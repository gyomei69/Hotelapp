import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchAllUsers,
  updateUserRole,
  getOccupancyCalendar,
  getPaymentsReport,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showActionError } from '../utils/errorHandling';
import ActivityLogsScreen from './ActivityLogsScreen';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', desc: 'Full system access', icon: 'shield-checkmark-outline' },
  { value: 'staff', label: 'Staff', desc: 'Bookings & operations', icon: 'briefcase-outline' },
];

export default function ManageHubScreen() {
  const [view, setView] = useState('menu');

  if (view === 'menu') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Management</Text>
          <Text style={styles.screenSub}>Admin tools</Text>
          {[
            { key: 'users', icon: 'people-outline', title: 'User roles', desc: 'Assign Admin, Staff, or Guest' },
            { key: 'calendar', icon: 'calendar-outline', title: 'Room calendar', desc: 'Occupancy & reservations' },
            { key: 'payments', icon: 'wallet-outline', title: 'Payments', desc: 'Monitor payment status' },
            { key: 'activityLogs', icon: 'list-outline', title: 'Activity logs', desc: 'Audit trail' },
          ].map((row) => (
            <TouchableOpacity
              key={row.key}
              style={styles.menuCard}
              onPress={() => setView(row.key)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={row.icon} size={22} color="#4A5BCC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{row.title}</Text>
                <Text style={styles.menuDesc}>{row.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === 'users') {
    return <UsersPanel onBack={() => setView('menu')} />;
  }
  if (view === 'calendar') {
    return <CalendarPanel onBack={() => setView('menu')} />;
  }
  if (view === 'payments') {
    return <PaymentsPanel onBack={() => setView('menu')} />;
  }
  if (view === 'activityLogs') {
    return <ActivityLogsScreen onGoBack={() => setView('menu')} />;
  }

  return null;
}

function PanelHeader({ title, onBack }) {
  return (
    <View style={styles.panelHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backHit} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color="#1B2036" />
      </TouchableOpacity>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

function UsersPanel({ onBack }) {
  const { user: authUser, refreshSession } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [savingRole, setSavingRole] = useState(false);
  const [credUser, setCredUser] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (e) {
      showActionError('Users', e, 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeRoleModal = () => {
    if (!savingRole) setRoleModalUser(null);
  };

  const applyRole = async (roleValue, roleLabel) => {
    if (!roleModalUser || savingRole) return;
    try {
      setSavingRole(true);
      await updateUserRole(roleModalUser._id, roleValue);
      if (authUser && String(roleModalUser._id) === String(authUser._id)) {
        await refreshSession();
      }
      await load();
      setRoleModalUser(null);
      Alert.alert('Updated', `Role set to ${roleLabel}`);
    } catch (e) {
      showActionError('Role update', e, e.message || 'Could not update role.');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PanelHeader title="User roles" onBack={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4A5BCC" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <TouchableOpacity
                style={{ flex: 1, paddingRight: 10 }}
                onPress={() => setRoleModalUser(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCredUser(item)}
                style={styles.credBtn}
                accessibilityRole="button"
                accessibilityLabel="View user credentials"
              >
                <Ionicons name="eye-outline" size={20} color="#4A5BCC" />
              </TouchableOpacity>

              <Text style={styles.roleBadge}>
                {item.role === 'admin' ? 'Admin' : item.role === 'staff' ? 'Staff' : item.role === 'guest' ? 'Guest' : item.role}
              </Text>
            </View>
          )}
        />
      )}

      <Modal
        visible={roleModalUser != null}
        transparent
        animationType="fade"
        onRequestClose={closeRoleModal}
      >
        <View style={styles.roleModalOverlay}>
          <Pressable style={styles.roleModalBackdrop} onPress={closeRoleModal} />
          <View style={styles.roleModalCard}>
            <TouchableOpacity
              style={styles.roleModalBackRow}
              onPress={closeRoleModal}
              disabled={savingRole}
              activeOpacity={0.7}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color="#4A5BCC" />
              <Text style={styles.roleModalBackText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.roleModalTitle}>Assign role</Text>
            <Text style={styles.roleModalUserName} numberOfLines={1}>
              {roleModalUser?.name || 'User'}
            </Text>
            <Text style={styles.roleModalUserEmail} numberOfLines={1}>
              {roleModalUser?.email}
            </Text>

            <View style={styles.roleModalDivider} />

            {ROLE_OPTIONS.map((r) => {
              const isCurrent = roleModalUser?.role === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleOptionRow, isCurrent && styles.roleOptionRowCurrent]}
                  onPress={() => applyRole(r.value, r.label)}
                  disabled={savingRole || isCurrent}
                  activeOpacity={0.65}
                >
                  <View style={styles.roleOptionIconWrap}>
                    <Ionicons name={r.icon} size={22} color={isCurrent ? '#4A5BCC' : '#64748B'} />
                  </View>
                  <View style={styles.roleOptionTextCol}>
                    <Text style={[styles.roleOptionLabel, isCurrent && styles.roleOptionLabelCurrent]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                  </View>
                  {isCurrent ? (
                    <Ionicons name="checkmark-circle" size={22} color="#4A5BCC" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              );
            })}

            {savingRole ? (
              <View style={styles.roleModalSaving}>
                <ActivityIndicator color="#4A5BCC" size="small" />
                <Text style={styles.roleModalSavingText}>Saving…</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={credUser != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCredUser(null)}
      >
        <View style={styles.roleModalOverlay}>
          <Pressable style={styles.roleModalBackdrop} onPress={() => setCredUser(null)} />
          <View style={styles.roleModalCard}>
            <Text style={styles.roleModalTitle}>User credentials</Text>
            <Text style={styles.roleModalUserName} numberOfLines={1}>
              {credUser?.name || 'User'}
            </Text>
            <Text style={styles.roleModalUserEmail} numberOfLines={1}>
              {credUser?.email || '—'}
            </Text>
            <View style={styles.roleModalDivider} />

            <Text style={styles.credRow}><Text style={styles.credLabel}>Phone:</Text> {credUser?.phone || '—'}</Text>
            <Text style={styles.credRow}><Text style={styles.credLabel}>Provider:</Text> {credUser?.provider || '—'}</Text>
            <Text style={styles.credRow}><Text style={styles.credLabel}>Verified:</Text> {credUser?.isVerified ? 'Yes' : 'No'}</Text>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setCredUser(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CalendarPanel({ onBack }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { bookings: b } = await getOccupancyCalendar();
        setBookings(b || []);
      } catch (e) {
        showActionError('Calendar', e, 'Could not load calendar.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <PanelHeader title="Room calendar" onBack={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4A5BCC" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.room?.type} | Rm {item.room?.roomNumber}
              </Text>
              <Text style={styles.cardMeta}>
                {item.user?.name} | {item.status}
              </Text>
              <Text style={styles.cardMeta}>
                {new Date(item.checkInDate).toLocaleDateString()} to{' '}
                {new Date(item.checkOutDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No active reservations.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function PaymentsPanel({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPaymentsReport();
        setRows(data || []);
      } catch (e) {
        showActionError('Payments', e, 'Could not load payments.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <PanelHeader title="Payments" onBack={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4A5BCC" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {'\u20b1'}
                {Number(item.totalAmount || 0).toLocaleString()}
              </Text>
              <Text style={styles.cardMeta}>
                {item.user?.name} | {item.paymentStatus} | {item.status}
              </Text>
              <Text style={styles.cardMeta}>
                {item.room ? `${item.room.type} ${item.room.roomNumber}` : '—'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  scroll: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 16 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#1B2036' },
  screenSub: { fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 16 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#1B2036' },
  menuDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 8,
    paddingBottom: 12,
    backgroundColor: '#F5F5F7',
  },
  backHit: { padding: 4 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1B2036' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { padding: 16, paddingBottom: 40 },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userName: { fontSize: 16, fontWeight: '600', color: '#1B2036' },
  userEmail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  roleBadge: { fontSize: 13, fontWeight: '600', color: '#4A5BCC', textTransform: 'capitalize' },
  credBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DDE3FF',
  },
  credRow: { fontSize: 14, color: '#1B2036', marginTop: 8 },
  credLabel: { fontWeight: '700', color: '#1B2036' },
  closeBtn: {
    marginTop: 18,
    backgroundColor: '#1B2036',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1B2036' },
  cardMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 24 },
  feedbackMsg: { fontSize: 15, color: '#1B2036', marginTop: 8, lineHeight: 22 },
  responseText: { fontSize: 14, color: '#059669', marginTop: 8 },
  replyBtn: { marginTop: 10, alignSelf: 'flex-start' },
  replyBtnText: { color: '#4A5BCC', fontWeight: '600' },
  replyBox: { marginTop: 16, padding: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  sendBtn: {
    marginTop: 10,
    backgroundColor: '#1B2036',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendBtnText: { color: '#FFFFFF', fontWeight: '600' },

  roleModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  roleModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  roleModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  roleModalBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 8,
  },
  roleModalBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5BCC',
    marginLeft: 8,
  },
  roleModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  roleModalUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B2036',
  },
  roleModalUserEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 4,
  },
  roleModalDivider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 16,
  },
  roleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  roleOptionRowCurrent: {
    backgroundColor: '#EEF0FF',
    borderColor: '#C7D2FE',
  },
  roleOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleOptionTextCol: { flex: 1, minWidth: 0 },
  roleOptionLabel: { fontSize: 16, fontWeight: '700', color: '#1B2036' },
  roleOptionLabelCurrent: { color: '#1B2036' },
  roleOptionDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  roleModalSaving: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  roleModalSavingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 10,
  },
});
