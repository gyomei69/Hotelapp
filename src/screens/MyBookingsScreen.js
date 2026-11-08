import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getMyBookings, cancelMyBooking, deleteMyBooking, selectCashPayment, selectCardPayment } from '../services/api';
import { getRoomImageSource } from '../utils/roomImages';
import { showActionError } from '../utils/errorHandling';
import { formatBookingDateTime } from '../utils/formatBookingDateTime';
import NotificationBell from '../components/NotificationBell';
import { handleGuestNotificationNavigate } from '../utils/notificationNavigation';
import { guestPalette } from '../theme/guestPalette';

function getBookingStatusLabel(booking) {
  const status = booking.status;
  const ps = booking.paymentStatus || '';
  if (status === 'Approved' && ps === 'Paid') return 'Paid';
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
  const [cardModalBooking, setCardModalBooking] = useState(null);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const lastLoadTsRef = useRef(0);
  const inFlightRef = useRef(false);

  const loadMyBookings = useCallback(async (opts = {}) => {
    const { skipGlobalLoading = false, force = false, throttleMs = 0 } = opts;
    const now = Date.now();
    if (!force && throttleMs > 0 && now - lastLoadTsRef.current < throttleMs) {
      return;
    }
    if (inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      lastLoadTsRef.current = now;
      if (!skipGlobalLoading) setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load my bookings:', error);
      showActionError('Bookings Error', error, 'Unable to load your bookings right now.');
    } finally {
      if (!skipGlobalLoading) setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadMyBookings({ skipGlobalLoading: true, throttleMs: 10_000 });
    });
    return () => sub.remove();
  }, [loadMyBookings]);

  const getStatusColor = (booking) => {
    const status = booking.status;
    const ps = booking.paymentStatus || '';
    if (status === 'Approved' && ps === 'Paid') return { bg: guestPalette.infoBg, text: guestPalette.info };
    switch (status) {
      case 'Approved':
        return { bg: guestPalette.successBg, text: guestPalette.success };
      case 'Pending':
        return { bg: guestPalette.warningBg, text: guestPalette.warning };
      case 'Rejected':
        return { bg: guestPalette.dangerBg, text: guestPalette.danger };
      case 'Cancelled':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: guestPalette.muted };
      case 'Confirmed':
        return { bg: guestPalette.infoBg, text: guestPalette.info };
      case 'Completed':
        return { bg: guestPalette.successBg, text: guestPalette.success };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', text: guestPalette.muted };
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
    const b = bookings.find((x) => String(x._id) === String(bookingId));
    setCardModalBooking(b || { _id: bookingId });
    setCardName('');
    setCardNumber('');
    setCardExp('');
    setCardCvv('');
    setCheckoutEmail('');
    setSaveInfo(false);
  };

  const submitSandboxCardPay = async () => {
    const bookingId = cardModalBooking?._id;
    if (!bookingId) {
      Alert.alert('Payment', 'Missing booking id. Please close and reopen the checkout.');
      return;
    }
    try {
      setPaymentBusyId(bookingId);
      await selectCardPayment(bookingId);
      setCardModalBooking(null);
      await loadMyBookings({ force: true });
      Alert.alert(
        'Payment submitted (Pending)',
        'This is a sandbox checkout. Your payment is marked as pending and must be confirmed by staff before check-in.'
      );
    } catch (e) {
      showActionError('Payment', e, 'Could not submit card payment.');
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

  const confirmDeleteBooking = (booking) => {
    Alert.alert(
      'Delete Booking',
      'Remove this booking from your history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingId(booking._id);
              await deleteMyBooking(booking._id);
              await loadMyBookings({ force: true });
              Alert.alert('Deleted', 'Booking removed from your history.');
            } catch (error) {
              showActionError('Delete Failed', error, 'Unable to delete this booking.');
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
          iconColor={guestPalette.text}
          onNotificationNavigate={(item) => handleGuestNotificationNavigate(setActiveTab, item)}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
           <ActivityIndicator size="large" color={guestPalette.accent} />
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
                  await loadMyBookings({ skipGlobalLoading: true, force: true });
                } finally {
                  setListRefreshing(false);
                }
              }}
              tintColor={guestPalette.accent}
            />
          }
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={48} color={guestPalette.muted} />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtitle}>When you book a stay, it will appear here.</Text>
            </View>
          ) : (
            bookings.map(booking => {
              const statusColors = getStatusColor(booking);
              const statusLabel = getBookingStatusLabel(booking);
              const checkIn = formatBookingDateTime(booking.check_in_datetime || booking.checkInDate);
              const checkOut = formatBookingDateTime(booking.check_out_datetime || booking.checkOutDate);
              const payStatus = booking.paymentStatus || '';
              const needsPaymentChoice =
                booking.status === 'Approved' &&
                ['Awaiting Payment', 'Failed'].includes(payStatus);
              const showCashHoldMessage =
                booking.status === 'Approved' &&
                (payStatus === 'Pending' || payStatus === 'Pending Payment at Hotel');
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
                        <Feather name="users" size={14} color={guestPalette.muted} />
                        <Text style={styles.metaText}>{booking.guestCount || 1} Guests</Text>
                     </View>
                     <View style={styles.metaItem}>
                        <Feather name="credit-card" size={14} color={guestPalette.muted} />
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
                        <Feather name="arrow-right" size={16} color={guestPalette.muted} />
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
                             <ActivityIndicator size="small" color={guestPalette.text} />
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
                             <ActivityIndicator size="small" color={guestPalette.card} />
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

                   {['Cancelled', 'Rejected', 'Completed'].includes(booking.status) ? (
                     <TouchableOpacity
                       style={[styles.cancelBookingBtn, styles.deleteBookingBtn]}
                       onPress={() => confirmDeleteBooking(booking)}
                       disabled={cancellingId === booking._id}
                     >
                       {cancellingId === booking._id ? (
                         <ActivityIndicator size="small" color="#EF4444" />
                       ) : (
                         <Text style={styles.cancelBookingText}>Delete Booking</Text>
                       )}
                     </TouchableOpacity>
                   ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={cardModalBooking != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCardModalBooking(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.checkoutCard}>
            <View style={styles.checkoutHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.checkoutTitle}>Sandbox checkout</Text>
                <Text style={styles.checkoutMerchant}>Aurora Grand Hotel</Text>
              </View>
              <TouchableOpacity onPress={() => setCardModalBooking(null)} hitSlop={12}>
                <Feather name="x" size={20} color={guestPalette.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryRoom}>
                {cardModalBooking?.room?.roomNumber ? `Room ${cardModalBooking.room.roomNumber}` : 'Room'} •{' '}
                {cardModalBooking?.room?.type || 'Stay'}
              </Text>
              <Text style={styles.summaryAmount}>
                ₱{Number(cardModalBooking?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.summaryBookingId}>
                Booking {String(cardModalBooking?._id || '').slice(-10)}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Contact information</Text>
            <View style={styles.field}>
              <TextInput
                value={checkoutEmail}
                onChangeText={setCheckoutEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.fieldInput}
              />
            </View>

            <Text style={styles.sectionLabel}>Payment method</Text>
            <View style={styles.paymentBox}>
              <View style={styles.paymentHeaderRow}>
                <View style={styles.paymentHeaderLeft}>
                  <View style={styles.cardIconDot}>
                    <Feather name="credit-card" size={16} color={guestPalette.accent} />
                  </View>
                  <Text style={styles.paymentHeaderText}>Card</Text>
                </View>
                <View style={styles.brandRow}>
                  <View style={styles.brandPill}><Text style={styles.brandText}>VISA</Text></View>
                  <View style={styles.brandPill}><Text style={styles.brandText}>MC</Text></View>
                  <View style={styles.brandPill}><Text style={styles.brandText}>AMEX</Text></View>
                </View>
              </View>

              <Text style={styles.smallLabel}>Card information</Text>
              <View style={styles.cardInfoBox}>
                <View style={styles.cardInfoRowTop}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(t.replace(/[^\d ]/g, '').slice(0, 19))}
                    placeholder="1234 1234 1234 1234"
                    keyboardType="number-pad"
                    style={[styles.fieldInput, { paddingVertical: 12 }]}
                  />
                </View>
                <View style={styles.cardInfoRowBottom}>
                  <View style={[styles.cardInfoCell, styles.cardInfoCellRight]}>
                    <TextInput
                      value={cardExp}
                      onChangeText={(t) => setCardExp(t.replace(/[^\d/]/g, '').slice(0, 5))}
                      placeholder="MM/YY"
                      keyboardType="number-pad"
                      style={styles.fieldInput}
                    />
                  </View>
                  <View style={styles.cardInfoDividerV} />
                  <View style={styles.cardInfoCell}>
                    <TextInput
                      value={cardCvv}
                      onChangeText={(t) => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVC"
                      keyboardType="number-pad"
                      secureTextEntry
                      style={styles.fieldInput}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.smallLabel}>Cardholder name</Text>
              <View style={styles.field}>
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="Full name on card"
                  style={styles.fieldInput}
                />
              </View>

              <Text style={styles.smallLabel}>Country or region</Text>
              <View style={[styles.field, styles.fieldSelect]}>
                <Text style={styles.selectText}>Philippines</Text>
                <Feather name="chevron-down" size={18} color={guestPalette.muted} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveRow}
              onPress={() => setSaveInfo((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: saveInfo }}
              accessibilityLabel="Save my information"
            >
              <View style={[styles.saveCheck, saveInfo && styles.saveCheckOn]}>
                {saveInfo ? <Feather name="check" size={14} color={guestPalette.card} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.saveTitle}>Save my information for faster checkout</Text>
                <Text style={styles.saveSub}>Sandbox only — nothing is stored.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payStripeBtn, paymentBusyId === cardModalBooking?._id && { opacity: 0.7 }]}
              disabled={paymentBusyId === cardModalBooking?._id}
              onPress={submitSandboxCardPay}
            >
              {paymentBusyId === cardModalBooking?._id ? (
                <ActivityIndicator color={guestPalette.card} />
              ) : (
                <Text style={styles.payStripeText}>Pay</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.poweredBy}>Powered by sandbox</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: guestPalette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: guestPalette.bg,
  },
  headerTextBlock: { flex: 1, minWidth: 0, marginRight: 8 },
  title: { fontSize: 26, fontWeight: '800', color: guestPalette.text },
  subtitle: { fontSize: 14, color: guestPalette.muted, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 0 },

  card: {
    backgroundColor: guestPalette.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  roomThumb: { width: 50, height: 50, borderRadius: 12, backgroundColor: guestPalette.surface },
  headerInfo: { flex: 1, marginLeft: 16 },
  hotelName: { fontSize: 17, fontWeight: '800', color: guestPalette.text },
  roomSub: { fontSize: 13, color: guestPalette.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, maxWidth: '46%' },
  statusText: { fontSize: 10, fontWeight: '800', textAlign: 'right' },

  paymentDetailText: { fontSize: 12, color: guestPalette.muted, fontWeight: '600', marginBottom: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { fontSize: 12, color: guestPalette.muted, fontWeight: '600', marginLeft: 6 },
  refId: { fontSize: 11, color: guestPalette.muted, fontWeight: '500', marginLeft: 'auto' },

  divider: { height: 1, backgroundColor: guestPalette.cardBorder, marginVertical: 16 },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 11, color: guestPalette.muted, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, fontWeight: '700', color: guestPalette.textSecondary },
  dateArrow: { width: 40, alignItems: 'center' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: guestPalette.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  priceLabel: { fontSize: 13, color: guestPalette.muted, fontWeight: '700' },
  priceValue: { fontSize: 20, fontWeight: '800', color: guestPalette.accent },

  cancelBookingBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: guestPalette.dangerBg,
  },
  deleteBookingBtn: {
    marginTop: 10,
  },
  cancelBookingText: { fontSize: 14, fontWeight: '700', color: guestPalette.danger },

  payOptions: { marginTop: 12 },
  payHint: { fontSize: 12, color: guestPalette.danger, marginBottom: 10, fontWeight: '600' },
  payRow: { flexDirection: 'row' },
  payMethodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: guestPalette.surface,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    marginRight: 10,
  },
  payMethodBtnCard: { backgroundColor: guestPalette.accent, borderColor: guestPalette.accent, marginRight: 0 },
  payMethodText: { fontSize: 13, fontWeight: '800', color: guestPalette.text },
  payMethodTextCard: { color: guestPalette.card },
  cashMessage: {
    marginTop: 12,
    fontSize: 13,
    color: guestPalette.textSecondary,
    fontWeight: '600',
    lineHeight: 20,
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: guestPalette.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: guestPalette.muted, textAlign: 'center', lineHeight: 22 },

  modalOverlay: {
    flex: 1,
    backgroundColor: guestPalette.overlay,
  },
  modalScrollContent: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: guestPalette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
  },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutTitle: { fontSize: 14, fontWeight: '800', color: guestPalette.text },
  checkoutMerchant: { fontSize: 12, color: guestPalette.muted, marginTop: 2 },
  summaryBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    backgroundColor: guestPalette.surface,
  },
  summaryRoom: { fontSize: 12, color: guestPalette.muted, fontWeight: '700' },
  summaryAmount: { fontSize: 26, fontWeight: '900', color: guestPalette.accent, marginTop: 6 },
  summaryBookingId: { fontSize: 12, color: guestPalette.muted, fontWeight: '700', marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: guestPalette.textSecondary, marginTop: 14, marginBottom: 8 },
  smallLabel: { fontSize: 11, fontWeight: '800', color: guestPalette.muted, marginTop: 12, marginBottom: 8 },
  field: {
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    borderRadius: 12,
    backgroundColor: guestPalette.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInput: { fontSize: 14, color: guestPalette.text, fontWeight: '600' },
  selectText: { fontSize: 14, color: guestPalette.text, fontWeight: '700' },
  paymentBox: {
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    borderRadius: 14,
    padding: 12,
    backgroundColor: guestPalette.surface,
  },
  paymentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardIconDot: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: guestPalette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    marginRight: 8,
  },
  paymentHeaderText: { fontSize: 14, fontWeight: '900', color: guestPalette.text },
  brandRow: { flexDirection: 'row' },
  brandPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: guestPalette.bg,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    marginRight: 6,
  },
  brandText: { fontSize: 10, fontWeight: '900', color: guestPalette.textSecondary },
  cardInfoBox: {
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: guestPalette.surface,
  },
  cardInfoRowTop: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: guestPalette.cardBorder,
  },
  cardInfoRowBottom: { flexDirection: 'row', alignItems: 'center' },
  cardInfoCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
  cardInfoCellRight: {},
  cardInfoDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: guestPalette.cardBorder },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: guestPalette.cardBorder,
    backgroundColor: guestPalette.surface,
  },
  saveCheck: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: guestPalette.cardBorder,
    backgroundColor: guestPalette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 10,
  },
  saveCheckOn: { backgroundColor: guestPalette.accent, borderColor: guestPalette.accent },
  saveTitle: { fontSize: 12, fontWeight: '900', color: guestPalette.text },
  saveSub: { fontSize: 11, color: guestPalette.muted, marginTop: 2, fontWeight: '600' },
  payStripeBtn: {
    marginTop: 14,
    backgroundColor: guestPalette.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payStripeText: { color: guestPalette.card, fontWeight: '900', fontSize: 14 },
  poweredBy: { marginTop: 10, fontSize: 11, color: guestPalette.muted, textAlign: 'center', fontWeight: '700' },
});
