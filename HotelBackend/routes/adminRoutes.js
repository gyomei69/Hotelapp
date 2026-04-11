import express from 'express';
import {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  confirmBookingPayment,
  deleteBooking,
  patchBookingCheckIn,
  patchBookingCheckOut,
  cancelBookingByAdmin,
} from '../controllers/bookingController.js';
import { getRevenueReport } from '../controllers/revenueReportController.js';
import { listHousekeeping, updateHousekeepingTask } from '../controllers/housekeepingController.js';
import { listFeedbackAdmin, respondFeedback } from '../controllers/feedbackController.js';
import { getOccupancyCalendar, listPaymentsReport } from '../controllers/adminOpsController.js';
import { protect, requireAdmin, requireStaffAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// ── Super admin only ───────────────────────────────────────────────
router.get('/revenue-report', requireAdmin, getRevenueReport);
router.get('/feedback', requireAdmin, listFeedbackAdmin);
router.patch('/feedback/:id/respond', requireAdmin, respondFeedback);

router.patch('/bookings/:id', requireAdmin, updateBookingStatus);
router.patch('/bookings/:id/cancel-admin', requireAdmin, cancelBookingByAdmin);
router.delete('/bookings/:id', requireAdmin, deleteBooking);

// ── Staff + super admin ────────────────────────────────────────────
router.get('/calendar', requireStaffAccess, getOccupancyCalendar);
router.get('/payments', requireStaffAccess, listPaymentsReport);
router.get('/housekeeping', requireStaffAccess, listHousekeeping);
router.patch('/housekeeping/:id', requireStaffAccess, updateHousekeepingTask);

router.get('/bookings', requireStaffAccess, getAllBookings);
router.get('/bookings/:id', requireStaffAccess, getBookingById);
router.patch('/bookings/:id/confirm-payment', requireStaffAccess, confirmBookingPayment);
router.patch('/bookings/:id/check-in', requireStaffAccess, patchBookingCheckIn);
router.patch('/bookings/:id/check-out', requireStaffAccess, patchBookingCheckOut);

export default router;
