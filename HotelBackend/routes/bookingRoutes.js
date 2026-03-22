import express from 'express';
import { getBookings, createBooking, updateBookingStatus, deleteBooking } from '../controllers/bookingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking); // Staff can create

router.route('/:id')
  .put(protect, updateBookingStatus)
  .delete(protect, admin, deleteBooking);

export default router;
