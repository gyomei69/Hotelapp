// src/services/api.js
// Centralized API client for the Hotel Management Backend
// All API calls go through this module for consistent auth & error handling.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

// -------------------------------------------------------------------
// Base URL Configuration (Expo Go on a real phone)
// - `localhost` in EXPO_PUBLIC_API_URL points at the phone itself — broken.
// - We reuse the same LAN host Expo uses for Metro (hostUri / debuggerHost).
// - Override anytime: EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:5000/api
// - Tunnel mode (--tunnel): Metro host is not your API; set EXPO_PUBLIC_API_URL
//   to your PC's LAN IP or a public URL (e.g. ngrok) for the backend.
// -------------------------------------------------------------------

/** Metro / dev-server ports — never use these for the Hotel API (they return HTML 404 for /api/*). */
const EXPO_PACKAGER_PORTS = new Set(['8081', '8082', '19000', '19001']);

const getEnvApiUrl = () =>
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined;

/** If EXPO_PUBLIC_API_URL mistakenly uses a packager port, coerce to API port 5000. */
const normalizeApiBaseUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (u.port && EXPO_PACKAGER_PORTS.has(u.port)) {
      u.port = '5000';
    }
    return u.href.replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
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

  if (Platform.OS === 'web') {
    return normalizeApiBaseUrl(envUrl || 'http://localhost:5000/api');
  }

  const strict = apiStrictHost();
  const { port, path } = parseEnvPortAndPath(envUrl);
  const suffix = `${port}${path.startsWith('/') ? path : `/${path}`}`;

  // Dev on a real device: use the SAME LAN IP as the Metro bundler for the API host.
  if (!strict && typeof __DEV__ !== 'undefined' && __DEV__) {
    const metroHost = getPackagerLanHost();
    if (metroHost) {
      return normalizeApiBaseUrl(`http://${metroHost}:${suffix}`);
    }
  }

  if (envUrl && !localhostish(envUrl)) {
    return normalizeApiBaseUrl(envUrl);
  }

  const lanHost = getPackagerLanHost();
  if (lanHost) {
    return normalizeApiBaseUrl(`http://${lanHost}:${suffix}`);
  }

  // iOS Simulator: localhost reaches the Mac. Android emulator: 10.0.2.2 reaches the host PC.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'ios') {
      return normalizeApiBaseUrl(`http://127.0.0.1:${suffix}`);
    }
    if (Platform.OS === 'android') {
      return normalizeApiBaseUrl(`http://10.0.2.2:${suffix}`);
    }
  }

  return normalizeApiBaseUrl(envUrl || 'http://localhost:5000/api');
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      let message =
        (data && typeof data === 'object' && data.message && String(data.message)) || '';
      if (!message && typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('<')) {
          message =
            'API returned HTML (wrong host/port). Point EXPO_PUBLIC_API_URL at your backend, e.g. http://YOUR_PC_IP:5000/api — not Metro (8081).';
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

// ===================================================================
// AUTH API
// ===================================================================

/** Login with email & password. Returns { _id, name, email, role, token } */
export const loginUser = (email, password, recaptchaToken) =>
  api
    .post('/auth/login', { email, password, recaptchaToken })
    .then((res) => res.data);

/** Register a new user. Returns { _id, name, email, role, token } */
export const registerUser = (name, email, password, phone = '', role = 'guest', recaptchaToken) =>
  api
    .post('/auth/register', { name, email, password, phone, role, recaptchaToken })
    .then((res) => res.data);

/** Standalone reCAPTCHA check (optional; login/register verify server-side too). */
export const verifyRecaptchaToken = (token) =>
  api.post('/verify-recaptcha', { token }).then((res) => res.data);

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

// ===================================================================
// ROOMS API
// ===================================================================

/** Get all rooms */
export const getRooms = () =>
  api.get('/rooms').then((res) => res.data);

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
export const getBookings = () =>
  api.get('/admin/bookings').then((res) => res.data);

/** Get current user's bookings only */
export const getMyBookings = () =>
  api.get('/bookings/my').then((res) => res.data);

/** Create a new booking */
export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData).then((res) => res.data);

/** Cancel own pending booking */
export const cancelMyBooking = (id) =>
  api.patch(`/bookings/${id}/cancel`).then((res) => res.data);

/** Update booking status (admin) — Approve or Reject */
export const updateBookingStatus = (id, status) =>
  api.patch(`/admin/bookings/${id}`, { status }).then((res) => res.data);

/** Admin confirms payment (cash); sets Paid + Completed — revenue counts here */
export const confirmBookingPayment = (id) =>
  api.patch(`/admin/bookings/${id}/confirm-payment`).then((res) => res.data);

/** Delete a booking (super admin only) */
export const deleteBooking = (id) =>
  api.delete(`/admin/bookings/${id}`).then((res) => res.data);

export const patchBookingCheckIn = (id) =>
  api.patch(`/admin/bookings/${id}/check-in`).then((res) => res.data);

export const patchBookingCheckOut = (id) =>
  api.patch(`/admin/bookings/${id}/check-out`).then((res) => res.data);

/** Super admin cancels a reservation */
export const cancelBookingAdmin = (id) =>
  api.patch(`/admin/bookings/${id}/cancel-admin`).then((res) => res.data);

/** Revenue aggregates for PDF export (super admin) — period: daily | monthly | yearly */
export const getRevenueReport = (period) =>
  api.get('/admin/revenue-report', { params: { period } }).then((res) => res.data);

export const getOccupancyCalendar = () =>
  api.get('/admin/calendar').then((res) => res.data);

export const getPaymentsReport = () =>
  api.get('/admin/payments').then((res) => res.data);

export const getHousekeeping = () =>
  api.get('/admin/housekeeping').then((res) => res.data);

export const patchHousekeeping = (id, payload) =>
  api.patch(`/admin/housekeeping/${id}`, payload).then((res) => res.data);

export const getFeedbackAdmin = () =>
  api.get('/admin/feedback').then((res) => res.data);

export const respondToFeedback = (id, response) =>
  api.patch(`/admin/feedback/${id}/respond`, { response }).then((res) => res.data);

/** Guest feedback */
export const submitFeedback = (message) =>
  api.post('/feedback', { message }).then((res) => res.data);

/** User selects cash after admin approval */
export const selectCashPayment = (bookingId) =>
  api.post(`/bookings/${bookingId}/payment/cash`).then((res) => res.data);

/** URL to open mock card checkout in browser */
export const getCardPaymentUrl = (bookingId) =>
  api.get(`/bookings/${bookingId}/payment/card-url`).then((res) => res.data);

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
// USERS (super admin)
// ===================================================================

export const fetchAllUsers = () =>
  api.get('/users').then((res) => res.data);

export const updateUserRole = (id, role) =>
  api.patch(`/users/${id}/role`, { role }).then((res) => res.data);

// ===================================================================
// STATS API
// ===================================================================

/** Dashboard stats — full revenue for super admin; limited fields for staff */
export const getStats = () =>
  api.get('/stats').then((res) => res.data);

// ===================================================================
// NOTIFICATIONS API
// ===================================================================

/** Inbox for current user or admin/staff — { notifications, unreadCount } */
export const getNotifications = () =>
  api.get('/notifications').then((res) => res.data);

export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((res) => res.data);

export default api;
