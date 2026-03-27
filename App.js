import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens - Auth
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';

// Screens - Admin
import DashboardScreen from './src/screens/DashboardScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomTabBar from './src/components/BottomTabBar';

// Screens - User
import UserDashboardScreen from './src/screens/UserDashboardScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import UserBottomTabBar from './src/components/UserBottomTabBar';

const Stack = createNativeStackNavigator();

// Admin Tab wrapper
const AdminApp = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [subScreen, setSubScreen] = React.useState(null);

  const handleNavigate = (screen) => setSubScreen(screen);
  const handleGoBack = () => setSubScreen(null);

  if (subScreen === 'profile') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <ProfileScreen onGoBack={handleGoBack} />
      </View>
    );
  }
  if (subScreen === 'bookingHistory') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <BookingsScreen />
        <BottomTabBar activeTab={activeTab} setActiveTab={(tab) => { setSubScreen(null); setActiveTab(tab); }} />
      </View>
    );
  }

  let Content;
  switch (activeTab) {
    case 'rooms': Content = RoomsScreen; break;
    case 'guests': Content = BookingsScreen; break;
    case 'analytics': Content = AnalyticsScreen; break;
    default: Content = DashboardScreen; break;
  }

  const contentProps = activeTab === 'dashboard'
    ? { setActiveTab, onNavigate: handleNavigate }
    : {};

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <Content {...contentProps} />
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
};

// User Tab wrapper
const UserApp = () => {
  const [activeTab, setActiveTab] = React.useState('explore');

  let Content;
  switch (activeTab) {
    case 'mybookings': Content = MyBookingsScreen; break;
    case 'profile': Content = UserProfileScreen; break;
    default: Content = UserDashboardScreen; break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <Content setActiveTab={setActiveTab} />
      <UserBottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
};

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : user.role === 'admin' || user.role === 'staff' ? (
          <Stack.Screen name="AdminApp" component={AdminApp} />
        ) : (
          <Stack.Screen name="UserApp" component={UserApp} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
