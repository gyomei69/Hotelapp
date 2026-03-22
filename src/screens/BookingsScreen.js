import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const bookingsData = [
  { id: 'BKG-001', guest: 'Eleanor Pena', room: 'Deluxe Suite', dates: 'Oct 12 - Oct 15', status: 'Confirmed', amount: '$450.00' },
  { id: 'BKG-002', guest: 'Jacob Jones', room: 'Standard Room', dates: 'Oct 14 - Oct 16', status: 'Pending', amount: '$200.00' },
  { id: 'BKG-003', guest: 'Albert Flores', room: 'Ocean View', dates: 'Oct 15 - Oct 20', status: 'Confirmed', amount: '$1,200.00' },
  { id: 'BKG-004', guest: 'Wade Warren', room: 'Penthouse', dates: 'Oct 15 - Oct 18', status: 'Cancelled', amount: '$800.00' },
  { id: 'BKG-005', guest: 'Bessie Cooper', room: 'Standard Room', dates: 'Oct 16 - Oct 17', status: 'Confirmed', amount: '$150.00' },
];

export default function BookingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Manage all reservations</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {bookingsData.map((booking) => (
          <View key={booking.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookingId}>{booking.id}</Text>
              <View style={[styles.statusBadge, 
                 booking.status === 'Confirmed' ? styles.bgEmerald : 
                 booking.status === 'Pending' ? styles.bgAmber : styles.bgRose]}>
                <Text style={[styles.statusText, 
                  booking.status === 'Confirmed' ? styles.textEmerald : 
                  booking.status === 'Pending' ? styles.textAmber : styles.textRose]}>
                  {booking.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.guestRow}>
              <View style={styles.avatar}>
                 <Text style={styles.avatarText}>{booking.guest.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.guestName}>{booking.guest}</Text>
                <Text style={styles.roomType}>{booking.room}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
               <View style={styles.footerInfo}>
                 <Feather name="calendar" size={14} color="#64748B" />
                 <Text style={styles.footerText}>{booking.dates}</Text>
               </View>
               <Text style={styles.amount}>{booking.amount}</Text>
            </View>

          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bgEmerald: { backgroundColor: '#ECFDF5' },
  textEmerald: { color: '#10B981' },
  bgAmber: { backgroundColor: '#FFFBEB' },
  textAmber: { color: '#F59E0B' },
  bgRose: { backgroundColor: '#FEF2F2' },
  textRose: { color: '#EF4444' },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  roomType: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
