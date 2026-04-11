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

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState('');
  const [recaptchaOpen, setRecaptchaOpen] = useState(false);

  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const clearError = (key) => {
    setErrors(p => ({ ...p, [key]: undefined }));
    setSignupError('');
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!validateEmail(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (!confirmPassword) e.confirm = 'Confirm your password';
    else if (password !== confirmPassword) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = () => {
    setSignupError('');
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
      await register(name.trim(), email.trim(), password, phone.trim(), token);
    } catch (error) {
      setSignupError(error.message || 'Something went wrong');
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
          setSignupError(
            'Security check failed. For dev: set RECAPTCHA_DEV_BYPASS=1 in HotelBackend/.env and restart API; or fix reCAPTCHA keys in Google admin.'
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
          <View style={[styles.header, { marginBottom: isCompact ? 20 : 28 }]}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to get started with{'\n'}Aurora Grand Hotel
            </Text>
          </View>

          {/* Error banner */}
          {signupError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorBannerText}>{signupError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <AuthInput
              icon="person-outline"
              placeholder="Enter your full name"
              value={name}
              onChangeText={(t) => { setName(t); clearError('name'); }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={!!errors.name}
            />
            {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

            <View style={{ height: isCompact ? 10 : 16 }} />

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <AuthInput
              icon="mail-outline"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              keyboardType="email-address"
              inputRef={emailRef}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={!!errors.email}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

            <View style={{ height: isCompact ? 10 : 16 }} />

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number</Text>
            <AuthInput
              icon="call-outline"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              inputRef={phoneRef}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View style={{ height: isCompact ? 10 : 16 }} />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <AuthInput
              icon="lock-closed-outline"
              placeholder="Create a password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
              secureTextEntry
              showToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              inputRef={passwordRef}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={!!errors.password}
            />
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

            <View style={{ height: isCompact ? 10 : 16 }} />

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <AuthInput
              icon="lock-closed-outline"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError('confirm'); }}
              secureTextEntry
              showToggle
              showPassword={showConfirm}
              onTogglePassword={() => setShowConfirm(!showConfirm)}
              inputRef={confirmRef}
              returnKeyType="go"
              onSubmitEditing={handleSignup}
              error={!!errors.confirm}
            />
            {errors.confirm ? <Text style={styles.fieldError}>{errors.confirm}</Text> : null}
          </View>

          {/* Create Account Button */}
          <View style={[styles.buttonContainer, { marginTop: isCompact ? 20 : 28 }]}>
            <AuthButton
              title="Create Account"
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
            />
          </View>

          {/* Footer */}
          <View style={[styles.footer, { marginTop: isCompact ? 16 : 24 }]}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
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
    marginBottom: 20,
  },
  header: {
    marginBottom: 28,
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
    marginBottom: 16,
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
  buttonContainer: {
    marginTop: 28,
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingBottom: 16,
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
