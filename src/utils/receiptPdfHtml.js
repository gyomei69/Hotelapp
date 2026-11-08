function escapeHtml(s) {
  const str = s == null ? '' : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReceiptHtml(payload) {
  const hotel = escapeHtml(payload.hotelName || 'Aurora Grand Hotel');
  const guestName = escapeHtml(payload.guestName || 'Guest');
  const email = escapeHtml(payload.email || '');
  const roomType = escapeHtml(payload.roomType || '—');
  const roomNo = escapeHtml(payload.roomNo || '');
  const checkIn = escapeHtml(payload.checkInLabel || '—');
  const checkOut = escapeHtml(payload.checkOutLabel || '—');
  const nights = Number(payload.nights || 0);
  const pricePerNight = Number(payload.pricePerNight || 0);
  const totalAmount = Number(payload.totalAmount || 0);
  const paymentMethod = escapeHtml(payload.paymentMethod || '—');
  const issued = escapeHtml(payload.issuedLabel || new Date().toLocaleString());

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<title>Receipt</title>' +
    '<style>' +
    'body{font-family:system-ui,sans-serif;color:#0f172a;padding:28px;}' +
    'h1{font-size:22px;margin:0;text-align:center;}' +
    '.sub{font-size:12px;color:#64748b;text-align:center;margin-top:6px;margin-bottom:18px;font-weight:700;}' +
    '.card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;}' +
    '.sec{padding:12px 0;border-top:1px solid #f1f5f9;}' +
    '.sec:first-child{border-top:none;padding-top:0;}' +
    '.label{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:800;color:#0f172a;}' +
    '.val{font-size:14px;font-weight:700;margin-top:6px;}' +
    '.muted{font-size:12px;color:#64748b;margin-top:6px;font-weight:600;}' +
    '.row{display:flex;justify-content:space-between;gap:12px;margin-top:10px;}' +
    '.divider{height:1px;background:#e2e8f0;margin-top:12px;}' +
    '.total{font-size:16px;font-weight:900;}' +
    '.paid{color:#10b981;font-weight:800;}' +
    '</style></head><body>' +
    '<h1>' +
    hotel +
    '</h1>' +
    '<div class="sub">Official Receipt</div>' +
    '<div class="card">' +
    '<div class="sec">' +
    '<div class="label">Guest</div>' +
    '<div class="val">' +
    guestName +
    '</div>' +
    (email ? '<div class="muted">' + email + '</div>' : '') +
    '</div>' +
    '<div class="sec">' +
    '<div class="label">Stay</div>' +
    '<div class="val">' +
    roomType +
    (roomNo ? ' • Room ' + roomNo : '') +
    '</div>' +
    '<div class="muted">Check-in: ' +
    checkIn +
    '</div>' +
    '<div class="muted">Check-out: ' +
    checkOut +
    '</div>' +
    '</div>' +
    '<div class="sec">' +
    '<div class="row"><div class="muted">Total nights</div><div class="val">' +
    String(nights) +
    '</div></div>' +
    '<div class="row"><div class="muted">Price / night</div><div class="val">\u20b1' +
    pricePerNight.toLocaleString() +
    '</div></div>' +
    '<div class="divider"></div>' +
    '<div class="row"><div class="label">Total Amount</div><div class="total">\u20b1' +
    totalAmount.toLocaleString() +
    '</div></div>' +
    '</div>' +
    '<div class="sec">' +
    '<div class="row"><div class="muted">Payment method</div><div class="val">' +
    paymentMethod +
    '</div></div>' +
    '<div class="row"><div class="muted">Payment status</div><div class="paid">PAID</div></div>' +
    '<div class="row"><div class="muted">Date issued</div><div class="val">' +
    issued +
    '</div></div>' +
    '</div>' +
    '</div>' +
    '</body></html>'
  );
}

