/**
 * Local dev only: skip invisible reCAPTCHA WebView (often breaks in Expo Go).
 * Requires HotelBackend RECAPTCHA_DEV_BYPASS=1. Never ship with this enabled.
 */
export const shouldSkipRecaptchaWebView = () =>
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SKIP_RECAPTCHA === '1';

export const DEV_RECAPTCHA_TOKEN = 'dev-recaptcha-bypass';