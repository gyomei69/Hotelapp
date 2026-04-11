import express from 'express';
import { getGuests, createGuest, updateGuest, deleteGuest } from '../controllers/guestController.js';
import { protect, requireAdmin, requireStaffAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, requireStaffAccess, getGuests)
  .post(protect, requireAdmin, createGuest);

router.route('/:id')
  .put(protect, requireAdmin, updateGuest)
  .delete(protect, requireAdmin, deleteGuest);

export default router;
