import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getBookingsPaginated,
  deleteBooking,
  putBookingApprove,
  putBookingReject,
  confirmBookingPayment,
  patchBookingCheckIn,
  patchBookingCheckOut,
  putBookingComplete,
  cancelBookingAdmin,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showActionError } from '../utils/errorHandling';
import NotificationBell from '../components/NotificationBell';
import { handleStaffNotificationNavigate } from '../utils/notificationNavigation';
import { formatBookingDateTime } from '../utils/formatBookingDateTime';
import { useIsMountedRef } from '../utils/useIsMountedRef';

const TABS = [
  'Pending',
  'Approved',
  'Confirmed',
  'Checked-In',
  'Checked-Out',
  'Completed',
  'Rejected',
  'Cancelled',
];

/** Bottom tab bar ~56px + spacing; keeps last cards scrollable above tabs */
const BOTTOM_TAB_CLEARANCE = 72;

function startOfDayTs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Guest chose cash (or legacy) — staff must confirm before Paid. */
function canStaffConfirmPayment(b) {
  return (
    b.booking_status === 'Approved' &&
    ['Pending', 'Pending Payment at Hotel'].includes(b.paymentStatus || '')
  );
}

function canStaffCheckIn(b) {
  const paid = b.paymentStatus === 'Paid';
  // Allow check-in from Confirmed, or Approved if already marked Paid (legacy/edge).
  if (b.booking_status === 'Confirmed') return true;
  if (b.booking_status === 'Approved' && paid) return true;
  return false;
}

function canStaffManualCheckOut(b) {
  return b.booking_status === 'Checked-In';
}

function canStaffAutoCheckOutDue(b) {
  if (!canStaffManualCheckOut(b)) return false;
  const today = startOfDayTs(new Date());
  return today >= startOfDayTs(b.checkOutDate);
}

function canStaffMarkCompleted(b) {
  return b.booking_status === 'Checked-Out';
}

function userCanOperateBookings(user) {
  const r = String(user?.role ?? '').trim().toLowerCase();
  return r === 'admin' || r === 'staff';
}

export default function BookingsScreen({ setActiveTab, isSuperAdmin = false }) {
  const { user } = useAuth();
  const canOperateBookings = userCanOperateBookings(user);
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const scrollBottomPad = BOTTOM_TAB_CLEARANCE + Math.max(insets.bottom, 8);
  const autoCheckoutInFlightRef = useRef(false);
  const loadAbortRef = useRef(null);
  const mountedRef = useIsMountedRef();

  const loadData = useCallback(async () => {
    // Cancel any previous in-flight list load to prevent overlap + setState after unmount.
    try {
      loadAbortRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    const controller = new AbortController();
    loadAbortRef.current = controller;

    try {
      setLoading(true);
      const status = activeFilter;
      const resp = await getBookingsPaginated({ page, limit: 10, status, signal: controller.signal });
      const rows = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
      // Hard clamp to 10 for UX safety even if backend misbehaves.
      const normalized = rows.map((b) => ({
        ...b,
        booking_status: b.booking_status || b.status || 'Pending',
      }));
      if (!mountedRef.current || controller.signal.aborted) return;
      setBookings(normalized.slice(0, 10));
      setTotalPages(Number(resp?.totalPages) || 1);

      // Auto check-out: if stay is checked-in and checkout date is reached,
      // automatically trigger check-out so it moves to the Checked-Out tab.
      if (canOperateBookings && !autoCheckoutInFlightRef.current && Array.isArray(rows)) {
        const dueForAutoCheckout = rows.filter((b) => canStaffAutoCheckOutDue(b));
        if (dueForAutoCheckout.length) {
          autoCheckoutInFlightRef.current = true;
          try {
            // Sequential to avoid spamming the backend.
            // Each call records activity + sends the guest notification.
            for (const b of dueForAutoCheckout) {
              // eslint-disable-next-line no-await-in-loop
              await patchBookingCheckOut(b._id);
            }
            if (mountedRef.current && activeFilter === 'Checked-In') {
              setActiveFilter('Checked-Out');
            }
            const refreshed = await getBookingsPaginated({ page, limit: 10, status, signal: controller.signal });
            const refreshedRows = Array.isArray(refreshed?.data) ? refreshed.data : [];
            const refreshedNormalized = refreshedRows.map((b) => ({
              ...b,
              booking_status: b.booking_status || b.status || 'Pending',
            }));
            if (!mountedRef.current || controller.signal.aborted) return;
            setBookings(refreshedNormalized.slice(0, 10));
            setTotalPages(Number(refreshed?.totalPages) || 1);
          } catch (e) {
            console.warn('[autoCheckout] failed', e?.message || e);
          } finally {
            autoCheckoutInFlightRef.current = false;
          }
        }
      }
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('canceled')) {
        return;
      }
      if (String(e?.message || '').toLowerCase().includes('aborted')) {
        return;
      }
      console.error('Failed to load bookings:', e);
      showActionError('Bookings Error', e, 'Unable to load bookings right now.');
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [activeFilter, page, canOperateBookings, mountedRef]);

  useEffect(() => {
    loadData();
    return () => {
      try {
        loadAbortRef.current?.abort?.();
      } catch {
        /* ignore */
      }
    };
  }, [loadData]);

  const handleDelete = (id) => {
    Alert.alert('Delete Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (actionBusyId) return;
          setActionBusyId(id);
          await deleteBooking(id);
          await loadData();
        } catch (e) {
          showActionError('Delete Failed', e, 'Unable to delete booking right now.');
        } finally {
          setActionBusyId(null);
        }
      }},
    ]);
  };

  const handleApprove = (id) => {
    Alert.alert('Approve booking', 'Approve this reservation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            if (actionBusyId) return;
            setActionBusyId(id);
            await putBookingApprove(id);
            await loadData();
          } catch (e) {
            showActionError('Update Failed', e, 'Unable to approve booking.');
          } finally {
            setActionBusyId(null);
          }
        },
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Reject booking', 'Reject this reservation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            if (actionBusyId) return;
            setActionBusyId(id);
            await putBookingReject(id);
            await loadData();
          } catch (e) {
            showActionError('Update Failed', e, 'Unable to reject booking.');
          } finally {
            setActionBusyId(null);
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
            if (actionBusyId) return;
            setActionBusyId(id);
            const updated = await patchBookingCheckIn(id);
            const room = updated?.room;
            const roomLabel = room ? `${room.type || 'Room'} (Rm ${room.roomNumber || '—'})` : 'the booked room';
            setActiveFilter('Checked-In');
            await loadData();
            Alert.alert('Successful check-in', `Guest has been checked in to ${roomLabel}.`);
          } catch (e) {
            showActionError('Check-in', e, 'Could not record check-in.');
          } finally {
            setActionBusyId(null);
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
            if (actionBusyId) return;
            setActionBusyId(id);
            await patchBookingCheckOut(id, {});
            setActiveFilter('Checked-Out');
            await loadData();
          } catch (e) {
            showActionError('Check-out', e, 'Could not record check-out.');
          } finally {
            setActionBusyId(null);
          }
        },
      },
    ]);
  };

  const handleMarkCompleted = (id) => {
    Alert.alert('Mark as completed', 'Mark this booking as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            if (actionBusyId) return;
            setActionBusyId(id);
            await putBookingComplete(id);
            setActiveFilter('Completed');
            await loadData();
          } catch (e) {
            showActionError('Complete', e, 'Could not mark as completed.');
          } finally {
            setActionBusyId(null);
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
            if (actionBusyId) return;
            setActionBusyId(id);
            await cancelBookingAdmin(id);
            await loadData();
          } catch (e) {
            showActionError('Cancel', e, 'Could not cancel booking.');
          } finally {
            setActionBusyId(null);
          }
        },
      },
    ]);
  };

  const handleConfirmPayment = (id) => {
    Alert.alert(
      'Confirm payment',
      'Record that payment was received? The booking stays active until the guest checks out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (actionBusyId) return;
              setActionBusyId(id);
              await confirmBookingPayment(id);
              await loadData();
              Alert.alert('Success', 'Payment confirmed.');
            } catch (e) {
              showActionError('Confirm failed', e, 'Unable to confirm payment right now.');
            } finally {
              setActionBusyId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (d) => {
    const s = formatBookingDateTime(d);
    return s || 'N/A';
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Approved': return { bg: '#ECFDF5', text: '#10B981' };
      case 'Pending':  return { bg: '#FFF8E1', text: '#FF9500' };
      case 'Rejected': return { bg: '#FEF2F2', text: '#EF4444' };
      case 'Cancelled': return { bg: '#F1F5F9', text: '#64748B' };
      case 'Confirmed': return { bg: '#EEF2FF', text: '#4A5BCC' };
      case 'Checked-In': return { bg: '#ECFEFF', text: '#0F766E' };
      case 'Checked-Out': return { bg: '#F3E8FF', text: '#7C3AED' };
      case 'Completed': return { bg: '#E8FFF0', text: '#15803D' };
      default:         return { bg: '#F0F0F2', text: '#8E8E93' };
    }
  };

  const filtered = bookings.filter((b) => b.booking_status === activeFilter);

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
          onNotificationNavigate={(item) =>
            handleStaffNotificationNavigate(setActiveTab, isSuperAdmin, item)
          }
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
              onPress={() => {
                setActiveFilter(tab);
                setPage(1);
              }}
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

      <FlatList
        data={filtered}
        keyExtractor={(b) => String(b._id)}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item: b }) => {
          const colors = getStatusColor(b.booking_status);
          const guestName = b.user?.name || 'Unknown Guest';
          const guestEmail = b.user?.email || 'No email';
          const roomName = b.room ? `${b.room.type} (Rm ${b.room.roomNumber})` : 'Room Data Unavailable';
          const busy = loading || Boolean(actionBusyId);
          const busyThis = actionBusyId && String(actionBusyId) === String(b._id);

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
                      {b.booking_status || '—'}
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
                      {formatDate(b.check_in_datetime || b.checkInDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="log-out-outline" size={16} color="#8E8E93" style={styles.detailIcon} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Check-out</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {formatDate(b.check_out_datetime || b.checkOutDate)}
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
                {canOperateBookings && b.booking_status === 'Pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtnBase, styles.approveBtn, styles.actionBtnSpacing]}
                      onPress={() => handleApprove(b._id)}
                      disabled={busy}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnBase, styles.rejectBtn, styles.actionBtnSpacing]}
                      onPress={() => handleReject(b._id)}
                      disabled={busy}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                {canOperateBookings && canStaffConfirmPayment(b) && (
                  <TouchableOpacity
                    style={[styles.actionBtnBase, styles.approveBtn, styles.actionBtnSpacing]}
                    onPress={() => handleConfirmPayment(b._id)}
                    disabled={busy}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Confirm Payment</Text>
                  </TouchableOpacity>
                )}
                {canOperateBookings && canStaffCheckIn(b) && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtnBase,
                      styles.approveBtn,
                      styles.actionBtnSpacing,
                      { backgroundColor: '#0F766E' },
                      busyThis && { opacity: 0.7 },
                    ]}
                    onPress={() => handleCheckIn(b._id)}
                    disabled={busy}
                  >
                    <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Check-in</Text>
                  </TouchableOpacity>
                )}
                {canOperateBookings && canStaffManualCheckOut(b) && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtnBase,
                      styles.approveBtn,
                      styles.actionBtnSpacing,
                      { backgroundColor: '#7C3AED' },
                      busyThis && { opacity: 0.7 },
                    ]}
                    onPress={() => handleCheckOut(b._id)}
                    disabled={busy}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Check-out</Text>
                  </TouchableOpacity>
                )}
                {canOperateBookings && canStaffMarkCompleted(b) && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtnBase,
                      styles.approveBtn,
                      styles.actionBtnSpacing,
                      { backgroundColor: '#15803D' },
                      busyThis && { opacity: 0.7 },
                    ]}
                    onPress={() => handleMarkCompleted(b._id)}
                    disabled={busy}
                  >
                    <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}
                {isSuperAdmin && !['Completed', 'Cancelled'].includes(b.booking_status) && (
                  <TouchableOpacity
                    style={[styles.actionBtnBase, styles.rejectBtn, styles.actionBtnSpacing]}
                    onPress={() => handleAdminCancel(b._id)}
                    disabled={busy}
                  >
                    <Text style={styles.rejectBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                {isSuperAdmin && (
                  <TouchableOpacity style={[styles.deleteBtn, busy && { opacity: 0.7 }]} onPress={() => handleDelete(b._id)} disabled={busy}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} bookings found</Text>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageText}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

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
    alignItems: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  actionBtnSpacing: { marginRight: 10, marginBottom: 8 },
  actionBtnBase: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 140,
    justifyContent: 'center',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 10,
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
    alignSelf: 'center',
    marginTop: 10,
  },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  deleteBtn: { marginLeft: 'auto', padding: 8, marginBottom: 8 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', marginTop: 8 },

  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingTop: 10,
    paddingBottom: 6,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 13, fontWeight: '700', color: '#1B2036' },
  pageBtnTextDisabled: { color: '#8E8E93' },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    flexGrow: 1,
    textAlign: 'center',
    marginHorizontal: 8,
    paddingVertical: 6,
  },
});
