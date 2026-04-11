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
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login', loginLimiter, authUser);
router.post('/register', registerLimiter, registerUser);
router.post('/google-login', googleLogin);
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

router.post('/forgot-password', passwordResetLimiter, forgotPasswordRequest);
router.post('/verify-reset-code', passwordResetLimiter, verifyResetCode);
router.post('/reset-password', passwordResetLimiter, resetPasswordWithToken);

export default router;
