import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetCodeEmail } from '../services/emailService.js';
import { verifyRecaptchaWithGoogle } from '../services/recaptchaService.js';

const generateToken = (id, expiresIn = '30d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// ── Input Validation Helpers ─────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const sanitize = (str) => (typeof str === 'string' ? str.trim() : '');

/** reCAPTCHA must pass before local auth; does not log secrets. */
const ensureRecaptchaOk = async (req, res) => {
  const raw = req.body.recaptchaToken;
  const token = typeof raw === 'string' ? raw.trim() : '';
  if (!token) {
    res.status(400).json({ message: 'Security verification required' });
    return false;
  }
  const ok = await verifyRecaptchaWithGoogle(token);
  if (!ok) {
    res.status(403).json({
      message:
        'Security verification failed. Check server logs for [reCAPTCHA]. Ensure RECAPTCHA_SECRET_KEY matches your site key, or set RECAPTCHA_DEV_BYPASS=1 locally only.',
    });
    return false;
  }
  return true;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const authUser = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  if (!(await ensureRecaptchaOk(req, res))) {
    return;
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Prevent local login for Google-only accounts
    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please use "Sign in with Google".',
      });
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('[Login Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email).toLowerCase();
  const password = req.body.password;
  const phone = sanitize(req.body.phone || '');
  let role = req.body.role || 'guest';
  if (role === 'user') role = 'guest';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (name.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  if (!(await ensureRecaptchaOk(req, res))) {
    return;
  }

  const allowedRoles = ['guest'];
  const safeRole = allowedRoles.includes(role) ? role : 'guest';

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: safeRole,
      provider: 'local',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('[Register Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/**
 * Build allowed OAuth client IDs for ID token `aud` validation.
 * Web and Android (APK/Play) tokens use different client IDs — accept both.
 */
const getGoogleJwtAudiences = () => {
  const web = process.env.GOOGLE_WEB_CLIENT_ID;
  const android = process.env.GOOGLE_ANDROID_CLIENT_ID;
  const list = [web, android].filter(Boolean);
  return list;
};

// @desc    Google Sign-In / Sign-Up (verify idToken, issue JWT)
// @route   POST /api/auth/google-login  (also POST /api/auth/google — legacy)
export const googleLogin = async (req, res) => {
  const raw = req.body?.idToken;
  const idToken = typeof raw === 'string' ? raw.trim() : '';

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  const audiences = getGoogleJwtAudiences();
  if (audiences.length === 0) {
    return res.status(500).json({ message: 'Google Sign-In is not configured on the server' });
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email ? String(payload.email).toLowerCase() : null;
    const name = payload.name || (email ? email.split('@')[0] : 'User');

    if (!email) {
      return res.status(400).json({ message: 'Could not retrieve email from Google account' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.password) user.provider = 'google';
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        provider: 'google',
        role: 'guest',
      });
    }

    const token = generateToken(user._id, '7d');

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error('[Google Auth Error]', error.message);
    const msg = String(error.message || '');
    if (
      msg.includes('Token used too late') ||
      msg.includes('Invalid token') ||
      msg.includes('Wrong number of segments') ||
      msg.includes('audience')
    ) {
      return res.status(401).json({ message: 'Google token is invalid or expired. Please try again.' });
    }
    res.status(500).json({ message: 'Google authentication failed. Please try again.' });
  }
};


// @desc    Get user profile
// @route   GET /api/auth/profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

    if (!name || name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    user.name = name;
    user.phone = phone;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      provider: updatedUser.provider,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ── Forgot password (email + 6-digit code) ───────────────────────────

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

// @desc    Request 6-digit reset code emailed to user
// @route   POST /api/auth/forgot-password
export const forgotPasswordRequest = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.json({
        message: 'If an account exists, a code was sent to that email.',
      });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    await PasswordReset.findOneAndUpdate(
      { email },
      { email, codeHash, expiresAt },
      { upsert: true, new: true }
    );

    await sendPasswordResetCodeEmail(email, code);

    return res.json({
      message: 'If an account exists, a code was sent to that email.',
    });
  } catch (error) {
    console.error('[forgotPasswordRequest Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Verify 6-digit code; returns short-lived resetToken
// @route   POST /api/auth/verify-reset-code
export const verifyResetCode = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const code = sanitize(req.body.code);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
  }

  try {
    const record = await PasswordReset.findOne({ email });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' });
    }

    const match = await bcrypt.compare(code, record.codeHash);
    if (!match) {
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' });
    }

    await PasswordReset.deleteOne({ _id: record._id });

    const resetToken = jwt.sign(
      { purpose: 'password-reset', email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ resetToken });
  } catch (error) {
    console.error('[verifyResetCode Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Set new password using resetToken from verify step
// @route   POST /api/auth/reset-password
export const resetPasswordWithToken = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken) {
    return res.status(400).json({ message: 'Reset session is invalid. Start again.' });
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
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        message: 'Reset link expired or invalid. Please start again.',
      });
    }

    if (decoded.purpose !== 'password-reset' || !decoded.email) {
      return res.status(400).json({ message: 'Reset session is invalid. Start again.' });
    }

    const user = await User.findOne({ email: decoded.email.toLowerCase() });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Unable to reset password for this account.' });
    }

    user.password = newPassword;
    await user.save();
    await PasswordReset.deleteMany({ email: user.email });

    return res.json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error('[resetPasswordWithToken Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Change password (authenticated; verifies current password)
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({ message: 'Current password is required' });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'New password is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
      return res.status(400).json({
        message: 'Password change is not available for this account.',
      });
    }
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[changePassword Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
