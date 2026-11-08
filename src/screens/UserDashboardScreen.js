import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { getRooms, createBooking } from '../services/api';
import { getRoomImageSource } from '../utils/roomImages';
import { showActionError } from '../utils/errorHandling';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { handleGuestNotificationNavigate } from '../utils/notificationNavigation';

const formatYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseYmd = (s) => {
  if (!s || typeof s !== 'string') return new Date();
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function UserDashboardScreen({ setActiveTab }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('hotel'); // hotel | bookings | billing | profile
  
  // Booking Modal State
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bookingData, setBookingData] = useState({
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    specialRequests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [datePicker, setDatePicker] = useState(null);

  useEffect(() => {
    loadAvailableRooms();
  }, []);

  const loadAvailableRooms = async () => {
    try {
      setLoading(true);
      const allRooms = await getRooms();
      setRooms(allRooms.filter(r => r.status === 'Available'));
    } catch (error) {
      console.error('Failed to load rooms:', error);
      showActionError('Rooms Unavailable', error, 'Unable to load available rooms right now.');
    } finally {
      setLoading(false);
    }
  };

  const openBooking = (room) => {
    setSelectedRoom(room);
    setBookingData({
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      guestCount: 1,
      specialRequests: ''
    });
    setModalVisible(true);
  };

  const calculateTotal = () => {
    if (!selectedRoom || !bookingData.checkInDate || !bookingData.checkOutDate) return 0;
    const start = new Date(bookingData.checkInDate);
    const end = new Date(bookingData.checkOutDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return (diffDays || 1) * selectedRoom.price;
  };

  const roomCapacity = (room) =>
    typeof room?.capacity === 'number' && room.capacity > 0 ? room.capacity : 4;

  const minCheckoutDate = () => {
    const base = bookingData.checkInDate
      ? parseYmd(bookingData.checkInDate)
      : startOfDay(new Date());
    const d = new Date(startOfDay(base));
    d.setDate(d.getDate() + 1);
    return d;
  };

  const getPickerValue = () => {
    if (datePicker?.field === 'checkOut') {
      const minD = minCheckoutDate();
      if (bookingData.checkOutDate) {
        const d = startOfDay(parseYmd(bookingData.checkOutDate));
        return d < minD ? minD : d;
      }
      return minD;
    }
    const minD = startOfDay(new Date());
    if (bookingData.checkInDate) {
      const d = startOfDay(parseYmd(bookingData.checkInDate));
      return d < minD ? minD : d;
    }
    return minD;
  };

  const onChangeNativeDate = (event, selectedDate) => {
    const field = datePicker?.field;
    if (Platform.OS === 'android') {
      setDatePicker(null);
      if (event?.type === 'dismissed') return;
    }
    if (!selectedDate || !field) return;

    const ymd = formatYmd(selectedDate);

    if (field === 'checkIn') {
      setBookingData((prev) => {
        const inD = startOfDay(parseYmd(ymd));
        let outStr = prev.checkOutDate;
        if (outStr) {
          const outD = startOfDay(parseYmd(outStr));
          if (outD <= inD) {
            const next = new Date(inD);
            next.setDate(next.getDate() + 1);
            outStr = formatYmd(next);
          }
        } else {
          const next = new Date(inD);
          next.setDate(next.getDate() + 1);
          outStr = formatYmd(next);
        }
        return { ...prev, checkInDate: ymd, checkOutDate: outStr };
      });
    } else {
      setBookingData((prev) => ({ ...prev, checkOutDate: ymd }));
    }
  };

  const handleConfirmBooking = async () => {
    if (!user?._id) {
      Alert.alert('Error', 'You must be signed in to book.');
      return;
    }
    if (!selectedRoom?._id) {
      Alert.alert('Error', 'Please select a room.');
      return;
    }
    if (!bookingData.checkInDate?.trim() || !bookingData.checkOutDate?.trim()) {
      Alert.alert('Error', 'Please select both check-in and check-out dates.');
      return;
    }
    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      Alert.alert('Error', 'Invalid date format. Use YYYY-MM-DD.');
      return;
    }
    if (checkOut <= checkIn) {
      Alert.alert('Error', 'Check-out must be later than check-in.');
      return;
    }

    const today = startOfDay(new Date());
    const checkInDay = startOfDay(checkIn);
    if (checkInDay < today) {
      Alert.alert('Error', 'Check-in date cannot be in the past.');
      return;
    }

    const cap = roomCapacity(selectedRoom);
    const guests = Number(bookingData.guestCount);
    if (Number.isNaN(guests) || guests < 1) {
      Alert.alert('Error', 'Number of guests must be at least 1.');
      return;
    }
    if (guests > cap) {
      Alert.alert('Error', `Number of guests cannot exceed room capacity (${cap}).`);
      return;
    }

    const totalPrice = calculateTotal();
    if (totalPrice <= 0) {
      Alert.alert('Error', 'Unable to calculate total for these dates.');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        user_id: user._id,
        room_id: selectedRoom._id,
        room: selectedRoom._id,
        checkInDate: bookingData.checkInDate.trim(),
        checkOutDate: bookingData.checkOutDate.trim(),
        guestCount: guests,
        specialRequests: bookingData.specialRequests || '',
        total_price: totalPrice,
        booking_status: 'Pending',
        created_at: new Date().toISOString(),
      });

      Alert.alert('Success ✨', 'Your booking was submitted and is pending approval.', [
        {
          text: 'View My Bookings',
          onPress: () => {
            setModalVisible(false);
            setActiveTab('mybookings');
          },
        },
        {
          text: 'Close',
          onPress: () => {
            setModalVisible(false);
            loadAvailableRooms();
          },
        },
      ]);
    } catch (error) {
      showActionError('Booking Failed', error, 'Unable to complete booking right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#E7C8A6" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroImageSlot}>
              <Image
                source={require('../../assets/homepage.png')}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroGradient} />
            </View>
            <View style={[styles.heroBellBar, { paddingTop: insets.top + 6 }]}>
              <NotificationBell
                iconColor="#FFFFFF"
                size={22}
                onNotificationNavigate={(item) => handleGuestNotificationNavigate(setActiveTab, item)}
              />
            </View>
          </View>

          <View style={styles.sheet}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <TouchableOpacity
                style={[styles.chip, activeCategory === 'hotel' && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveCategory('hotel');
                  setActiveTab && setActiveTab('explore');
                }}
              >
                <Feather
                  name="home"
                  size={16}
                  color={activeCategory === 'hotel' ? '#1B2036' : '#CBD5E1'}
                  style={styles.chipIcon}
                />
                <Text style={[styles.chipText, activeCategory === 'hotel' && styles.chipTextActive]}>Hotel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, activeCategory === 'bookings' && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveCategory('bookings');
                  setActiveTab && setActiveTab('mybookings');
                }}
              >
                <Feather
                  name="calendar"
                  size={16}
                  color={activeCategory === 'bookings' ? '#1B2036' : '#CBD5E1'}
                  style={styles.chipIcon}
                />
                <Text style={[styles.chipText, activeCategory === 'bookings' && styles.chipTextActive]}>Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, activeCategory === 'billing' && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveCategory('billing');
                  setActiveTab && setActiveTab('billing');
                }}
              >
                <Feather
                  name="file-text"
                  size={16}
                  color={activeCategory === 'billing' ? '#1B2036' : '#CBD5E1'}
                  style={styles.chipIcon}
                />
                <Text style={[styles.chipText, activeCategory === 'billing' && styles.chipTextActive]}>Billing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, activeCategory === 'profile' && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveCategory('profile');
                  setActiveTab && setActiveTab('profile');
                }}
              >
                <Feather
                  name="user"
                  size={16}
                  color={activeCategory === 'profile' ? '#1B2036' : '#CBD5E1'}
                  style={styles.chipIcon}
                />
                <Text style={[styles.chipText, activeCategory === 'profile' && styles.chipTextActive]}>Profile</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Most Popular</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {rooms.map((room) => (
                <View key={room._id} style={[styles.popCard, { width: Math.min(320, width * 0.78) }]}>
                  <Image source={getRoomImageSource(room)} style={styles.popImage} resizeMode="cover" />
                  <View style={styles.popBody}>
                    <Text style={styles.popTitle} numberOfLines={1}>
                      {room.type}
                    </Text>
                    <View style={styles.popMetaRow}>
                      <Feather name="map-pin" size={12} color="#94A3B8" style={styles.popMetaIcon} />
                      <Text style={styles.popMetaText} numberOfLines={1}>
                        Room {room.roomNumber}
                      </Text>
                    </View>
                    <View style={styles.popFooter}>
                      <Text style={styles.popPrice}>₱{room.price}/night</Text>
                      <TouchableOpacity style={styles.popBook} activeOpacity={0.85} onPress={() => openBooking(room)}>
                        <Text style={styles.popBookText}>Book</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {rooms.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="moon" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>All rooms are fully booked for now.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* BOOKING MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Reservation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedRoom && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.roomSummary}>
                   <Image source={getRoomImageSource(selectedRoom)} style={styles.summaryThumb} resizeMode="cover" />
                   <View style={styles.summaryInfo}>
                      <Text style={styles.summaryName}>{selectedRoom.type}</Text>
                      <Text style={styles.summarySub}>Room {selectedRoom.roomNumber}</Text>
                   </View>
                </View>

                <View style={styles.formRow}>
                   <View style={styles.formCol}>
                      <Text style={styles.label}>Check-in</Text>
                      {Platform.OS === 'web' ? (
                        <TextInput
                          style={styles.input}
                          value={bookingData.checkInDate}
                          onChangeText={(t) => setBookingData({ ...bookingData, checkInDate: t })}
                          placeholder="YYYY-MM-DD"
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.input}
                          onPress={() => setDatePicker({ field: 'checkIn' })}
                        >
                          <Text style={styles.dateInputText}>
                            {bookingData.checkInDate || 'Select date'}
                          </Text>
                        </TouchableOpacity>
                      )}
                   </View>
                   <View style={styles.formCol}>
                      <Text style={styles.label}>Check-out</Text>
                      {Platform.OS === 'web' ? (
                        <TextInput
                          style={styles.input}
                          value={bookingData.checkOutDate}
                          onChangeText={(t) => setBookingData({ ...bookingData, checkOutDate: t })}
                          placeholder="YYYY-MM-DD"
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.input}
                          onPress={() => setDatePicker({ field: 'checkOut' })}
                        >
                          <Text style={styles.dateInputText}>
                            {bookingData.checkOutDate || 'Select date'}
                          </Text>
                        </TouchableOpacity>
                      )}
                   </View>
                </View>

                {datePicker && Platform.OS === 'ios' ? (
                  <View style={{ marginTop: 8 }}>
                    <DateTimePicker
                      value={getPickerValue()}
                      mode="date"
                      display="spinner"
                      minimumDate={
                        datePicker.field === 'checkIn'
                          ? startOfDay(new Date())
                          : minCheckoutDate()
                      }
                      onChange={onChangeNativeDate}
                    />
                    <TouchableOpacity
                      style={[styles.confirmBtn, { marginTop: 12 }]}
                      onPress={() => setDatePicker(null)}
                    >
                      <Text style={styles.confirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {datePicker && Platform.OS === 'android' ? (
                  <DateTimePicker
                    value={getPickerValue()}
                    mode="date"
                    display="default"
                    minimumDate={
                      datePicker.field === 'checkIn'
                        ? startOfDay(new Date())
                        : minCheckoutDate()
                    }
                    onChange={onChangeNativeDate}
                  />
                ) : null}

                <Text style={styles.label}>Guests</Text>
                <View style={styles.guestSelector}>
                   <TouchableOpacity 
                     onPress={() => setBookingData({...bookingData, guestCount: Math.max(1, bookingData.guestCount - 1)})}
                     style={styles.stepBtn}
                   >
                     <Feather name="minus" size={20} color="#1E293B" />
                   </TouchableOpacity>
                   <Text style={styles.guestCountText}>{bookingData.guestCount}</Text>
                   <TouchableOpacity 
                     onPress={() => {
                       const maxG = roomCapacity(selectedRoom);
                       setBookingData({
                         ...bookingData,
                         guestCount: Math.min(maxG, bookingData.guestCount + 1),
                       });
                     }}
                     style={styles.stepBtn}
                   >
                     <Feather name="plus" size={20} color="#1E293B" />
                   </TouchableOpacity>
                </View>

                <Text style={styles.label}>Special Requests</Text>
                <TextInput 
                   style={[styles.input, styles.textArea]} 
                   multiline 
                   placeholder="e.g. Late check-in, dietary needs..."
                   value={bookingData.specialRequests}
                   onChangeText={(t) => setBookingData({...bookingData, specialRequests: t})}
                />

                <View style={styles.priceCard}>
                   <Text style={styles.totalLabel}>Estimated Total</Text>
                   <Text style={styles.totalValue}>₱{calculateTotal()}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.confirmBtn, submitting && { opacity: 0.7 }]} 
                  onPress={handleConfirmBooking}
                  disabled={submitting}
                >
                  <Text style={styles.confirmText}>{submitting ? 'Confirming...' : 'Complete Booking'}</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 24 },

  hero: {
    height: 252,
    width: '100%',
    backgroundColor: '#0B1220',
    position: 'relative',
  },
  heroImageSlot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    height: '128%',
    bottom: -56,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.22)',
  },
  heroBellBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 16,
    paddingBottom: 8,
    zIndex: 2,
  },

  sheet: {
    marginTop: -26,
    backgroundColor: '#121A2A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  chipsRow: { paddingVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#1B2436',
    borderWidth: 1,
    borderColor: '#243047',
    marginRight: 10,
  },
  chipIcon: { marginRight: 8 },
  chipActive: {
    backgroundColor: '#E7C8A6',
    borderColor: '#E7C8A6',
  },
  chipText: { color: '#CBD5E1', fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: '#1B2036' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  seeAll: { color: '#E7C8A6', fontWeight: '800', fontSize: 13 },

  popularRow: { paddingBottom: 10 },
  popCard: {
    backgroundColor: '#1B2436',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#243047',
    marginRight: 14,
  },
  popImage: { width: '100%', height: 170 },
  popBody: { padding: 14 },
  popTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  popMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  popMetaIcon: { marginRight: 6 },
  popMetaText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', flex: 1 },
  popFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  popPrice: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  popBook: {
    backgroundColor: '#E7C8A6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  popBookText: { color: '#1B2036', fontWeight: '900', fontSize: 13 },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', marginTop: 12, textAlign: 'center', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  roomSummary: { flexDirection: 'row', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 24 },
  summaryThumb: { width: 60, height: 60, borderRadius: 12 },
  summaryInfo: { marginLeft: 16, justifyContent: 'center' },
  summaryName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  summarySub: { fontSize: 13, color: '#64748B', marginTop: 2 },

  formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  formCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: '800', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, fontSize: 15, color: '#0F172A', fontWeight: '600' },
  dateInputText: { fontSize: 15, color: '#0F172A', fontWeight: '600' },
  textArea: { height: 80, textAlignVertical: 'top' },
  guestSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 16, justifyContent: 'space-between' },
  stepBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  guestCountText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  priceCard: { backgroundColor: '#4F46E5', borderRadius: 24, padding: 20, marginTop: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  totalValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  confirmBtn: { backgroundColor: '#0F172A', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 24 },
  confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
