import { sendEmail } from './mailer.js';
import {
  passwordResetCodeEmail,
  passwordChangeCodeEmail,
  verificationCodeEmail,
  bookingStatusEmail,
} from './emailTemplates.js';

/**
 * @param {string} to
 * @param {string} code
 */
export const sendPasswordResetCodeEmail = async (to, code) => {
  const { subject, html, text } = passwordResetCodeEmail({ code, minutes: 5 });
  await sendEmail(to, subject, html, { textContent: text });
};

/**
 * @param {string} to
 * @param {string} code
 * @param {'password_reset'|'password_change'} purpose
 */
export const sendSecurityCodeEmail = async (to, code, purpose) => {
  const tpl =
    purpose === 'password_change'
      ? passwordChangeCodeEmail({ code, minutes: 5 })
      : passwordResetCodeEmail({ code, minutes: 5 });
  await sendEmail(to, tpl.subject, tpl.html, { textContent: tpl.text });
};

/**
 * @param {string} to
 * @param {string} code
 */
export const sendSignupVerificationCodeEmail = async (to, code) => {
  const tpl = verificationCodeEmail({ code, minutes: 5 });
  await sendEmail(to, tpl.subject, tpl.html, { textContent: tpl.text });
};

/**
 * @param {string} to
 * @param {{name?: string, status: string, bookingId?: string, roomLabel?: string, checkIn?: string, checkOut?: string}} payload
 */
export const sendBookingStatusEmail = async (to, payload) => {
  const tpl = bookingStatusEmail(payload || {});
  await sendEmail(to, tpl.subject, tpl.html, { textContent: tpl.text });
};
