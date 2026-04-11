import Booking from '../models/Booking.js';

/**
 * @desc    Room occupancy / reservation calendar data
 * @route   GET /api/admin/calendar
 */
export const getOccupancyCalendar = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $nin: ['Rejected', 'Cancelled'] },
    })
      .populate('room', 'roomNumber type status')
      .populate('user', 'name email')
      .sort({ checkInDate: 1 })
      .lean();

    res.json({ bookings });
  } catch (error) {
    console.error('[getOccupancyCalendar]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Payment monitoring — bookings with payment fields
 * @route   GET /api/admin/payments
 */
export const listPaymentsReport = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('room', 'roomNumber type')
      .sort({ updatedAt: -1 })
      .lean();

    res.json(bookings);
  } catch (error) {
    console.error('[listPaymentsReport]', error.message);
    res.status(500).json({ message: error.message });
  }
};
