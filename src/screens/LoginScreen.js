import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import RecaptchaModal from '../components/RecaptchaModal';
import { shouldSkipRecaptchaWebView, DEV_RECAPTCHA_TOKEN } from '../utils/recaptchaDev';

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [recaptchaOpen, setRecaptchaOpen] = useState(false);

  const passwordRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!validateEmail(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = () => {
    setLoginError('');
    if (!validate()) return;
    if (shouldSkipRecaptchaWebView()) {
      handleRecaptchaToken(DEV_RECAPTCHA_TOKEN);
      return;
    }
    setRecaptchaOpen(true);
  };

  const handleRecaptchaToken = async (token) => {
    setIsLoading(true);
    try {
      await login(email.trim(), password, token);
    } catch (error) {
      setLoginError(error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safe}>
      <RecaptchaModal
        visible={recaptchaOpen}
        onClose={() => setRecaptchaOpen(false)}
        onToken={handleRecaptchaToken}
        onError={() =>
          setLoginError(
            'Security check failed. For Expo dev: EXPO_PUBLIC_SKIP_RECAPTCHA=1 in app .env and RECAPTCHA_DEV_BYPASS=1 in HotelBackend/.env; or fix reCAPTCHA keys / domains in Google admin.'
          )
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: sidePadding,
              paddingTop: Platform.OS === 'android' ? (isCompact ? 24 : 44) : (isCompact ? 8 : 16),
              paddingBottom: isCompact ? 20 : 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back arrow */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1B2036" />
          </TouchableOpacity>

          {/* Header */}
          <View style={[styles.header, { marginBottom: isCompact ? 24 : 36 }]}>
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

            <View style={{ height: isCompact ? 12 : 20 }} />

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
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ForgotPasswordEmail')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <View style={[styles.buttonContainer, { marginTop: isCompact ? 20 : 36 }]}>
            <AuthButton
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
            />
          </View>



          {/* Footer */}
          <View style={[styles.footer, { marginTop: isCompact ? 18 : 28 }]}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
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
  form: {},
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  forgotText: {
    fontSize: 13,
    color: '#4A5BCC',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 36,
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
