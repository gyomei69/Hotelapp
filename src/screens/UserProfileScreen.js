import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform,
  TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { showActionError } from '../utils/errorHandling';
import { normalizePhMobile, isValidPhMobileE164 } from '../utils/normalizePhPhone';
import {
  changePassword as changePasswordApi,
  submitFeedback,
} from '../services/api';
import NotificationBell from '../components/NotificationBell';
import { handleGuestNotificationNavigate } from '../utils/notificationNavigation';
import { guestPalette } from '../theme/guestPalette';

export default function UserProfileScreen({ setActiveTab }) {
  const { user, logout, updateProfile } = useAuth();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = React.useState(false);
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [address, setAddress] = React.useState(user?.address || '');
  const [saving, setSaving] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [feedbackSending, setFeedbackSending] = React.useState(false);

  React.useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
  }, [user]);

  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    if (!name.trim()) {
      showActionError('Validation Error', 'Name is required', 'Please enter your name.');
      return;
    }
    const emailTrim = email.trim().toLowerCase();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      showActionError('Validation Error', 'Invalid email', 'Please enter a valid email address.');
      return;
    }
    const phoneTrim = phone.trim();
    const normalizedPhone = phoneTrim ? normalizePhMobile(phoneTrim) : '';
    if (phoneTrim && !isValidPhMobileE164(normalizedPhone)) {
      showActionError('Validation Error', 'Invalid phone number', 'Use PH mobile format: +63 9XXXXXXXXX');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: emailTrim,
        phone: normalizedPhone,
        address: address.trim(),
      });
      setModalVisible(false);
    } catch (error) {
      showActionError('Update Failed', error, 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordModalVisible(true);
  };

  const resetPasswordModal = () => {
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      showActionError('Validation', 'Invalid new password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showActionError('Validation', 'Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (!currentPassword) {
      showActionError('Validation', 'Current password is required', 'Enter your current password.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePasswordApi(currentPassword, newPassword, confirmPassword);
      resetPasswordModal();
      Alert.alert('Success', 'Your password has been updated.');
    } catch (error) {
      showActionError('Update Failed', error, error.message || 'Unable to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerTitle, styles.headerTitleCenter]}>Profile</Text>
          <View style={styles.headerBellWrap}>
            <NotificationBell
              iconColor={guestPalette.text}
              onNotificationNavigate={(item) => handleGuestNotificationNavigate(setActiveTab, item)}
            />
          </View>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'admin' ? 'Admin' : user?.role === 'staff' ? 'Staff' : 'Guest'}
            </Text>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="mail-outline" label="Email" value={user?.email || 'user@hotel.com'} />
            <View style={styles.divider} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone || '—'} />
            <View style={styles.divider} />
            <InfoRow icon="location-outline" label="Address" value={user?.address?.trim() || '—'} />
          </View>

          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={() => setModalVisible(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="lock-closed-outline"
              label="Change Password"
              onPress={openPasswordModal}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="chatbubble-outline"
              label="Send feedback"
              onPress={() => setFeedbackModalVisible(true)}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={guestPalette.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="+63 9XXXXXXXXX"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="Street, city, region"
            />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={guestPalette.card} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={resetPasswordModal}>
                <Ionicons name="close" size={22} color={guestPalette.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={styles.passwordInput}
                placeholder="Current password"
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={guestPalette.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.passwordInput}
                placeholder="At least 8 characters"
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={guestPalette.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.passwordInput}
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={guestPalette.muted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, passwordSaving && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <ActivityIndicator color={guestPalette.card} />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={feedbackModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send feedback</Text>
              <TouchableOpacity
                onPress={() => {
                  setFeedbackModalVisible(false);
                  setFeedbackText('');
                }}
              >
                <Ionicons name="close" size={22} color={guestPalette.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              placeholder="Tell us about your stay..."
              multiline
            />
            <TouchableOpacity
              style={[styles.saveBtn, feedbackSending && { opacity: 0.7 }]}
              disabled={feedbackSending}
              onPress={async () => {
                if (!feedbackText.trim()) {
                  showActionError('Feedback', '', 'Please enter a message.');
                  return;
                }
                setFeedbackSending(true);
                try {
                  await submitFeedback(feedbackText.trim());
                  setFeedbackModalVisible(false);
                  setFeedbackText('');
                  Alert.alert('Thank you', 'Your feedback was submitted.');
                } catch (e) {
                  showActionError('Feedback', e, 'Could not send feedback.');
                } finally {
                  setFeedbackSending(false);
                }
              }}
            >
              {feedbackSending ? (
                <ActivityIndicator color={guestPalette.card} />
              ) : (
                <Text style={styles.saveBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={guestPalette.accent} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingsRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.6} onPress={onPress}>
      <Ionicons name={icon} size={20} color={guestPalette.accent} style={styles.settingsIconStyle} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={guestPalette.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: guestPalette.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 20,
    backgroundColor: guestPalette.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: guestPalette.text,
  },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerBellWrap: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: guestPalette.surface,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: guestPalette.accentSoft,
    borderWidth: 2,
    borderColor: guestPalette.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: guestPalette.accent,
  },
  avatarInfo: {},
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: guestPalette.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: guestPalette.muted,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: guestPalette.accent,
    marginBottom: 14,
  },

  infoCard: {
    backgroundColor: guestPalette.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIcon: { marginRight: 14 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: guestPalette.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: guestPalette.text,
  },
  divider: {
    height: 1,
    backgroundColor: guestPalette.cardBorder,
    marginLeft: 34,
  },

  editBtn: {
    backgroundColor: guestPalette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  editBtnText: {
    color: guestPalette.card,
    fontSize: 15,
    fontWeight: '600',
  },

  settingsCard: {
    backgroundColor: guestPalette.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingsIconStyle: { marginRight: 14 },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: guestPalette.text,
  },

  logoutContainer: {
    paddingHorizontal: 24,
    marginTop: 36,
    marginBottom: 40,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: guestPalette.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: guestPalette.dangerBg,
  },
  logoutText: {
    color: guestPalette.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: guestPalette.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: guestPalette.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: guestPalette.text,
  },
  inputLabel: {
    fontSize: 13,
    color: guestPalette.muted,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: guestPalette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: guestPalette.text,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: guestPalette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: guestPalette.text,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: guestPalette.accent,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  saveBtnText: {
    color: guestPalette.card,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: guestPalette.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: guestPalette.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  linkText: {
    color: guestPalette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  inputMuted: {
    fontSize: 12,
    color: guestPalette.muted,
    marginTop: 8,
    lineHeight: 18,
  },
});
