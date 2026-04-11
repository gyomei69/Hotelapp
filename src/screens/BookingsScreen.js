import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getBookings,
  deleteBooking,
  updateBookingStatus,
  confirmBookingPayment,
  patchBookingCheckIn,
  patchBookingCheckOut,
  cancelBookingAdmin,
} from '../services/api';
import { showActionError } from '../utils/errorHandling';
import NotificationBell from '../components/NotificationBell';

const TABS = ['All', 'Pending', 'Approved', 'Confirmed', 'Completed', 'Rejected', 'Cancelled'];

/** Bottom tab bar ~56px + spacing; keeps last cards scrollable above tabs */
const BOTTOM_TAB_CLEARANCE = 72;

export default function BookingsScreen({ setActiveTab, isSuperAdmin = false }) {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const scrollBottomPad = BOTTOM_TAB_CLEARANCE + Math.max(insets.bottom, 8);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBookings();
      setBookings(data);
    } catch (e) {
      console.error('Failed to load bookings:', e);
      showActionError('Bookings Error', e, 'Unable to load bookings right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteBooking(id);
          loadData();
        } catch (e) {
          showActionError('Delete Failed', e, 'Unable to delete booking right now.');
        }
      }},
    ]);
  };

  const handleStatusUpdate = (id, newStatus) => {
    const title = `${newStatus} booking`;
    const message = `Are you sure you want to ${newStatus.toLowerCase()} this booking?`;
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: newStatus,
        onPress: async () => {
          try {
            await updateBookingStatus(id, newStatus);
            loadData();
          } catch (e) {
            showActionError('Update Failed', e, 'Unable to update booking status.');
          }
        },
      },
    ]);
  };

  const handleCheckIn = (id) => {
    Alert.alert('Check-in', 'Mark this guest as checked in?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check in',
        onPress: async () => {
          try {
            await patchBookingCheckIn(id);
            loadData();
          } catch (e) {
            showActionError('Check-in', e, 'Could not record check-in.');
          }
        },
      },
    ]);
  };

  const handleCheckOut = (id) => {
    Alert.alert('Check-out', 'Mark this guest as checked out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check out',
        onPress: async () => {
          try {
            await patchBookingCheckOut(id);
            loadData();
          } catch (e) {
            showActionError('Check-out', e, 'Could not record check-out.');
          }
        },
      },
    ]);
  };

  const handleAdminCancel = (id) => {
    Alert.alert('Cancel booking', 'Cancel this reservation? This cannot be undone from the guest app.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBookingAdmin(id);
            loadData();
          } catch (e) {
            showActionError('Cancel', e, 'Could not cancel booking.');
          }
        },
      },
    ]);
  };

  const handleConfirmPayment = (id) => {
    Alert.alert(
      'Confirm payment',
      'Record that payment was received? This will mark the booking as paid and completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await confirmBookingPayment(id);
              loadData();
              Alert.alert('Success', 'Payment confirmed.');
            } catch (e) {
              showActionError('Confirm failed', e, 'Unable to confirm payment right now.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Approved': return { bg: '#ECFDF5', text: '#10B981' };
      case 'Pending':  return { bg: '#FFF8E1', text: '#FF9500' };
      case 'Rejected': return { bg: '#FEF2F2', text: '#EF4444' };
      case 'Cancelled': return { bg: '#F1F5F9', text: '#64748B' };
      case 'Confirmed': return { bg: '#EEF2FF', text: '#4A5BCC' };
      case 'Completed': return { bg: '#E8FFF0', text: '#15803D' };
      default:         return { bg: '#F0F0F2', text: '#8E8E93' };
    }
  };

  const filtered = bookings.filter(b => {
    if (activeFilter === 'All') return true;
    return b.status === activeFilter;
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F5F5F7' }]}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>{bookings.length} total reservations</Text>
        </View>
        <NotificationBell
          onBookingNotificationPress={() => setActiveTab && setActiveTab('guests')}
        />
      </View>

      {/* Tabs — no fixed maxHeight (was clipping labels / overlapping list) */}
      <View style={styles.tabStrip}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                index < TABS.length - 1 && styles.tabBtnSpacing,
                activeFilter === tab && styles.tabBtnActive,
              ]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeFilter === tab && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map(b => {
          const colors = getStatusColor(b.status);
          const guestName = b.user?.name || 'Unknown Guest';
          const guestEmail = b.user?.email || 'No email';
          const roomName = b.room ? `${b.room.type} (Rm ${b.room.roomNumber})` : 'Room Data Unavailable';

          return (
            <View key={b._id} style={styles.card}>
              {/* Guest row full width; status on its own row (no horizontal squeeze/overlap) */}
              <View style={styles.cardHeader}>
                <View style={styles.guestRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>
                      {guestName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.guestTextCol}>
                    <Text style={styles.guestName} numberOfLines={1} ellipsizeMode="tail">
                      {guestName}
                    </Text>
                    <Text style={styles.guestEmail} numberOfLines={1} ellipsizeMode="tail">
                      {guestEmail}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text
                      style={[styles.statusText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {b.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Booking Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="bed-outline" size={16} color="#8E8E93" style={styles.detailIcon} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Room</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {roomName}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#8E8E93" style={styles.detailIcon} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Check-in</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {formatDate(b.checkInDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="log-out-outline" size={16} color="#8E8E93" style={styles.detailIcon} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Check-out</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {formatDate(b.checkOutDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={16} color="#8E8E93" style={styles.detailIcon} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Total</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      ₱{b.totalAmount?.toLocaleString() || 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Extra Info Row */}
              <View style={styles.extraRow}>
                <View style={[styles.metaChip, styles.metaChipGuests]}>
                  <Ionicons name="people-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText} numberOfLines={1}>
                    {b.guestCount || 1} guests
                  </Text>
                </View>
                <View style={[styles.metaChip, styles.metaChipPayment]}>
                  <Ionicons name="card-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText} numberOfLines={2}>
                    {b.paymentMethod || '—'} · {b.paymentStatus || '—'}
                  </Text>
                </View>
                <Text style={styles.refId} numberOfLines={1}>
                  #{b._id.slice(-6).toUpperCase()}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isSuperAdmin && b.status === 'Pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.approveBtn, styles.actionBtnSpacing]}
                      onPress={() => handleStatusUpdate(b._id, 'Approved')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, styles.actionBtnSpacing]}
                      onPress={() => handleStatusUpdate(b._id, 'Rejected')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                {b.status === 'Approved' && (
                  <TouchableOpacity
                    style={[styles.approveBtn, styles.actionBtnSpacing]}
                    onPress={() => handleConfirmPayment(b._id)}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Confirm Payment</Text>
                  </TouchableOpacity>
                )}
                {['Approved', 'Confirmed', 'Completed'].includes(b.status) &&
                  b.checkInStatus !== 'checked_in' && (
                    <TouchableOpacity
                      style={[styles.approveBtn, styles.actionBtnSpacing, { backgroundColor: '#0F766E' }]}
                      onPress={() => handleCheckIn(b._id)}
                    >
                      <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Check-in</Text>
                    </TouchableOpacity>
                  )}
                {b.checkInStatus === 'checked_in' && b.checkOutStatus !== 'checked_out' && (
                  <TouchableOpacity
                    style={[styles.approveBtn, styles.actionBtnSpacing, { backgroundColor: '#7C3AED' }]}
                    onPress={() => handleCheckOut(b._id)}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Check-out</Text>
                  </TouchableOpacity>
                )}
                {isSuperAdmin && !['Completed', 'Cancelled'].includes(b.status) && (
                  <TouchableOpacity
                    style={[styles.rejectBtn, styles.actionBtnSpacing]}
                    onPress={() => handleAdminCancel(b._id)}
                  >
                    <Text style={styles.rejectBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                {isSuperAdmin && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(b._id)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} bookings found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 8,
    gap: 8,
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B2036' },
  subtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4 },

  tabStrip: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingBottom: 10,
    marginBottom: 4,
    backgroundColor: '#F5F5F7',
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabBtnSpacing: { marginRight: 8 },
  tabBtn: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  tabBtnActive: { backgroundColor: '#1B2036', borderColor: '#1B2036' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  tabTextActive: { color: '#FFFFFF' },

  listScroll: { flex: 1 },
  scroll: { padding: 20, paddingTop: 8 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2,
  },

  cardHeader: { marginBottom: 16 },
  guestRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  guestTextCol: { flex: 1, minWidth: 0 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    width: '100%',
  },
  avatarBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#1B2036' },
  guestName: { fontSize: 16, fontWeight: '700', color: '#1B2036' },
  guestEmail: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  statusText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  detailsGrid: { marginBottom: 14 },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: { marginRight: 10, marginTop: 2 },
  detailTextWrap: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#1B2036', fontWeight: '600' },

  extraRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  metaChipGuests: { alignSelf: 'flex-start' },
  metaChipPayment: { width: '100%' },
  metaChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
    minWidth: 0,
  },
  refId: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  actionBtnSpacing: { marginRight: 10, marginBottom: 8 },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  deleteBtn: { marginLeft: 'auto', padding: 8, marginBottom: 8 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', marginTop: 8 },
});
