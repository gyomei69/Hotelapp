// Removed manual dns.setServers as it conflicts with Node 20+ resolution on Windows sometimes
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

dotenv.config();

const app = express();

// ── Security Middleware ──────────────────────────────────────────────
app.use(helmet());           // HTTP security headers
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Global API rate limiter (100 req / 15min per IP)
app.use('/api', apiLimiter);

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel-mgmt';

mongoose.connect(MONGO_URI, {
  family: 4 // Force IPv4 to prevent mongoose from trying IPv6 first and failing
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

app.get('/', (req, res) => {
  res.send('Hotel Management API is running...');
});

// Setup Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
