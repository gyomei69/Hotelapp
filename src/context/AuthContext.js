import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { randomUUID } from 'expo-crypto';
import Constants from 'expo-constants';
import {
  loginUser,
  registerUser as apiRegisterUser,
  verifyEmail as apiVerifyEmail,
  googleSignIn as apiGoogleSignIn,
  updateProfile as apiUpdateProfile,
  getProfile,
  clearApiClientCache,
  getGoogleRelayOrigin,
  getGoogleRelayOriginPlaceholderHint,
  getGoogleRelayOriginPolicyHint,
  googleExpoRelayComplete,
} from '../services/api';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({
  user: null,
  login: async () => {},
  register: async () => {},
  verifyEmail: async () => {},
  googleLogin: async () => {},
  isGoogleConfigured: false,
  updateProfile: async () => {},
  refreshSession: async () => null,
  logout: async () => {},
  isLoading: true,
});

const readGoogleEnv = () => {
  const trim = (v) => (typeof v === 'string' ? v.trim() : '');
  return {
    webClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) || undefined,
    androidClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) || undefined,
    iosClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) || undefined,
  };
};

const hasGoogleWebClient = (env) => Boolean(env.webClientId);
const hasGoogleAndroidClient = (env) => Boolean(env.androidClientId);
const hasGoogleIosClient = (env) => Boolean(env.iosClientId);

const withTimeout = async (p, ms, message = 'Timed out', { onTimeout } = {}) => {
  let t;
  try {
    const timeout = new Promise((_, reject) => {
      t = setTimeout(() => {
        try {
          onTimeout?.();
        } catch {
          /* ignore */
        }
        reject(new Error(message));
      }, ms);
    });
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const isValidHttpsOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
};

/**
 * Native Android/iOS OAuth redirect (reversed client id + path).
 * Must match Google Cloud + Android intent `path` in app.config.js exactly.
 */
const googleReversedClientRedirectUri = (clientId) => {
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) return undefined;
  const suffix = clientId.replace('.apps.googleusercontent.com', '').trim();
  if (!suffix) return undefined;
  return `com.googleusercontent.apps.${suffix}:/oauth2redirect/google`;
};

// expo-auth-session's Google.useAuthRequest throws on Android/iOS if the platform
// client id is undefined — even when you only use email/password. Use web client
// as fallback (valid for many Expo setups), then a placeholder so the app boots
// when Google OAuth is not configured at all.
const PLACEHOLDER_GOOGLE_CLIENT_ID =
  '000000000000-not-configured.apps.googleusercontent.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleRequestVersion, setGoogleRequestVersion] = useState(0);
  const authOpInFlight = useRef(false);
  const authSeq = useRef(0);

  const nextAuthSeq = () => {
    authSeq.current += 1;
    return authSeq.current;
  };

  const googleEnv = useMemo(() => readGoogleEnv(), []);

  const isExpoGo = Constants.appOwnership === 'expo';
  /** Expo Go uses the auth proxy and needs a Web OAuth client. Dev / store builds can use native client IDs alone. */
  const isGoogleConfigured = useMemo(() => {
    if (hasGoogleWebClient(googleEnv)) return true;
    if (isExpoGo) return false;
    if (Platform.OS === 'android' && hasGoogleAndroidClient(googleEnv)) return true;
    if (Platform.OS === 'ios' && hasGoogleIosClient(googleEnv)) return true;
    return false;
  }, [googleEnv, isExpoGo]);

  const googleAuthConfig = useMemo(() => {
    const { webClientId: web, androidClientId: android, iosClientId: ios } = googleEnv;
    const proxyRedirectUri = AuthSession.makeRedirectUri({ useProxy: true });

    if (isExpoGo) {
      if (!web) {
      return {
        scopes: ['openid', 'profile', 'email'],
        extraParams: { prompt: 'select_account', v: String(googleRequestVersion) },
        prompt: 'select_account',
        redirectUri: proxyRedirectUri,
        expoClientId: PLACEHOLDER_GOOGLE_CLIENT_ID,
        webClientId: undefined,
        androidClientId: PLACEHOLDER_GOOGLE_CLIENT_ID,
        iosClientId: PLACEHOLDER_GOOGLE_CLIENT_ID,
      };
      }
      // Expo Go uses server-side Google relay (see googleLogin) — auth.expo.io proxy is deprecated / unreliable.
      return {
        scopes: ['openid', 'profile', 'email'],
        extraParams: { prompt: 'select_account', v: String(googleRequestVersion) },
        prompt: 'select_account',
        redirectUri: proxyRedirectUri,
        expoClientId: web,
        webClientId: web,
        androidClientId: web,
        iosClientId: web,
      };
    }

    const base = {
      scopes: ['openid', 'profile', 'email'],
      extraParams: { prompt: 'select_account', v: String(googleRequestVersion) },
      prompt: 'select_account',
      expoClientId: web || android || ios || PLACEHOLDER_GOOGLE_CLIENT_ID,
      webClientId: web,
      androidClientId: android || web || PLACEHOLDER_GOOGLE_CLIENT_ID,
      iosClientId: ios || web || PLACEHOLDER_GOOGLE_CLIENT_ID,
    };

    if (Platform.OS === 'android') {
      const effective = android || web;
      const redirectUri = googleReversedClientRedirectUri(effective);
      return redirectUri ? { ...base, redirectUri } : base;
    }

    if (Platform.OS === 'ios') {
      const effective = ios || web;
      const redirectUri = googleReversedClientRedirectUri(effective);
      return redirectUri ? { ...base, redirectUri } : base;
    }

    return base;
  }, [googleEnv, isExpoGo, googleRequestVersion]);

  const [request, response, promptAsync] = Google.useAuthRequest(
    googleAuthConfig,
    isExpoGo ? { useProxy: true } : {}
  );

  const googlePending = useRef(null);
  const googleFlowTimeout = useRef(null);
  const lastGoogleAccessToken = useRef(null);

  const resetGoogleFlow = useCallback((reason = 'reset') => {
    console.log('[Google] reset flow:', reason);
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      /* ignore */
    }
    try {
      // Some Android builds hang unless we force-dismiss the browser UI too.
      WebBrowser.dismissBrowser();
    } catch {
      /* ignore */
    }
    try {
      // Clear any lingering AuthSession redirect handler state (best-effort).
      if (typeof AuthSession.dismiss === 'function') {
        AuthSession.dismiss();
      }
    } catch {
      /* ignore */
    }
    if (googleFlowTimeout.current) {
      clearTimeout(googleFlowTimeout.current);
      googleFlowTimeout.current = null;
    }
    if (googlePending.current) {
      googlePending.current.reject(new Error(String(reason || 'Google flow cancelled')));
      googlePending.current = null;
    }
  }, []);

  const persistUser = useCallback(async (responseUser, { rememberMe = true } = {}) => {
    setUser(responseUser);
    await AsyncStorage.setItem('userToken', responseUser.token);
    await AsyncStorage.setItem('userData', JSON.stringify(responseUser));
    await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
  }, []);

  useEffect(() => {
    if (!response) return;

    const fail = (msg) => {
      if (googleFlowTimeout.current) {
        clearTimeout(googleFlowTimeout.current);
        googleFlowTimeout.current = null;
      }
      if (googlePending.current) {
        googlePending.current.reject(new Error(msg));
        googlePending.current = null;
      }
    };

    if (response.type === 'error') {
      console.warn('[Google] response error:', response.error);
      fail(response.error?.message || 'Google Sign-In failed');
      return;
    }

    if (response.type === 'cancel' || response.type === 'dismiss') {
      fail('Google Sign-In was cancelled');
      return;
    }

    if (response.type !== 'success') return;

    const idToken =
      response.params?.id_token || response.authentication?.idToken;
    const accessToken = response.authentication?.accessToken;
    if (typeof accessToken === 'string' && accessToken) {
      lastGoogleAccessToken.current = accessToken;
    }

    if (!idToken) {
      console.log('[Google] Awaiting id_token (OAuth code exchange may still be running)...');
      return;
    }

    if (!googlePending.current) return;

    const pending = googlePending.current;
    const { resolve, reject, seq } = pending;
    googlePending.current = null;
    if (googleFlowTimeout.current) {
      clearTimeout(googleFlowTimeout.current);
      googleFlowTimeout.current = null;
    }

    (async () => {
      try {
        // Ignore stale results (e.g. user logged out during the auth flow).
        if (seq !== authSeq.current) {
          return;
        }
        console.log('[Google] id_token received, length:', idToken.length);
        const data = await withTimeout(
          apiGoogleSignIn(idToken),
          10_000,
          'Google Sign-In timed out. Please try again.'
        );
        if (seq !== authSeq.current) {
          return;
        }
        await persistUser(data);
        resolve(data);
      } catch (err) {
        console.error('[Google] Backend error:', err?.message || err);
        reject(err instanceof Error ? err : new Error('Google Sign-In failed'));
      } finally {
        if (seq === authSeq.current) {
          authOpInFlight.current = false;
        }
      }
    })();
  }, [response, persistUser]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        const rememberMe = await AsyncStorage.getItem('rememberMe');
        const token = await AsyncStorage.getItem('userToken');
        if (rememberMe === 'false') {
          await AsyncStorage.removeItem('userData');
          await AsyncStorage.removeItem('userToken');
          return;
        }
        if (!storedUser) return;

        const parsed = JSON.parse(storedUser);

        if (token) {
          try {
            const profile = await getProfile();
            const merged = { ...parsed, ...profile, token };
            setUser(merged);
            await AsyncStorage.setItem('userData', JSON.stringify(merged));
          } catch (error) {
            const msg = error?.message || '';
            const authLike =
              /not authorized|token failed|no token|401/i.test(msg);
            if (authLike) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              await clearApiClientCache();
              setUser(null);
            } else {
              setUser(parsed);
            }
          }
        } else {
          setUser(parsed);
        }
      } catch (error) {
        console.warn('Failed to load user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    if (authOpInFlight.current) {
      throw new Error('Please wait…');
    }
    authOpInFlight.current = true;
    const seq = nextAuthSeq();
    try {
      const responseUser = await loginUser(email, password);
      if (seq !== authSeq.current) return responseUser;
      await persistUser(responseUser, { rememberMe });
      return responseUser;
    } finally {
      if (seq === authSeq.current) {
        authOpInFlight.current = false;
      }
    }
  };

  const register = async (name, email, password, phone = '') => {
    const responseUser = await apiRegisterUser(name, email, password, phone, 'guest');
    // New flow: server creates account as unverified and emails a code.
    // Do not persist a session until verification succeeds.
    return responseUser;
  };

  const verifyEmail = async (email, code) => {
    if (authOpInFlight.current) {
      throw new Error('Please wait…');
    }
    authOpInFlight.current = true;
    const seq = nextAuthSeq();
    try {
      const responseUser = await apiVerifyEmail(email, code);
      if (seq !== authSeq.current) return responseUser;
      await persistUser(responseUser);
      return responseUser;
    } finally {
      if (seq === authSeq.current) {
        authOpInFlight.current = false;
      }
    }
  };

  const googleLogin = useCallback(async () => {
    if (authOpInFlight.current) {
      console.log('[Google] blocked: auth operation already in flight');
      return Promise.reject(new Error('Please wait…'));
    }
    console.log('[Google] Login start');
    authOpInFlight.current = true;
    const seq = nextAuthSeq();
    // Make sure no previous browser session/pending promise can poison the next attempt.
    resetGoogleFlow('restart');
    // Give WebBrowser/AuthSession a beat to clear redirect handlers on Android.
    await delay(150);

    // Android custom tabs can hang if not warmed up after a previous cooldown/dismiss.
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      /* ignore */
    }

    const webId = googleEnv.webClientId;
    const androidId = googleEnv.androidClientId;
    const iosId = googleEnv.iosClientId;

    if (isExpoGo && !webId) {
      if (seq === authSeq.current) authOpInFlight.current = false;
      return Promise.reject(
        new Error(
          'Google Sign-In in Expo Go needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (OAuth Web client). Use a development build to sign in with only the Android client.'
        )
      );
    }

    if (!isExpoGo && Platform.OS === 'android' && !androidId && !webId) {
      if (seq === authSeq.current) authOpInFlight.current = false;
      return Promise.reject(
        new Error(
          'Google Sign-In on Android needs EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (or Web client as fallback).'
        )
      );
    }
    if (!isExpoGo && Platform.OS === 'ios' && !iosId && !webId) {
      if (seq === authSeq.current) authOpInFlight.current = false;
      return Promise.reject(
        new Error(
          'Google Sign-In on iOS needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (or Web client as fallback).'
        )
      );
    }

    if (!webId && !androidId && !iosId) {
      if (seq === authSeq.current) authOpInFlight.current = false;
      return Promise.reject(
        new Error(
          'Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and/or platform client IDs in .env.'
        )
      );
    }

    /**
     * Expo Go:
     * - Prefer the server-side relay (ngrok → your backend) if configured and reachable.
     * - Otherwise fall back to the Expo AuthSession proxy flow (no ngrok required).
     */
    if (isExpoGo) {
      const origin = getGoogleRelayOrigin();
      const relayLooksConfigured =
        origin &&
        isValidHttpsOrigin(origin) &&
        !getGoogleRelayOriginPlaceholderHint(origin) &&
        !getGoogleRelayOriginPolicyHint(origin);

      if (relayLooksConfigured) {
        // Preflight reachability to avoid dumping users into an ngrok offline error page.
        try {
          // IMPORTANT: ensure auth-session state is fully cleared before starting a new auth session.
          resetGoogleFlow('pre-relay');
          await delay(150);

          const healthUrl = `${origin.replace(/\/+$/, '')}/api/health`;
          await withTimeout(
            fetch(healthUrl, { method: 'GET' }).then((r) => {
              if (!r.ok) throw new Error(`Health check failed (${r.status})`);
              return r.text();
            }),
            4500,
            'Relay is not reachable (timeout)'
          );

          const returnUrl = Linking.createURL('oauth/google', {});
          const startUrl = `${origin}/api/auth/google/expo/start?returnUrl=${encodeURIComponent(returnUrl)}`;
          console.log('[Google] Expo Go relay start', { origin, returnUrl: returnUrl.slice(0, 80) });
          const result = await withTimeout(
            WebBrowser.openAuthSessionAsync(startUrl, returnUrl),
            20_000,
            'Google Sign-In timed out. Please try again.',
            {
              onTimeout: () => {
                // If the auth session is still open, immediately dismiss it to clear redirect handlers.
                resetGoogleFlow('relay_timeout');
              },
            }
          );
          console.log('[Google] Expo Go relay result:', result?.type);
          if (result.type !== 'success' || !result.url) {
            if (result.type === 'cancel' || result.type === 'dismiss') {
              if (seq === authSeq.current) authOpInFlight.current = false;
              return Promise.reject(new Error('Google Sign-In was cancelled'));
            }
            if (seq === authSeq.current) authOpInFlight.current = false;
            return Promise.reject(new Error('Google Sign-In failed'));
          }
          let xfer;
          let gerr;
          try {
            const parsed = Linking.parse(result.url);
            const x = parsed.queryParams?.xfer;
            const g = parsed.queryParams?.gerr;
            xfer = Array.isArray(x) ? x[0] : x;
            gerr = Array.isArray(g) ? g[0] : g;
          } catch {
            /* ignore */
          }
          if (gerr) {
            if (seq === authSeq.current) authOpInFlight.current = false;
            return Promise.reject(new Error(String(gerr)));
          }
          if (!xfer || typeof xfer !== 'string') {
            if (seq === authSeq.current) authOpInFlight.current = false;
            return Promise.reject(new Error('Google Sign-In did not return a session code. Check server logs.'));
          }
          const data = await withTimeout(
            googleExpoRelayComplete(xfer),
            15_000,
            'Google Sign-In timed out while completing. Please try again.'
          );
          if (seq !== authSeq.current) {
            return data;
          }
          await persistUser(data);
          if (seq === authSeq.current) authOpInFlight.current = false;
          return data;
        } catch (e) {
          const msg = String(e?.message || e || '');
          // Expo Go: Google’s old auth proxy flow is frequently blocked (invalid_request / access blocked).
          // If the relay is configured but unreachable (school Wi‑Fi blocks ngrok, etc.), fail fast with a clear message.
          console.warn('[Google] Relay failed:', msg);
          resetGoogleFlow(msg || 'relay_failed');
          await delay(600);
          if (seq === authSeq.current) authOpInFlight.current = false;
          return Promise.reject(
            new Error(
              msg ||
                'Google Sign-In relay is not reachable on this network. If your Wi‑Fi blocks ngrok, use mobile hotspot or a development build.'
            )
          );
        } finally {
          try {
            await WebBrowser.coolDownAsync();
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (!request) {
      console.log('[Google] request not ready yet');
      if (seq === authSeq.current) authOpInFlight.current = false;
      return Promise.reject(new Error('Google auth is still loading. Try again in a moment.'));
    }

    const traceId = randomUUID();
    console.log('[Google] Starting OAuth', {
      traceId,
      platform: Platform.OS,
      isExpoGo,
      redirectUri: request?.redirectUri,
    });

    const completion = new Promise((resolve, reject) => {
      googlePending.current = { resolve, reject, seq };
      googleFlowTimeout.current = setTimeout(() => {
        googleFlowTimeout.current = null;
        if (googlePending.current) {
          googlePending.current.reject(new Error('Google Sign-In timed out'));
          googlePending.current = null;
        }
        if (seq === authSeq.current) {
          authOpInFlight.current = false;
        }
      }, 15_000);
    });

    try {
      // Ensure no previous WebBrowser auth-session handler is still registered.
      resetGoogleFlow('pre-prompt');
      await delay(150);
      console.log('[Google] promptAsync → opening browser');
      const r = await promptAsync(
        Platform.OS === 'android'
          ? { showInRecents: true, prompt: 'select_account' }
          : { prompt: 'select_account' }
      );
      console.log('[Google] Login result:', {
        type: r?.type,
        hasParams: Boolean(r?.params),
        hasAuth: Boolean(r?.authentication),
        hasIdTokenParam: Boolean(r?.params?.id_token),
      });

      if (r?.type === 'cancel' || r?.type === 'dismiss') {
        resetGoogleFlow('Google Sign-In was cancelled');
        if (seq === authSeq.current) authOpInFlight.current = false;
        throw new Error('Google Sign-In was cancelled');
      }
      if (r?.type === 'error') {
        resetGoogleFlow(r?.error?.message || 'Google Sign-In failed');
        if (seq === authSeq.current) authOpInFlight.current = false;
        throw new Error(r?.error?.message || 'Google Sign-In failed');
      }

      // Success continues via `response` effect (which exchanges / exposes id_token).
      console.log('[Google] Waiting for id_token → backend exchange');
      return await completion;
    } catch (err) {
      console.error('[Google] promptAsync threw:', err?.message || err);
      resetGoogleFlow(err?.message || 'Google Sign-In failed');
      if (seq === authSeq.current) authOpInFlight.current = false;
      throw err instanceof Error ? err : new Error('Google Sign-In failed');
    } finally {
      try {
        await WebBrowser.coolDownAsync();
      } catch {
        /* ignore */
      }
    }
  }, [googleEnv, promptAsync, request, isExpoGo, persistUser, resetGoogleFlow]);

  const refreshSession = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setUser(null);
        return null;
      }
      const profile = await getProfile();
      const raw = await AsyncStorage.getItem('userData');
      const parsed = raw ? JSON.parse(raw) : {};
      const next = { ...parsed, ...profile, token };
      setUser(next);
      await AsyncStorage.setItem('userData', JSON.stringify(next));
      return next;
    } catch (e) {
      console.warn('[Auth] refreshSession failed:', e?.message || e);
      return null;
    }
  }, []);

  const logout = async () => {
    console.log('[Auth] Logout start');
    // Invalidate any in-flight auth operations (login/verify/google).
    nextAuthSeq();
    authOpInFlight.current = false;
    setIsLoading(true);
    try {
      // Force re-create the Google auth request on next login (prevents stale session/request reuse).
      setGoogleRequestVersion((v) => v + 1);

      resetGoogleFlow('Logged out');
      try {
        // Extra safety: ensure browser UI is fully dismissed on Android.
        WebBrowser.dismissBrowser();
      } catch {
        /* ignore */
      }
      try {
        // Best-effort: clear any lingering AuthSession state.
        if (typeof AuthSession.dismiss === 'function') {
          await AuthSession.dismiss();
        }
      } catch {
        /* ignore */
      }
      try {
        // Best effort: revoke Google access token to avoid cached sessions.
        if (lastGoogleAccessToken.current) {
          await AuthSession.revokeAsync(
            { token: lastGoogleAccessToken.current },
            { revocationEndpoint: 'https://oauth2.googleapis.com/revoke' }
          );
        }
      } catch {
        /* ignore */
      } finally {
        lastGoogleAccessToken.current = null;
      }

      await AsyncStorage.clear();
      await clearApiClientCache();
      setUser(null);
      console.log('[Auth] Logout complete');
    } catch (error) {
      console.warn('Failed to logout:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (payload = {}) => {
    const token = user?.token || (await AsyncStorage.getItem('userToken'));
    let nextUser = { ...(user || {}), token };

    if (Object.keys(payload).length) {
      const updatedUser = await apiUpdateProfile(payload);
      nextUser = { ...nextUser, ...updatedUser, token };
    }

    setUser(nextUser);
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(nextUser));
    return nextUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyEmail,
        googleLogin,
        isGoogleConfigured,
        updateProfile,
        refreshSession,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
