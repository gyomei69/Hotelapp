import React, { useState } from 'react';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import BillingScreen from './src/screens/BillingScreen';
import BottomTabBar from './src/components/BottomTabBar';

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return <LoginScreen />;
  }

  let Content;
  switch (activeTab) {
    case 'bookings': Content = BookingsScreen; break;
    case 'rooms': Content = RoomsScreen; break;
    case 'guests': Content = GuestsScreen; break;
    case 'billing': Content = BillingScreen; break;
    default: Content = DashboardScreen; break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Content />
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
