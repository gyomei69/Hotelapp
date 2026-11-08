import Booking from '../models/Booking.js';

/**
 * GET /api/billing
 * - Guest: only their own bookings
 * - Staff/Admin: all bookings
 *
 * Billing records are bookings that are:
 * - booking_status === "Confirmed"
 * - paymentStatus === "Paid"
 * - check_in_status === "Pending"
 * Sorted: latest first
 */
export const getBillingRecords = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isStaff = role === 'admin' || role === 'staff';

    const filter = {
      booking_status: 'Confirmed',
      paymentStatus: 'Paid',
      check_in_status: 'Pending',
    };

    if (!isStaff) {
      filter.user = req.user._id;
    }

    const rows = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('room', 'type price roomNumber')
      .sort({ createdAt: -1 });

    return res.json(rows);
  } catch (e) {
    console.error('[billing] getBillingRecords:', e?.message || e);
    return res.status(500).json({ message: 'Unable to load billing records right now.' });
  }
};

