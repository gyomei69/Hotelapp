import express from 'express';
import {
  createBooking,
  getMyBookings,
  cancelMyBooking,
  selectCashPayment,
  getCardCheckoutUrl,
} from '../controllers/bookingController.js';
import {
  renderCardPaymentPage,
  completeCardPayment,
  cancelCardPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/payment/card-complete', completeCardPayment);
router.get('/payment/card-cancel', cancelCardPayment);
router.get('/payment/card-page', renderCardPaymentPage);

// POST /api/bookings     → create a new booking (any authenticated user)
// GET  /api/bookings/my  → get current user's booking history
router.route('/').post(protect, createBooking);
router.route('/my').get(protect, getMyBookings);
router.post('/:id/payment/cash', protect, selectCashPayment);
router.get('/:id/payment/card-url', protect, getCardCheckoutUrl);
router.patch('/:id/cancel', protect, cancelMyBooking);

export default router;
