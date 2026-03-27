import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView, Platform,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBookings, deleteBooking, updateBookingStatus } from '../services/api';

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function BookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBookings();
      setBookings(data);
    } catch (e) {
      console.error('Failed to load bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteBooking(id); loadData(); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleStatusUpdate = (id, newStatus) => {
    Alert.alert(
      `${newStatus} Booking`,
      `Are you sure you want to ${newStatus.toLowerCase()} this booking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: newStatus, onPress: async () => {
          try {
            await updateBookingStatus(id, newStatus);
            loadData();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }},
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
        <Text style={styles.title}>Booking Management</Text>
        <Text style={styles.subtitle}>{bookings.length} total bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeFilter === tab && styles.tabBtnActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[
              styles.tabText,
              activeFilter === tab && styles.tabTextActive,
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map(b => {
          const colors = getStatusColor(b.status);
          const guestName = b.user?.name || 'Unknown Guest';
          const guestEmail = b.user?.email || 'No email';
          const roomName = b.room ? `${b.room.type} (Rm ${b.room.roomNumber})` : 'Room Data Unavailable';

          return (
            <View key={b._id} style={styles.card}>
              {/* Card Header: Guest Info + Status */}
              <View style={styles.cardHeader}>
                <View style={styles.guestRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>
                      {guestName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{guestName}</Text>
                    <Text style={styles.guestEmail}>{guestEmail}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.statusText, { color: colors.text }]}>{b.status}</Text>
                </View>
              </View>

              {/* Booking Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="bed-outline" size={16} color="#8E8E93" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Room</Text>
                    <Text style={styles.detailValue}>{roomName}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Check-in</Text>
                    <Text style={styles.detailValue}>{formatDate(b.checkInDate)}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="log-out-outline" size={16} color="#8E8E93" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Check-out</Text>
                    <Text style={styles.detailValue}>{formatDate(b.checkOutDate)}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={16} color="#8E8E93" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Total</Text>
                    <Text style={styles.detailValue}>${b.totalAmount?.toLocaleString() || 0}</Text>
                  </View>
                </View>
              </View>

              {/* Extra Info Row */}
              <View style={styles.extraRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="people-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText}>{b.guestCount || 1} guests</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="card-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText}>{b.paymentMethod || 'Cash'}</Text>
                </View>
                <Text style={styles.refId}>#{b._id.slice(-6).toUpperCase()}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {b.status === 'Pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleStatusUpdate(b._id, 'Approved')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleStatusUpdate(b._id, 'Rejected')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(b._id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
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

  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B2036' },
  subtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4 },

  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12,
  },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8E8',
  },
  tabBtnActive: { backgroundColor: '#1B2036', borderColor: '#1B2036' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  tabTextActive: { color: '#FFFFFF' },

  scroll: { padding: 20, paddingTop: 0, paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2,
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  guestRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  avatarBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#1B2036' },
  guestName: { fontSize: 16, fontWeight: '700', color: '#1B2036' },
  guestEmail: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },

  detailsGrid: { gap: 12, marginBottom: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTextWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#1B2036', fontWeight: '600' },

  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F2' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaChipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  refId: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginLeft: 'auto' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F2' },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  deleteBtn: { marginLeft: 'auto', padding: 8 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', marginTop: 8 },
});
