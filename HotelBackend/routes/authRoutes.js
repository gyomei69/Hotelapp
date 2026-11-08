import express from 'express';
import {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  googleLogin,
  forgotPasswordRequest,
  verifyResetCode,
  resetPasswordWithToken,
  changePassword,
  verifyEmail,
  resendVerificationCode,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimitMiddleware.js';
import { sendEmailCode, verifyEmailCode, apiForgotPassword, apiResetPassword } from '../controllers/securityCodeController.js';
import {
  googleExpoRelayStart,
  googleExpoRelayCallback,
  googleExpoRelayComplete,
} from '../controllers/googleExpoRelayController.js';

const router = express.Router();

router.post('/login', loginLimiter, authUser);
router.post('/register', registerLimiter, registerUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', passwordResetLimiter, resendVerificationCode);
router.get('/google/expo/start', googleExpoRelayStart);
router.get('/google/expo/callback', googleExpoRelayCallback);
router.post('/google/expo/complete', googleExpoRelayComplete);
router.post('/google-login', googleLogin);
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

// Email code flows (forgot password + optional code verification)
router.post('/send-code', passwordResetLimiter, sendEmailCode);
router.post('/verify-code', passwordResetLimiter, verifyEmailCode);
router.post('/forgot-password-code', passwordResetLimiter, apiForgotPassword);
router.post('/reset-password-code', passwordResetLimiter, apiResetPassword);

router.post('/forgot-password', passwordResetLimiter, forgotPasswordRequest);
router.post('/verify-reset-code', passwordResetLimiter, verifyResetCode);
router.post('/reset-password', passwordResetLimiter, resetPasswordWithToken);

export default router;
