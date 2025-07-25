import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect } from 'react';
import LoginUser from '@/components/core/auth/User';
import RideBooking from '@/components/core/user/RideBooking';
import BidDisplay from '@/components/core/user/BidDisplay';
import RideTracking from '@/components/core/user/RideTracking';
import RideHistory from '@/components/core/user/RideHistory';
import UserProfileManagement from '@/components/core/user/UserProfileManagement';
import { UserData, RideRequest, Bid } from '@/utils/userConstants';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';

type UserScreen = 'auth' | 'booking' | 'bids' | 'tracking' | 'history' | 'profile';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state, logout } = useApp();

  // Initialize screen based on whether user is already logged in
  // Use a more defensive approach that waits for the state to be properly initialized
  const [currentScreen, setCurrentScreen] = useState<UserScreen>(() => {
    // During initial load, if we don't know the state yet, default to auth
    if (state.currentUser && !state.currentDriver) {
      return 'booking';
    }
    return 'auth';
  });
  const [acceptedBid, setAcceptedBid] = useState<Bid | null>(null);

  // Get current request from AppContext - look for pending or bidding requests
  const appContextRequest = state.rideRequests.find(req => 
    req.status === 'pending' || req.status === 'bidding'
  ) || null;
  
  // Convert AppContext RideRequest to component RideRequest format
  const currentRequest: RideRequest | null = appContextRequest ? {
    _id: appContextRequest._id,
    userId: appContextRequest.userId,
    pickupLocation: appContextRequest.pickupLocation,
    destination: appContextRequest.destination,
    status: appContextRequest.status,
    estimatedDistance: appContextRequest.estimatedDistance,
    estimatedDuration: appContextRequest.estimatedDuration,
    bids: appContextRequest.bids || [],
    acceptedBid: appContextRequest.acceptedBid,
    createdAt: appContextRequest.createdAt,
    updatedAt: appContextRequest.updatedAt,
  } : null;

  // Convert stored user data to the format expected by components
  const currentUser: UserData | null = state.currentUser ? {
    userId: state.currentUser.id,
    name: state.currentUser.name,
    phone: state.currentUser.phone,
    email: state.currentUser.email,
  } : null;

  // Check if user is logged in and update screen accordingly
  // Don't interfere if a driver is logged in instead
  useEffect(() => {
    console.log('👤 Users Tab - useEffect triggered:', {
      hasCurrentUser: !!state.currentUser,
      hasCurrentDriver: !!state.currentDriver,
      currentScreen,
      userType: state.userType
    });
    
    // If a driver is logged in, don't manage user screens
    if (state.currentDriver) {
      console.log('👤 Users Tab - Driver is logged in, not managing user screens');
      return;
    }
    
    if (state.currentUser && currentScreen === 'auth') {
      console.log('👤 Users Tab - User logged in, switching to booking');
      setCurrentScreen('booking');
    } else if (!state.currentUser && currentScreen !== 'auth') {
      console.log('👤 Users Tab - No user logged in, switching to auth');
      setCurrentScreen('auth');
    }
  }, [state.currentUser, state.currentDriver, state.userType, currentScreen]);

  // Reset local state when user logs out, but not when driver is active
  useEffect(() => {
    console.log('👤 Users Tab - Reset useEffect triggered:', {
      hasCurrentUser: !!state.currentUser,
      hasCurrentDriver: !!state.currentDriver,
      userType: state.userType
    });
    
    if (!state.currentUser && !state.currentDriver) {
      console.log('👤 Users Tab - No users or drivers logged in, resetting to auth');
      setAcceptedBid(null);
      setCurrentScreen('auth');
    }
  }, [state.currentUser, state.currentDriver, state.userType]);

  const handleLogin = (userData: UserData) => {
    // Login is now handled by the auth component through AppContext
    setCurrentScreen('booking');
  };

  const handleRegister = (userData: UserData) => {
    // Registration is now handled by the auth component through AppContext
    setCurrentScreen('booking');
  };

  const handleLogout = async () => {
    // Reset local state first
    setAcceptedBid(null);
    setCurrentScreen('auth');
    // Then call global logout
    await logout();
  };

  const handleRideRequestCreated = () => {
    // The request is now automatically available through AppContext
    // Just switch to the bids screen
    setCurrentScreen('bids');
  };

  const handleBidAccepted = (bid: Bid) => {
    setAcceptedBid(bid);
    setCurrentScreen('tracking');
  };

  const handleRideCompleted = () => {
    setAcceptedBid(null);
    setCurrentScreen('booking');
  };

  const handleRideCancelled = () => {
    setAcceptedBid(null);
    setCurrentScreen('booking');
  };

  const handleProfileUpdated = (updatedUser: UserData) => {
    // Profile updates are now handled through AppContext
    // The component will handle updating the stored user data
  };

  const renderNavigationTabs = () => {
    // Don't render navigation if driver is logged in or no user is logged in
    if (!currentUser || state.currentDriver) return null;

    const tabs = [
      { key: 'booking', label: 'Book Ride', icon: '🚗' },
      { key: 'bids', label: 'Bids', icon: '💰' },
      { key: 'tracking', label: 'Track', icon: '📍' },
      { key: 'history', label: 'History', icon: '📋' },
      { key: 'profile', label: 'Profile', icon: '👤' },
    ];

    return (
      <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              currentScreen === tab.key && { backgroundColor: theme.tint },
            ]}
            onPress={() => setCurrentScreen(tab.key as UserScreen)}
          >
            <ThemedText style={styles.tabIcon}>{tab.icon}</ThemedText>
            <ThemedText style={[
              styles.tabLabel,
              { color: currentScreen === tab.key ? (colorScheme=== 'dark' ? '#000000' : '#ffffff') : theme.text }
            ]}>
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCurrentScreen = () => {
    // Don't render anything if a driver is logged in
    if (state.currentDriver && !state.currentUser) {
      console.log('👤 Users Tab - Driver is logged in, not rendering user screens');
      return null;
    }

    switch (currentScreen) {
      case 'auth':
        return (
          <LoginUser 
            onLogin={handleLogin} 
            onRegister={handleRegister}
          />
        );
      
      case 'booking':
        return (
          <RideBooking
            currentUser={currentUser}
            onRideRequestCreated={handleRideRequestCreated}
          />
        );
      
      case 'bids':
        return (
          <BidDisplay
            currentUser={currentUser}
            currentRequest={currentRequest}
            onBidAccepted={handleBidAccepted}
          />
        );
      
      case 'tracking':
        return (
          <RideTracking
            currentUser={currentUser}
            currentRequest={currentRequest}
            acceptedBid={acceptedBid || (currentRequest?.acceptedBid ? {
              _id: currentRequest.acceptedBid.driverId,
              driverId: currentRequest.acceptedBid.driverId,
              fareAmount: currentRequest.acceptedBid.fareAmount,
              bidTime: currentRequest.acceptedBid.bidTime,
            } : null)}
            onRideCompleted={handleRideCompleted}
            onRideCancelled={handleRideCancelled}
          />
        );
      
      case 'history':
        return <RideHistory currentUser={currentUser} />;
      
      case 'profile':
        return (
          <UserProfileManagement
            currentUser={currentUser}
            onProfileUpdated={handleProfileUpdated}
            onLogout={handleLogout}
          />
        );
      
      default:
        return (
          <LoginUser 
            onLogin={handleLogin} 
            onRegister={handleRegister}
          />
        );
    }
  };

  // Don't render anything if driver is logged in
  if (state.currentDriver && !state.currentUser) {
    console.log('👤 Users Tab - Driver is logged in, not rendering anything');
    return null;
  }

  console.log('👤 Users Tab - About to render:', {
    currentScreen,
    hasCurrentUser: !!state.currentUser,
    userType: state.userType
  });

  // For auth screen, use ParallaxScrollView with header image
  if (currentScreen === 'auth') {
    console.log('👤 Users Tab - Rendering auth screen');
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/usersLogo.png')}
            style={styles.topLogo}
          />
        }>
        {renderCurrentScreen()}
      </ParallaxScrollView>
    );
  }

  // For other screens, render with navigation tabs
  console.log('👤 Users Tab - Rendering dashboard/other screen');
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {renderNavigationTabs()}
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  topLogo: {
    height: 250,
    width: 420,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
