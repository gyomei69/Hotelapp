import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { formatRelativeTime } from '../utils/formatRelativeTime';

export default function NotificationModal({
  visible,
  onClose,
  notifications,
  loading,
  refreshing,
  onRefresh,
  onItemPress,
}) {
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.rowUnread]}
      onPress={() => onItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.rowBody}>
        <Text style={styles.msg}>{item.message}</Text>
        <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          {loading && notifications.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4A5BCC" />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => String(item._id)}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text style={styles.empty}>No notifications yet.</Text>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A5BCC" />
              }
              contentContainerStyle={
                notifications.length === 0 ? styles.emptyList : styles.listContent
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '72%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B263B',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5BCC',
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
    color: '#64748B',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  rowUnread: {
    backgroundColor: '#F8FAFC',
  },
  rowBody: {
    flex: 1,
  },
  msg: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 20,
  },
  time: {
    marginTop: 4,
    fontSize: 13,
    color: '#94A3B8',
  },
});
