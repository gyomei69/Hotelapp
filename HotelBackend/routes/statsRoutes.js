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
    const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });
    
    // Calculate total revenue from approved bookings
    const bookings = await Booking.find({ status: 'Approved' });
    const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // Calculate granular revenue
    const now = new Date();
    const startOfDay = new Date(now.setHours(0,0,0,0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyRevenue = bookings
      .filter(b => new Date(b.createdAt) >= startOfDay)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const weeklyRevenue = bookings
      .filter(b => new Date(b.createdAt) >= startOfWeek)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const monthlyRevenue = bookings
      .filter(b => new Date(b.createdAt) >= startOfMonth)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    // New bookings this week (simplified to all bookings for now)
    const newBookings = await Booking.countDocuments();

    res.json({
      guests: totalGuests,
      availableRooms: availableRooms,
      occupiedRooms: occupiedRooms,
      revenue: totalRevenue,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      newBookings: newBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
