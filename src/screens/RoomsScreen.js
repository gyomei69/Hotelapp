import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const roomsData = [
  { id: '101', type: 'Standard', status: 'Available', price: '$150' },
  { id: '102', type: 'Standard', status: 'Occupied', price: '$150' },
  { id: '201', type: 'Suite', status: 'Cleaning', price: '$350' },
  { id: '202', type: 'Suite', status: 'Available', price: '$350' },
  { id: '301', type: 'Ocean', status: 'Occupied', price: '$450' },
  { id: '302', type: 'Ocean', status: 'Maintenance', price: '$450' },
  { id: '401', type: 'Penthouse', status: 'Available', price: '$850' },
  { id: '402', type: 'Penthouse', status: 'Occupied', price: '$850' },
];

export default function RoomsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rooms Status</Text>
          <Text style={styles.subtitle}>Check availability</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="filter" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {roomsData.map((room) => {
            const isAvailable = room.status === 'Available';
            const isOccupied = room.status === 'Occupied';
            const isCleaning = room.status === 'Cleaning';
            
            return (
              <View key={room.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.roomId}>{room.id}</Text>
                  <View style={[styles.dot, 
                    isAvailable ? styles.bgEmerald : 
                    isOccupied ? styles.bgBlue : 
                    isCleaning ? styles.bgAmber : styles.bgRose
                  ]} />
                </View>
                
                <View style={[styles.iconBox, isAvailable && styles.iconBoxAvailable]}>
                  <Feather name="key" size={24} color={isAvailable ? '#4F46E5' : '#94A3B8'} />
                </View>

                <Text style={styles.roomType}>{room.type}</Text>
                
                <View style={styles.footerRow}>
                  <Text style={styles.price}>{room.price}<Text style={styles.night}>/n</Text></Text>
                  <Text style={[styles.statusText, 
                    isAvailable ? styles.textEmerald : 
                    isOccupied ? styles.textBlue : 
                    isCleaning ? styles.textAmber : styles.textRose
                  ]}>
                    {room.status}
                  </Text>
                </View>
              </View>
            );
          })}
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
  filterBtn: {
    backgroundColor: '#FFFFFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomId: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  bgEmerald: { backgroundColor: '#10B981' },
  bgBlue: { backgroundColor: '#3B82F6' },
  bgAmber: { backgroundColor: '#F59E0B' },
  bgRose: { backgroundColor: '#EF4444' },
  textEmerald: { color: '#10B981' },
  textBlue: { color: '#3B82F6' },
  textAmber: { color: '#F59E0B' },
  textRose: { color: '#EF4444' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconBoxAvailable: {
    backgroundColor: '#EEF2FF',
  },
  roomType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  night: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
