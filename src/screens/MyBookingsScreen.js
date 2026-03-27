import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getMyBookings } from '../services/api';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyBookings();
  }, []);

  const loadMyBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      setBookings(data.reverse());
    } catch (error) {
      console.error('Failed to load my bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return { bg: '#ECFDF5', text: '#10B981' };
      case 'Pending':  return { bg: '#FFF8E1', text: '#FF9500' };
      case 'Rejected': return { bg: '#FEF2F2', text: '#EF4444' };
      default:         return { bg: '#F8FAFC', text: '#64748B' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Manage your upcoming stays</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
           <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtitle}>When you book a stay, it will appear here.</Text>
            </View>
          ) : (
            bookings.map(booking => {
              const statusColors = getStatusColor(booking.status);
              const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              return (
                <View key={booking._id} style={styles.card}>
                   <View style={styles.cardHeader}>
                     <Image 
                        source={{ uri: booking.room?.imageUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80' }} 
                        style={styles.roomThumb} 
                     />
                     <View style={styles.headerInfo}>
                        <Text style={styles.hotelName}>{booking.room ? booking.room.type : 'Unknown Room'}</Text>
                        <Text style={styles.roomSub}>Room {booking.room ? booking.room.roomNumber : 'N/A'}</Text>
                     </View>
                     <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusText, { color: statusColors.text }]}>{booking.status}</Text>
                     </View>
                   </View>

                   <View style={styles.metaRow}>
                     <View style={styles.metaItem}>
                        <Feather name="users" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>{booking.guestCount || 1} Guests</Text>
                     </View>
                     <View style={styles.metaItem}>
                        <Feather name="credit-card" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>{booking.paymentMethod || 'Cash'}</Text>
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
                     <Text style={styles.priceValue}>${booking.totalAmount?.toLocaleString() || 0}</Text>
                   </View>
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
  header: { padding: 24, backgroundColor: '#F8FAFC' },
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },

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

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});
