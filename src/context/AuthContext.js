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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { randomUUID } from 'expo-crypto';
import Constants from 'expo-constants';
import {
  loginUser,
  registerUser as apiRegisterUser,
  googleSignIn as apiGoogleSignIn,
  updateProfile as apiUpdateProfile,
  getProfile,
} from '../services/api';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({
  user: null,
  login: async () => {},
  register: async () => {},
  googleLogin: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
  isLoading: true,
});

const readGoogleEnv = () => ({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

// expo-auth-session's Google.useAuthRequest throws on Android/iOS if the platform
// client id is undefined — even when you only use email/password. Use web client
// as fallback (valid for many Expo setups), then a placeholder so the app boots
// when Google OAuth is not configured at all.
const PLACEHOLDER_GOOGLE_CLIENT_ID =
  '000000000000-not-configured.apps.googleusercontent.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const googleEnv = useMemo(() => readGoogleEnv(), []);

  const redirectUriOptions = useMemo(
    () => ({
      scheme: Constants.expoConfig?.scheme ?? 'appdev',
    }),
    []
  );

  const googleAuthConfig = useMemo(() => {
    const web = googleEnv.webClientId;
    return {
      scopes: ['openid', 'profile', 'email'],
      webClientId: web,
      androidClientId: googleEnv.androidClientId || web || PLACEHOLDER_GOOGLE_CLIENT_ID,
      iosClientId: googleEnv.iosClientId || web || PLACEHOLDER_GOOGLE_CLIENT_ID,
    };
  }, [googleEnv]);

  const [request, response, promptAsync] = Google.useAuthRequest(googleAuthConfig, redirectUriOptions);

  const googlePending = useRef(null);
  const googleFlowTimeout = useRef(null);

  const persistUser = useCallback(async (responseUser) => {
    setUser(responseUser);
    await AsyncStorage.setItem('userToken', responseUser.token);
    await AsyncStorage.setItem('userData', JSON.stringify(responseUser));
    await AsyncStorage.setItem('rememberMe', 'true');
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

    if (!idToken) {
      console.log('[Google] Awaiting id_token (OAuth code exchange may still be running)...');
      return;
    }

    if (!googlePending.current) return;

    const { resolve, reject } = googlePending.current;
    googlePending.current = null;
    if (googleFlowTimeout.current) {
      clearTimeout(googleFlowTimeout.current);
      googleFlowTimeout.current = null;
    }

    (async () => {
      try {
        console.log('[Google] id_token received, length:', idToken.length);
        const data = await apiGoogleSignIn(idToken);
        await persistUser(data);
        resolve(data);
      } catch (err) {
        console.error('[Google] Backend error:', err?.message || err);
        reject(err instanceof Error ? err : new Error('Google Sign-In failed'));
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

  const login = async (email, password, recaptchaToken) => {
    const responseUser = await loginUser(email, password, recaptchaToken);
    await persistUser(responseUser);
    return responseUser;
  };

  const register = async (name, email, password, phone = '', recaptchaToken) => {
    const responseUser = await apiRegisterUser(name, email, password, phone, 'guest', recaptchaToken);
    await persistUser(responseUser);
    return responseUser;
  };

  const googleLogin = useCallback(async () => {
    const webId = googleEnv.webClientId;
    const androidId = googleEnv.androidClientId;
    const iosId = googleEnv.iosClientId;

    if (Platform.OS === 'android' && !androidId) {
      console.warn('[Google] EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is missing — required on Android');
    }
    if (Platform.OS === 'ios' && !iosId) {
      console.warn('[Google] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing — required on iOS');
    }
    if (!webId) {
      throw new Error('Google Sign-In is not configured (set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
    }

    if (!request) {
      throw new Error('Google auth is still loading. Try again in a moment.');
    }

    const traceId = randomUUID();
    console.log('[Google] Starting OAuth', { traceId, platform: Platform.OS });

    return new Promise((resolve, reject) => {
      googlePending.current = { resolve, reject };

      googleFlowTimeout.current = setTimeout(() => {
        googleFlowTimeout.current = null;
        if (googlePending.current) {
          googlePending.current.reject(new Error('Google Sign-In timed out'));
          googlePending.current = null;
        }
      }, 120000);

      promptAsync()
        .then((r) => {
          console.log('[Google] promptAsync finished, type:', r?.type);
          if (r?.type === 'cancel' || r?.type === 'dismiss') {
            if (googleFlowTimeout.current) {
              clearTimeout(googleFlowTimeout.current);
              googleFlowTimeout.current = null;
            }
            if (googlePending.current) {
              googlePending.current.reject(new Error('Google Sign-In was cancelled'));
              googlePending.current = null;
            }
          }
        })
        .catch((err) => {
          console.error('[Google] promptAsync error:', err);
          if (googleFlowTimeout.current) {
            clearTimeout(googleFlowTimeout.current);
            googleFlowTimeout.current = null;
          }
          if (googlePending.current) {
            googlePending.current.reject(err instanceof Error ? err : new Error(String(err)));
            googlePending.current = null;
          }
        });
    });
  }, [googleEnv, promptAsync, request]);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('rememberMe');
      setUser(null);
    } catch (error) {
      console.warn('Failed to logout:', error);
    }
  };

  const updateProfile = async ({ name, phone = '' }) => {
    const updatedUser = await apiUpdateProfile({ name, phone });
    const nextUser = { ...user, ...updatedUser };
    setUser(nextUser);
    await AsyncStorage.setItem('userData', JSON.stringify(nextUser));
    return nextUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, updateProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
