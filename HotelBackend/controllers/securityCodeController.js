import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
  upsertEmailCode,
  verifyEmailCodeRecord,
  PURPOSE,
  CODE_TTL_MS,
} from '../services/verificationCodeService.js';
import { sendSecurityCodeEmail } from '../services/emailService.js';

const sanitize = (str) => (typeof str === 'string' ? str.trim() : '');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const issueChangeToken = (email, purpose) =>
  jwt.sign(
    { email: email.toLowerCase(), purpose, kind: 'email-code-password' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

/** POST /api/send-code */
export const sendEmailCode = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  let purpose = sanitize(req.body.purpose || PURPOSE.PASSWORD_RESET);
  if (purpose === 'password_reset') purpose = PURPOSE.PASSWORD_RESET;
  if (purpose === 'password_change') purpose = PURPOSE.PASSWORD_CHANGE;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (purpose !== PURPOSE.PASSWORD_RESET && purpose !== PURPOSE.PASSWORD_CHANGE) {
    return res.status(400).json({ message: 'Invalid purpose' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      if (purpose === PURPOSE.PASSWORD_RESET) {
        return res.status(400).json({ message: 'Email not registered' });
      }
      // Keep generic for other purposes (privacy).
      return res.json({ message: 'If an account exists, a code was sent to that email.', expiresInSec: Math.floor(CODE_TTL_MS / 1000) });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'Password reset is not available for this account.' });
    }

    const code = await upsertEmailCode(email, purpose);
    await sendSecurityCodeEmail(email, code, purpose);

    return res.json({
      message: 'If an account exists, a code was sent to that email.',
      expiresInSec: Math.floor(CODE_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('[sendEmailCode]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/** POST /api/verify-code */
export const verifyEmailCode = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const code = sanitize(req.body.code);
  let purpose = sanitize(req.body.purpose || PURPOSE.PASSWORD_RESET);
  if (purpose === 'password_reset') purpose = PURPOSE.PASSWORD_RESET;
  if (purpose === 'password_change') purpose = PURPOSE.PASSWORD_CHANGE;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
  }
  if (purpose !== PURPOSE.PASSWORD_RESET && purpose !== PURPOSE.PASSWORD_CHANGE) {
    return res.status(400).json({ message: 'Invalid purpose' });
  }

  try {
    const result = await verifyEmailCodeRecord(email, purpose, code);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }
    const changeToken = issueChangeToken(email, purpose);
    return res.json({ changeToken });
  } catch (error) {
    console.error('[verifyEmailCode]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/** POST /api/change-password — after verify-code (changeToken); not the authenticated PUT route */
export const changePasswordWithEmailToken = async (req, res) => {
  const { changeToken, newPassword, confirmPassword } = req.body;

  if (!changeToken || typeof changeToken !== 'string') {
    return res.status(400).json({ message: 'Verification session is invalid. Start again.' });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'New password is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(changeToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Session expired. Request a new code.' });
    }

    if (
      decoded.kind !== 'email-code-password' ||
      !decoded.email ||
      (decoded.purpose !== PURPOSE.PASSWORD_CHANGE && decoded.purpose !== PURPOSE.PASSWORD_RESET)
    ) {
      return res.status(400).json({ message: 'Invalid session' });
    }

    const user = await User.findOne({ email: String(decoded.email).toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Unable to update password for this account.' });
    }

    user.password = newPassword;
    if (user.provider === 'google' && !user.googleId) {
      /* keep */
    }
    await user.save();

    return res.json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error('[changePasswordWithEmailToken]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/** POST /api/forgot-password — same as send-code with password_reset */
export const apiForgotPassword = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email is not registered' });
    }
    if (!user.password || user.provider !== 'local') {
      return res.status(400).json({ message: 'Password reset is not available for this account.' });
    }

    req.body = { ...req.body, purpose: PURPOSE.PASSWORD_RESET };
    return sendEmailCode(req, res);
  } catch (error) {
    console.error('[apiForgotPassword]', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/** POST /api/reset-password — email + code + new password (atomic) */
export const apiResetPassword = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const code = sanitize(req.body.code);
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'New password is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const result = await verifyEmailCodeRecord(email, PURPOSE.PASSWORD_RESET, code);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Unable to reset password for this account.' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error('[apiResetPassword]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
