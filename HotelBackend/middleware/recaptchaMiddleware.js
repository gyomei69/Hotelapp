// reCAPTCHA v3 Verification Middleware (Web-only, Optional)
// When a reCAPTCHA token is provided in the request body,
// this middleware verifies it with Google's API.
// If no token is provided (e.g., from mobile clients), it skips verification.

import axios from 'axios';

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const verifyRecaptcha = (scoreThreshold = 0.5) => {
  return async (req, res, next) => {
    const { recaptchaToken } = req.body;

    // If no reCAPTCHA secret is configured, skip verification
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      return next();
    }

    // If no token provided (mobile client), skip verification
    if (!recaptchaToken) {
      return next();
    }

    try {
      const response = await axios.post(
        RECAPTCHA_VERIFY_URL,
        null,
        {
          params: {
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: recaptchaToken,
          },
        }
      );

      const { success, score, action } = response.data;

      if (!success) {
        return res.status(403).json({
          message: 'reCAPTCHA verification failed. Please try again.',
        });
      }

      if (score < scoreThreshold) {
        console.warn(`[reCAPTCHA] Low score detected: ${score} for action: ${action}`);
        return res.status(403).json({
          message: 'Suspicious activity detected. Please try again later.',
        });
      }

      // Verification passed — attach score to request for logging
      req.recaptchaScore = score;
      next();
    } catch (error) {
      console.error('[reCAPTCHA] Verification error:', error.message);
      // Fail open — don't block users if Google API is unreachable
      next();
    }
  };
};
