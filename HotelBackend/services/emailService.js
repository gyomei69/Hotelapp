import nodemailer from 'nodemailer';

const buildTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * @param {string} to
 * @param {string} code
 */
export const sendPasswordResetCodeEmail = async (to, code) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = buildTransport();

  const text = `Your Aurora Grand Hotel password reset code is: ${code}\n\nIt expires in 15 minutes. If you did not request this, ignore this email.`;

  if (!transport || !from) {
    console.log(`[emailService] SMTP not configured. Password reset code for ${to}: ${code}`);
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject: 'Your password reset code',
    text,
  });
};
