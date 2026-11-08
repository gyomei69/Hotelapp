import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { logActivity } from './activityLogService.js';
import { ACTIVITY_ACTION } from '../constants/activityActions.js';

const generateToken = (id, expiresIn = '30d') =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

/** Web + Android client IDs accepted as JWT `aud` when verifying Google ID tokens. */
export const getGoogleJwtAudiences = () => {
  const web = process.env.GOOGLE_WEB_CLIENT_ID;
  const android = process.env.GOOGLE_ANDROID_CLIENT_ID;
  return [web, android].filter(Boolean);
};

/**
 * Verify Google ID token, create or link user, issue app JWT.
 * @returns {{ token: string, user: object }}
 */
export async function signInOrRegisterWithGoogleIdToken(idToken) {
  const audiences = getGoogleJwtAudiences();
  if (audiences.length === 0) {
    const err = new Error('Google Sign-In is not configured on the server');
    err.status = 500;
    throw err;
  }

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
    const err = new Error('Could not retrieve email from Google account');
    err.status = 400;
    throw err;
  }

  let user = await User.findOne({ email });
  let isNewGoogleUser = false;

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      if (!user.password) user.provider = 'google';
      // Google accounts are verified by Google (no code activation required)
      if (user.isVerified === false) user.isVerified = true;
      await user.save();
    }
  } else {
    isNewGoogleUser = true;
    user = await User.create({
      name,
      email,
      googleId,
      provider: 'google',
      role: 'guest',
      isVerified: true,
    });
  }

  const token = generateToken(user._id, '7d');

  await logActivity(
    user._id,
    user.role,
    isNewGoogleUser ? ACTIVITY_ACTION.REGISTER : ACTIVITY_ACTION.LOGIN,
    isNewGoogleUser ? 'Registered via Google' : 'Signed in with Google',
    null
  );

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      phone: user.phone || '',
      address: user.address || '',
    },
  };
}
