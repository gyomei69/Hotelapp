import express from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/roomController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getRooms)
  .post(protect, admin, createRoom);

router.route('/:id')
  .put(protect, admin, updateRoom)
  .delete(protect, admin, deleteRoom);

export default router;
