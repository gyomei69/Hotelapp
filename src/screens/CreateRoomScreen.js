import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createRoom } from '../services/api';
import { showActionError } from '../utils/errorHandling';

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Ocean View', 'Penthouse'];
const AVAILABILITY = ['Available', 'Unavailable'];

export default function CreateRoomScreen({ onGoBack, onSuccess }) {
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState('Standard');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [availability, setAvailability] = useState('Available');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Error', 'Room name / number is required.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Error', 'Price per night is required.');
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Enter a valid price.');
      return;
    }
    const capNum = Number(capacity);
    if (Number.isNaN(capNum) || capNum < 1) {
      Alert.alert('Error', 'Capacity must be at least 1.');
      return;
    }

    const status = availability === 'Unavailable' ? 'Unavailable' : 'Available';

    setSubmitting(true);
    try {
      await createRoom({
        roomNumber: roomNumber.trim(),
        type,
        price: priceNum,
        capacity: capNum,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        status,
      });
      Alert.alert('Success', 'Room created successfully.', [
        { text: 'OK', onPress: () => onSuccess && onSuccess() },
      ]);
    } catch (error) {
      showActionError('Create Failed', error, 'Unable to create room. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onGoBack} style={styles.backWrap}>
            <Ionicons name="arrow-back" size={24} color="#1B2036" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Room</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.inputLabel}>Room name / number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 102 or Ocean Suite A"
          placeholderTextColor="#8E8E93"
          value={roomNumber}
          onChangeText={setRoomNumber}
        />

        <Text style={styles.inputLabel}>Room type *</Text>
        <View style={styles.typeRow}>
          {ROOM_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Price per night *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 150"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.inputLabel}>Capacity *</Text>
        <TextInput
          style={styles.input}
          placeholder="Max guests"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={capacity}
          onChangeText={setCapacity}
        />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Room description..."
          placeholderTextColor="#8E8E93"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.inputLabel}>Room image URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor="#8E8E93"
          value={imageUrl}
          onChangeText={setImageUrl}
        />
        {type === 'Ocean View' ? (
          <Text style={styles.hint}>
            Leave blank to use the default ocean view photo in the app (bundled image).
          </Text>
        ) : null}

        <Text style={styles.inputLabel}>Availability *</Text>
        <View style={styles.statusRow}>
          {AVAILABILITY.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, availability === s && styles.statusChipActive]}
              onPress={() => setAvailability(s)}
            >
              <Text style={[styles.statusChipText, availability === s && styles.statusChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#F5F5F7" />
          ) : (
            <Text style={styles.saveBtnText}>Create room</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  scroll: { padding: 20, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backWrap: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B2036' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1B2036',
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  typeChipActive: { backgroundColor: '#1B2036', borderColor: '#1B2036' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#1B2036' },
  typeChipTextActive: { color: '#F5F5F7' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  statusChipActive: { backgroundColor: '#1B2036', borderColor: '#1B2036' },
  statusChipText: { fontSize: 14, fontWeight: '600', color: '#1B2036' },
  statusChipTextActive: { color: '#F5F5F7' },
  saveBtn: {
    backgroundColor: '#1B2036',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#F5F5F7', fontSize: 16, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 18,
  },
});
