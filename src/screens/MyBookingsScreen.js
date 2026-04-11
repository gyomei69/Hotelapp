import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  AppState,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getMyBookings, cancelMyBooking, selectCashPayment, getCardPaymentUrl } from '../services/api';
import { getRoomImageSource } from '../utils/roomImages';
import { showActionError } from '../utils/errorHandling';
import NotificationBell from '../components/NotificationBell';

function getBookingStatusLabel(status) {
  switch (status) {
    case 'Pending': return 'Waiting for Staff Approval';
    case 'Approved': return 'Awaiting Payment';
    case 'Confirmed': return 'Paid';
    case 'Cancelled': return 'Cancelled';
    case 'Completed': return 'Completed Stay';
    case 'Rejected': return 'Rejected';
    default: return status || '';
  }
}

export default function MyBookingsScreen({ setActiveTab }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [listRefreshing, setListRefreshing] = useState(false);

  const loadMyBookings = useCallback(async (opts = {}) => {
    const { skipGlobalLoading = false } = opts;
    try {
      if (!skipGlobalLoading) setLoading(true);
      const data = await getMyBookings();
      setBookings(data.reverse());
    } catch (error) {
      console.error('Failed to load my bookings:', error);
      showActionError('Bookings Error', error, 'Unable to load your bookings right now.');
    } finally {
      if (!skipGlobalLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadMyBookings();
    });
    return () => sub.remove();
  }, [loadMyBookings]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return { bg: '#ECFDF5', text: '#10B981' };
      case 'Pending':  return { bg: '#FFF8E1', text: '#FF9500' };
      case 'Rejected': return { bg: '#FEF2F2', text: '#EF4444' };
      case 'Cancelled': return { bg: '#F1F5F9', text: '#64748B' };
      case 'Confirmed': return { bg: '#EEF2FF', text: '#4F46E5' };
      case 'Completed': return { bg: '#F0FDF4', text: '#15803D' };
      default:         return { bg: '#F8FAFC', text: '#64748B' };
    }
  };

  const handleCashPayment = async (bookingId) => {
    try {
      setPaymentBusyId(bookingId);
      await selectCashPayment(bookingId);
      await loadMyBookings();
      Alert.alert(
        'Cash payment',
        'Please pay in cash at Aurora Grand Hotel upon arrival.'
      );
    } catch (error) {
      showActionError('Payment update failed', error, 'Could not save cash payment choice.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  const handleCardPayment = async (bookingId) => {
    try {
      setPaymentBusyId(bookingId);
      const { url } = await getCardPaymentUrl(bookingId);
      await WebBrowser.openBrowserAsync(url);
      Alert.alert(
        'Complete payment',
        'After paying in the browser, return here — your list refreshes when the app opens again.',
        [{ text: 'OK', onPress: () => loadMyBookings() }]
      );
    } catch (error) {
      showActionError('Card checkout', error, 'Could not open card payment. Try again.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  const confirmCancelBooking = (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingId(bookingId);
              await cancelMyBooking(bookingId);
              await loadMyBookings();
              Alert.alert('Cancelled', 'Your booking has been cancelled.');
            } catch (error) {
              showActionError('Cancel Failed', error, 'Unable to cancel this booking.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>Manage your upcoming stays</Text>
        </View>
        <NotificationBell
          onBookingNotificationPress={() => setActiveTab && setActiveTab('mybookings')}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
           <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={async () => {
                setListRefreshing(true);
                try {
                  await loadMyBookings({ skipGlobalLoading: true });
                } finally {
                  setListRefreshing(false);
                }
              }}
              tintColor="#4F46E5"
            />
          }
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtitle}>When you book a stay, it will appear here.</Text>
            </View>
          ) : (
            bookings.map(booking => {
              const statusColors = getStatusColor(booking.status);
              const statusLabel = getBookingStatusLabel(booking.status);
              const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const payStatus = booking.paymentStatus || '';
              const needsPaymentChoice =
                booking.status === 'Approved' &&
                ['Awaiting Payment', 'Failed'].includes(payStatus);
              const showCashHoldMessage =
                booking.status === 'Approved' && payStatus === 'Pending Payment at Hotel';
              const payBusy = paymentBusyId === booking._id;

              return (
                <View key={booking._id} style={styles.card}>
                   <View style={styles.cardHeader}>
                     <Image
                        source={getRoomImageSource(booking.room)}
                        style={styles.roomThumb}
                        resizeMode="cover"
                     />
                     <View style={styles.headerInfo}>
                        <Text style={styles.hotelName}>{booking.room ? booking.room.type : 'Unknown Room'}</Text>
                        <Text style={styles.roomSub}>Room {booking.room ? booking.room.roomNumber : 'N/A'}</Text>
                     </View>
                     <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusText, { color: statusColors.text }]} numberOfLines={2}>{statusLabel}</Text>
                     </View>
                   </View>

                   {payStatus ? (
                     <Text style={styles.paymentDetailText}>Payment: {payStatus}</Text>
                   ) : null}

                   <View style={styles.metaRow}>
                     <View style={styles.metaItem}>
                        <Feather name="users" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>{booking.guestCount || 1} Guests</Text>
                     </View>
                     <View style={styles.metaItem}>
                        <Feather name="credit-card" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>{booking.paymentMethod || '—'}</Text>
                     </View>
                     <Text style={styles.refId}>#{booking._id.slice(-6).toUpperCase()}</Text>
                   </View>

                   <View style={styles.divider} />

                   <View style={styles.dateRow}>
                     <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-in</Text>
                        <Text style={styles.dateValue}>{checkIn}</Text>
                     </View>
                     <View style={styles.dateArrow}>
                        <Feather name="arrow-right" size={16} color="#CBD5E1" />
                     </View>
                     <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-out</Text>
                        <Text style={styles.dateValue}>{checkOut}</Text>
                     </View>
                   </View>
                   
                   <View style={styles.footer}>
                     <Text style={styles.priceLabel}>Total Amount</Text>
                     <Text style={styles.priceValue}>₱{booking.totalAmount?.toLocaleString() || 0}</Text>
                   </View>

                   {needsPaymentChoice ? (
                     <View style={styles.payOptions}>
                       {payStatus === 'Failed' ? (
                         <Text style={styles.payHint}>Card payment did not complete. You can try again or pay with cash.</Text>
                       ) : null}
                       <View style={styles.payRow}>
                         <TouchableOpacity
                           style={[styles.payMethodBtn, payBusy && { opacity: 0.7 }]}
                           disabled={payBusy}
                           onPress={() => handleCashPayment(booking._id)}
                         >
                           {payBusy ? (
                             <ActivityIndicator size="small" color="#0F172A" />
                           ) : (
                             <Text style={styles.payMethodText}>Pay with Cash</Text>
                           )}
                         </TouchableOpacity>
                         <TouchableOpacity
                           style={[styles.payMethodBtn, styles.payMethodBtnCard, payBusy && { opacity: 0.7 }]}
                           disabled={payBusy}
                           onPress={() => handleCardPayment(booking._id)}
                         >
                           {payBusy ? (
                             <ActivityIndicator size="small" color="#FFFFFF" />
                           ) : (
                             <Text style={[styles.payMethodText, styles.payMethodTextCard]}>Pay by Card</Text>
                           )}
                         </TouchableOpacity>
                       </View>
                     </View>
                   ) : null}

                   {showCashHoldMessage ? (
                     <Text style={styles.cashMessage}>
                       Please pay in cash at Aurora Grand Hotel upon arrival.
                     </Text>
                   ) : null}

                   {booking.status === 'Pending' ? (
                     <TouchableOpacity
                       style={styles.cancelBookingBtn}
                       onPress={() => confirmCancelBooking(booking._id)}
                       disabled={cancellingId === booking._id}
                     >
                       {cancellingId === booking._id ? (
                         <ActivityIndicator size="small" color="#EF4444" />
                       ) : (
                         <Text style={styles.cancelBookingText}>Cancel Booking</Text>
                       )}
                     </TouchableOpacity>
                   ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 0, gap: 20 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  roomThumb: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F1F5F9' },
  headerInfo: { flex: 1, marginLeft: 16 },
  hotelName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  roomSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, maxWidth: '46%' },
  statusText: { fontSize: 10, fontWeight: '800', textAlign: 'right' },

  paymentDetailText: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  refId: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginLeft: 'auto' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  dateArrow: { width: 40, alignItems: 'center' },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  priceLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  priceValue: { fontSize: 20, fontWeight: '800', color: '#4F46E5' },

  cancelBookingBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cancelBookingText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  payOptions: { marginTop: 12 },
  payHint: { fontSize: 12, color: '#B91C1C', marginBottom: 10, fontWeight: '600' },
  payRow: { flexDirection: 'row', gap: 10 },
  payMethodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payMethodBtnCard: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  payMethodText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  payMethodTextCard: { color: '#FFFFFF' },
  cashMessage: {
    marginTop: 12,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 20,
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});
