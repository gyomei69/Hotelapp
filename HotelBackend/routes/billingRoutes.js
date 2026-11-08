import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getBillingRecords } from '../controllers/billingController.js';

const router = express.Router();

router.get('/', protect, getBillingRecords);

export default router;

