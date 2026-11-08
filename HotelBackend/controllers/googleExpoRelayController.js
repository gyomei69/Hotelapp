import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { signInOrRegisterWithGoogleIdToken } from '../services/googleAuthUserService.js';

const TTL_MS = 10 * 60 * 1000;
const pendingByState = new Map(); // state -> { returnUrl, created }
const xferToPayload = new Map(); // xfer -> { token, user, created }

function pruneMaps() {
  const now = Date.now();
  for (const [k, v] of pendingByState) {
    if (now - v.created > TTL_MS) pendingByState.delete(k);
  }
  for (const [k, v] of xferToPayload) {
    if (now - v.created > TTL_MS) xferToPayload.delete(k);
  }
}

/** Only allow deep links back into Expo / this app (open redirect prevention). */
export function isAllowedExpoGoogleReturnUrl(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  try {
    const u = new URL(url);
    const proto = u.protocol.toLowerCase();
    if (proto === 'exp:' || proto === 'expo:') return true;
    if (proto === 'appdev:') return true;
    if (proto === 'com.auroragrand.hotelapp:') return true;
    if (proto === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

function getPublicBase() {
  const raw = (process.env.GOOGLE_OAUTH_PUBLIC_BASE || '').trim().replace(/\/+$/, '');
  return raw || null;
}

function isNgrokPlaceholderHost(hostname) {
  const h = String(hostname).toLowerCase();
  return h === 'abcd-1234.ngrok-free.app' || h === 'your-subdomain.ngrok-free.app';
}

/** Google Cloud Web OAuth clients reject private IPs and many non-HTTPS origins for redirect URIs. */
function oauthPublicBaseGooglePolicyError(base) {
  if (!base) return 'GOOGLE_OAUTH_PUBLIC_BASE is not set.';
  try {
    const u = new URL(base);
    if (isNgrokPlaceholderHost(u.hostname)) {
      return 'GOOGLE_OAUTH_PUBLIC_BASE looks like a documentation example, not your real ngrok host. Run "ngrok http 5000" and paste the https Forwarding origin here.';
    }
    const { protocol, hostname } = u;
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIpv4) {
      const p = hostname.split('.').map((x) => parseInt(x, 10));
      const [a, b] = p;
      const privateIpv4 =
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a === 127 ||
        (a === 169 && b === 254);
      if (privateIpv4) {
        return 'GOOGLE_OAUTH_PUBLIC_BASE uses a private LAN IP — Google does not allow that for Web OAuth redirect URIs.';
      }
    }
    if (protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'GOOGLE_OAUTH_PUBLIC_BASE uses http:// on a non-localhost host — use https:// (e.g. ngrok) for Google Web OAuth redirects.';
    }
    if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'GOOGLE_OAUTH_PUBLIC_BASE must use https:// (e.g. ngrok) so Google Cloud accepts the redirect URI.';
    }
  } catch {
    return 'GOOGLE_OAUTH_PUBLIC_BASE is not a valid URL.';
  }
  return null;
}

function getGoogleWebRedirectUri() {
  const base = getPublicBase();
  if (!base) return null;
  return `${base}/api/auth/google/expo/callback`;
}

/**
 * GET /api/auth/google/expo/start?returnUrl=...
 * Redirects to Google; after consent Google hits our /callback, then we redirect to returnUrl?xfer=...
 */
export const googleExpoRelayStart = (req, res) => {
  pruneMaps();

  const returnUrl = String(req.query.returnUrl || '').trim();
  if (!isAllowedExpoGoogleReturnUrl(returnUrl)) {
    return res.status(400).send('Invalid or disallowed returnUrl (use Expo Go / dev deep link only).');
  }

  const base = getPublicBase();
  if (!base) {
    return res
      .status(500)
      .type('text')
      .send(
        'Set GOOGLE_OAUTH_PUBLIC_BASE to a public https:// origin (e.g. your ngrok URL, no /api path).\nGoogle Cloud rejects http://192.168.x.x/... as Authorized redirect URIs for Web clients.'
      );
  }
  const policyErr = oauthPublicBaseGooglePolicyError(base);
  if (policyErr) {
    return res.status(503).type('text').send(
      `${policyErr}\n\nFix: run "ngrok http 5000", set GOOGLE_OAUTH_PUBLIC_BASE to the printed https://… origin, add exactly "${base}/api/auth/google/expo/callback" under Google Cloud → Credentials → Web client → Authorized redirect URIs, restart the API.`
    );
  }

  const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .send('Set GOOGLE_WEB_CLIENT_ID and GOOGLE_WEB_CLIENT_SECRET on the server for Expo Go Google relay.');
  }

  const redirectUri = getGoogleWebRedirectUri();
  const state = crypto.randomBytes(24).toString('hex');
  pendingByState.set(state, { returnUrl, created: Date.now() });

  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', 'openid email profile');
  auth.searchParams.set('state', state);
  auth.searchParams.set('access_type', 'offline');
  auth.searchParams.set('include_granted_scopes', 'true');
  auth.searchParams.set('prompt', 'select_account');

  return res.redirect(302, auth.toString());
};

/**
 * GET /api/auth/google/expo/callback?code=...&state=...
 */
export const googleExpoRelayCallback = async (req, res) => {
  pruneMaps();

  const { code, state, error, error_description: errorDescription } = req.query;

  const failRedirect = (returnUrl, message) => {
    if (!returnUrl || !isAllowedExpoGoogleReturnUrl(returnUrl)) {
      return res.status(400).send(String(message || 'Google sign-in failed'));
    }
    const sep = returnUrl.includes('?') ? '&' : '?';
    const dest = `${returnUrl}${sep}gerr=${encodeURIComponent(String(message || 'error'))}`;
    return res.redirect(302, dest);
  };

  if (error) {
    const rec = pendingByState.get(state);
    pendingByState.delete(state);
    const msg = `${error}${errorDescription ? `: ${errorDescription}` : ''}`;
    if (rec?.returnUrl) return failRedirect(rec.returnUrl, msg);
    return res.status(400).send(msg);
  }

  const rec = pendingByState.get(state);
  pendingByState.delete(state);
  if (!rec?.returnUrl) {
    return res.status(400).send('Invalid or expired OAuth state. Try signing in again.');
  }

  const base = getPublicBase();
  const redirectUri = getGoogleWebRedirectUri();
  const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;

  if (!base || !redirectUri || !clientId || !clientSecret) {
    return failRedirect(rec.returnUrl, 'Server OAuth is not configured.');
  }

  if (!code || typeof code !== 'string') {
    return failRedirect(rec.returnUrl, 'Missing authorization code from Google.');
  }

  try {
    const o2 = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await o2.getToken({ code });
    const idToken = tokens.id_token;
    if (!idToken) {
      return failRedirect(rec.returnUrl, 'Google did not return an ID token.');
    }

    const { token, user } = await signInOrRegisterWithGoogleIdToken(idToken);
    const xfer = crypto.randomBytes(18).toString('hex');
    xferToPayload.set(xfer, { token, user, created: Date.now() });

    const sep = rec.returnUrl.includes('?') ? '&' : '?';
    const dest = `${rec.returnUrl}${sep}xfer=${encodeURIComponent(xfer)}`;
    return res.redirect(302, dest);
  } catch (e) {
    console.error('[googleExpoRelayCallback]', e?.message || e);
    return failRedirect(rec.returnUrl, e?.message || 'Google authentication failed');
  }
};

/**
 * POST /api/auth/google/expo/complete  { "xfer": "..." }
 */
export const googleExpoRelayComplete = async (req, res) => {
  pruneMaps();
  const xfer = typeof req.body?.xfer === 'string' ? req.body.xfer.trim() : '';
  if (!xfer) {
    return res.status(400).json({ message: 'xfer is required' });
  }
  const rec = xferToPayload.get(xfer);
  xferToPayload.delete(xfer);
  if (!rec) {
    return res.status(400).json({ message: 'Invalid or expired sign-in code. Try again.' });
  }
  return res.json({ token: rec.token, user: rec.user });
};
