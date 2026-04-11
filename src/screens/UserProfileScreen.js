import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform,
  TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { showActionError } from '../utils/errorHandling';
import { changePassword as changePasswordApi, submitFeedback } from '../services/api';
import NotificationBell from '../components/NotificationBell';

export default function UserProfileScreen({ setActiveTab }) {
  const { user, logout, updateProfile } = useAuth();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = React.useState(false);
  const [name, setName] = React.useState(user?.name || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [saving, setSaving] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [feedbackSending, setFeedbackSending] = React.useState(false);

  React.useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
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
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setModalVisible(false);
    } catch (error) {
      showActionError('Update Failed', error, 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showActionError('Validation', 'Current password is required', 'Enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showActionError('Validation', 'Invalid new password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showActionError('Validation', 'Mismatch', 'New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePasswordApi(currentPassword, newPassword, confirmPassword);
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
              iconColor="#FFFFFF"
              onBookingNotificationPress={() => setActiveTab && setActiveTab('mybookings')}
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
            <Text style={styles.userRole}>Guest</Text>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="mail-outline" label="Email" value={user?.email || 'user@hotel.com'} />
            <View style={styles.divider} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone || '+1234 567 8900'} />
            <View style={styles.divider} />
            <InfoRow icon="location-outline" label="Location" value="Malaybalay City" />
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
              onPress={() => setPasswordModalVisible(true)}
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
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
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
                <Ionicons name="close" size={22} color="#1B2036" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" />
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Your phone" keyboardType="phone-pad" />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Ionicons name="close" size={22} color="#1B2036" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              placeholder="Current password"
              secureTextEntry
            />
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              placeholder="At least 8 characters"
              secureTextEntry
            />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              placeholder="Confirm new password"
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.saveBtn, passwordSaving && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <ActivityIndicator color="#FFFFFF" />
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
                <Ionicons name="close" size={22} color="#1B2036" />
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
                <ActivityIndicator color="#FFFFFF" />
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
      <Ionicons name={icon} size={20} color="#8E8E93" style={styles.infoIcon} />
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
      <Ionicons name={icon} size={20} color="#1B2036" style={styles.settingsIconStyle} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 20,
    backgroundColor: '#1B2036',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1B2036',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF20',
    borderWidth: 2,
    borderColor: '#FFFFFF40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarInfo: {},
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#FFFFFF99',
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 14,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B2036',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F2',
    marginLeft: 34,
  },

  editBtn: {
    backgroundColor: '#1B2036',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#1B2036',
  },

  logoutContainer: {
    paddingHorizontal: 24,
    marginTop: 36,
    marginBottom: 40,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
    color: '#1B2036',
  },
  inputLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1B2036',
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: '#1B2036',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
