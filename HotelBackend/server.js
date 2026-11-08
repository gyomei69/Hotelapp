// Removed manual dns.setServers as it conflicts with Node 20+ resolution on Windows sometimes
import express from 'express';
import path from 'path';
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
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import { apiLimiter, passwordResetLimiter } from './middleware/rateLimitMiddleware.js';
import { protect } from './middleware/authMiddleware.js';
import { changePassword } from './controllers/authController.js';
import { verifyResetCode, resetPasswordWithToken } from './controllers/authController.js';
import {
  sendEmailCode,
  verifyEmailCode,
  changePasswordWithEmailToken,
  apiForgotPassword,
  apiResetPassword,
} from './controllers/securityCodeController.js';

dotenv.config();

const app = express();

// ── Security Middleware ──────────────────────────────────────────────
// CSP disabled so HTML card-checkout pages can use inline styles in the browser.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
// Behind ngrok / reverse proxies, express-rate-limit expects trust proxy enabled
// so it can safely read X-Forwarded-For for client IPs.
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel-mgmt';
const HOST = process.env.HOST || '0.0.0.0';

// Lightweight health check (before rate limit) — for LAN / Expo debugging
app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: true,
    mongo: dbOk ? 'connected' : 'disconnected',
  });
});

// Global API rate limiter (100 req / 15min per IP)
app.use('/api', apiLimiter);

app.post('/api/send-code', passwordResetLimiter, sendEmailCode);
app.post('/api/verify-code', passwordResetLimiter, verifyEmailCode);
app.post('/api/change-password', passwordResetLimiter, changePasswordWithEmailToken);
// Authenticated password change (no email-code flow) — alias for mobile settings UX.
app.put('/api/change-password', protect, changePassword);
app.post('/api/forgot-password', passwordResetLimiter, apiForgotPassword);
// OTP verify alias (requested route name): returns { resetToken } from authController
app.post('/api/verify-otp', passwordResetLimiter, verifyResetCode);
// Reset alias: support either { resetToken, newPassword, confirmPassword } OR atomic { email, code, newPassword, confirmPassword }.
app.post('/api/reset-password', passwordResetLimiter, (req, res, next) => {
  if (req?.body?.resetToken) {
    return resetPasswordWithToken(req, res, next);
  }
  return apiResetPassword(req, res, next);
});

mongoose
  .connect(MONGO_URI, {
    family: 4, // Force IPv4 to prevent mongoose from trying IPv6 first and failing
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('⚠️  Start MongoDB or set MONGO_URI — API routes need the database.');
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/billing', billingRoutes);
console.log('[routes] GET/PUT /api/notifications registered');

app.use('/api/admin', adminRoutes);

const httpServer = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on http://${HOST}:${PORT} (open http://YOUR_PC_IP:${PORT}/api/health from your phone’s network)`);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use — another process (often a previous \`node server.js\`) is still bound to it.`);
    console.error('   Stop that terminal or free the port, then start again.');
    console.error('   Use another port:  PowerShell:  $env:PORT=5001; npm run start');
    console.error('   See what owns the port:  netstat -ano | findstr :' + PORT);
    console.error('   End the process:         taskkill /PID <pid> /F\n');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
