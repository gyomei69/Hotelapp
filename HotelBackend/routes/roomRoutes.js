import express from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/roomController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getRooms)
  .post(protect, requireAdmin, createRoom);

router.route('/:id')
  .put(protect, requireAdmin, updateRoom)
  .delete(protect, requireAdmin, deleteRoom);

export default router;
