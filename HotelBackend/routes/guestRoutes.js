import express from 'express';
import { getGuests, createGuest, updateGuest, deleteGuest } from '../controllers/guestController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getGuests)
  .post(protect, admin, createGuest);

router.route('/:id')
  .put(protect, admin, updateGuest)
  .delete(protect, admin, deleteGuest);

export default router;
