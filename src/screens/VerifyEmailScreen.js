import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function VerifyEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!validateEmail(email.trim())) e.email = 'Enter a valid email';
    if (!code.trim()) e.code = 'Verification code is required';
    else if (code.trim().length < 6) e.code = 'Enter the full 6-digit code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    setIsLoading(true);
    // Placeholder — backend email verification would go here
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Success', 'Email verified successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }, 1500);
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
          {/* Back arrow */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1B2036" />
          </TouchableOpacity>

          {/* Card */}
          <View style={styles.card}>
            {/* Header */}
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}your email.
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <AuthInput
              icon="mail-outline"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors(p => ({...p, email: undefined})); }}
              keyboardType="email-address"
              returnKeyType="next"
              error={!!errors.email}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

            <View style={{ height: 22 }} />

            {/* Verification Code */}
            <Text style={styles.label}>Verification Code</Text>
            <AuthInput
              icon="mail-outline"
              placeholder="Enter your Verification Code"
              value={code}
              onChangeText={(t) => { setCode(t); setErrors(p => ({...p, code: undefined})); }}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={handleVerify}
              error={!!errors.code}
            />
            {errors.code ? <Text style={styles.fieldError}>{errors.code}</Text> : null}

            {/* Verify Button */}
            <View style={styles.buttonContainer}>
              <AuthButton
                title="Verify"
                onPress={handleVerify}
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
    marginBottom: 40,
  },
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 28,
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
  buttonContainer: {
    marginTop: 32,
  },
});
