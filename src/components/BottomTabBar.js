import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rfs, rs } from '../theme/responsive';

const CORE_TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'rooms', label: 'Rooms', icon: 'bed-outline', activeIcon: 'bed' },
  { key: 'guests', label: 'Bookings', icon: 'calendar-outline', activeIcon: 'calendar' },
];

/** Billing: staff only (admin uses Manage / other tools; billing tab hidden for admin). */
const BILLING_TAB = { key: 'billing', label: 'Billing', icon: 'receipt-outline', activeIcon: 'receipt' };

const FEEDBACK_TAB = {
  key: 'feedback',
  label: 'Feedback',
  icon: 'chatbubble-ellipses-outline',
  activeIcon: 'chatbubble-ellipses',
};

const ADMIN_EXTRA_TABS = [
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'manage', label: 'Manage', icon: 'settings-outline', activeIcon: 'settings' },
];

function buildStaffTabs(isSuperAdmin) {
  if (isSuperAdmin) {
    // Admin tools: no Guests/Bookings and no Feedback tab
    return [
      CORE_TABS[0], // dashboard
      CORE_TABS[1], // rooms
      ...ADMIN_EXTRA_TABS,
    ];
  }
  return [...CORE_TABS, BILLING_TAB, FEEDBACK_TAB];
}

export default function BottomTabBar({ activeTab, setActiveTab, isSuperAdmin }) {
  const insets = useSafeAreaInsets();
  const tabs = buildStaffTabs(isSuperAdmin);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FFFFFF', borderTopColor: '#F0F0F0' }]}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? '#4A5BCC' : '#8E8E93'}
              />
              <Text style={[styles.label, { color: isActive ? '#4A5BCC' : '#8E8E93' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    borderTopWidth: 1,
  },
  container: {
    flexDirection: 'row',
    minHeight: rs(56),
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: rs(6),
  },
  label: {
    fontSize: rfs(10),
    fontWeight: '500',
    marginTop: rs(2),
  },
});
