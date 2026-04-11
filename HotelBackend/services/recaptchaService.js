import axios from 'axios';

const SITE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verifies a reCAPTCHA token with Google (secret stays server-side only).
 * @param {string} token - User response token from the widget
 * @returns {Promise<boolean>}
 */
const INTEGRATION_TEST_TOKEN = '__INTEGRATION_TEST_RECAPTCHA__';

export async function verifyRecaptchaWithGoogle(token) {
  if (
    process.env.RECAPTCHA_TEST_BYPASS === '1' &&
    token === INTEGRATION_TEST_TOKEN
  ) {
    return true;
  }

  if (process.env.RECAPTCHA_DEV_BYPASS === '1') {
    console.warn('[reCAPTCHA] RECAPTCHA_DEV_BYPASS=1 — verification skipped (never use in production)');
    return true;
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('[reCAPTCHA] RECAPTCHA_SECRET_KEY is not configured');
    return false;
  }
  if (!token || typeof token !== 'string' || token.length > 4000) {
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', token.trim());

    const { data } = await axios.post(SITE_VERIFY_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      validateStatus: (s) => s === 200,
    });

    if (data?.success === true) {
      return true;
    }
    const codes = data?.['error-codes'];
    console.error('[reCAPTCHA] Google siteverify rejected token:', Array.isArray(codes) ? codes.join(', ') : codes || 'unknown');
    return false;
  } catch (err) {
    console.error('[reCAPTCHA] Verification request failed:', err.message);
    return false;
  }
}
