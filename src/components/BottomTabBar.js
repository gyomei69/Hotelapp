import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';

const TABS = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar' },
  { key: 'rooms', label: 'Rooms', icon: 'key' },
  { key: 'guests', label: 'Guests', icon: 'users' },
  { key: 'billing', label: 'Billing', icon: 'credit-card' },
];

export default function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity 
              key={tab.key} 
              style={styles.tabButton} 
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather 
                name={tab.icon} 
                size={22} 
                color={isActive ? '#4F46E5' : '#94A3B8'} 
                style={styles.icon}
              />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
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
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  container: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabLabel: {
    color: '#4F46E5',
    fontWeight: '700',
  },
});
