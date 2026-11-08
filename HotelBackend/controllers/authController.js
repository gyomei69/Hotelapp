import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetCodeEmail, sendSignupVerificationCodeEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityLogService.js';
import { ACTIVITY_ACTION } from '../constants/activityActions.js';
import { signInOrRegisterWithGoogleIdToken } from '../services/googleAuthUserService.js';
import {
  upsertSignupVerification,
  verifySignupVerification,
  SIGNUP_VERIFY_TTL_MS,
} from '../services/signupEmailVerificationService.js';

const generateToken = (id, expiresIn = '30d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// ── Input Validation Helpers ─────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const sanitize = (str) => (typeof str === 'string' ? str.trim() : '');

const normalizePhMobile = (input) => {
  const raw = sanitize(input);
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // 09xxxxxxxxx -> +639xxxxxxxxx
  if (digits.length === 11 && digits.startsWith('09')) return `+63${digits.slice(1)}`;
  // 9xxxxxxxxx -> +639xxxxxxxxx
  if (digits.length === 10 && digits.startsWith('9')) return `+63${digits}`;
  // 639xxxxxxxxx -> +639xxxxxxxxx
  if (digits.length === 12 && digits.startsWith('63') && digits[2] === '9') return `+${digits}`;
  // +63... path
  if (raw.startsWith('+') && digits.length === 12 && digits.startsWith('63') && digits[2] === '9') return `+${digits}`;
  return '';
};

const isValidPhMobileE164 = (e164) => typeof e164 === 'string' && /^\+639\d{9}$/.test(e164);

const profilePayload = (user, req) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  address: user.address || '',
  role: user.role,
  provider: user.provider,
});

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

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Block unverified local accounts
    if (user.provider === 'local' && user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Prevent local login for Google-only accounts
    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please use "Sign in with Google".',
      });
    }

    if (await user.matchPassword(password)) {
      await logActivity(
        user._id,
        user.role,
        ACTIVITY_ACTION.LOGIN,
        'Signed in with email and password',
        null
      );
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
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
  const phoneRaw = sanitize(req.body.phone || '');
  const phone = phoneRaw ? normalizePhMobile(phoneRaw) : '';
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
  if (phoneRaw && !isValidPhMobileE164(phone)) {
    return res.status(400).json({ message: 'Phone must be a PH mobile number in +63 format (e.g. +639XXXXXXXXX).' });
  }

  const allowedRoles = ['guest'];
  const safeRole = allowedRoles.includes(role) ? role : 'guest';

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const address = sanitize(req.body.address || '');

    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      role: safeRole,
      provider: 'local',
      isVerified: false,
    });

    if (user) {
      // Create / refresh verification code
      const code = await upsertSignupVerification(email);
      await sendSignupVerificationCodeEmail(email, code);

      await logActivity(
        user._id,
        user.role,
        ACTIVITY_ACTION.REGISTER,
        'Registered a new account',
        null
      );
      res.status(201).json({
        message: 'Verification code sent to email',
        email: user.email,
        expiresInSec: Math.floor(SIGNUP_VERIFY_TTL_MS / 1000),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('[Register Error]', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Verify email using 6-digit code; activates account and returns session
// @route   POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const code = sanitize(req.body.code);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }
    if (user.provider !== 'local') {
      return res.status(400).json({ message: 'This account does not require email verification.' });
    }
    if (user.isVerified === true) {
      // Already verified — treat as success
      return res.json({
        ...profilePayload(user, req),
        token: generateToken(user._id),
      });
    }

    const result = await verifySignupVerification(email, code);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    user.isVerified = true;
    await user.save();

    await logActivity(
      user._id,
      user.role,
      ACTIVITY_ACTION.VERIFY_EMAIL,
      'Verified email address',
      null
    );

    return res.json({
      ...profilePayload(user, req),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('[verifyEmail Error]', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Resend email verification code (local accounts only)
// @route   POST /api/auth/resend-verification
export const resendVerificationCode = async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Privacy: do not reveal existence
      return res.json({
        message: 'If an account exists, a code was sent to that email.',
        expiresInSec: Math.floor(SIGNUP_VERIFY_TTL_MS / 1000),
      });
    }
    if (user.provider !== 'local') {
      return res.status(400).json({ message: 'This account does not require email verification.' });
    }
    if (user.isVerified === true) {
      return res.json({ message: 'Email is already verified.' });
    }

    const code = await upsertSignupVerification(email);
    await sendSignupVerificationCodeEmail(email, code);

    return res.json({
      message: 'Verification code sent to email',
      expiresInSec: Math.floor(SIGNUP_VERIFY_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('[resendVerificationCode Error]', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Google Sign-In / Sign-Up (verify idToken, issue JWT)
// @route   POST /api/auth/google-login  (also POST /api/auth/google — legacy)
export const googleLogin = async (req, res) => {
  const raw = req.body?.idToken;
  const idToken = typeof raw === 'string' ? raw.trim() : '';

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  try {
    const out = await signInOrRegisterWithGoogleIdToken(idToken);
    res.json(out);
  } catch (error) {
    console.error('[Google Auth Error]', error.message);
    const status = error.status || 500;
    const msg = String(error.message || '');
    if (
      msg.includes('Token used too late') ||
      msg.includes('Invalid token') ||
      msg.includes('Wrong number of segments') ||
      msg.includes('audience')
    ) {
      return res.status(401).json({ message: 'Google token is invalid or expired. Please try again.' });
    }
    if (status >= 400 && status < 500) {
      return res.status(status).json({ message: msg || 'Request error' });
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
      res.json(profilePayload(user, req));
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
    const phoneRaw = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const phone = phoneRaw ? normalizePhMobile(phoneRaw) : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';

    if (!name || name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (req.body.email !== undefined) {
      const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
      if (!emailRaw || !isValidEmail(emailRaw)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      const nextEmail = emailRaw.toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
        if (taken) {
          return res.status(400).json({ message: 'That email is already in use' });
        }
        user.email = nextEmail;
      }
    }

    user.name = name;
    if (phoneRaw && !isValidPhMobileE164(phone)) {
      return res.status(400).json({ message: 'Phone must be a PH mobile number in +63 format (e.g. +639XXXXXXXXX).' });
    }
    user.phone = phone;
    user.address = address;

    const updatedUser = await user.save();

    res.json(profilePayload(updatedUser, req));
  } catch (error) {
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ── Forgot password (email + 6-digit code) ───────────────────────────

const RESET_CODE_TTL_MS = 5 * 60 * 1000;

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
