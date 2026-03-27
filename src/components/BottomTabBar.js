import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'rooms', label: 'Rooms', icon: 'bed-outline', activeIcon: 'bed' },
  { key: 'guests', label: 'Guests', icon: 'people-outline', activeIcon: 'people' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
];

export default function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FFFFFF', borderTopColor: '#F0F0F0' }]}>
      <View style={styles.container}>
        {TABS.map((tab) => {
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
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
