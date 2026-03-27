import express from 'express';
import { createBooking, getMyBookings } from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/bookings     → create a new booking (any authenticated user)
// GET  /api/bookings/my  → get current user's booking history
router.route('/').post(protect, createBooking);
router.route('/my').get(protect, getMyBookings);

export default router;
