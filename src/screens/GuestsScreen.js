import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const guestsData = [
  { id: '1', name: 'Eleanor Pena', email: 'eleanor.p@example.com', phone: '+1 (555) 000-0000', bookings: 4, spent: '$1,850', status: 'Active' },
  { id: '2', name: 'Jacob Jones', email: 'jacob.j@example.com', phone: '+1 (555) 111-1111', bookings: 1, spent: '$200', status: 'Inactive' },
  { id: '3', name: 'Albert Flores', email: 'albert.f@example.com', phone: '+1 (555) 222-2222', bookings: 7, spent: '$4,200', status: 'Active' },
  { id: '4', name: 'Wade Warren', email: 'wade.w@example.com', phone: '+1 (555) 333-3333', bookings: 2, spent: '$800', status: 'Inactive' },
];

export default function GuestsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Guests</Text>
          <Text style={styles.subtitle}>Directory & History</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="user-plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#94A3B8" />
            <Text style={styles.searchText}>Search guests...</Text>
          </View>

          {guestsData.map(guest => (
            <View key={guest.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                   <Text style={styles.avatarText}>{guest.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{guest.name}</Text>
                  <Text style={styles.contact}>{guest.email}</Text>
                </View>
                <View style={[styles.statusBadge, guest.status === 'Active' ? styles.bgEmerald : styles.bgSlate]}>
                   <Text style={[styles.statusText, guest.status === 'Active' ? styles.textEmerald : styles.textSlate]}>
                     {guest.status}
                   </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statContainer}>
                   <Text style={styles.statLabel}>Bookings</Text>
                   <Text style={styles.statValue}>{guest.bookings}</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statContainer}>
                   <Text style={styles.statLabel}>Total Spent</Text>
                   <Text style={styles.statValue}>{guest.spent}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn}>
                   <Feather name="phone" size={16} color="#4F46E5" />
                </TouchableOpacity>
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
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchText: {
    color: '#94A3B8',
    fontSize: 15,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  contact: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bgEmerald: { backgroundColor: '#ECFDF5' },
  textEmerald: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  bgSlate: { backgroundColor: '#F1F5F9' },
  textSlate: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statContainer: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
