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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchAllUsers,
  updateUserRole,
  getOccupancyCalendar,
  getPaymentsReport,
  getHousekeeping,
  patchHousekeeping,
  getFeedbackAdmin,
  respondToFeedback,
} from '../services/api';
import { showActionError } from '../utils/errorHandling';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'guest', label: 'Guest' },
];

export default function ManageHubScreen() {
  const [view, setView] = useState('menu');

  if (view === 'menu') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Management</Text>
          <Text style={styles.screenSub}>Super admin tools</Text>
          {[
            { key: 'users', icon: 'people-outline', title: 'User roles', desc: 'Assign admin, staff, or guest' },
            { key: 'calendar', icon: 'calendar-outline', title: 'Room calendar', desc: 'Occupancy & reservations' },
            { key: 'payments', icon: 'wallet-outline', title: 'Payments', desc: 'Monitor payment status' },
            { key: 'housekeeping', icon: 'sparkles-outline', title: 'Housekeeping', desc: 'Room cleaning status' },
            { key: 'feedback', icon: 'chatbubble-outline', title: 'Guest feedback', desc: 'View & respond' },
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
  if (view === 'housekeeping') {
    return <HousekeepingPanel onBack={() => setView('menu')} />;
  }
  if (view === 'feedback') {
    return <FeedbackPanel onBack={() => setView('menu')} />;
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const changeRole = (u) => {
    const buttons = ROLE_OPTIONS.map((r) => ({
      text: r.label,
      onPress: async () => {
        try {
          await updateUserRole(u._id, r.value);
          await load();
          Alert.alert('Updated', `Role set to ${r.label}`);
        } catch (e) {
          showActionError('Role update', e, e.message || 'Could not update role.');
        }
      },
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(u.name || u.email, 'Choose role', buttons);
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
            <TouchableOpacity style={styles.userRow} onPress={() => changeRole(item)} activeOpacity={0.7}>
              <View>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              <Text style={styles.roleBadge}>{item.role}</Text>
            </TouchableOpacity>
          )}
        />
      )}
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

function HousekeepingPanel({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getHousekeeping();
      setRows(data || []);
    } catch (e) {
      showActionError('Housekeeping', e, 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cycleStatus = async (row) => {
    const order = ['clean', 'dirty', 'in_progress'];
    const i = order.indexOf(row.status);
    const next = order[(i + 1) % order.length];
    try {
      await patchHousekeeping(row._id, { status: next });
      await load();
    } catch (e) {
      showActionError('Update', e, 'Could not update status.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PanelHeader title="Housekeeping" onBack={onBack} />
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
            <TouchableOpacity style={styles.card} onPress={() => cycleStatus(item)} activeOpacity={0.7}>
              <Text style={styles.cardTitle}>
                Rm {item.roomDetails?.roomNumber} | {item.roomDetails?.type}
              </Text>
              <Text style={styles.cardMeta}>Status: {item.status}</Text>
              {item.assignedTo?.name ? (
                <Text style={styles.cardMeta}>Assigned: {item.assignedTo.name}</Text>
              ) : null}
              <Text style={styles.tapHint}>Tap to cycle: clean, dirty, in progress</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function FeedbackPanel({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getFeedbackAdmin();
      setRows(data || []);
    } catch (e) {
      showActionError('Feedback', e, 'Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    if (!replyId || !replyText.trim()) return;
    try {
      await respondToFeedback(replyId, replyText.trim());
      setReplyId(null);
      setReplyText('');
      await load();
      Alert.alert('Sent', 'Response saved.');
    } catch (e) {
      showActionError('Reply', e, 'Could not save response.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PanelHeader title="Feedback" onBack={onBack} />
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
              <Text style={styles.cardMeta}>{item.user?.name || item.user?.email}</Text>
              <Text style={styles.feedbackMsg}>{item.message}</Text>
              {item.response ? (
                <Text style={styles.responseText}>Response: {item.response}</Text>
              ) : (
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={() => {
                    setReplyId(item._id);
                    setReplyText('');
                  }}
                >
                  <Text style={styles.replyBtnText}>Respond</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={
            replyId ? (
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Your response"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendReply}>
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
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
  tapHint: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
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
});
