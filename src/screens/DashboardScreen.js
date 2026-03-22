import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const statsData = [
  { id: 1, label: 'Guests', value: '142', icon: 'users', color: '#3B82F6' },
  { id: 2, label: 'Rooms', value: '18 left', icon: 'key', color: '#8B5CF6' },
  { id: 3, label: 'Revenue', value: '$8.2k', icon: 'dollar-sign', color: '#10B981' },
];

const recentBookings = [
  { id: '#1', guest: 'Eleanor Pena', room: 'Deluxe Suite', status: 'Confirmed' },
  { id: '#2', guest: 'Wade Warren', room: 'Ocean View', status: 'Pending' },
  { id: '#3', guest: 'Jacob Jones', room: 'Standard', status: 'Confirmed' },
];

export default function DashboardScreen() {
  const { user, logout } = useAuth(); 

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.title}>{user?.name || 'Manager'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Feather name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer}>
            {statsData.map(stat => (
              <View key={stat.id} style={styles.statCard}>
                <View style={[styles.iconWrapper, { backgroundColor: `${stat.color}15` }]}>
                  <Feather name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.bookingsContainer}>
           {recentBookings.map((booking, index) => (
             <View key={booking.id} style={[styles.bookingItem, index === recentBookings.length - 1 && styles.noBorder]}>
                <View style={styles.bookingRow}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{booking.guest.charAt(0)}</Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.guestName}>{booking.guest}</Text>
                    <Text style={styles.roomType}>{booking.room}</Text>
                  </View>
                  <View style={[styles.statusBadge, booking.status === 'Confirmed' ? styles.statusConfirmed : styles.statusPending]}>
                     <Text style={[styles.statusText, booking.status === 'Confirmed' ? styles.statusConfirmedText : styles.statusPendingText]}>
                       {booking.status}
                     </Text>
                  </View>
                </View>
             </View>
           ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  viewAll: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  statsScroll: {
    marginHorizontal: -20,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  bookingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bookingItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  roomType: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusConfirmedText: {
    color: '#10B981',
  },
  statusPendingText: {
    color: '#F59E0B',
  },
});
