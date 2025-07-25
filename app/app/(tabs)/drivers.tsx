import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';


import { useState, useEffect } from 'react';
import LoginDriver from '@/components/core/auth/Driver';
import DriverDashboard from '@/components/core/driver/DriverDashboard';
import AvailableRequests from '@/components/core/driver/AvailableRequests';
import { parseVehicleYear } from '@/utils/constants';
import DriverEarnings from '@/components/core/driver/DriverEarnings';
import VehicleInfoManagement from '@/components/core/driver/VehicleInfoManagement';
import { DriversProfile } from '@/components/core/driver/DriversProfile';
import { useApp } from '@/contexts/AppContext';
import { DriverData } from '@/utils/driverConstants';
import { StoredDriverData } from '@/services/storageService';

type DriverScreen = 'login' | 'dashboard' | 'requests' | 'earnings' | 'vehicle' | 'profile';

// Helper function to convert StoredDriverData to DriverData
const convertStoredDriverToDriverData = (storedDriver: StoredDriverData): DriverData => {
  return {
    driverId: storedDriver.id,
    name: storedDriver.name,
    phone: storedDriver.phone,
    email: storedDriver.email,
    status: storedDriver.status,
    vehicleInfo: storedDriver.vehicleInfo ? {
      make: storedDriver.vehicleInfo.make,
      model: storedDriver.vehicleInfo.model,
      year: parseVehicleYear(storedDriver.vehicleInfo.year) || new Date().getFullYear(),
      color: storedDriver.vehicleInfo.color,
      licensePlate: storedDriver.vehicleInfo.licensePlate,
    } : undefined,
  };
};

export default function TabTwoScreen() {
  const { state, logout } = useApp();
  
  console.log('🚗 Driver Tab - Component mounting/re-rendering:', {
    hasCurrentDriver: !!state.currentDriver,
    hasCurrentUser: !!state.currentUser,
    userType: state.userType,
    isConnected: state.isConnected
  });
  
  // Initialize screen based on whether driver is already logged in
  // Use a more defensive approach that waits for the state to be properly initialized
  const [currentScreen, setCurrentScreen] = useState<DriverScreen>(() => {
    console.log('🚗 Driver Tab - Initializing state:', {
      hasCurrentDriver: !!state.currentDriver,
      hasCurrentUser: !!state.currentUser,
      userType: state.userType
    });
    // During initial load, if driver is already logged in, go to dashboard
    if (state.currentDriver && !state.currentUser) {
      console.log('🚗 Driver Tab - Initializing to dashboard (driver logged in)');
      return 'dashboard';
    }
    console.log('🚗 Driver Tab - Initializing to login');
    return 'login';
  });

  // Force immediate screen update on mount if driver is already logged in
  useEffect(() => {
    console.log('🚗 Driver Tab - Mount effect - checking initial driver state');
    if (state.currentDriver && !state.currentUser && currentScreen === 'login') {
      console.log('🚗 Driver Tab - Mount effect - Driver found on mount, switching to dashboard');
      setCurrentScreen('dashboard');
    }
  }, [state.currentDriver, state.currentUser, currentScreen]);

  // Convert stored driver data to the format expected by components
  const currentDriver: DriverData | null = state.currentDriver 
    ? convertStoredDriverToDriverData(state.currentDriver)
    : null;

  // Debug logging for driver tab
  console.log('🔍 Driver Tab - AppContext state:', {
    hasCurrentDriver: !!state.currentDriver,
    hasCurrentUser: !!state.currentUser,
    driverId: state.currentDriver?.id || 'null',
    userId: state.currentUser?.id || 'null',
    isConnected: state.isConnected,
    isSocketRegistered: state.isSocketRegistered,
    connectionStatus: state.connectionStatus,
    currentScreen
  });

  // Check if driver is logged in and update screen accordingly
  // Don't interfere if a user is logged in instead
  useEffect(() => {
    console.log('🚗 Driver Tab - Main useEffect triggered:', {
      hasCurrentDriver: !!state.currentDriver,
      hasCurrentUser: !!state.currentUser,
      currentScreen,
      userType: state.userType,
      driverId: state.currentDriver?.id
    });
    
    // If a user is logged in, don't manage driver screens
    if (state.currentUser) {
      console.log('🚗 Driver Tab - User is logged in, not managing driver screens');
      return;
    }
    
    if (state.currentDriver) {
      // If driver is logged in, ensure we're on dashboard (unless explicitly on another screen)
      if (currentScreen === 'login') {
        console.log('🚗 Driver Tab - Driver logged in, switching to dashboard');
        setCurrentScreen('dashboard');
      }
    } else {
      // If no driver is logged in, redirect to login
      if (currentScreen !== 'login') {
        console.log('🚗 Driver Tab - No driver logged in, switching to login');
        setCurrentScreen('login');
      }
    }
  }, [state.currentDriver, state.currentUser, state.userType, currentScreen]);

  // Specific effect to handle driver session restoration
  useEffect(() => {
    console.log('🚗 Driver Tab - Driver restoration effect:', {
      hasCurrentDriver: !!state.currentDriver,
      currentScreen,
      driverId: state.currentDriver?.id,
      userType: state.userType
    });
    
    // Force switch to dashboard when driver becomes available
    if (state.currentDriver && !state.currentUser && currentScreen === 'login') {
      console.log('🚗 Driver Tab - Forcing switch to dashboard for restored driver');
      setCurrentScreen('dashboard');
    }
  }, [state.currentDriver, currentScreen, state.currentUser, state.userType]);

  // Effect to monitor userType changes specifically
  useEffect(() => {
    console.log('🚗 Driver Tab - UserType change effect:', {
      userType: state.userType,
      currentScreen,
      hasCurrentDriver: !!state.currentDriver
    });
    
    // When userType becomes 'driver' and we have a driver but still on login
    if (state.userType === 'driver' && state.currentDriver && currentScreen === 'login') {
      console.log('🚗 Driver Tab - UserType is driver, switching to dashboard');
      setCurrentScreen('dashboard');
    }
  }, [state.userType, currentScreen, state.currentDriver]);

  const handleDriverLogin = () => {
    // This will be called when login is successful
    // The LoginDriver component handles setting the driver state via app context
    setCurrentScreen('dashboard');
  };

  const handleDriverLogout = async () => {
    // Reset local state first
    setCurrentScreen('login');
    // Call global logout (this will handle socket disconnection)
    console.log('Logging out driver...');
    await logout();
  };

  const navigateToScreen = (screen: DriverScreen) => {
    setCurrentScreen(screen);
  };

  const renderCurrentScreen = () => {
    // Don't render anything if a user is logged in
    if (state.currentUser && !state.currentDriver) {
      console.log('🚗 Driver Tab - User is logged in, not rendering driver screens');
      return null;
    }

    switch (currentScreen) {
      case 'login':
        return <LoginDriver onSuccess={handleDriverLogin} />;
      
      case 'dashboard':
        return (
          <DriverDashboard
            currentDriver={currentDriver}
            onLogout={handleDriverLogout}
            onNavigateToRequests={() => navigateToScreen('requests')}
            onNavigateToEarnings={() => navigateToScreen('earnings')}
            onNavigateToProfile={() => navigateToScreen('profile')}
            onNavigateToVehicle={() => navigateToScreen('vehicle')}
          />
        );
      
      case 'requests':
        return (
          <AvailableRequests
            currentDriver={currentDriver}
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'earnings':
        return (
          <DriverEarnings
            currentDriver={currentDriver}
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'vehicle':
        return (
          <VehicleInfoManagement
            currentDriver={currentDriver}
            onBackToDashboard={() => navigateToScreen('dashboard')}
            onVehicleUpdated={(vehicleInfo) => {
              // Vehicle info is handled by the component internally
              // The app context will be updated when the component saves the data
            }}
          />
        );
      
      case 'profile':
        return (
          <DriversProfile
            currentDriver={currentDriver}
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      default:
        return <LoginDriver onSuccess={handleDriverLogin} />;
    }
  };

  // Don't render anything if user is logged in
  if (state.currentUser && !state.currentDriver) {
    console.log('🚗 Driver Tab - User is logged in, not rendering anything');
    return null;
  }

  console.log('🚗 Driver Tab - About to render:', {
    currentScreen,
    hasCurrentDriver: !!state.currentDriver,
    userType: state.userType
  });

  // For login screen, use ParallaxScrollView with header image
  if (currentScreen === 'login') {
    console.log('🚗 Driver Tab - Rendering login screen');
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <Image
            source={require('@/assets/images/driverLogo.png')}
            style={styles.headerImage}
          />
        }
      >
        {renderCurrentScreen()}
      </ParallaxScrollView>
    );
  }

  // For other screens, render directly
  console.log('🚗 Driver Tab - Rendering dashboard/other screen');
  return renderCurrentScreen();
}

const styles = StyleSheet.create({
  headerImage: {
    height: 250,
    width: 420,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
