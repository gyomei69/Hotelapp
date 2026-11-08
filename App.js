import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { navigationRef, resetTo } from './src/navigation/navigationRef';
import { useFonts, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import ErrorBoundary from './src/components/ErrorBoundary';

// CRITICAL: completes any pending auth session and clears stale redirect handlers.
WebBrowser.maybeCompleteAuthSession();

// Screens - Auth
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import ForgotPasswordEmailScreen from './src/screens/ForgotPasswordEmailScreen';
import ForgotPasswordVerifyScreen from './src/screens/ForgotPasswordVerifyScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ForgotPassword from './src/screens/ForgotPassword';

// Screens - Staff / Admin
import DashboardScreen from './src/screens/DashboardScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateRoomScreen from './src/screens/CreateRoomScreen';
import ManageHubScreen from './src/screens/ManageHubScreen';
import ActivityLogsScreen from './src/screens/ActivityLogsScreen';
import StaffFeedbackScreen from './src/screens/StaffFeedbackScreen';
import BottomTabBar from './src/components/BottomTabBar';

// Screens - Guest
import UserDashboardScreen from './src/screens/UserDashboardScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import UserBottomTabBar from './src/components/UserBottomTabBar';
import BillingScreen from './src/screens/BillingScreen';

const Stack = createNativeStackNavigator();

/** Staff + admin: shared shell; admin role gets extra tabs (Analytics, Manage). */
const HotelStaffApp = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [subScreen, setSubScreen] = React.useState(null);

  React.useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'analytics' || activeTab === 'manage')) {
      setActiveTab('dashboard');
    }
    if (isSuperAdmin && activeTab === 'billing') {
      setActiveTab('dashboard');
    }
  }, [isSuperAdmin, activeTab]);

  const handleNavigate = (screen) => setSubScreen(screen);
  const handleGoBack = () => setSubScreen(null);

  if (subScreen === 'profile') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <ProfileScreen onGoBack={handleGoBack} setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />
      </View>
    );
  }
  if (subScreen === 'bookingHistory') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <BookingsScreen setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />
        <BottomTabBar
          activeTab={activeTab}
          isSuperAdmin={isSuperAdmin}
          setActiveTab={(tab) => {
            setSubScreen(null);
            setActiveTab(tab);
          }}
        />
      </View>
    );
  }
  if (subScreen === 'createRoom') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <CreateRoomScreen
          onGoBack={handleGoBack}
          onSuccess={() => {
            setSubScreen(null);
            setActiveTab('rooms');
          }}
        />
      </View>
    );
  }
  if (subScreen === 'activityLogs') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <ActivityLogsScreen onGoBack={handleGoBack} />
        <BottomTabBar
          activeTab={activeTab}
          isSuperAdmin={isSuperAdmin}
          setActiveTab={(tab) => {
            setSubScreen(null);
            setActiveTab(tab);
          }}
        />
      </View>
    );
  }

  let Content;
  switch (activeTab) {
    case 'rooms':
      Content = RoomsScreen;
      break;
    case 'guests':
      Content = BookingsScreen;
      break;
    case 'billing':
      Content = BillingScreen;
      break;
    case 'feedback':
      Content = StaffFeedbackScreen;
      break;
    case 'analytics':
      Content = AnalyticsScreen;
      break;
    case 'manage':
      Content = ManageHubScreen;
      break;
    default:
      Content = DashboardScreen;
      break;
  }

  const contentProps = {
    setActiveTab,
    isSuperAdmin,
    ...(activeTab === 'dashboard' ? { onNavigate: handleNavigate } : {}),
    ...(activeTab === 'rooms' ? { onNavigate: handleNavigate } : {}),
    ...(activeTab === 'guests' ? {} : {}),
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <Content {...contentProps} />
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />
    </View>
  );
};

const GuestApp = () => {
  const [activeTab, setActiveTab] = React.useState('explore');

  let Content;
  switch (activeTab) {
    case 'mybookings':
      Content = MyBookingsScreen;
      break;
    case 'billing':
      Content = BillingScreen;
      break;
    case 'profile':
      Content = UserProfileScreen;
      break;
    default:
      Content = UserDashboardScreen;
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      <Content setActiveTab={setActiveTab} />
      <UserBottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
};

function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Always keep route names mounted so CommonActions.reset works reliably.
  React.useEffect(() => {
    // After auth state flips, reset to the correct root route.
    if (!user) {
      console.log('[nav] reset → Welcome');
      resetTo('Welcome');
      return;
    }
    const role = String(user?.role || '').trim().toLowerCase();
    console.log('[nav] reset →', role === 'admin' || role === 'staff' ? 'HotelStaffApp' : 'GuestApp');
    resetTo(role === 'admin' || role === 'staff' ? 'HotelStaffApp' : 'GuestApp');
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth screens (always registered) */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmailScreen} />
        <Stack.Screen name="ForgotPasswordVerify" component={ForgotPasswordVerifyScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* App shells (always registered) */}
        <Stack.Screen name="GuestApp" component={GuestApp} />
        <Stack.Screen name="HotelStaffApp" component={HotelStaffApp} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cinzel_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
