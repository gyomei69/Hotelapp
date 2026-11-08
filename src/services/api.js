// src/services/api.js
// Centralized API client for the Hotel Management Backend
// All API calls go through this module for consistent auth & error handling.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

// -------------------------------------------------------------------
// Sustainability: request de-dupe + short-lived cache for GETs
// -------------------------------------------------------------------
// The app has many screens that fetch the same resources (rooms, bookings,
// notifications). When tab switching, re-renders, or foreground events happen
// quickly, it can unintentionally spike requests and trip the API rate limiter.
//
// We keep a tiny in-memory cache (TTL) and de-dupe in-flight GETs so repeated
// calls within a short window reuse the same promise / result.
const __inflightGet = new Map(); // key -> Promise<any>
const __getCache = new Map(); // key -> { expiresAt: number, data: any }

const stableStringify = (value) => {
  try {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, Object.keys(value).sort());
  } catch {
    return String(value);
  }
};

const buildGetKey = async ({ baseURL, url, params }) => {
  let token = '';
  try {
    token = (await AsyncStorage.getItem('userToken')) || '';
  } catch {
    token = '';
  }
  return [
    String(baseURL || ''),
    'GET',
    String(url || ''),
    stableStringify(params || {}),
    token ? `auth:${token.slice(0, 16)}` : 'noauth',
  ].join('|');
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseRetryAfterMs = (retryAfterHeader) => {
  if (!retryAfterHeader) return null;
  const raw = Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : String(retryAfterHeader);
  const s = raw.trim();
  // Retry-After: <seconds>
  const seconds = Number(s);
  if (!Number.isNaN(seconds) && seconds >= 0) return Math.min(60_000, seconds * 1000);
  // Retry-After: <http-date>
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const diff = t - Date.now();
    if (diff > 0) return Math.min(60_000, diff);
  }
  return null;
};

// -------------------------------------------------------------------
// Base URL Configuration (Expo Go on a real phone)
// - `localhost` in EXPO_PUBLIC_API_URL points at the phone itself — broken on a device.
// - If EXPO_PUBLIC_API_URL is a non-localhost URL (LAN, ngrok https, …), it wins over Metro’s host in __DEV__.
// - Otherwise __DEV__ uses the same LAN host as Metro (hostUri / debuggerHost) + port/path.
// - EXPO_PUBLIC_API_STRICT_URL=1 forces EXPO_PUBLIC_API_URL even when it is localhost (advanced).
// -------------------------------------------------------------------

/** Metro / dev-server ports — never use these for the Hotel API (they return HTML 404 for /api/*). */
const EXPO_PACKAGER_PORTS = new Set(['8081', '8082', '19000', '19001']);

const getEnvApiUrl = () =>
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined;

/**
 * Final base URL for the Hotel API:
 * - Coerce Metro/packager ports (8081, …) → 5000 (those hosts return HTML for /bookings/*).
 * - If the URL has no path (or only `/`), append `/api` (Express mounts routes under `/api`).
 */
const finalizeHotelApiBaseUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (u.port && EXPO_PACKAGER_PORTS.has(u.port)) {
      u.port = '5000';
    }
    const pathNoTrail = (u.pathname || '').replace(/\/+$/, '') || '';
    if (!pathNoTrail || pathNoTrail === '/') {
      u.pathname = '/api';
    }
    return u.href.replace(/\/+$/, '');
  } catch {
    const trimmed = String(url).trim().replace(/\/$/, '');
    if (/^https?:\/\/[^/]+$/i.test(trimmed)) {
      return `${trimmed}/api`;
    }
    return trimmed;
  }
};

/** Hosts that load JS but are not where your Node API runs */
const isTunnelStyleHost = (host) =>
  !host ||
  /\.exp\.direct$/i.test(host) ||
  /exp\.host$/i.test(host) ||
  /^u\.expo\.dev$/i.test(host);

/** Parse host from the JS bundle URL (e.g. http://192.168.x.x:8081/.../index.bundle) — reliable when debuggerHost is missing. */
const getHostFromBundleScriptUrl = () => {
  try {
    const url = NativeModules?.SourceCode?.scriptURL;
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/^https?:\/\/([^/:]+)/i);
    const host = m?.[1];
    if (host && !isTunnelStyleHost(host)) return host;
  } catch {
    /* ignore */
  }
  return null;
};

const getPackagerLanHost = () => {
  const fromConfig = Constants.expoConfig?.hostUri?.split(':')[0];
  if (fromConfig && !isTunnelStyleHost(fromConfig)) return fromConfig;
  const fromGo = Constants.expoGoConfig?.debuggerHost?.split(':')[0];
  if (fromGo && !isTunnelStyleHost(fromGo)) return fromGo;
  return getHostFromBundleScriptUrl();
};

const localhostish = (url) =>
  typeof url === 'string' && /localhost|127\.0\.0\.1/i.test(url);

/** Set to 1 in .env only if the API runs on a different machine than Metro. */
const apiStrictHost = () =>
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_STRICT_URL === '1';

const parseEnvPortAndPath = (envUrl) => {
  let port = '5000';
  let path = '/api';
  if (!envUrl) return { port, path };
  try {
    const u = new URL(envUrl);
    if (u.port) {
      port = EXPO_PACKAGER_PORTS.has(u.port) ? '5000' : u.port;
    }
    const p = u.pathname.replace(/\/$/, '');
    if (p) path = p;
  } catch {
    /* keep defaults */
  }
  return { port, path };
};

const resolveApiBaseUrl = () => {
  const envUrl = getEnvApiUrl();
  const trimmed = typeof envUrl === 'string' ? envUrl.trim() : '';

  if (Platform.OS === 'web') {
    return finalizeHotelApiBaseUrl(trimmed || 'http://localhost:5000/api');
  }

  const strict = apiStrictHost();
  const { port, path } = parseEnvPortAndPath(envUrl);
  const suffix = `${port}${path.startsWith('/') ? path : `/${path}`}`;

  // Prefer explicit EXPO_PUBLIC_API_URL (ngrok, https, or a LAN IP that differs from Metro's)
  // before falling back to Metro's LAN host — otherwise dev devices ignore .env and hit the wrong host
  // (Metro returns HTML for /api/* on 8081; wrong IP → timeouts; ngrok → HTML interstitial without skip header).
  if (trimmed && (!localhostish(trimmed) || strict)) {
    return finalizeHotelApiBaseUrl(trimmed);
  }

  if (!strict && typeof __DEV__ !== 'undefined' && __DEV__) {
    const metroHost = getPackagerLanHost();
    if (metroHost) {
      return finalizeHotelApiBaseUrl(`http://${metroHost}:${suffix}`);
    }
  }

  const lanHost = getPackagerLanHost();
  if (lanHost) {
    return finalizeHotelApiBaseUrl(`http://${lanHost}:${suffix}`);
  }

  // iOS Simulator: localhost reaches the Mac. Android emulator: 10.0.2.2 reaches the host PC.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'ios') {
      return finalizeHotelApiBaseUrl(`http://127.0.0.1:${suffix}`);
    }
    if (Platform.OS === 'android') {
      return finalizeHotelApiBaseUrl(`http://10.0.2.2:${suffix}`);
    }
  }

  return finalizeHotelApiBaseUrl(trimmed || 'http://localhost:5000/api');
};

const isNgrokHostname = (hostname) => {
  if (!hostname || typeof hostname !== 'string') return false;
  const h = hostname.toLowerCase();
  return h.endsWith('ngrok-free.app') || h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io');
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Origin only (no `/api`), e.g. `http://192.168.1.5:5000` — used for Google OAuth relay in Expo Go. */
export const getHotelApiOrigin = () => {
  const base = String(api.defaults.baseURL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return base.replace(/\/api\/?$/i, '');
};

const trimEnv = (key) =>
  typeof process.env[key] === 'string' ? process.env[key].trim().replace(/\/+$/, '') : '';

/**
 * Public HTTPS origin for Google OAuth relay only (Expo Go).
 * Google Cloud rejects private IPs (192.168.x.x) for Web client redirect URIs — use ngrok etc.
 * Falls back to API origin if unset (LAN then fails GCP unless you use a dev build instead).
 */
export const getGoogleRelayOrigin = () => {
  const relay = trimEnv('EXPO_PUBLIC_GOOGLE_RELAY_BASE');
  if (relay) return relay;
  return getHotelApiOrigin();
};

/** Docs/examples — not real tunnels; ngrok ERR_NGROK_3200 if used. */
export const getGoogleRelayOriginPlaceholderHint = (origin) => {
  if (!origin) return null;
  try {
    const h = new URL(origin).hostname.toLowerCase();
    if (h === 'abcd-1234.ngrok-free.app' || h === 'your-subdomain.ngrok-free.app') {
      return 'placeholder';
    }
  } catch {
    return null;
  }
  return null;
};

/** Why LAN `http://192.168…` cannot be used as Google Web OAuth redirect in GCP. */
export const getGoogleRelayOriginPolicyHint = (origin) => {
  if (!origin) return null;
  try {
    const u = new URL(origin.includes('://') ? origin : `http://${origin}`);
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
        return 'private_ip';
      }
    }
    if (protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'http_remote';
    }
    if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'not_https';
    }
  } catch {
    return 'invalid';
  }
  return null;
};

if (typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS !== 'web') {
  console.log('[Hotel API] baseURL →', api.defaults.baseURL);
}

// -------------------------------------------------------------------
// Request interceptors
// -------------------------------------------------------------------
// Refresh API host each request in dev (Constants / scriptURL can be ready after first import).
api.interceptors.request.use((config) => {
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    Platform.OS !== 'web' &&
    !apiStrictHost()
  ) {
    config.baseURL = resolveApiBaseUrl();
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  try {
    const base = String(config.baseURL || api.defaults.baseURL || '');
    const host = new URL(base).hostname;
    if (isNgrokHostname(host)) {
      config.headers['ngrok-skip-browser-warning'] = '69420';
    }
  } catch {
    /* ignore */
  }
  return config;
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------------------
// Response Interceptor — normalize errors
// -------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Retry a couple times on "please slow down" responses.
    // This prevents UI loops from instantly slamming the backend when it is already limiting.
    const status = error?.response?.status;
    const config = error?.config;
    if (config && (status === 429 || status === 503 || status === 502 || status === 504)) {
      const maxRetries = 2;
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < maxRetries) {
        config.__retryCount += 1;
        const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
        const backoffMs =
          retryAfterMs ??
          Math.min(10_000, 800 * 2 ** (config.__retryCount - 1) + Math.floor(Math.random() * 250));
        await sleep(backoffMs);
        return api.request(config);
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      let message =
        (data && typeof data === 'object' && data.message && String(data.message)) || '';
      if (!message && typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('<')) {
          const base = String(error.config?.baseURL || '').replace(/\/$/, '');
          const path = String(error.config?.url || '');
          const tried =
            base && path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base || path || 'unknown';
          message =
            `The server returned HTML instead of JSON (wrong host/port or missing /api). Tried: ${tried}. Set EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:5000/api (same Wi‑Fi as the phone; not port 8081).`;
        } else if (trimmed.length) {
          message = trimmed.slice(0, 300);
        }
      }
      if (!message) {
        const url = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
        if (status === 404) {
          message = `Not found: ${url || 'API'}. Check that the backend is running and routes are up to date.`;
        } else {
          message = `Request failed (${status})${url ? `: ${url}` : ''}`;
        }
      }
      return Promise.reject(new Error(message));
    } else if (error.request) {
      const base = (error.config?.baseURL || api.defaults.baseURL || '').replace(/\/$/, '');
      const path = error.config?.url || '';
      const tried = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(
          new Error(
            `Request timed out (${tried}). Start the backend (npm run backend), confirm MongoDB is running, and allow Node through Windows Firewall on port 5000.`
          )
        );
      }
      return Promise.reject(
        new Error(
          `Cannot reach API at ${tried}. On your PC run: npm run backend. Phone and PC must be on the same Wi‑Fi. In Windows Defender Firewall, allow inbound TCP port 5000 for Node, or open http://YOUR_PC_IP:5000/api/health in the phone browser to test.`
        )
      );
    }
    const msg = error?.message || 'Something went wrong';
    return Promise.reject(error instanceof Error ? error : new Error(msg));
  }
);

// -------------------------------------------------------------------
// Cached / de-duped GET helper
// -------------------------------------------------------------------
async function cachedGet(url, { params, ttlMs = 5000, force = false, signal } = {}) {
  const baseURL = api.defaults.baseURL;
  const key = await buildGetKey({ baseURL, url, params });

  if (!force) {
    const hit = __getCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data;
    }
  }

  const existing = __inflightGet.get(key);
  if (existing) return existing;

  const p = api
    .get(url, { params, signal })
    .then((res) => res.data)
    .then((data) => {
      if (ttlMs > 0) {
        __getCache.set(key, { expiresAt: Date.now() + ttlMs, data });
      }
      return data;
    })
    .finally(() => {
      __inflightGet.delete(key);
    });

  __inflightGet.set(key, p);
  return p;
}

export async function clearApiClientCache() {
  __inflightGet.clear();
  __getCache.clear();
}

// ===================================================================
// AUTH API
// ===================================================================

/** Login with email & password. Returns { _id, name, email, role, token } */
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

/** Register a new user. Returns { _id, name, email, role, token } */
export const registerUser = (name, email, password, phone = '', role = 'guest') =>
  api.post('/auth/register', { name, email, password, phone, role }).then((res) => res.data);

/** Verify email with 6-digit code. Returns logged-in user payload + token. */
export const verifyEmail = (email, code) =>
  api.post('/auth/verify-email', { email, code }).then((res) => res.data);

/** Resend signup verification code (local accounts). */
export const resendVerificationCode = (email) =>
  api.post('/auth/resend-verification', { email }).then((res) => res.data);

/**
 * Google Sign-In: POST /auth/google-login with idToken.
 * Backend returns { token, user }; normalized to the same shape as email login for the app.
 */
export const googleSignIn = (idToken) =>
  api.post('/auth/google-login', { idToken }).then((res) => {
    const { token, user } = res.data;
    if (!token || !user) {
      return res.data;
    }
    return {
      ...user,
      token,
    };
  });

/** Expo Go: exchange one-time xfer from deep link for session (after server Google relay). */
export const googleExpoRelayComplete = (xfer) =>
  api.post('/auth/google/expo/complete', { xfer }).then((res) => {
    const { token, user } = res.data;
    if (!token || !user) {
      return res.data;
    }
    return {
      ...user,
      token,
    };
  });

/** Request password reset code via email */
export const requestPasswordReset = (email) =>
  api.post('/auth/forgot-password', { email }).then((res) => res.data);

/** Verify 6-digit code; returns { resetToken } */
export const verifyPasswordResetCode = (email, code) =>
  api.post('/auth/verify-reset-code', { email, code }).then((res) => res.data);

/** Complete password reset with token from verify step */
export const resetPasswordWithToken = (resetToken, newPassword, confirmPassword) =>
  api
    .post('/auth/reset-password', { resetToken, newPassword, confirmPassword })
    .then((res) => res.data);

/** Get current user's profile (requires auth). */
export const getProfile = () =>
  api.get('/auth/profile').then((res) => res.data);

/** Update current user's profile (name/phone) */
export const updateProfile = (payload) =>
  api.put('/auth/profile', payload).then((res) => res.data);

/** Change password while logged in (verifies current password on server) */
export const changePassword = (currentPassword, newPassword, confirmPassword) =>
  api
    .put('/auth/change-password', { currentPassword, newPassword, confirmPassword })
    .then((res) => res.data);

/** Email verification codes (5 min TTL on server) — purposes: password_reset | password_change */
export const SECURITY_CODE_TTL_SEC = 300;

export const sendSecurityCode = (email, purpose = 'password_reset') =>
  api.post('/auth/send-code', { email, purpose }).then((res) => res.data);

export const verifySecurityCode = (email, code, purpose = 'password_reset') =>
  api.post('/auth/verify-code', { email, code, purpose }).then((res) => res.data);

/** After verifySecurityCode — not the authenticated PUT /auth/change-password */
export const changePasswordWithEmailToken = (changeToken, newPassword, confirmPassword) =>
  api
    .post('/change-password', { changeToken, newPassword, confirmPassword })
    .then((res) => res.data);

/** Top-level forgot (same email-code store as /send-code purpose password_reset) */
export const postForgotPassword = (email) =>
  api.post('/auth/forgot-password-code', { email }).then((res) => res.data);

/** Atomic reset: email + 6-digit code + new password */
export const postResetPasswordAtomic = (email, code, newPassword, confirmPassword) =>
  api
    .post('/auth/reset-password-code', { email, code, newPassword, confirmPassword })
    .then((res) => res.data);

// ===================================================================
// ROOMS API
// ===================================================================

/** Get all rooms */
export const getRooms = (opts = {}) =>
  cachedGet('/rooms', { ttlMs: 15_000, ...opts });

/** Create a room (admin only) */
export const createRoom = (roomData) =>
  api.post('/rooms', roomData).then((res) => res.data);

/** Update a room (admin only) */
export const updateRoom = (id, roomData) =>
  api.put(`/rooms/${id}`, roomData).then((res) => res.data);

/** Delete a room (admin only) */
export const deleteRoom = (id) =>
  api.delete(`/rooms/${id}`).then((res) => res.data);

// ===================================================================
// BOOKINGS API
// ===================================================================

/** Get all bookings (admin) */
export const getBookings = (opts = {}) =>
  cachedGet('/admin/bookings', { ttlMs: 5_000, ...opts });

/** Get bookings paginated (staff + admin) */
export const getBookingsPaginated = ({ page = 1, limit = 10, status } = {}) =>
  api
    // Use /admin/bookings since it already exists in older backend builds.
    // Backend supports pagination response when page/limit are present.
    .get('/admin/bookings', {
      params: {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
        ...(status ? { status } : {}),
      },
    })
    .then((res) => res.data);

/** Get current user's bookings only */
export const getMyBookings = (opts = {}) =>
  cachedGet('/bookings/my', { ttlMs: 5_000, ...opts });

/** Create a new booking */
export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData).then((res) => res.data);

/** Cancel own pending booking */
export const cancelMyBooking = (id) =>
  api.patch(`/bookings/${id}/cancel`).then((res) => res.data);

/** Delete own inactive booking (Cancelled/Rejected/Completed) */
export const deleteMyBooking = (id) =>
  api.delete(`/bookings/${id}`).then((res) => res.data);

/** Approve or reject — PATCH /api/admin/bookings/:id (staff + admin; legacy body) */
export const updateBookingStatus = (id, status) =>
  api.patch(`/admin/bookings/${id}`, { status }).then((res) => res.data);

/** Booking ops — PUT /api/bookings/:id/... (staff + admin; same controllers as admin PATCH). */
export const putBookingApprove = (id) =>
  api.put(`/bookings/${id}/approve`, {}).then((res) => res.data);

export const putBookingReject = (id) =>
  api.put(`/bookings/${id}/reject`, {}).then((res) => res.data);

/** Staff confirms payment after guest selected method (cash → Pending) */
export const confirmBookingPayment = (id) =>
  api.put(`/bookings/${id}/confirm-payment`, {}).then((res) => res.data);

/** Delete a booking (admin only) */
export const deleteBooking = (id) =>
  api.delete(`/admin/bookings/${id}`).then((res) => res.data);

export const patchBookingCheckIn = (id) =>
  api.put(`/bookings/${id}/check-in`, {}).then((res) => res.data);

export const patchBookingCheckOut = (id, options = {}) =>
  api.put(`/bookings/${id}/check-out`, options || {}).then((res) => res.data);

/** Mark as completed after check-out (staff + admin) */
export const putBookingComplete = (id) =>
  api.put(`/bookings/${id}/complete`, {}).then((res) => res.data);

/** Admin cancels a reservation */
export const cancelBookingAdmin = (id) =>
  api.patch(`/admin/bookings/${id}/cancel-admin`).then((res) => res.data);

/** Revenue aggregates for PDF export (admin) — period: daily | monthly | yearly */
export const getRevenueReport = (period) =>
  api.get('/admin/revenue-report', { params: { period } }).then((res) => res.data);

export const getOccupancyCalendar = () =>
  cachedGet('/admin/calendar', { ttlMs: 10_000 });

export const getPaymentsReport = () =>
  cachedGet('/admin/payments', { ttlMs: 10_000 });

/** Activity audit (staff: filtered; admin: full) — optional role filter */
export const getActivityLogs = (params = {}) =>
  api.get('/activity-logs', { params }).then((res) => res.data);

/** Guest feedback list — admin (Manage) + staff (Feedback tab). */
export const getFeedbackAdmin = () =>
  cachedGet('/admin/feedback', { ttlMs: 10_000 });

export const respondToFeedback = (id, response) =>
  api.patch(`/admin/feedback/${id}/respond`, { response }).then((res) => res.data);

export const deleteFeedback = (id) =>
  api.delete(`/admin/feedback/${id}`).then((res) => res.data);

/** Guest feedback */
export const submitFeedback = (message) =>
  api.post('/feedback', { message }).then((res) => res.data);

/** User selects cash after admin approval */
export const selectCashPayment = (bookingId) =>
  api.post(`/bookings/${bookingId}/payment/cash`).then((res) => res.data);

/** URL to open mock card checkout in browser */
export const getCardPaymentUrl = (bookingId) =>
  api.get(`/bookings/${bookingId}/payment/card-url`).then((res) => res.data);

/** Sandbox card payment selection: marks payment as pending for staff confirmation. */
export const selectCardPayment = (bookingId) =>
  api.post(`/bookings/${bookingId}/payment/card`, {}).then((res) => res.data);

// ===================================================================
// GUESTS API
// ===================================================================

/** Get all guests */
export const getGuests = () =>
  api.get('/guests').then((res) => res.data);

/** Create a guest */
export const createGuest = (guestData) =>
  api.post('/guests', guestData).then((res) => res.data);

/** Update a guest */
export const updateGuest = (id, guestData) =>
  api.put(`/guests/${id}`, guestData).then((res) => res.data);

/** Delete a guest */
export const deleteGuest = (id) =>
  api.delete(`/guests/${id}`).then((res) => res.data);

// ===================================================================
// USERS (admin)
// ===================================================================

export const fetchAllUsers = () =>
  cachedGet('/users', { ttlMs: 10_000 });

export const updateUserRole = (id, role) =>
  api.put(`/users/${id}/role`, { role }).then((res) => res.data);

// ===================================================================
// STATS API
// ===================================================================

/** Dashboard stats — full revenue for admin; limited fields for staff */
export const getStats = () =>
  cachedGet('/stats', { ttlMs: 10_000 });

// ===================================================================
// NOTIFICATIONS API
// ===================================================================

/** Inbox for current user or admin/staff — { notifications, unreadCount } */
export const getNotifications = () =>
  cachedGet('/notifications', { ttlMs: 5_000 });

export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((res) => res.data);

// ===================================================================
// BILLING API
// ===================================================================

/** Billing records: confirmed + paid + not checked-in yet. Guest gets own records; staff/admin gets all. */
export const getBillingRecords = () =>
  api.get('/billing').then((res) => res.data);

export default api;
