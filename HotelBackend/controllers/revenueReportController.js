import Booking from '../models/Booking.js';
import { logActivity } from '../services/activityLogService.js';
import { ACTIVITY_ACTION } from '../constants/activityActions.js';

const HOTEL_NAME = 'Aurora Grand Hotel';

/**
 * @desc    Aggregated revenue for admin PDF export (paid bookings only)
 * @route   GET /api/admin/revenue-report?period=daily|monthly|yearly
 * @access  Private / Admin
 */
export const getRevenueReport = async (req, res) => {
  try {
    const period = String(req.query.period || 'daily').toLowerCase();
    if (!['daily', 'monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ message: 'period must be daily, monthly, or yearly' });
    }

    const paid = await Booking.find({ paymentStatus: 'Paid' })
      .populate('room', 'roomNumber type')
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const now = new Date();
    let start;
    let reportTypeLabel;
    if (period === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      reportTypeLabel = 'Daily';
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      reportTypeLabel = 'Monthly';
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      reportTypeLabel = 'Yearly';
    }

    const filtered = paid.filter((b) => {
      const d = b.paidAt ? new Date(b.paidAt) : new Date(b.updatedAt);
      return d >= start;
    });

    const totalRevenue = filtered.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const breakdown = filtered.map((b) => ({
      id: String(b._id),
      guest: b.user?.name || 'Guest',
      room: b.room ? `${b.room.type} (${b.room.roomNumber})` : 'Room',
      amount: b.totalAmount,
      paidAt: (b.paidAt || b.updatedAt) ? new Date(b.paidAt || b.updatedAt).toISOString() : '',
    }));

    await logActivity(
      req.user._id,
      req.user.role,
      ACTIVITY_ACTION.GENERATE_REVENUE_REPORT,
      `Generated revenue report (${reportTypeLabel})`,
      null
    );

    res.json({
      hotelName: HOTEL_NAME,
      reportType: reportTypeLabel,
      period,
      generatedAt: new Date().toISOString(),
      totalRevenue,
      currencySymbol: '\u20b1',
      breakdown,
    });
  } catch (error) {
    console.error('[getRevenueReport]', error);
    const msg =
      (error && typeof error.message === 'string' && error.message) ||
      'Could not load revenue data.';
    res.status(500).json({ message: msg });
  }
};
