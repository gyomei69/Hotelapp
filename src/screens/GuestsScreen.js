import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getGuests, createGuest, updateGuest, deleteGuest } from '../services/api';

export default function GuestsScreen() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const data = await getGuests();
      setGuests(data.reverse()); // Newest first
    } catch (error) {
      console.error('Failed to load guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPress = () => {
    setEditingGuest(null);
    setFormData({ name: '', email: '', phone: '' });
    setModalVisible(true);
  };

  const handleEditPress = (guest) => {
    setEditingGuest(guest);
    setFormData({ name: guest.name, email: guest.email, phone: guest.phone || '' });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Name, Email, and Phone are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGuest) {
        await updateGuest(editingGuest._id, formData);
        Alert.alert('Success', 'Guest updated successfully!');
      } else {
        await createGuest(formData);
        Alert.alert('Success', 'Guest added successfully!');
      }
      setModalVisible(false);
      loadGuests();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process guest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Guest', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteGuest(id);
          loadGuests();
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      }}
    ]);
  };

  const filteredGuests = guests.filter(guest => 
    guest.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (guest.phone && guest.phone.includes(searchQuery))
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Guests</Text>
          <Text style={styles.subtitle}>{guests.length} total profiles</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddPress}>
          <Feather name="user-plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search name, email or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredGuests.map(guest => (
            <View key={guest._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{guest.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{guest.name}</Text>
                  <Text style={styles.email}>{guest.email}</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditPress(guest)} style={styles.editBtn}>
                   <Feather name="edit-2" size={16} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={14} color="#64748B" />
                  <Text style={styles.infoText}>{guest.phone || 'No phone'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(guest._id)}>
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filteredGuests.length === 0 && (
            <View style={styles.emptyBox}>
              <Feather name="users" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No guests found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* GUEST MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGuest ? 'Edit Profile' : 'New Guest'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                value={formData.name} 
                onChangeText={(t) => setFormData({...formData, name: t})}
                placeholder="John Doe"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput 
                style={styles.input} 
                value={formData.email} 
                onChangeText={(t) => setFormData({...formData, email: t})}
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput 
                style={styles.input} 
                value={formData.phone} 
                onChangeText={(t) => setFormData({...formData, phone: t})}
                placeholder="+1 234 567 890"
                keyboardType="phone-pad"
              />

              <TouchableOpacity 
                style={[styles.submitBtn, submitting && styles.btnDisabled]} 
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Please wait...' : editingGuest ? 'Save Changes' : 'Create Profile'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  addBtn: { width: 48, height: 48, backgroundColor: '#4F46E5', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  searchBox: { paddingHorizontal: 24, marginBottom: 16 },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 0, gap: 16 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  cardInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: '#64748B', marginTop: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  modalForm: { flexGrow: 0 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 16, color: '#0F172A' },
  submitBtn: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  btnDisabled: { backgroundColor: '#94A3B8' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
