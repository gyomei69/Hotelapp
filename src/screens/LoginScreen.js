import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, useWindowDimensions, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import GoogleLoginButton from '../components/GoogleLoginButton';

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;
  // Push image down so the bottom watermark is cropped off-screen (responsive).
  const bgTranslateY = Math.round(Math.max(14, Math.min(74, height * 0.1)));
  // Scale up enough so translating doesn't leave an empty strip at the top.
  const bgScale = Math.max(1.14, Math.min(1.26, 1.12 + bgTranslateY / height + 0.08));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');

  const passwordRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!validateEmail(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setLoginError('');
    if (isLoading) return;
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(email.trim(), password, true);
    } catch (error) {
      setLoginError(error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/signup.png')}
      style={styles.bg}
      resizeMode="cover"
      imageStyle={[
        styles.bgImage,
        {
          transform: [{ scale: bgScale }, { translateY: bgTranslateY }],
        },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.bgOverlay} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingHorizontal: sidePadding,
                paddingTop: Platform.OS === 'android' ? (isCompact ? 16 : 28) : (isCompact ? 6 : 12),
                paddingBottom: isCompact ? 18 : 28,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* Back arrow */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  if (navigation.canGoBack()) return navigation.goBack();
                  return navigation.navigate('Welcome');
                }}
              >
                <Ionicons name="arrow-back" size={22} color="#1B2036" />
              </TouchableOpacity>

              {/* Header */}
              <View style={[styles.header, { marginBottom: isCompact ? 18 : 26 }]}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue to Aurora Grand Hotel</Text>
              </View>

              {/* Error banner */}
              {loginError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{loginError}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={styles.form}>
                <Text style={styles.label}>Email Address</Text>
                <AuthInput
                  icon="mail-outline"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors(p => ({...p, email: undefined})); setLoginError(''); }}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={!!errors.email}
                />
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

                <View style={{ height: isCompact ? 10 : 16 }} />

                <Text style={styles.label}>Password</Text>
                <AuthInput
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors(p => ({...p, password: undefined})); setLoginError(''); }}
                  secureTextEntry
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  inputRef={passwordRef}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  error={!!errors.password}
                />
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

                {/* Forgot Password */}
                <View style={styles.forgotRow}>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <View style={[styles.buttonContainer, { marginTop: isCompact ? 16 : 22 }]}>
                <AuthButton
                  title="Login"
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={isLoading}
                />
              </View>

              {/* Google Sign-In */}
              <View style={[styles.googleContainer, { marginTop: 12 }]}>
                <GoogleLoginButton
                  disabled={isLoading}
                  onBeforePress={() => setLoginError('')}
                  onError={(msg) => setLoginError(msg)}
                />
              </View>

              {/* Footer */}
              <View style={[styles.footer, { marginTop: isCompact ? 14 : 18 }]}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  bgImage: {
    // Avoid looking "stretched" by keeping it centered.
    resizeMode: 'cover',
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
  },
  header: {
    marginBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1B2036',
    marginBottom: 10,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 8,
    fontWeight: '500',
  },
  forgotRow: { marginTop: 14, alignItems: 'flex-end' },
  forgotText: {
    fontSize: 13,
    color: '#4A5BCC',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 36,
    paddingHorizontal: 12,
  },
  googleContainer: {
    paddingHorizontal: 12,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5BCC',
  },
});
