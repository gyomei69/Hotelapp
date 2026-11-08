import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import EmailVerificationCode from '../models/EmailVerificationCode.js';

export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;

export const PURPOSE = {
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
};

export async function upsertEmailCode(email, purpose) {
  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await EmailVerificationCode.findOneAndUpdate(
    { email, purpose },
    { email, purpose, codeHash, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  return code;
}

export async function verifyEmailCodeRecord(email, purpose, code) {
  const record = await EmailVerificationCode.findOne({ email, purpose });
  if (!record) {
    return { ok: false, message: 'Invalid or expired code' };
  }
  if (record.expiresAt < new Date()) {
    await EmailVerificationCode.deleteOne({ _id: record._id });
    return { ok: false, message: 'Invalid or expired code' };
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await EmailVerificationCode.deleteOne({ _id: record._id });
    return { ok: false, message: 'Invalid or expired code' };
  }

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { ok: false, message: 'Invalid or expired code' };
  }

  await EmailVerificationCode.deleteOne({ _id: record._id });
  return { ok: true };
}
