// Rate Limiting Middleware
// Protects authentication endpoints from brute-force attacks.

import rateLimit from 'express-rate-limit';

// ── Login Rate Limiter ───────────────────────────────────────────────
// Max 5 login attempts per IP every 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful logins
});

// ── Registration Rate Limiter ────────────────────────────────────────
// Max 3 registrations per IP every 60 minutes
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5,
  message: {
    message: 'Too many accounts created from this IP. Please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Password reset (forgot password) ─────────────────────────────────
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: 'Too many reset attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── General API Rate Limiter ─────────────────────────────────────────
// Max 100 requests per IP per 15 minutes for all API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
