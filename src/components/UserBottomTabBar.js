import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { guestPalette } from '../theme/guestPalette';

export default function UserBottomTabBar({ activeTab, setActiveTab }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { id: 'explore', icon: 'home', label: 'Explore' },
    { id: 'mybookings', icon: 'calendar', label: 'Bookings' },
    { id: 'billing', icon: 'file-text', label: 'Billing' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: guestPalette.surface,
          borderTopColor: guestPalette.cardBorder,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10),
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && { backgroundColor: guestPalette.accentSoft }]}>
              <Feather
                name={tab.icon}
                size={22}
                color={isActive ? guestPalette.accent : guestPalette.muted}
              />
            </View>
            <Text style={[styles.label, { color: isActive ? guestPalette.accent : guestPalette.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
