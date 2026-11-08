import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markNotificationRead } from '../services/api';
import NotificationModal from './NotificationModal';
import { showActionError } from '../utils/errorHandling';

export default function NotificationBell({
  iconColor = '#1B263B',
  size = 22,
  style,
  /** Preferred: full notification row for smart navigation. */
  onNotificationNavigate,
  /** Legacy: called with relatedId only (booking flows). */
  onBookingNotificationPress,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openedOnceRef = useRef(false);

  const applyPayload = useCallback((data) => {
    const list = data?.notifications || [];
    setNotifications(list);
    const count =
      typeof data?.unreadCount === 'number'
        ? data.unreadCount
        : list.filter((n) => !n.isRead).length;
    setUnreadCount(count);
  }, []);

  const load = useCallback(
    async ({ showUserError = false, isPull = false, showListSpinner = false } = {}) => {
      try {
        if (isPull) setRefreshing(true);
        else if (showListSpinner) setLoading(true);
        const data = await getNotifications();
        applyPayload(data);
      } catch (e) {
        console.warn('[NotificationBell]', e?.message || e);
        if (showUserError) {
          showActionError('Notifications', e, 'Could not load notifications.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    load({ showListSpinner: true });
  }, [load]);

  useEffect(() => {
    if (!modalVisible) return;
    const firstOpen = !openedOnceRef.current;
    if (firstOpen) openedOnceRef.current = true;
    load({ showUserError: firstOpen, isPull: false });
  }, [modalVisible, load]);

  const handleItemPress = async (item) => {
    try {
      if (!item.isRead && item._id) {
        await markNotificationRead(item._id);
        setNotifications((prev) =>
          prev.map((n) =>
            String(n._id) === String(item._id) ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setModalVisible(false);
      if (typeof onNotificationNavigate === 'function') {
        onNotificationNavigate(item);
      } else if (item.relatedId && typeof onBookingNotificationPress === 'function') {
        onBookingNotificationPress(String(item.relatedId));
      }
    } catch (e) {
      showActionError('Notifications', e, 'Could not update this notification.');
    }
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Open notifications"
      >
        <Ionicons name="notifications-outline" size={size} color={iconColor} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : String(unreadCount)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        notifications={notifications}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => load({ showUserError: true, isPull: true })}
        onItemPress={handleItemPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
