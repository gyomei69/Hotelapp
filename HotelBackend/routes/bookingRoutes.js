import express from 'express';
import {
  createBooking,
  getMyBookings,
  cancelMyBooking,
  deleteMyBooking,
  selectCashPayment,
  selectCardPayment,
  getCardCheckoutUrl,
  listBookingsPaginated,
  putBookingApprove,
  putBookingReject,
  confirmBookingPayment,
  patchBookingCheckIn,
  patchBookingCheckOut,
  putBookingComplete,
} from '../controllers/bookingController.js';
import {
  renderCardPaymentPage,
  completeCardPayment,
  cancelCardPayment,
} from '../controllers/paymentController.js';
import { protect, requireRole, ROLES_ADMIN_STAFF } from '../middleware/authMiddleware.js';

const router = express.Router();

const requireBookingOps = requireRole(ROLES_ADMIN_STAFF, 'Staff access required');

router.post('/payment/card-complete', completeCardPayment);
router.get('/payment/card-cancel', cancelCardPayment);
router.get('/payment/card-page', renderCardPaymentPage);

// POST /api/bookings     → create a new booking (any authenticated user)
// GET  /api/bookings/my  → get current user's booking history
router.route('/').get(protect, requireBookingOps, listBookingsPaginated).post(protect, createBooking);
router.route('/my').get(protect, getMyBookings);
router.post('/:id/payment/cash', protect, selectCashPayment);
router.post('/:id/payment/card', protect, selectCardPayment);
router.get('/:id/payment/card-url', protect, getCardCheckoutUrl);
router.patch('/:id/cancel', protect, cancelMyBooking);
router.delete('/:id', protect, deleteMyBooking);

router.put('/:id/approve', protect, requireBookingOps, putBookingApprove);
router.put('/:id/reject', protect, requireBookingOps, putBookingReject);
router.put('/:id/confirm-payment', protect, requireBookingOps, confirmBookingPayment);
router.put('/:id/check-in', protect, requireBookingOps, patchBookingCheckIn);
router.put('/:id/check-out', protect, requireBookingOps, patchBookingCheckOut);
router.put('/:id/complete', protect, requireBookingOps, putBookingComplete);

export default router;
