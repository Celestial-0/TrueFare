import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect, useCallback, useMemo } from 'react';
import LoginUser from '@/components/core/auth/UserAuth';
import {RideBooking} from '@/components/core/user/RideBooking';
import BidDisplay from '@/components/core/user/BidDisplay';
import RideTracking from '@/components/core/user/RideTracking';
import RideHistory from '@/components/core/user/RideHistory';
import UserProfileManagement from '@/components/core/user/UserProfileManagement';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';

type UserScreen = 'auth' | 'dashboard' | 'bids' | 'tracking' | 'history' | 'profile';

export default function UsersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { currentUser, currentDriver, userType, rideRequests, cancelRide, addNotification } = useApp();

  // Initialize screen based on whether user is already logged in
  const [currentScreen, setCurrentScreen] = useState<UserScreen>(() => {
    if (currentUser && !currentDriver) {
      return 'dashboard';
    }
    return 'auth';
  });

  // Find active ride request - only one ride request should be processed at a time
  const activeRideRequest = useMemo(() => {
    const activeRequests = rideRequests.filter((r) => ['pending', 'bidding', 'accepted'].includes(r.status));
    
    // Return the most recent active ride request (latest created)
    if (activeRequests.length > 0) {
      return activeRequests.reduce((latest, current) => {
        const latestTime = new Date(latest.createdAt || 0).getTime();
        const currentTime = new Date(current.createdAt || 0).getTime();
        return currentTime > latestTime ? current : latest;
      });
    }
    
    return null;
  }, [rideRequests]);

  // Check if user can create a new ride request
  const canCreateNewRide = !activeRideRequest;

  // Handle ride request creation and navigation
  const handleRideRequestCreated = useCallback((requestId: string) => {
    console.log('🔄 [Users Tab] Ride request created, switching to bids tab:', requestId);
    setCurrentScreen('bids');
  }, []);

  // Handle ride cancellation
  const handleCancelRide = useCallback(async () => {
    if (!activeRideRequest) return;
    
    try {
      await cancelRide(activeRideRequest.requestId, 'User cancelled');
      addNotification({
        type: 'success',
        message: 'Ride request cancelled successfully',
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error cancelling ride:', error);
      addNotification({
        type: 'error',
        message: 'Failed to cancel ride. Please try again.',
        createdAt: new Date(),
      });
    }
  }, [activeRideRequest, cancelRide, addNotification]);

  // Check if user is logged in and update screen accordingly
  useEffect(() => {
    console.log('👤 Users Tab - useEffect triggered:', {
      hasCurrentUser: !!currentUser,
      hasCurrentDriver: !!currentDriver,
      currentScreen,
      userType: userType
    });
    
    // If a driver is logged in, don't manage user screens
    if (currentDriver && !currentUser) {
      console.log('👤 Users Tab - Driver is logged in, not managing user screens');
      return;
    }
    
    if (currentUser && currentScreen === 'auth') {
      console.log('👤 Users Tab - User logged in, switching to dashboard');
      setCurrentScreen('dashboard');
    } else if (!currentUser && currentScreen !== 'auth') {
      console.log('👤 Users Tab - No user logged in, switching to auth');
      setCurrentScreen('auth');
    }
  }, [currentUser, currentDriver, userType, currentScreen]);

  // Reset local state when user logs out
  useEffect(() => {
    console.log('👤 Users Tab - Reset useEffect triggered:', {
      hasCurrentUser: !!currentUser,
      hasCurrentDriver: !!currentDriver,
      userType: userType
    });
    
    if (!currentUser && !currentDriver) {
      console.log('👤 Users Tab - No users or drivers logged in, resetting to auth');
      setCurrentScreen('auth');
    }
  }, [currentUser, currentDriver, userType]);

  const renderNavigationTabs = () => {
    // Don't render navigation if driver is logged in or no user is logged in
    if (!currentUser || currentDriver) return null;

    const tabs = [
      { key: 'dashboard', label: 'Book Ride', icon: '🚗' },
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
    // Don't render anything if a driver is logged in or no user is logged in
    if (currentDriver && !currentUser) {
      console.log('👤 Users Tab - Driver is logged in, not rendering user screens');
      return null;
    }

    switch (currentScreen) {
      case 'auth':
        return <LoginUser />;
      
      case 'dashboard':
        // If there's an active ride request, show cancellation interface instead of booking form
        if (activeRideRequest) {
          return (
            <View style={styles.cancelContainer}>
              <ThemedText style={[styles.cancelTitle, { color: theme.text }]}>
                Active Ride Request
              </ThemedText>
              <View style={[styles.cancelCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={[styles.cancelStatus, { color: theme.primary }]}>
                  Status: {activeRideRequest.status.charAt(0).toUpperCase() + activeRideRequest.status.slice(1)}
                </ThemedText>
                <ThemedText style={[styles.cancelRoute, { color: theme.text }]}>
                  From: {activeRideRequest.pickupLocation.address}
                </ThemedText>
                <ThemedText style={[styles.cancelRoute, { color: theme.text }]}>
                  To: {activeRideRequest.destination.address}
                </ThemedText>
                
                <View style={styles.cancelActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.danger }]}
                    onPress={handleCancelRide}
                  >
                    <ThemedText style={styles.cancelButtonText}>Cancel Ride</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.viewBidsButton, { backgroundColor: theme.primary }]}
                    onPress={() => setCurrentScreen('bids')}
                  >
                    <ThemedText style={styles.viewBidsButtonText}>View Bids</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }
        return canCreateNewRide ? <RideBooking onRideRequestCreated={handleRideRequestCreated} /> : <View><ThemedText>No new ride requests can be created at this time.</ThemedText></View>;
      
      case 'bids':
        return <BidDisplay />;
      
      case 'tracking':
        return <RideTracking />;
      
      case 'history':
        return <RideHistory />;
      
      case 'profile':
        return <UserProfileManagement />;
      
      default:
        return <LoginUser />;
    }
  };

  // Don't render anything if driver is logged in
  if (currentDriver && !currentUser) {
    console.log('👤 Users Tab - Driver is logged in, not rendering anything');
    return null;
  }

  console.log('👤 Users Tab - About to render:', {
    currentScreen,
    hasCurrentUser: !!currentUser,
    userType: userType
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
  // New styles for ride cancellation interface
  cancelContainer: {
    flex: 1,
    padding: 20,
  },
  cancelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  cancelStatus: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelRoute: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  cancelActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewBidsButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewBidsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
