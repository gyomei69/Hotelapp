import nodemailer from 'nodemailer';

const buildTransport = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const getFrom = () =>
  (process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();

const shouldLogOnly = () => {
  const v = String(process.env.EMAIL_LOG_ONLY || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

/**
 * Reusable email sender.
 * Falls back to console logging when SMTP isn't configured (dev).
 */
export async function sendEmail(to, subject, htmlContent, { textContent } = {}) {
  const safeTo = typeof to === 'string' ? to.trim() : '';
  const safeSubject = typeof subject === 'string' ? subject.trim() : '';
  const from = getFrom();
  const transport = buildTransport();

  const html = typeof htmlContent === 'string' ? htmlContent : '';
  const text = typeof textContent === 'string' ? textContent : '';

  if (!transport || !from) {
    const payload = {
      to: safeTo,
      subject: safeSubject,
      text: text ? text.slice(0, 500) : undefined,
    };
    if (shouldLogOnly()) {
      console.log('[mailer] EMAIL_LOG_ONLY=1 — would send:', payload);
      return;
    }
    const err = new Error(
      'Email delivery is not configured on the server (missing SMTP_FROM + SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS).'
    );
    err.details = payload;
    throw err;
  }

  await transport.sendMail({
    from,
    to: safeTo,
    subject: safeSubject,
    html,
    ...(text ? { text } : {}),
  });
}

