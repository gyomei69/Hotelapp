import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Platform,
  TouchableOpacity, ActivityIndicator, Dimensions, Image, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getStats, getRooms, getRevenueReport } from '../services/api';
import { getRoomImageSource } from '../utils/roomImages';
import { buildRevenueReportHtml } from '../utils/revenueReportPdfHtml';
import { showActionError } from '../utils/errorHandling';
import NotificationBell from '../components/NotificationBell';
import { handleStaffNotificationNavigate } from '../utils/notificationNavigation';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen({ setActiveTab, onNavigate, isSuperAdmin = false }) {
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, roomsData] = await Promise.all([getStats(), getRooms()]);
      setStats(statsData);
      setRooms(roomsData.filter(r => r.status === 'Available').slice(0, 3));
    } catch (e) {
      console.error('Failed to load dashboard:', e);
      showActionError('Dashboard Error', e, 'Unable to load dashboard data right now.');
    } finally {
      setLoading(false);
    }
  };

  const exportRevenuePdf = async (period) => {
    setExportModalVisible(false);
    try {
      setExporting(true);
      let data;
      try {
        data = await getRevenueReport(period);
      } catch (apiErr) {
        showActionError(
          'Could not load revenue',
          apiErr,
          'Check that the backend is running, your Wi‑Fi IP in api.js matches this PC, and restart the server after updates.'
        );
        return;
      }
      const html = buildRevenueReportHtml(data);
      let uri;
      try {
        const result = await Print.printToFileAsync({ html });
        uri = result.uri;
      } catch (printErr) {
        showActionError('Could not create PDF', printErr, 'PDF generation failed on this device.');
        return;
      }

      if (Platform.OS === 'web') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          try {
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
          } catch {
            Alert.alert('Report ready', 'PDF was generated. Use print or save from the browser if prompted.');
          }
        } else {
          Alert.alert('Report ready', 'PDF was generated. Check your downloads or print dialog.');
        }
        return;
      }

      try {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Export Revenue Report',
        });
      } catch (shareErr) {
        console.warn('[export] share failed', shareErr);
        Alert.alert(
          'Report created',
          'The PDF was saved but sharing could not open. You can find it in your app cache or try again.',
        );
      }
    } catch (e) {
      showActionError('Export failed', e, 'Could not share the report. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const promptExportPeriod = () => {
    setExportModalVisible(true);
  };

  if (loading && !stats) {
    return (
      <View style={[styles.center, { backgroundColor: '#F5F5F7' }]}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  const occupied = stats?.occupiedRooms || 0;
  const availableTypes = stats?.availableRooms || 0;
  const checkIns = stats?.newBookings || 0;
  const roomTypes = stats?.roomTypes || 0;

  const statCards = [
    { icon: 'bed-outline', bg: '#3478F6', value: roomTypes, label: 'Type of Rooms' },
    { icon: 'people-outline', bg: '#FFB800', value: occupied, label: 'Occupied' },
    { icon: 'home-outline', bg: '#34C759', value: availableTypes, label: 'Available\nTypes' },
    { icon: 'log-in-outline', bg: '#FF6B35', value: checkIns, label: 'Check-ins\nToday' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F5F5F7' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Top Bar ─── */}
        <View style={styles.topBar}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#1B2036" />
            <Text style={[styles.locationText, { color: '#1B2036' }]}>Malay Balay City, Bukidnon</Text>
          </View>
          <View style={styles.topRight}>
            <NotificationBell
              onNotificationNavigate={(item) =>
                handleStaffNotificationNavigate(setActiveTab, isSuperAdmin, item)
              }
            />
            <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate && onNavigate('profile')}>
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Title ─── */}
        <Text style={styles.dashboardRoleLabel}>
          {isSuperAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
        </Text>
        <Text style={[styles.title, { color: '#1B2036', textAlign: 'center', alignSelf: 'stretch' }]}>
          Discover{'\n'}Aurora Grand Hotel
        </Text>

        {/* ─── Stat Cards ─── */}
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: '#1B2036' }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: '#8E8E93' }]}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Quick Actions ─── */}
        <Text style={[styles.sectionTitle, { color: '#1B2036' }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {isSuperAdmin ? (
            <TouchableOpacity
              style={[styles.actionCard, exporting && { opacity: 0.7 }]}
              onPress={promptExportPeriod}
              disabled={exporting}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconBox}>
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.actionLabelWhite}>Export Revenue</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0' },
            ]}
            onPress={() => onNavigate && onNavigate('bookingHistory')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={24} color="#1B2036" />
            <Text style={[styles.actionLabelDark, { color: '#1B2036', textAlign: 'center', alignSelf: 'center' }]}>View History</Text>
          </TouchableOpacity>
          {isSuperAdmin ? (
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0' },
              ]}
              onPress={() => onNavigate && onNavigate('activityLogs')}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={24} color="#1B2036" />
              <Text style={[styles.actionLabelDark, { color: '#1B2036', textAlign: 'center', alignSelf: 'center' }]}>Activity logs</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ─── Available Rooms ─── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: '#1B2036' }]}>Available Rooms</Text>
          <TouchableOpacity onPress={() => setActiveTab && setActiveTab('rooms')}>
            <Text style={[styles.seeAll, { color: '#4A5BCC' }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {rooms.map((room) => (
          <View key={room._id} style={[styles.roomCard, { backgroundColor: '#FFFFFF' }]}>
            <Image
              source={getRoomImageSource(room)}
              style={styles.roomImage}
              resizeMode="cover"
            />
            <View style={styles.roomInfo}>
              <View style={styles.roomTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomName, { color: '#1B2036' }]}>{room.type || 'Deluxe Suite'}</Text>
                  <View style={styles.roomLocationRow}>
                    <Ionicons name="location" size={12} color="#8E8E93" />
                    <Text style={[styles.roomFloor, { color: '#8E8E93' }]}>Floor {Math.ceil(parseInt(room.roomNumber) / 100)}, Room {room.roomNumber}</Text>
                  </View>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FFB800" />
                  <Text style={[styles.ratingText, { color: '#1B2036' }]}>4.8</Text>
                </View>
              </View>
              <View style={styles.roomBottom}>
                <Text style={[styles.roomPrice, { color: '#1B2036' }]}>₱{room.price} <Text style={[styles.perNight, { color: '#8E8E93' }]}>/night</Text></Text>
                <View style={[styles.availBadge, { backgroundColor: '#E8FFF0' }]}>
                  <Text style={styles.availText}>Available</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {rooms.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="bed-outline" size={40} color="#8E8E93" />
            <Text style={[styles.emptyText, { color: '#8E8E93' }]}>No available rooms</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalCard}>
            <Text style={styles.exportModalTitle}>Export Revenue Report</Text>
            <Text style={styles.exportModalSubtitle}>Choose period</Text>
            {['daily', 'monthly', 'yearly'].map((period) => (
              <TouchableOpacity
                key={period}
                style={styles.exportModalBtn}
                onPress={() => exportRevenuePdf(period)}
                disabled={exporting}
              >
                <Text style={styles.exportModalBtnText}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.exportModalCancel} onPress={() => setExportModalVisible(false)}>
              <Text style={styles.exportModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const cardW = (screenWidth - 62) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, fontWeight: '500' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A5BCC', justifyContent: 'center', alignItems: 'center' },
  dashboardRoleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5BCC',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  statCard: { width: cardW, flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 1, flexShrink: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  seeAll: { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  actionCard: { flex: 1, backgroundColor: '#1B2036', borderRadius: 16, padding: 18, alignItems: 'center', gap: 10 },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF15', justifyContent: 'center', alignItems: 'center' },
  actionLabelWhite: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  actionLabelDark: { fontSize: 13, fontWeight: '600' },
  roomCard: { flexDirection: 'row', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, alignItems: 'center' },
  roomImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#E8E8E8' },
  roomInfo: { flex: 1, marginLeft: 14 },
  roomTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  roomName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  roomLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  roomFloor: { fontSize: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600' },
  roomBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  roomPrice: { fontSize: 15, fontWeight: '700' },
  perNight: { fontSize: 11, fontWeight: '400' },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  availText: { fontSize: 11, color: '#34C759', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, fontSize: 14 },

  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exportModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  exportModalTitle: { fontSize: 18, fontWeight: '700', color: '#1B2036', marginBottom: 4 },
  exportModalSubtitle: { fontSize: 13, color: '#8E8E93', marginBottom: 16 },
  exportModalBtn: {
    backgroundColor: '#1B2036',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  exportModalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  exportModalCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  exportModalCancelText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
});
