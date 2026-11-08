import express from 'express';
import { getUsers, deleteUser, updateUserRole } from '../controllers/userController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import { updateUserProfile, getUserProfile } from '../controllers/authController.js';

const router = express.Router();

// Self-service profile (all roles) — alias to /api/auth/profile for compatibility
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

router.route('/').get(protect, requireAdmin, getUsers);

router.patch('/:id/role', protect, requireAdmin, updateUserRole);
router.put('/:id/role', protect, requireAdmin, updateUserRole);

router.route('/:id').delete(protect, requireAdmin, deleteUser);

export default router;
