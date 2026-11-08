const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const baseTemplate = ({ greeting, title, bodyHtml }) => {
  const safeGreeting = escapeHtml(greeting);
  const safeTitle = escapeHtml(title);
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f7; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; padding:24px; border:1px solid #eee;">
        <div style="font-size:18px; font-weight:700; color:#1B2036; margin-bottom:12px;">${safeTitle}</div>
        <div style="font-size:14px; color:#1B2036; margin-bottom:16px;">${safeGreeting}</div>
        <div style="font-size:14px; color:#1B2036; line-height:20px;">${bodyHtml}</div>
        <div style="margin-top:24px; font-size:12px; color:#64748B;">
          If you did not request this, you can safely ignore this email.
        </div>
      </div>
      <div style="max-width:560px; margin:10px auto 0; font-size:11px; color:#94a3b8; text-align:center;">
        Aurora Grand Hotel
      </div>
    </div>
  `;
};

const codeBlock = (code) => `
  <div style="margin:16px 0; text-align:center;">
    <div style="display:inline-block; padding:14px 18px; border-radius:12px; background:#F5F5F7; border:1px solid #E8E8E8; letter-spacing:2px; font-size:22px; font-weight:800; color:#1B2036;">
      ${escapeHtml(code)}
    </div>
  </div>
`;

export function verificationCodeEmail({ code, minutes = 5 }) {
  const subject = 'Your Verification Code';
  const html = baseTemplate({
    greeting: 'Hello,',
    title: 'Your Verification Code',
    bodyHtml: `
      <div>Use the code below to complete your request:</div>
      ${codeBlock(code)}
      <div style="color:#64748B; font-size:13px;">This code expires in <b>${escapeHtml(minutes)}</b> minutes.</div>
    `,
  });
  const text = `Your verification code is: ${code}. It expires in ${minutes} minutes.`;
  return { subject, html, text };
}

export function passwordResetCodeEmail({ code, minutes = 5 }) {
  const subject = 'Your Password Reset Code';
  const html = baseTemplate({
    greeting: 'Hello,',
    title: 'Password Reset Code',
    bodyHtml: `
      <div>Use the code below to reset your password:</div>
      ${codeBlock(code)}
      <div style="color:#64748B; font-size:13px;">This code expires in <b>${escapeHtml(minutes)}</b> minutes.</div>
    `,
  });
  const text = `Your password reset code is: ${code}. It expires in ${minutes} minutes.`;
  return { subject, html, text };
}

export function passwordChangeCodeEmail({ code, minutes = 5 }) {
  const subject = 'Your Password Change Code';
  const html = baseTemplate({
    greeting: 'Hello,',
    title: 'Password Change Code',
    bodyHtml: `
      <div>Use the code below to change your password:</div>
      ${codeBlock(code)}
      <div style="color:#64748B; font-size:13px;">This code expires in <b>${escapeHtml(minutes)}</b> minutes.</div>
    `,
  });
  const text = `Your password change code is: ${code}. It expires in ${minutes} minutes.`;
  return { subject, html, text };
}

export function bookingStatusEmail({
  name = '',
  status = '',
  bookingId = '',
  roomLabel = '',
  checkIn = '',
  checkOut = '',
}) {
  const safeStatus = escapeHtml(status);
  const subject = `Booking update: ${safeStatus}`;
  const html = baseTemplate({
    greeting: name ? `Hello ${name},` : 'Hello,',
    title: 'Booking Status Update',
    bodyHtml: `
      <div>Your booking status has been updated to:</div>
      <div style="margin:14px 0; font-size:18px; font-weight:800; color:#1B2036;">${safeStatus}</div>
      <div style="color:#64748B; font-size:13px; margin-top:10px;">
        <div><b>Booking ID:</b> ${escapeHtml(bookingId || '—')}</div>
        <div><b>Room:</b> ${escapeHtml(roomLabel || '—')}</div>
        <div><b>Check-in:</b> ${escapeHtml(checkIn || '—')}</div>
        <div><b>Check-out:</b> ${escapeHtml(checkOut || '—')}</div>
      </div>
    `,
  });
  const text = `Booking update: ${status}
Booking ID: ${bookingId || '—'}
Room: ${roomLabel || '—'}
Check-in: ${checkIn || '—'}
Check-out: ${checkOut || '—'}`;
  return { subject, html, text };
}

