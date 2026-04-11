import jwt from 'jsonwebtoken';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import {
  validateBookingInput,
  checkRoomAvailability,
  calculateTotalPrice,
  assertGuestCapacity,
} from '../services/bookingService.js';
import { notifyAdminRecipients, notifyUser } from '../services/notificationService.js';

function inferPaymentStatus(status, existing) {
  if (existing) {
    if (existing === 'Awaiting Admin') return 'Unpaid';
    return existing;
  }
  switch (status) {
    case 'Pending':
      return 'Unpaid';
    case 'Approved':
      return 'Awaiting Payment';
    case 'Confirmed':
    case 'Completed':
      return 'Paid';
    default:
      return 'Unpaid';
  }
}

function effectivePaymentStatus(booking) {
  return inferPaymentStatus(booking.status, booking.paymentStatus);
}

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
      specialRequests = '',
      total_price,
      totalPrice,
    } = req.body;

    // 1. Validate inputs (payment is finalized after admin approval)
    const validation = validateBookingInput({
      room,
      checkInDate,
      checkOutDate,
      guestCount,
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

    const capacityCheck = assertGuestCapacity(pricing.room, Number(guestCount));
    if (!capacityCheck.ok) {
      return res.status(400).json({ message: capacityCheck.message });
    }

    const clientTotal = total_price ?? totalPrice;
    if (clientTotal !== undefined && clientTotal !== null && clientTotal !== '') {
      const n = Number(clientTotal);
      if (!Number.isNaN(n) && Math.abs(n - pricing.totalAmount) > 0.01) {
        return res.status(400).json({
          message: 'Total price mismatch. Please refresh dates and try again.',
        });
      }
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

      // Count booking; totalSpent updates only when payment_status becomes Paid
      guestDoc.totalBookings += 1;
      await guestDoc.save();
    }

    // 5. Create the booking — payment is chosen after admin approval
    const booking = await Booking.create({
      user: req.user._id,
      guest: guestId,
      room,
      checkInDate,
      checkOutDate,
      totalAmount: pricing.totalAmount,
      guestCount,
      paymentMethod: 'Cash',
      paymentStatus: 'Unpaid',
      specialRequests,
      status: 'Pending',
    });

    // 6. Return the booking with populated room data
    const populated = await Booking.findById(booking._id)
      .populate('room', 'roomNumber type price imageUrl capacity');

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_CREATED',
        message: 'New booking request received',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[createBooking] notify admins failed', e.message);
    }

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
      .populate('room', 'roomNumber type price imageUrl features capacity')
      .sort({ createdAt: -1 });

    const normalized = bookings.map((b) => {
      const o = b.toObject();
      o.paymentStatus = inferPaymentStatus(o.status, o.paymentStatus);
      return o;
    });

    res.json(normalized);
  } catch (error) {
    console.error('[getMyBookings Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Cancel own pending booking
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
/**
 * @desc    User selects cash payment after admin approval
 * @route   POST /api/bookings/:id/payment/cash
 * @access  Private
 */
export const selectCashPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'Approved') {
      return res.status(400).json({ message: 'Booking must be approved before you can pay' });
    }
    const ps = effectivePaymentStatus(booking);
    if (ps !== 'Awaiting Payment') {
      return res.status(400).json({ message: 'Payment is not awaiting selection for this booking' });
    }

    booking.paymentMethod = 'Cash';
    booking.paymentStatus = 'Pending Payment at Hotel';
    await booking.save();

    const populated = await Booking.findById(booking._id).populate(
      'room',
      'roomNumber type price imageUrl capacity'
    );
    res.json(populated);
  } catch (error) {
    console.error('[selectCashPayment Error]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Get browser URL for mock card checkout page
 * @route   GET /api/bookings/:id/payment/card-url
 * @access  Private
 */
export const getCardCheckoutUrl = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'Approved') {
      return res.status(400).json({ message: 'Booking must be approved before you can pay' });
    }
    const ps = effectivePaymentStatus(booking);
    if (!['Awaiting Payment', 'Failed'].includes(ps)) {
      return res.status(400).json({ message: 'Card payment is not available for this booking' });
    }

    const token = jwt.sign(
      {
        purpose: 'card-checkout',
        bookingId: booking._id.toString(),
        userId: req.user._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const host = `${req.protocol}://${req.get('host')}`;
    const url = `${host}/api/bookings/payment/card-page?token=${encodeURIComponent(token)}`;
    res.json({ url });
  } catch (error) {
    console.error('[getCardCheckoutUrl Error]', error.message);
    res.status(400).json({ message: error.message });
  }
};

export const cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        message: 'Only pending bookings can be cancelled',
      });
    }

    booking.status = 'Cancelled';
    await booking.save();

    const populated = await Booking.findById(booking._id).populate(
      'room',
      'roomNumber type price imageUrl capacity'
    );

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_CANCELLED',
        message: 'User cancelled a booking',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[cancelMyBooking] notify admins failed', e.message);
    }

    res.json(populated);
  } catch (error) {
    console.error('[cancelMyBooking Error]', error.message);
    res.status(400).json({ message: error.message });
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

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const allowedStatuses = ['Approved', 'Rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        message: `Cannot change status of a booking that is already "${booking.status}"`,
      });
    }

    booking.status = status;
    if (status === 'Approved') {
      booking.paymentStatus = 'Awaiting Payment';
    }
    if (status === 'Rejected') {
      booking.paymentStatus = 'Unpaid';
    }
    await booking.save();

    try {
      if (status === 'Approved') {
        await notifyUser({
          userId: booking.user,
          type: 'BOOKING_APPROVED',
          message: 'Your booking has been approved',
          relatedId: booking._id,
        });
      } else if (status === 'Rejected') {
        await notifyUser({
          userId: booking.user,
          type: 'BOOKING_REJECTED',
          message: 'Your booking was rejected',
          relatedId: booking._id,
        });
      }
    } catch (e) {
      console.warn('[updateBookingStatus] notify user failed', e.message);
    }

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
 * @desc    Admin confirms payment (cash at hotel) — marks booking paid & completed; revenue counts here only
 * @route   PATCH /api/admin/bookings/:id/confirm-payment
 * @access  Private/Admin
 */
export const confirmBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'Approved') {
      return res.status(400).json({
        message: 'Payment can only be confirmed for approved bookings awaiting payment',
      });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Payment is already recorded as paid' });
    }

    booking.paymentStatus = 'Paid';
    booking.status = 'Completed';
    booking.paidAt = new Date();
    await booking.save();

    if (booking.guest) {
      const guestDoc = await Guest.findById(booking.guest);
      if (guestDoc) {
        guestDoc.totalSpent = (guestDoc.totalSpent || 0) + (Number(booking.totalAmount) || 0);
        await guestDoc.save();
      }
    }

    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');

    try {
      await notifyUser({
        userId: booking.user,
        type: 'PAYMENT_CONFIRMED',
        message: 'Your payment has been confirmed',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[confirmBookingPayment] notify user failed', e.message);
    }

    res.json(updated);
  } catch (error) {
    console.error('[confirmBookingPayment Error]', error.message);
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

const staffUpdatableStatuses = ['Approved', 'Confirmed', 'Completed'];

/**
 * @desc    Record guest check-in
 * @route   PATCH /api/admin/bookings/:id/check-in
 * @access  Staff + super admin
 */
export const patchBookingCheckIn = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!staffUpdatableStatuses.includes(booking.status)) {
      return res.status(400).json({ message: 'Check-in is only available for approved or active stays' });
    }
    if (booking.checkInStatus === 'checked_in') {
      return res.status(400).json({ message: 'Guest is already checked in' });
    }
    booking.checkInStatus = 'checked_in';
    booking.checkInAt = new Date();
    await booking.save();
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');
    res.json(updated);
  } catch (error) {
    console.error('[patchBookingCheckIn]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Record guest check-out
 * @route   PATCH /api/admin/bookings/:id/check-out
 * @access  Staff + super admin
 */
export const patchBookingCheckOut = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.checkInStatus !== 'checked_in') {
      return res.status(400).json({ message: 'Guest must be checked in before check-out' });
    }
    if (booking.checkOutStatus === 'checked_out') {
      return res.status(400).json({ message: 'Guest is already checked out' });
    }
    booking.checkOutStatus = 'checked_out';
    booking.checkOutAt = new Date();
    await booking.save();
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');
    res.json(updated);
  } catch (error) {
    console.error('[patchBookingCheckOut]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Super admin cancels a booking (any non-completed state)
 * @route   PATCH /api/admin/bookings/:id/cancel-admin
 * @access  Super admin only
 */
export const cancelBookingByAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (['Completed', 'Cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking cannot be cancelled' });
    }
    booking.status = 'Cancelled';
    booking.paymentStatus = 'Unpaid';
    await booking.save();
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');
    res.json(updated);
  } catch (error) {
    console.error('[cancelBookingByAdmin]', error.message);
    res.status(400).json({ message: error.message });
  }
};
