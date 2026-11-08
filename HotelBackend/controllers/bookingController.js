import jwt from 'jsonwebtoken';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import {
  validateBookingInput,
  calculateTotalPrice,
  assertGuestCapacity,
} from '../services/bookingService.js';
import { assertRoomAvailabilityForBooking } from '../services/roomAvailabilityService.js';
import { notifyAdminRecipients, notifyUser } from '../services/notificationService.js';
import { logActivity } from '../services/activityLogService.js';
import { ACTIVITY_ACTION } from '../constants/activityActions.js';
import { sendBookingStatusEmail } from '../services/emailService.js';

function startOfDayTimestamp(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function isPaymentRecordedPaid(booking) {
  return booking.paymentStatus === 'Paid';
}

function isCheckedInStatus(booking) {
  return booking.checkInStatus === 'Checked-In' || booking.checkInStatus === 'checked_in';
}

function isCheckedOutStatus(booking) {
  return booking.checkOutStatus === 'Checked-Out' || booking.checkOutStatus === 'checked_out';
}

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

function getBookingPrimaryStatus(booking) {
  // booking_status is authoritative; legacy rows may not have it yet.
  return booking.booking_status || booking.status || 'Pending';
}

function safeDateStr(d) {
  try {
    return d ? new Date(d).toLocaleString() : '';
  } catch {
    return '';
  }
}

async function emailBookingStatus({ bookingId, status }) {
  try {
    const b = await Booking.findById(bookingId).populate('user', 'name email').populate('room', 'type roomNumber');
    const to = b?.user?.email;
    if (!to) return;
    await sendBookingStatusEmail(to, {
      name: b.user?.name || '',
      status,
      bookingId: String(b._id),
      roomLabel: b.room ? `${b.room.type} (Rm ${b.room.roomNumber})` : '',
      checkIn: safeDateStr(b.checkInDate || b.check_in_datetime),
      checkOut: safeDateStr(b.checkOutDate || b.check_out_datetime),
    });
  } catch (e) {
    console.warn('[emailBookingStatus] failed', e?.message || e);
  }
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
      check_in_datetime,
      check_out_datetime,
      guestCount = 1,
      specialRequests = '',
      total_price,
      totalPrice,
    } = req.body;

    const inRaw = check_in_datetime || checkInDate;
    const outRaw = check_out_datetime || checkOutDate;

    // 1. Validate inputs (payment is finalized after admin approval)
    const validation = validateBookingInput({
      room,
      checkInDate: inRaw,
      checkOutDate: outRaw,
      check_in_datetime: inRaw,
      check_out_datetime: outRaw,
      guestCount,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // 2. Same-room + room-type pool availability (date overlaps vs totalRooms)
    const availability = await assertRoomAvailabilityForBooking(room, inRaw, outRaw);
    if (!availability.ok) {
      return res.status(400).json({
        message: availability.message,
        ...(availability.conflict
          ? {
              conflict: {
                checkIn: availability.conflict.checkInDate,
                checkOut: availability.conflict.checkOutDate,
              },
            }
          : {}),
      });
    }

    // 3. Calculate total price server-side (never trust frontend)
    const pricing = await calculateTotalPrice(room, inRaw, outRaw);
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

      // Count booking; totalSpent updates only when paymentStatus becomes Paid
      guestDoc.totalBookings += 1;
      await guestDoc.save();
    }

    // 5. Create the booking — payment is chosen after admin approval
    const booking = await Booking.create({
      user: req.user._id,
      guest: guestId,
      room,
      checkInDate: inRaw,
      checkOutDate: outRaw,
      check_in_datetime: inRaw,
      check_out_datetime: outRaw,
      totalAmount: pricing.totalAmount,
      guestCount,
      paymentMethod: 'Cash',
      paymentStatus: 'Unpaid',
      specialRequests,
      booking_status: 'Pending',
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

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.CREATE_BOOKING,
      'Created a new booking request',
      booking._id
    );

    // Email guest: booking created (Pending)
    emailBookingStatus({ bookingId: booking._id, status: 'Pending' });

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
      o.booking_status = o.booking_status || getBookingPrimaryStatus(o);
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
    if (getBookingPrimaryStatus(booking) !== 'Approved') {
      return res.status(400).json({ message: 'Booking must be approved before you can pay' });
    }
    const ps = effectivePaymentStatus(booking);
    if (ps !== 'Awaiting Payment') {
      return res.status(400).json({ message: 'Payment is not awaiting selection for this booking' });
    }

    booking.paymentMethod = 'Cash';
    booking.paymentStatus = 'Pending';
    await booking.save();

    try {
      await notifyAdminRecipients({
        type: 'PAYMENT_METHOD_CHOSEN',
        message: 'Guest selected cash payment (awaiting confirmation)',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[selectCashPayment] notify staff failed', e.message);
    }

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.PAYMENT_SELECT_CASH,
      'Selected cash payment for an approved booking',
      booking._id
    );

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
 * @desc    User selects card payment after admin approval (sandbox UI)
 * @route   POST /api/bookings/:id/payment/card
 * @access  Private
 */
export const selectCardPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (getBookingPrimaryStatus(booking) !== 'Approved') {
      return res.status(400).json({ message: 'Booking must be approved before you can pay' });
    }
    const ps = effectivePaymentStatus(booking);
    if (ps !== 'Awaiting Payment' && ps !== 'Failed') {
      return res.status(400).json({ message: 'Card payment is not available for this booking' });
    }

    booking.paymentMethod = 'Card';
    // Sandbox: mark pending so staff can confirm via /confirm-payment
    booking.paymentStatus = 'Pending';
    await booking.save();

    try {
      await notifyAdminRecipients({
        type: 'PAYMENT_METHOD_CHOSEN',
        message: 'Guest started card payment (pending staff confirmation)',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[selectCardPayment] notify staff failed', e.message);
    }

    const populated = await Booking.findById(booking._id).populate(
      'room',
      'roomNumber type price imageUrl capacity'
    );
    return res.json(populated);
  } catch (error) {
    console.error('[selectCardPayment Error]', error.message);
    return res.status(400).json({ message: error.message });
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
    if (getBookingPrimaryStatus(booking) !== 'Approved') {
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

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.PAYMENT_CARD_CHECKOUT,
      'Opened card checkout for an approved booking',
      booking._id
    );

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

    if (getBookingPrimaryStatus(booking) !== 'Pending') {
      return res.status(400).json({
        message: 'Only pending bookings can be cancelled',
      });
    }

    booking.booking_status = 'Cancelled';
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

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.CANCEL_BOOKING,
      'Cancelled a pending booking',
      booking._id
    );

    // Email guest: cancelled
    emailBookingStatus({ bookingId: booking._id, status: 'Cancelled' });

    res.json(populated);
  } catch (error) {
    console.error('[cancelMyBooking Error]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Delete own booking (cleanup old reservations)
 * @route   DELETE /api/bookings/:id
 * @access  Private (owner)
 */
export const deleteMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    // Safety: only allow deletion for inactive/old reservations.
    // Active pipeline bookings should be cancelled/processed instead.
    const deletableStatuses = ['Cancelled', 'Rejected', 'Completed'];
    if (!deletableStatuses.includes(getBookingPrimaryStatus(booking))) {
      return res.status(400).json({
        message: `Only ${deletableStatuses.join(', ')} bookings can be deleted`,
      });
    }

    const deletedId = booking._id;
    await booking.deleteOne();

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_DELETED_USER',
        message: 'A guest removed a booking from their history',
        relatedId: deletedId,
      });
    } catch (e) {
      console.warn('[deleteMyBooking] notify staff failed', e.message);
    }

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.DELETE_BOOKING,
      'Deleted an old booking from history',
      deletedId
    );

    return res.json({ message: 'Booking deleted', id: String(deletedId) });
  } catch (error) {
    console.error('[deleteMyBooking Error]', error.message);
    return res.status(500).json({ message: error.message });
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
      filter.booking_status = req.query.status;
    }

    const pageRaw = Number(req.query.page);
    const limitRaw = Number(req.query.limit);
    const wantsPagination = Number.isFinite(pageRaw) || Number.isFinite(limitRaw);

    if (!wantsPagination) {
      const bookings = await Booking.find(filter)
        .populate('user', 'name email phone')
        .populate('guest', 'name email phone')
        .populate('room', 'roomNumber type price imageUrl')
        .sort({ createdAt: -1 });
      return res.json(bookings);
    }

    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));
    const skip = (page - 1) * limit;

    const [totalItems, rows] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('user', 'name email phone')
        .populate('guest', 'name email phone')
        .populate('room', 'roomNumber type price imageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return res.json({
      data: rows,
      currentPage: page,
      totalPages,
      totalItems,
    });
  } catch (error) {
    console.error('[getAllBookings Error]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all bookings (staff/admin ops) with pagination
 * @route   GET /api/bookings?page=1&limit=10
 * @access  Staff + admin
 */
export const listBookingsPaginated = async (req, res) => {
  try {
    const pageRaw = Number(req.query.page);
    const limitRaw = Number(req.query.limit);
    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));
    const skip = (page - 1) * limit;

    // Support optional status filter via query param
    const filter = {};
    if (req.query.status) {
      filter.booking_status = req.query.status;
    }

    const [totalItems, rows] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('user', 'name email phone')
        .populate('guest', 'name email phone')
        .populate('room', 'roomNumber type price imageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return res.json({
      data: rows,
      currentPage: page,
      totalPages,
      totalItems,
    });
  } catch (error) {
    console.error('[listBookingsPaginated Error]', error.message);
    return res.status(500).json({ message: error.message });
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

/** Payment states that mean guest committed to a method and staff must confirm (cash path). */
const STAFF_CONFIRM_PAYMENT_STATUSES = ['Pending', 'Pending Payment at Hotel'];

/**
 * Shared: Pending → Approved | Rejected (staff/admin).
 */
async function runBookingStatusFromPending(req, res, status) {
  try {
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

    if (getBookingPrimaryStatus(booking) !== 'Pending') {
      return res.status(400).json({
        message: `Cannot change status of a booking that is already "${getBookingPrimaryStatus(booking)}"`,
      });
    }

    booking.booking_status = status;
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
      console.warn('[runBookingStatusFromPending] notify user failed', e.message);
    }

    try {
      await notifyAdminRecipients({
        type: status === 'Approved' ? 'BOOKING_APPROVED_TEAM' : 'BOOKING_REJECTED_TEAM',
        message:
          status === 'Approved'
            ? 'A booking was approved (guest notified)'
            : 'A booking was rejected (guest notified)',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[runBookingStatusFromPending] notify staff team failed', e.message);
    }

    // Email guest: approved / rejected
    emailBookingStatus({ bookingId: booking._id, status });

    const action =
      status === 'Approved' ? ACTIVITY_ACTION.APPROVE_BOOKING : ACTIVITY_ACTION.REJECT_BOOKING;
    await logActivity(
      req.user._id,
      req.user.role,
      action,
      status === 'Approved' ? 'Approved a booking request' : 'Rejected a booking request',
      booking._id
    );

    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price');

    return res.json(updated);
  } catch (error) {
    console.error('[runBookingStatusFromPending]', error.message);
    if (!res.headersSent) {
      res.status(400).json({ message: error.message });
    }
  }
}

/**
 * @desc    Approve or reject a booking (legacy body)
 * @route   PATCH /api/admin/bookings/:id
 * @access  Staff + admin
 */
export const updateBookingStatus = (req, res) =>
  runBookingStatusFromPending(req, res, req.body?.status);

/**
 * @desc    Approve booking
 * @route   PUT /api/bookings/:id/approve
 * @access  Staff + admin
 */
export const putBookingApprove = (req, res) => runBookingStatusFromPending(req, res, 'Approved');

/**
 * @desc    Reject booking
 * @route   PUT /api/bookings/:id/reject
 * @access  Staff + admin
 */
export const putBookingReject = (req, res) => runBookingStatusFromPending(req, res, 'Rejected');

/**
 * @desc    Staff confirms payment (after guest chose a method — cash path uses paymentStatus Pending)
 * @route   PUT /api/bookings/:id/confirm-payment  |  PATCH /api/admin/bookings/:id/confirm-payment
 * @access  Staff + admin
 */
export const confirmBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (getBookingPrimaryStatus(booking) !== 'Approved') {
      return res.status(400).json({
        message: 'Payment can only be confirmed for approved bookings',
      });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Payment is already recorded as paid' });
    }

    if (!STAFF_CONFIRM_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
      return res.status(400).json({
        message: 'Payment can only be confirmed after the guest has selected a payment method (awaiting staff confirmation)',
      });
    }

    booking.paymentStatus = 'Paid';
    booking.paidAt = new Date();
    // Payment confirmed ⇒ booking becomes Confirmed (separate from Completed).
    booking.booking_status = 'Confirmed';
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

    try {
      await notifyAdminRecipients({
        type: 'PAYMENT_CONFIRMED_TEAM',
        message: 'Payment was confirmed for a booking',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[confirmBookingPayment] notify staff failed', e.message);
    }

    // Email guest: confirmed
    emailBookingStatus({ bookingId: booking._id, status: 'Confirmed' });

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.CONFIRM_PAYMENT,
      'Recorded payment as paid (stay active until check-out)',
      booking._id
    );

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

/**
 * @desc    Record guest check-in
 * @route   PATCH /api/admin/bookings/:id/check-in  |  PUT /api/bookings/:id/check-in
 * @access  Staff + admin
 */
export const patchBookingCheckIn = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check-in rules:
    // - Allow if Confirmed (payment confirmed) OR Approved-but-already-paid (legacy/edge).
    // - Prevent double check-in.
    const paid = booking.paymentStatus === 'Paid';
    const primary = getBookingPrimaryStatus(booking);
    const canByStatus = primary === 'Confirmed' || (primary === 'Approved' && paid);
    if (!canByStatus) {
      return res.status(400).json({ message: 'Booking must be approved and paid before check-in' });
    }
    // Make check-in idempotent (sustainable for mobile retries / double-taps)
    if (primary === 'Checked-In') {
      const updated = await Booking.findById(booking._id)
        .populate('user', 'name email phone')
        .populate('room', 'roomNumber type price imageUrl');
      return res.json({ ...updated.toObject(), alreadyCheckedIn: true });
    }

    booking.booking_status = 'Checked-In';
    booking.checkInAt = new Date();
    await booking.save();

    // Keep room status consistent for rooms/availability UI.
    try {
      await Room.updateOne({ _id: booking.room }, { $set: { status: 'Occupied' } });
    } catch (e) {
      console.warn('[patchBookingCheckIn] room status update failed', e?.message || e);
    }
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');

    try {
      await notifyUser({
        userId: booking.user,
        type: 'BOOKING_CHECKED_IN',
        message: 'You have been checked in for your booking.',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[patchBookingCheckIn] notify user failed', e.message);
    }

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_CHECKED_IN_TEAM',
        message: 'Guest was checked in',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[patchBookingCheckIn] notify staff failed', e.message);
    }

    // Email guest: checked-in
    emailBookingStatus({ bookingId: booking._id, status: 'Checked-In' });

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.PROCESS_BOOKING,
      'Processed booking — guest check-in',
      booking._id
    );
    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.CHECK_IN_GUEST,
      'Recorded guest check-in',
      booking._id
    );

    res.json(updated);
  } catch (error) {
    console.error('[patchBookingCheckIn]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Record guest check-out
 * @route   PATCH /api/admin/bookings/:id/check-out  |  PUT /api/bookings/:id/check-out
 * @access  Staff + admin
 */
export const patchBookingCheckOut = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const primary = getBookingPrimaryStatus(booking);
    if (primary !== 'Checked-In') {
      return res.status(400).json({ message: 'Booking must be checked in before check-out' });
    }

    booking.booking_status = 'Checked-Out';
    booking.checkOutAt = new Date();
    await booking.save();

    // When checked-out, free the room again.
    try {
      await Room.updateOne({ _id: booking.room }, { $set: { status: 'Available' } });
    } catch (e) {
      console.warn('[patchBookingCheckOut] room status update failed', e?.message || e);
    }
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');

    try {
      await notifyUser({
        userId: booking.user,
        type: 'BOOKING_CHECKED_OUT',
        message: 'You have been checked out for your booking.',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[patchBookingCheckOut] notify user failed', e.message);
    }

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_CHECKED_OUT_TEAM',
        message: 'Guest was checked out',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[patchBookingCheckOut] notify staff failed', e.message);
    }

    // Email guest: checked-out
    emailBookingStatus({ bookingId: booking._id, status: 'Checked-Out' });

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.PROCESS_BOOKING,
      'Processed booking — guest check-out',
      booking._id
    );
    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.CHECK_OUT_GUEST,
      'Recorded guest check-out',
      booking._id
    );

    res.json(updated);
  } catch (error) {
    console.error('[patchBookingCheckOut]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Mark a checked-out booking as completed
 * @route   PUT /api/bookings/:id/complete  |  PATCH /api/admin/bookings/:id/complete
 * @access  Staff + admin
 */
export const putBookingComplete = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const primary = getBookingPrimaryStatus(booking);
    if (primary !== 'Checked-Out') {
      return res.status(400).json({ message: 'Booking must be checked out before completion' });
    }
    if (primary === 'Completed') {
      return res.status(400).json({ message: 'Booking is already completed' });
    }

    booking.booking_status = 'Completed';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');

    try {
      await notifyUser({
        userId: booking.user,
        type: 'BOOKING_COMPLETED',
        message: 'Your booking has been marked as completed. Thank you for staying with us.',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[putBookingComplete] notify user failed', e.message);
    }

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_COMPLETED_TEAM',
        message: 'A stay was marked completed',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[putBookingComplete] notify staff failed', e.message);
    }

    // Email guest: completed
    emailBookingStatus({ bookingId: booking._id, status: 'Completed' });

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.BOOKING_MARK_COMPLETED,
      'Booking marked as completed',
      booking._id
    );

    return res.json(updated);
  } catch (error) {
    console.error('[putBookingComplete]', error.message);
    return res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Admin cancels a booking (any non-completed state)
 * @route   PATCH /api/admin/bookings/:id/cancel-admin
 * @access  Admin only
 */
export const cancelBookingByAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (['Completed', 'Cancelled'].includes(getBookingPrimaryStatus(booking))) {
      return res.status(400).json({ message: 'This booking cannot be cancelled' });
    }
    booking.booking_status = 'Cancelled';
    booking.paymentStatus = 'Unpaid';
    await booking.save();
    const updated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type price imageUrl');

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.ADMIN_CANCEL_BOOKING,
      'Cancelled a booking (admin)',
      booking._id
    );

    try {
      await notifyUser({
        userId: booking.user,
        type: 'BOOKING_CANCELLED_ADMIN',
        message: 'Your booking was cancelled by the hotel',
        relatedId: booking._id,
      });
    } catch (e) {
      console.warn('[cancelBookingByAdmin] notify user failed', e.message);
    }

    try {
      await notifyAdminRecipients({
        type: 'BOOKING_CANCELLED_ADMIN_TEAM',
        message: 'A booking was cancelled by admin/staff',
        relatedId: booking._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[cancelBookingByAdmin] notify staff failed', e.message);
    }

    // Email guest: cancelled by admin
    emailBookingStatus({ bookingId: booking._id, status: 'Cancelled' });

    res.json(updated);
  } catch (error) {
    console.error('[cancelBookingByAdmin]', error.message);
    res.status(400).json({ message: error.message });
  }
};
