import express from 'express';
import { listActivityLogs } from '../controllers/activityLogController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin only — staff should not have access to activity logs.
router.get('/', protect, requireAdmin, listActivityLogs);

export default router;
