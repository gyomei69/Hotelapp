import express from 'express';
import {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  putBookingApprove,
  putBookingReject,
  confirmBookingPayment,
  deleteBooking,
  patchBookingCheckIn,
  patchBookingCheckOut,
  putBookingComplete,
  cancelBookingByAdmin,
} from '../controllers/bookingController.js';
import { getRevenueReport } from '../controllers/revenueReportController.js';
import { deleteFeedback, listFeedbackAdmin, respondFeedback } from '../controllers/feedbackController.js';
import { getOccupancyCalendar, listPaymentsReport } from '../controllers/adminOpsController.js';
import { protect, requireAdmin, requireRole, ROLES_ADMIN_STAFF } from '../middleware/authMiddleware.js';

const router = express.Router();

const requireBookingOps = requireRole(ROLES_ADMIN_STAFF, 'Staff access required');

router.use(protect);

// ── Admin only ───────────────────────────────────────────────────────
router.get('/revenue-report', requireAdmin, getRevenueReport);
router.get('/feedback', requireBookingOps, listFeedbackAdmin);
router.patch('/feedback/:id/respond', requireBookingOps, respondFeedback);
router.delete('/feedback/:id', requireBookingOps, deleteFeedback);

// ── Staff + admin (operational bookings) — specific PATCH paths first ──
router.get('/calendar', requireBookingOps, getOccupancyCalendar);
router.get('/payments', requireBookingOps, listPaymentsReport);

router.get('/bookings', requireBookingOps, getAllBookings);
router.get('/bookings/:id', requireBookingOps, getBookingById);
router.patch('/bookings/:id/approve', requireBookingOps, putBookingApprove);
router.patch('/bookings/:id/reject', requireBookingOps, putBookingReject);
router.patch('/bookings/:id/confirm-payment', requireBookingOps, confirmBookingPayment);
router.patch('/bookings/:id/check-in', requireBookingOps, patchBookingCheckIn);
router.patch('/bookings/:id/check-out', requireBookingOps, patchBookingCheckOut);
router.patch('/bookings/:id/complete', requireBookingOps, putBookingComplete);
router.patch('/bookings/:id/cancel-admin', requireAdmin, cancelBookingByAdmin);
router.delete('/bookings/:id', requireAdmin, deleteBooking);
/** Legacy: PATCH body { status: 'Approved' | 'Rejected' } — staff + admin */
router.patch('/bookings/:id', requireBookingOps, updateBookingStatus);

export default router;
