import express from 'express';
import {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from '../controllers/bookingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, admin);

// GET  /api/admin/bookings       → list all bookings (supports ?status=Pending filter)
// POST is not here — users create bookings via /api/bookings
router.route('/bookings')
  .get(getAllBookings);

// GET    /api/admin/bookings/:id  → booking details (user + room info)
// PATCH  /api/admin/bookings/:id  → approve or reject
// DELETE /api/admin/bookings/:id  → delete booking
router.route('/bookings/:id')
  .get(getBookingById)
  .patch(updateBookingStatus)
  .delete(deleteBooking);

export default router;
