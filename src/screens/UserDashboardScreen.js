import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { getRooms, createBooking } from '../services/api';
import { getRoomImageSource } from '../utils/roomImages';
import { showActionError } from '../utils/errorHandling';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

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
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      <View style={{ height: Platform.OS === 'android' ? 44 : 12 }} />
      <View style={styles.notifyBar}>
        <NotificationBell
          onBookingNotificationPress={() => setActiveTab && setActiveTab('mybookings')}
        />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.promoCard}>
            <Image 
               source={{ uri: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80' }} 
               style={styles.promoImage} 
            />
            <View style={styles.promoOverlay}>
               <Text style={styles.promoTag}>LIMITED OFFER</Text>
               <Text style={styles.promoTitle}>Get 20% off on your first stay</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exclusive Rooms</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
          </View>

          {rooms.map(room => (
            <View key={room._id} style={styles.card}>
              <Image source={getRoomImageSource(room)} style={styles.roomImage} resizeMode="cover" />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.roomName}>{room.type}</Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.statusText}>Available</Text>
                  </View>
                </View>
                <Text style={styles.roomDesc} numberOfLines={2}>
                  {room.description || 'Experience comfort and style in our prime selection rooms.'}
                </Text>
                
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Price / Night</Text>
                    <Text style={styles.priceValue}>₱{room.price}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookBtn} onPress={() => openBooking(room)}>
                    <Text style={styles.bookBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {rooms.length === 0 && (
            <View style={styles.emptyBox}>
               <Feather name="moon" size={48} color="#CBD5E1" />
               <Text style={styles.emptyText}>All rooms are fully booked for now.</Text>
            </View>
          )}

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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  notifyBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  header: { padding: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginLeft: 44 }, // Offset the profile button width to center perfectly
  greeting: { fontSize: 13, fontWeight: '600', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 3, fontStyle: 'italic' },
  title: { fontSize: 26, fontWeight: '900', color: '#1B2036', marginTop: 4, letterSpacing: 1 },
  profileBtnWrapper: { position: 'absolute', right: 24 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatar: { width: '100%', height: '100%' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 0 },
  
  promoCard: { height: 180, borderRadius: 24, overflow: 'hidden', marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  promoImage: { width: '100%', height: '100%' },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, justifyContent: 'flex-end' },
  promoTag: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  promoTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  seeAll: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
  roomImage: { width: '100%', height: 220 },
  cardBody: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomName: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { color: '#10B981', fontSize: 11, fontWeight: '800' },
  roomDesc: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  priceLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#4F46E5', marginTop: 2 },
  bookBtn: { backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  bookBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  emptyBox: { padding: 80, alignItems: 'center' },
  emptyText: { color: '#94A3B8', marginTop: 12, textAlign: 'center' },

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
