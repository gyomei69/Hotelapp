import jwt from 'jsonwebtoken';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';

function effectivePaymentStatus(booking) {
  if (booking.paymentStatus) return booking.paymentStatus;
  if (booking.status === 'Approved') return 'Awaiting Payment';
  if (booking.status === 'Pending') return 'Unpaid';
  if (booking.status === 'Confirmed' || booking.status === 'Completed') return 'Paid';
  return 'Unpaid';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @desc    Mock card checkout page (opened in device browser)
 * @route   GET /api/bookings/payment/card-page?token=
 * @access  Public (JWT in query, short-lived)
 */
export const renderCardPaymentPage = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).send('Missing payment token.');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(400)
        .send('Invalid or expired payment link. Return to the app and open Pay by Card again.');
    }
    if (decoded.purpose !== 'card-checkout') {
      return res.status(400).send('Invalid payment link.');
    }

    const booking = await Booking.findById(decoded.bookingId).populate('room', 'type roomNumber');
    if (!booking) {
      return res.status(404).send('Booking not found.');
    }
    if (booking.user.toString() !== decoded.userId) {
      return res.status(403).send('This payment link does not match your account.');
    }
    if (booking.status !== 'Approved') {
      return res.status(400).send('This booking is no longer awaiting card payment.');
    }
    const ps = effectivePaymentStatus(booking);
    if (!['Awaiting Payment', 'Failed'].includes(ps)) {
      return res.status(400).send('Card payment is not available for this booking.');
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const completeUrl = `${host}/api/bookings/payment/card-complete`;
    const cancelUrl = `${host}/api/bookings/payment/card-cancel?token=${encodeURIComponent(token)}`;
    const safeToken = escapeHtml(token);
    const shortId = escapeHtml(String(booking._id).slice(-6));
    const amountStr = escapeHtml(booking.totalAmount.toLocaleString('en-PH'));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Card Payment - Aurora Grand Hotel</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:420px;margin:0 auto;background:#f5f5f7;">
  <h1 style="font-size:22px;color:#1B2036;">Aurora Grand Hotel</h1>
  <p style="color:#64748b;">Card checkout for booking #${shortId}</p>
  <p style="font-size:18px;color:#1B2036;"><strong>Amount: \u20b1${amountStr}</strong></p>
  <form method="POST" action="${completeUrl}" style="margin-top:24px;">
    <input type="hidden" name="token" value="${safeToken}"/>
    <button type="submit" style="width:100%;padding:14px;font-size:16px;background:#1B2036;color:#fff;border:none;border-radius:12px;font-weight:600;cursor:pointer;">Complete payment</button>
  </form>
  <p style="margin-top:20px;"><a href="${cancelUrl}" style="color:#EF4444;font-weight:600;">Cancel / payment failed</a></p>
  <p style="margin-top:32px;font-size:13px;color:#94a3b8;">After paying, return to the app and open My Bookings to refresh.</p>
</body>
</html>`);
  } catch (error) {
    console.error('[renderCardPaymentPage]', error);
    res.status(500).send('Unable to load payment page.');
  }
};

/**
 * @desc    Complete mock card payment
 * @route   POST /api/bookings/payment/card-complete
 * @access  Public (body token)
 */
export const completeCardPayment = async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).send('Missing token.');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).send('Invalid or expired token.');
    }
    if (decoded.purpose !== 'card-checkout') {
      return res.status(400).send('Invalid token.');
    }

    const booking = await Booking.findById(decoded.bookingId);
    if (!booking) {
      return res.status(404).send('Booking not found.');
    }
    if (booking.user.toString() !== decoded.userId) {
      return res.status(403).send('Unauthorized.');
    }
    if (booking.paymentStatus === 'Paid') {
      return res.status(400).send('Payment already recorded.');
    }
    const ps = effectivePaymentStatus(booking);
    if (booking.status !== 'Approved' || !['Awaiting Payment', 'Failed'].includes(ps)) {
      return res.status(400).send('This booking cannot be completed by card right now.');
    }

    booking.paymentMethod = 'Card';
    booking.paymentStatus = 'Paid';
    booking.status = 'Completed';
    booking.paidAt = new Date();
    await booking.save();

    if (booking.guest) {
      const guestDoc = await Guest.findById(booking.guest);
      if (guestDoc) {
        guestDoc.totalSpent = (guestDoc.totalSpent || 0) + (Number(booking.totalAmount) || 0);
        await guestDoc.save();
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui;padding:32px;text-align:center;background:#f0fdf4;">
  <h1 style="color:#166534;">Payment successful</h1>
  <p style="color:#334155;">You can close this page and return to the app.</p>
</body>
</html>`);
  } catch (error) {
    console.error('[completeCardPayment]', error);
    res.status(500).send('Payment could not be completed.');
  }
};

/**
 * @desc    Mark card attempt as failed (user cancelled mock checkout)
 * @route   GET /api/bookings/payment/card-cancel?token=
 * @access  Public
 */
export const cancelCardPayment = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).send('Missing token.');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).send('Invalid or expired link.');
    }
    if (decoded.purpose !== 'card-checkout') {
      return res.status(400).send('Invalid link.');
    }

    const booking = await Booking.findById(decoded.bookingId);
    if (!booking || booking.user.toString() !== decoded.userId) {
      return res.status(403).send('Unauthorized.');
    }
    const ps = effectivePaymentStatus(booking);
    if (booking.status === 'Approved' && ['Awaiting Payment', 'Failed'].includes(ps)) {
      booking.paymentStatus = 'Failed';
      await booking.save();
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui;padding:32px;text-align:center;">
  <h1 style="color:#b91c1c;">Payment not completed</h1>
  <p style="color:#334155;">Return to the app and try Pay by Card again or choose Cash.</p>
</body>
</html>`);
  } catch (error) {
    console.error('[cancelCardPayment]', error);
    res.status(500).send('Something went wrong.');
  }
};
