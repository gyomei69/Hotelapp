import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { verifyPasswordResetCode } from '../services/api';

export default function ForgotPasswordVerifyScreen({ navigation, route }) {
  const emailParam = route.params?.email || '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

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
      const { resetToken } = await verifyPasswordResetCode(emailParam, code.trim());
      if (!resetToken) {
        setFormError('Invalid response from server. Please try again.');
        return;
      }
      navigation.navigate('ResetPassword', { resetToken });
    } catch (error) {
      setFormError(error.message || 'Invalid code');
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
            <Text style={styles.title}>Verify code</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              {emailParam || 'your email'}.
            </Text>

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
