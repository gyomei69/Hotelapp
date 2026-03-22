import express from 'express';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import Booking from '../models/Booking.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const totalGuests = await Guest.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'Available' });
    
    // Calculate total revenue from completed/confirmed bookings
    const bookings = await Booking.find({ status: { $in: ['Confirmed', 'Completed'] } });
    const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    // New bookings this week (simplified to all bookings for now)
    const newBookings = await Booking.countDocuments();

    res.json({
      guests: totalGuests,
      availableRooms: availableRooms,
      revenue: totalRevenue,
      newBookings: newBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
