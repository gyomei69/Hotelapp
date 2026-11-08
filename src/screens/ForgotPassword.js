import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import {
  postForgotPassword,
  verifySecurityCode,
  changePasswordWithEmailToken,
  SECURITY_CODE_TTL_SEC,
} from '../services/api';

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ForgotPassword({ navigation }) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;
  // Match Sign in/Sign up background behavior (hide watermark + avoid top gaps).
  const bgTranslateY = Math.round(Math.max(14, Math.min(74, height * 0.1)));
  const bgScale = Math.max(1.14, Math.min(1.26, 1.12 + bgTranslateY / height + 0.08));

  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(60);
  const [changeToken, setChangeToken] = useState('');

  const ttlSec = SECURITY_CODE_TTL_SEC;

  const canResend = timer <= 0 && !isLoading;
  const safeEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (step !== 2) return undefined;
    if (timer <= 0) return undefined;
    const id = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const validateStep1 = () => {
    const e = {};
    if (!safeEmail) e.email = 'Email is required';
    else if (!validateEmail(safeEmail)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!/^\d{6}$/.test(code.trim())) e.code = 'Enter the 6-digit code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (!newPassword) e.newPassword = 'Password is required';
    else if (newPassword.length < 6) e.newPassword = 'Minimum 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async ({ isResend = false } = {}) => {
    if (isLoading) return;
    if (!validateStep1()) return;
    setIsLoading(true);
    try {
      await postForgotPassword(safeEmail);
      setStep(2);
      setTimer(60);
      if (!isResend) {
        Alert.alert('Code sent', `We sent a 6-digit code to ${safeEmail}. It expires in ${Math.floor(ttlSec / 60)} minutes.`);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isLoading) return;
    if (!validateStep2()) return;
    setIsLoading(true);
    try {
      const res = await verifySecurityCode(safeEmail, code.trim(), 'password_reset');
      if (!res?.changeToken) {
        Alert.alert('Error', 'Invalid response from server. Try again.');
        return;
      }
      setChangeToken(res.changeToken);
      setStep(3);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (isLoading) return;
    if (!validateStep3()) return;
    if (!changeToken) {
      Alert.alert('Error', 'Reset session expired. Start again.');
      setStep(1);
      return;
    }
    setIsLoading(true);
    try {
      await changePasswordWithEmailToken(changeToken, newPassword, confirmPassword);
      Alert.alert('Success', 'Password updated successfully', [
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Unable to reset password');
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
        { transform: [{ scale: bgScale }, { translateY: bgTranslateY }] },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.bgOverlay} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#1B2036" />
              </TouchableOpacity>

              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'Enter your registered email. We will send a 6-digit code.'
                  : step === 2
                    ? `Enter the 6-digit code sent to\n${safeEmail || 'your email'}.`
                    : 'Choose a new password.'}
              </Text>

            {step === 1 ? (
              <>
                <Text style={styles.label}>Email Address</Text>
                <AuthInput
                  icon="mail-outline"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  keyboardType="email-address"
                  returnKeyType="go"
                  onSubmitEditing={() => handleSend({ isResend: false })}
                  error={!!errors.email}
                />
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

                <View style={styles.buttonContainer}>
                  <AuthButton title="Send Code" onPress={() => handleSend({ isResend: false })} loading={isLoading} disabled={isLoading} />
                </View>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.timerText}>
                  {timer > 0 ? `Resend available in ${timer}s` : 'Didn’t get a code?'}
                </Text>
                <Text style={styles.label}>Verification Code</Text>
                <AuthInput
                  icon="key-outline"
                  placeholder="6-digit code"
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, '').slice(0, 6));
                    setErrors((p) => ({ ...p, code: undefined }));
                  }}
                  keyboardType="number-pad"
                  returnKeyType="go"
                  onSubmitEditing={handleVerify}
                  error={!!errors.code}
                />
                {errors.code ? <Text style={styles.fieldError}>{errors.code}</Text> : null}

                <View style={styles.buttonContainer}>
                  <AuthButton title="Verify Code" onPress={handleVerify} loading={isLoading} disabled={isLoading} />
                </View>

                <TouchableOpacity
                  style={[styles.resendBtn, !canResend && styles.resendBtnDisabled]}
                  disabled={!canResend}
                  onPress={() => handleSend({ isResend: true })}
                >
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.label}>New Password</Text>
                <AuthInput
                  icon="lock-closed-outline"
                  placeholder="New password"
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setErrors((p) => ({ ...p, newPassword: undefined }));
                  }}
                  secureTextEntry
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((v) => !v)}
                  returnKeyType="next"
                  error={!!errors.newPassword}
                />
                {errors.newPassword ? <Text style={styles.fieldError}>{errors.newPassword}</Text> : null}

                <View style={{ height: 18 }} />

                <Text style={styles.label}>Confirm Password</Text>
                <AuthInput
                  icon="lock-closed-outline"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }}
                  secureTextEntry
                  showToggle
                  showPassword={showConfirm}
                  onTogglePassword={() => setShowConfirm((v) => !v)}
                  returnKeyType="go"
                  onSubmitEditing={handleReset}
                  error={!!errors.confirmPassword}
                />
                {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}

                <View style={styles.buttonContainer}>
                  <AuthButton title="Reset Password" onPress={handleReset} loading={isLoading} disabled={isLoading} />
                </View>
              </>
            ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgImage: { resizeMode: 'cover', width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.12)' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
    justifyContent: 'center',
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
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1B2036', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8E8E93', lineHeight: 22, marginBottom: 22 },
  label: { fontSize: 14, fontWeight: '500', color: '#1B2036', marginBottom: 10 },
  fieldError: { color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 8, fontWeight: '500' },
  buttonContainer: { marginTop: 22, paddingHorizontal: 12 },
  timerText: { fontSize: 13, fontWeight: '600', color: '#4A5BCC', marginBottom: 14 },
  resendBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 12 },
  resendBtnDisabled: { opacity: 0.6 },
  resendText: { fontSize: 13, fontWeight: '600', color: '#4A5BCC' },
});

