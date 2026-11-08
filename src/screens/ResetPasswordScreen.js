import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert, useWindowDimensions, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { resetPasswordWithToken, changePasswordWithEmailToken } from '../services/api';

export default function ResetPasswordScreen({ navigation, route }) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 760;
  const sidePadding = width < 360 ? 20 : 28;
  const bgTranslateY = Math.round(Math.max(14, Math.min(74, height * 0.1)));
  const bgScale = Math.max(1.14, Math.min(1.26, 1.12 + bgTranslateY / height + 0.08));

  const changeToken = route.params?.changeToken || '';
  const resetToken = route.params?.resetToken || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const confirmRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!newPassword) e.newPassword = 'Password is required';
    else if (newPassword.length < 8) e.newPassword = 'At least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!changeToken && !resetToken) {
      setFormError('Reset session expired. Start again from Forgot Password.');
      return;
    }
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (changeToken) {
        await changePasswordWithEmailToken(changeToken, newPassword, confirmPassword);
      } else {
        await resetPasswordWithToken(resetToken, newPassword, confirmPassword);
      }
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      setFormError(error.message || 'Unable to reset password');
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

              <Text style={styles.title}>New password</Text>
              <Text style={styles.subtitle}>
                Choose a new password (minimum 8 characters).
              </Text>

              {formError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <Text style={styles.label}>New password</Text>
                <AuthInput
                  icon="lock-closed-outline"
                  placeholder="New password"
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setErrors((p) => ({ ...p, newPassword: undefined }));
                    setFormError('');
                  }}
                  secureTextEntry
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  error={!!errors.newPassword}
                />
                {errors.newPassword ? (
                  <Text style={styles.fieldError}>{errors.newPassword}</Text>
                ) : null}

                <View style={{ height: 16 }} />

                <Text style={styles.label}>Confirm password</Text>
                <AuthInput
                  icon="lock-closed-outline"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setErrors((p) => ({ ...p, confirmPassword: undefined }));
                    setFormError('');
                  }}
                  secureTextEntry
                  showToggle
                  showPassword={showConfirm}
                  onTogglePassword={() => setShowConfirm(!showConfirm)}
                  inputRef={confirmRef}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  error={!!errors.confirmPassword}
                />
                {errors.confirmPassword ? (
                  <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
                ) : null}
              </View>

              <View style={styles.buttonContainer}>
                <AuthButton
                  title="Update password"
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
  subtitle: { fontSize: 14, color: '#8E8E93', lineHeight: 22, marginBottom: 18, textAlign: 'center' },
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
  form: { width: '100%' },
  buttonContainer: { marginTop: 22 },
});
