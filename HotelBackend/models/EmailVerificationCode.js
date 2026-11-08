import mongoose from 'mongoose';

const emailVerificationCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: {
      type: String,
      enum: ['password_reset', 'password_change'],
      required: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailVerificationCodeSchema.index({ email: 1, purpose: 1 }, { unique: true });

const EmailVerificationCode = mongoose.model('EmailVerificationCode', emailVerificationCodeSchema);
export default EmailVerificationCode;
