import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { resetPasswordWithToken } from '../services/api';

export default function ResetPasswordScreen({ navigation, route }) {
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
    if (!resetToken) {
      setFormError('Reset session expired. Start again from Forgot Password.');
      return;
    }
    if (!validate()) return;
    setIsLoading(true);
    try {
      await resetPasswordWithToken(resetToken, newPassword, confirmPassword);
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1B2036" />
          </TouchableOpacity>

          <View style={styles.card}>
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

            <View style={{ height: 20 }} />

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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1B2036', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#8E8E93', lineHeight: 22, marginBottom: 28 },
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
  buttonContainer: { marginTop: 32 },
});
