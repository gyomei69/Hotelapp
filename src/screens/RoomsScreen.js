import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView, Platform,
  TouchableOpacity, ActivityIndicator, Image, Modal, TextInput,
  Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function RoomsScreen() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '', type: 'Standard', price: '', status: 'Available', imageUrl: '',
  });

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await getRooms();
      setRooms(data);
    } catch (e) {
      console.error('Failed to load rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPress = () => {
    setEditingRoom(null);
    setFormData({ roomNumber: '', type: 'Standard', price: '', status: 'Available', imageUrl: '' });
    setModalVisible(true);
  };
  const handleEditPress = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber, type: room.type,
      price: room.price.toString(), status: room.status, imageUrl: room.imageUrl || '',
    });
    setModalVisible(true);
  };
  const handleSubmit = async () => {
    if (!formData.roomNumber || !formData.price) {
      Alert.alert('Error', 'Please fill in room number and price.');
      return;
    }
    try {
      if (editingRoom) {
        await updateRoom(editingRoom._id, formData);
      } else {
        await createRoom(formData);
      }
      setModalVisible(false);
      loadRooms();
    } catch (e) { Alert.alert('Error', e.message); }
  };
  const handleDelete = (id) => {
    Alert.alert('Delete Room', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteRoom(id); loadRooms(); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const total = rooms.length;
  const availCount = rooms.filter(r => r.status === 'Available').length;
  const occCount = rooms.filter(r => r.status === 'Occupied').length;

  const filteredRooms = rooms.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.roomNumber?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  });

  const amenities = ['WiFi', 'TV', 'Mini Bar', 'Ocean View'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Rooms & Booking</Text>
          <TouchableOpacity style={styles.addFab} onPress={handleAddPress}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rooms..."
            placeholderTextColor="#B0B0B5"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity>
            <Ionicons name="options-outline" size={20} color="#1B2036" />
          </TouchableOpacity>
        </View>

        {/* Summary pills */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Total</Text>
            <Text style={styles.pillValue}>{total}</Text>
          </View>
          <View style={[styles.pill, styles.pillGreen]}>
            <Text style={[styles.pillLabel, { color: '#34C759' }]}>Available</Text>
            <Text style={[styles.pillValue, { color: '#34C759' }]}>{availCount}</Text>
          </View>
          <View style={[styles.pill, styles.pillOrange]}>
            <Text style={[styles.pillLabel, { color: '#FF9500' }]}>Occupied</Text>
            <Text style={[styles.pillValue, { color: '#FF9500' }]}>{occCount}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#4A5BCC" /></View>
        ) : (
          filteredRooms.map((room) => (
            <View key={room._id} style={styles.roomCard}>
              {/* Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: room.imageUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80' }}
                  style={styles.roomImage}
                />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{room.status}</Text>
                </View>
                <View style={styles.ratingTag}>
                  <Ionicons name="star" size={12} color="#FFB800" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              </View>

              {/* Info */}
              <View style={styles.infoSection}>
                <View style={styles.namePriceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{room.type || 'Deluxe Suite'}</Text>
                    <Text style={styles.roomSub}>Room {room.roomNumber}·Floor {Math.ceil(parseInt(room.roomNumber) / 100)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.roomPrice}>₱{room.price}</Text>
                    <Text style={styles.perNight}>per night</Text>
                  </View>
                </View>

                {/* Capacity + Type */}
                <View style={styles.tagsRow}>
                  <View style={styles.capacityTag}>
                    <Ionicons name="people-outline" size={14} color="#8E8E93" />
                    <Text style={styles.capacityText}>Up to 3</Text>
                  </View>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{room.type}</Text>
                  </View>
                </View>

                {/* Amenities */}
                <View style={styles.amenitiesRow}>
                  {amenities.map((a) => (
                    <View key={a} style={styles.amenityChip}>
                      <Text style={styles.amenityText}>{a}</Text>
                    </View>
                  ))}
                </View>

                {/* Book Now + Admin actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.bookBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>

                {/* Admin actions (Edit / Delete) */}
                <View style={styles.adminRow}>
                  <TouchableOpacity onPress={() => handleEditPress(room)} style={styles.adminBtn}>
                    <Ionicons name="pencil" size={16} color="#4A5BCC" />
                    <Text style={styles.adminBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(room._id)} style={styles.adminBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {filteredRooms.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Ionicons name="bed-outline" size={48} color="#8E8E93" />
            <Text style={[styles.emptyText, { color: '#8E8E93' }]}>No rooms found</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal is kept separate and styles can remain mostly hardcoded or partially themed depending on preference, but let's theme the modal content too */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#1B2036' }]}>
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1B2036" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: '#8E8E93' }]}>Room Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F1F5F9', color: '#1B2036', borderColor: '#F0F0F2' }]}
                placeholder="e.g. 101"
                placeholderTextColor="#8E8E93"
                value={formData.roomNumber}
                onChangeText={(t) => setFormData(p => ({ ...p, roomNumber: t }))}
              />

              <Text style={[styles.inputLabel, { color: '#8E8E93' }]}>Room Type</Text>
              <View style={styles.typeRow}>
                {['Standard', 'Deluxe', 'Suite', 'Ocean View', 'Penthouse'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      { backgroundColor: '#F1F5F9', borderColor: '#F0F0F2' },
                      formData.type === t && { backgroundColor: '#1B2036', borderColor: '#1B2036' }
                    ]}
                    onPress={() => setFormData(p => ({ ...p, type: t }))}
                  >
                    <Text style={[
                      styles.typeChipText,
                      { color: formData.type === t ? '#F5F5F7' : '#1B2036' }
                    ]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: '#8E8E93' }]}>Price per night ($) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F1F5F9', color: '#1B2036', borderColor: '#F0F0F2' }]}
                placeholder="e.g. 150"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(t) => setFormData(p => ({ ...p, price: t }))}
              />

              <Text style={[styles.inputLabel, { color: '#8E8E93' }]}>Image URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F1F5F9', color: '#1B2036', borderColor: '#F0F0F2' }]}
                placeholder="https://..."
                placeholderTextColor="#8E8E93"
                value={formData.imageUrl}
                onChangeText={(t) => setFormData(p => ({ ...p, imageUrl: t }))}
              />

              <Text style={[styles.inputLabel, { color: '#8E8E93' }]}>Status</Text>
              <View style={styles.statusRow}>
                {['Available', 'Occupied', 'Maintenance'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      { backgroundColor: '#F1F5F9', borderColor: '#F0F0F2' },
                      formData.status === s && { backgroundColor: '#1B2036', borderColor: '#1B2036' }
                    ]}
                    onPress={() => setFormData(p => ({ ...p, status: s }))}
                  >
                    <Text style={[
                      styles.statusChipText,
                      { color: formData.status === s ? '#F5F5F7' : '#1B2036' }
                    ]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#1B2036' }]} onPress={handleSubmit}>
              <Text style={[styles.saveBtnText, { color: '#F5F5F7' }]}>Save Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  scroll: { padding: 20, paddingTop: Platform.OS === 'android' ? 44 : 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B2036' },
  addFab: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#4A5BCC', justifyContent: 'center', alignItems: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 28, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#E8E8E8', marginBottom: 18,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1B2036' },

  pillsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 22 },
  pill: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: '#E8E8E8' },
  pillGreen: { borderColor: '#34C75933' },
  pillOrange: { borderColor: '#FF950033' },
  pillLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '500', marginBottom: 2 },
  pillValue: { fontSize: 20, fontWeight: '700', color: '#1B2036' },

  roomCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  imageContainer: { position: 'relative' },
  roomImage: { width: '100%', height: 180, backgroundColor: '#E8E8E8' },
  statusTag: { position: 'absolute', top: 12, left: 12, backgroundColor: '#E8FFF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { color: '#34C759', fontSize: 11, fontWeight: '600' },
  ratingTag: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#1B2036' },

  infoSection: { padding: 16 },
  namePriceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  roomName: { fontSize: 18, fontWeight: '700', color: '#1B2036' },
  roomSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  roomPrice: { fontSize: 20, fontWeight: '700', color: '#1B2036' },
  perNight: { fontSize: 11, color: '#8E8E93' },

  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  capacityTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacityText: { fontSize: 12, color: '#8E8E93' },
  typeTag: { backgroundColor: '#F0F0F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeTagText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },

  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  amenityChip: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  amenityText: { fontSize: 11, color: '#8E8E93' },

  actionsRow: { marginBottom: 8 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B2036', borderRadius: 14, paddingVertical: 13, gap: 6 },
  bookBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  adminRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  adminBtnText: { fontSize: 13, color: '#4A5BCC', fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', marginTop: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1B2036' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#1B2036', marginBottom: 8, marginTop: 12 },
  modalInput: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 14, fontSize: 15, color: '#1B2036', borderWidth: 1, borderColor: '#E8E8E8' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F5F5F7', borderWidth: 1, borderColor: '#E8E8E8' },
  chipActive: { backgroundColor: '#EEF0FF', borderColor: '#4A5BCC' },
  chipText: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  chipTextActive: { color: '#4A5BCC' },
  submitBtn: { backgroundColor: '#1B2036', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
