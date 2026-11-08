import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import EmailVerification from '../models/EmailVerification.js';

export const SIGNUP_VERIFY_TTL_MS = 5 * 60 * 1000;
export const SIGNUP_MAX_ATTEMPTS = 5;

export async function upsertSignupVerification(email) {
  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + SIGNUP_VERIFY_TTL_MS);

  await EmailVerification.findOneAndUpdate(
    { email },
    { email, codeHash, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  return code;
}

export async function verifySignupVerification(email, code) {
  const record = await EmailVerification.findOne({ email });
  if (!record) return { ok: false, message: 'Invalid or expired code' };

  if (record.expiresAt < new Date()) {
    await EmailVerification.deleteOne({ _id: record._id });
    return { ok: false, message: 'Invalid or expired code' };
  }

  if (record.attempts >= SIGNUP_MAX_ATTEMPTS) {
    await EmailVerification.deleteOne({ _id: record._id });
    return { ok: false, message: 'Invalid or expired code' };
  }

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { ok: false, message: 'Invalid or expired code' };
  }

  await EmailVerification.deleteOne({ _id: record._id });
  return { ok: true };
}

