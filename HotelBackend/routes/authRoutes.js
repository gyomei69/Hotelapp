import express from 'express';
import { authUser, registerUser, getUserProfile, googleAuth } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login', loginLimiter, authUser);
router.post('/register', registerLimiter, registerUser);
router.post('/google', googleAuth);
router.get('/profile', protect, getUserProfile);

export default router;
