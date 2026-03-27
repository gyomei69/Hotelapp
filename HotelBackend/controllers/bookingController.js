import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import {
  validateBookingInput,
  checkRoomAvailability,
  calculateTotalPrice,
} from '../services/bookingService.js';

// ─────────────────────────────────────────────────────────────────────
// USER-FACING CONTROLLERS
// ─────────────────────────────────────────────────────────────────────

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private (authenticated user)
 */
export const createBooking = async (req, res) => {
  try {
    const {
      room,
      checkInDate,
      checkOutDate,
      guestCount = 1,
      paymentMethod = 'Cash',
      specialRequests = '',
    } = req.body;

    // 1. Validate inputs
    const validation = validateBookingInput({
      room,
      checkInDate,
      checkOutDate,
      guestCount,
      paymentMethod,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // 2. Check room availability (prevents double booking)
    const availability = await checkRoomAvailability(room, checkInDate, checkOutDate);
    if (!availability.available) {
      return res.status(400).json({
        message: 'Room is already booked for these dates',
        conflict: {
          checkIn: availability.conflictingBooking.checkInDate,
          checkOut: availability.conflictingBooking.checkOutDate,
        },
      });
    }

    // 3. Calculate total price server-side (never trust frontend)
    const pricing = await calculateTotalPrice(room, checkInDate, checkOutDate);
    if (pricing.error) {
      return res.status(404).json({ message: pricing.error });
    }

    // 4. Find or create Guest profile for stats tracking
    let guestId = null;
    if (req.user) {
      let guestDoc = await Guest.findOne({ email: req.user.email });
      if (!guestDoc) {
        guestDoc = await Guest.create({
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || 'N/A',
        });
      }
      guestId = guestDoc._id;

      // Update guest stats
      guestDoc.totalBookings += 1;
      guestDoc.totalSpent += pricing.totalAmount;
      await guestDoc.save();
    }

    // 5. Create the booking — status defaults to Pending
    const booking = await Booking.create({
      user: req.user._id,
      guest: guestId,
      room,
      checkInDate,
      checkOutDate,
      totalAmount: pricing.totalAmount,
      guestCount,
      paymentMethod,
      specialRequests,
      status: 'Pending',
    });

    // 6. Return the booking with populated room data
    const populated = await Booking.findById(booking._id)
      .populate('room', 'roomNumber type price imageUrl');

    res.status(201).json(populated);
  } catch (error) {
    console.error('[createBooking Error]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Get current user's booking history
 * @route   GET /api/bookings/my
 * @access  Private (authenticated user)
 */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room', 'roomNumber type price imageUrl features')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('[getMyBookings Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// ADMIN-FACING CONTROLLERS
// ─────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all bookings (admin dashboard)
 * @route   GET /api/admin/bookings
 * @access  Private/Admin
 */
export const getAllBookings = async (req, res) => {
  try {
    // Support optional status filter via query param
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('guest', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('[getAllBookings Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get a single booking by ID (admin detail view)
 * @route   GET /api/admin/bookings/:id
 * @access  Private/Admin
 */
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone role')
      .populate('guest', 'name email phone totalBookings totalSpent')
      .populate('room', 'roomNumber type price status features imageUrl');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('[getBookingById Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Approve or reject a booking
 * @route   PATCH /api/admin/bookings/:id
 * @access  Private/Admin
 *
 * Business rules:
 *   - Only bookings with status "Pending" can be updated
 *   - Allowed transitions: Pending → Approved  |  Pending → Rejected
 *   - If approved and check-in is today, mark room as Occupied
 *   - If rejected, free the room (set to Available)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate the requested status
    const allowedStatuses = ['Approved', 'Rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only Pending bookings can be approved or rejected
    if (booking.status !== 'Pending') {
      return res.status(400).json({
        message: `Cannot change status of a booking that is already "${booking.status}"`,
      });
    }

    booking.status = status;
    await booking.save();

    // Side effects based on new status
    if (status === 'Approved') {
      // If check-in is today or in the past, mark room as Occupied
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDay = new Date(booking.checkInDate);
      checkInDay.setHours(0, 0, 0, 0);

      if (checkInDay <= today) {
        const Room = (await import('../models/Room.js')).default;
        const roomDoc = await Room.findById(booking.room);
        if (roomDoc) {
          roomDoc.status = 'Occupied';
          await roomDoc.save();
        }
      }
    }

    // Return updated booking with populated fields
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price');

    res.json(updated);
  } catch (error) {
    console.error('[updateBookingStatus Error]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Delete a booking
 * @route   DELETE /api/admin/bookings/:id
 * @access  Private/Admin
 */
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.deleteOne();
    res.json({ message: 'Booking removed' });
  } catch (error) {
    console.error('[deleteBooking Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};
