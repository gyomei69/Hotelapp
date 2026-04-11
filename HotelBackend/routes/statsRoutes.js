import express from 'express';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import Booking from '../models/Booking.js';
import { protect, requireStaffAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, requireStaffAccess, async (req, res) => {
  try {
    const totalGuests = await Guest.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'Available' });
    const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });

    const revenueBookings = await Booking.find({ paymentStatus: 'Paid' });
    const totalRevenue = revenueBookings.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const revenueAt = (b) => new Date(b.paidAt || b.updatedAt || b.createdAt);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyRevenue = revenueBookings
      .filter((b) => revenueAt(b) >= startOfDay)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const weeklyRevenue = revenueBookings
      .filter((b) => revenueAt(b) >= startOfWeek)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const monthlyRevenue = revenueBookings
      .filter((b) => revenueAt(b) >= startOfMonth)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const yearlyRevenue = revenueBookings
      .filter((b) => revenueAt(b) >= startOfYear)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const newBookings = await Booking.countDocuments();

    const payload = {
      guests: totalGuests,
      availableRooms,
      occupiedRooms,
      totalRooms: availableRooms + occupiedRooms,
      revenue: totalRevenue,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      newBookings,
    };

    if (req.user.role === 'staff') {
      return res.json({
        guests: payload.guests,
        availableRooms: payload.availableRooms,
        occupiedRooms: payload.occupiedRooms,
        totalRooms: payload.availableRooms + payload.occupiedRooms,
        newBookings: payload.newBookings,
      });
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
