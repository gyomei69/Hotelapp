import { verifyRecaptchaWithGoogle } from '../services/recaptchaService.js';

/**
 * POST /api/verify-recaptcha
 * Body: { token } or { recaptchaToken }
 */
export const verifyRecaptcha = async (req, res) => {
  const raw = req.body?.token ?? req.body?.recaptchaToken;
  const token = typeof raw === 'string' ? raw.trim() : '';

  if (!token) {
    return res.status(400).json({ success: false });
  }

  try {
    const ok = await verifyRecaptchaWithGoogle(token);
    return res.json({ success: ok });
  } catch {
    return res.status(500).json({ success: false });
  }
};
