import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, useWindowDimensions, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { verifySecurityCode, SECURITY_CODE_TTL_SEC } from '../services/api';

export default function ForgotPasswordVerifyScreen({ navigation, route }) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;
  const bgTranslateY = Math.round(Math.max(14, Math.min(74, height * 0.1)));
  const bgScale = Math.max(1.14, Math.min(1.26, 1.12 + bgTranslateY / height + 0.08));

  const emailParam = route.params?.email || '';
  const codeTtlSec = route.params?.codeTtlSec ?? SECURITY_CODE_TTL_SEC;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(codeTtlSec);

  React.useEffect(() => {
    setSecondsLeft(codeTtlSec);
  }, [codeTtlSec]);

  React.useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0]);

  const validate = () => {
    const e = {};
    if (!code.trim()) e.code = 'Code is required';
    else if (!/^\d{6}$/.test(code.trim())) e.code = 'Enter the 6-digit code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!emailParam) {
      setFormError('Session expired. Go back and enter your email again.');
      return;
    }
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { changeToken } = await verifySecurityCode(emailParam, code.trim(), 'password_reset');
      if (!changeToken) {
        setFormError('Invalid response from server. Please try again.');
        return;
      }
      navigation.navigate('ResetPassword', { changeToken });
    } catch (error) {
      setFormError(error.message || 'Invalid code');
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
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color="#1B2036" />
              </TouchableOpacity>

              <Text style={styles.title}>Verify code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                {emailParam || 'your email'}.
              </Text>
              {secondsLeft > 0 ? (
                <Text style={styles.timerText}>Code expires in {secondsLeft}s</Text>
              ) : (
                <Text style={styles.timerText}>Code may have expired — request a new one from the previous screen.</Text>
              )}

              {formError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Verification code</Text>
              <AuthInput
                icon="key-outline"
                placeholder="6-digit code"
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 6));
                  setErrors((p) => ({ ...p, code: undefined }));
                  setFormError('');
                }}
                keyboardType="number-pad"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={!!errors.code}
              />
              {errors.code ? <Text style={styles.fieldError}>{errors.code}</Text> : null}

              <View style={styles.buttonContainer}>
                <AuthButton
                  title="Verify"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                />
              </View>
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
  title: { fontSize: 28, fontWeight: '700', color: '#1B2036', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8E8E93', lineHeight: 22, marginBottom: 12, textAlign: 'center' },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5BCC',
    marginBottom: 20,
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
  label: { fontSize: 14, fontWeight: '500', color: '#1B2036', marginBottom: 10 },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 8,
    fontWeight: '500',
  },
  buttonContainer: { marginTop: 22 },
});
