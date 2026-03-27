import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { loginUser, registerUser as apiRegisterUser, googleSignIn as apiGoogleSignIn } from '../services/api';

// Complete any pending browser auth sessions
WebBrowser.maybeCompleteAuthSession();

// Google OAuth discovery document
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// ⚠️ Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = '';

const AuthContext = createContext({
  user: null,
  login: async () => {},
  register: async () => {},
  googleLogin: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from AsyncStorage on app load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        const rememberMe = await AsyncStorage.getItem('rememberMe');
        if (rememberMe === 'false') {
          await AsyncStorage.removeItem('userData');
          await AsyncStorage.removeItem('userToken');
          return;
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn('Failed to load user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  // ── Save user to state + storage ──
  const persistUser = async (responseUser) => {
    setUser(responseUser);
    await AsyncStorage.setItem('userToken', responseUser.token);
    await AsyncStorage.setItem('userData', JSON.stringify(responseUser));
    await AsyncStorage.setItem('rememberMe', 'true');
  };

  // ── Email/Password Login ──
  const login = async (email, password) => {
    const responseUser = await loginUser(email, password);
    await persistUser(responseUser);
    return responseUser;
  };

  // ── Email/Password Register ──
  const register = async (name, email, password, phone = '') => {
    const responseUser = await apiRegisterUser(name, email, password, phone, 'user');
    await persistUser(responseUser);
    return responseUser;
  };

  // ── Google Sign-In ──
  const googleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error(
        'Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID in AuthContext.js'
      );
    }

    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success') {
        const { id_token } = result.params;
        // Send the ID token to our backend for verification
        const responseUser = await apiGoogleSignIn(id_token);
        await persistUser(responseUser);
        return responseUser;
      } else if (result.type === 'cancel') {
        throw new Error('Google Sign-In was cancelled');
      } else {
        throw new Error('Google Sign-In failed');
      }
    } catch (error) {
      if (error.message.includes('cancelled')) {
        throw error;
      }
      console.error('[Google Login Error]', error);
      throw new Error(error.message || 'Google Sign-In failed. Please try again.');
    }
  };

  // ── Logout ──
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

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
