import express from 'express';
import { getUsers, deleteUser, updateUserRole } from '../controllers/userController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, requireAdmin, getUsers);

router.patch('/:id/role', protect, requireAdmin, updateUserRole);

router.route('/:id').delete(protect, requireAdmin, deleteUser);

export default router;
