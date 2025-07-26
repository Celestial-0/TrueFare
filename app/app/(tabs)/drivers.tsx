import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';

import { useState, useEffect } from 'react';
import LoginDriver from '@/components/core/auth/DriverAuth';
import DriverDashboard from '@/components/core/driver/DriverDashboard';
import AvailableRequests from '@/components/core/driver/AvailableRequests';
import DriverEarnings from '@/components/core/driver/DriverEarnings';
import VehicleInfoManagement from '@/components/core/driver/VehicleInfoManagement';
import DriversProfile from '@/components/core/driver/DriversProfile';
import ActiveRideManagement from '@/components/core/driver/ActiveRideManagement';
import { useApp } from '@/contexts/AppContext';

type DriverScreen = 'login' | 'dashboard' | 'requests' | 'earnings' | 'vehicle' | 'profile' | 'management';

export default function TabTwoScreen() {
  const { currentDriver, currentUser, userType, socketConnected, logout } = useApp();
  
  console.log('🚗 Driver Tab - Component mounting/re-rendering:', {
    hasCurrentDriver: !!currentDriver,
    hasCurrentUser: !!currentUser,
    userType: userType,
    socketConnected: socketConnected
  });
  
  // Initialize screen based on whether driver is already logged in
  // Use a more defensive approach that waits for the state to be properly initialized
  const [currentScreen, setCurrentScreen] = useState<DriverScreen>(() => {
    console.log('🚗 Driver Tab - Initializing state:', {
      hasCurrentDriver: !!currentDriver,
      hasCurrentUser: !!currentUser,
      userType: userType
    });
    // During initial load, if driver is already logged in, go to dashboard
    if (currentDriver && !currentUser) {
      console.log('🚗 Driver Tab - Initializing to dashboard (driver logged in)');
      return 'dashboard';
    }
    console.log('🚗 Driver Tab - Initializing to login');
    return 'login';
  });

  // Force immediate screen update on mount if driver is already logged in
  useEffect(() => {
    console.log('🚗 Driver Tab - Mount effect - checking initial driver state');
    if (currentDriver && !currentUser && currentScreen === 'login') {
      console.log('🚗 Driver Tab - Mount effect - Driver found on mount, switching to dashboard');
      setCurrentScreen('dashboard');
    }
  }, [currentDriver, currentUser, currentScreen]);

  // Debug logging for driver tab
  console.log('🚗 Driver Tab - AppContext state:', {
    hasCurrentDriver: !!currentDriver,
    hasCurrentUser: !!currentUser,
    driverId: currentDriver?._id || 'null',
    userId: currentUser?._id || 'null',
    socketConnected: socketConnected,
    currentScreen
  });

  // Check if driver is logged in and update screen accordingly
  // Don't interfere if a user is logged in instead
  useEffect(() => {
    console.log('🚗 Driver Tab - Main useEffect triggered:', {
      hasCurrentDriver: !!currentDriver,
      hasCurrentUser: !!currentUser,
      currentScreen,
      userType: userType,
      driverId: currentDriver?._id
    });
    
    // If a user is logged in, don't manage driver screens
    if (currentUser) {
      console.log('🚗 Driver Tab - User is logged in, not managing driver screens');
      return;
    }
    
    if (currentDriver) {
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
  }, [currentDriver, currentUser, userType, currentScreen]);

  // Specific effect to handle driver session restoration
  useEffect(() => {
    console.log('🚗 Driver Tab - Driver restoration effect:', {
      hasCurrentDriver: !!currentDriver,
      currentScreen,
      driverId: currentDriver?._id,
      userType: userType
    });
    
    // Force switch to dashboard when driver becomes available
    if (currentDriver && !currentUser && currentScreen === 'login') {
      console.log('🚗 Driver Tab - Forcing switch to dashboard for restored driver');
      setCurrentScreen('dashboard');
    }
  }, [currentDriver, currentScreen, currentUser, userType]);

  // Effect to monitor userType changes specifically
  useEffect(() => {
    console.log('🚗 Driver Tab - UserType change effect:', {
      userType: userType,
      currentScreen,
      hasCurrentDriver: !!currentDriver
    });
    
    // When userType becomes 'driver' and we have a driver but still on login
    if (userType === 'driver' && currentDriver && currentScreen === 'login') {
      console.log('🚗 Driver Tab - UserType is driver, switching to dashboard');
      setCurrentScreen('dashboard');
    }
  }, [userType, currentScreen, currentDriver]);

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
    if (currentUser && !currentDriver) {
      console.log('🚗 Driver Tab - User is logged in, not rendering driver screens');
      return null;
    }

    switch (currentScreen) {
      case 'login':
        return <LoginDriver onSuccess={handleDriverLogin} />;
      
      case 'dashboard':
        return (
          <DriverDashboard
            onLogout={handleDriverLogout}
            onNavigateToRequests={() => navigateToScreen('requests')}
            onNavigateToEarnings={() => navigateToScreen('earnings')}
            onNavigateToProfile={() => navigateToScreen('profile')}
            onNavigateToVehicle={() => navigateToScreen('vehicle')}
            onNavigateToManagement={() => navigateToScreen('management')}
          />
        );
      
      case 'requests':
        return (
          <AvailableRequests
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'earnings':
        return (
          <DriverEarnings
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'vehicle':
        return (
          <VehicleInfoManagement
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'profile':
        return (
          <DriversProfile
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      case 'management':
        return (
          <ActiveRideManagement
            onBackToDashboard={() => navigateToScreen('dashboard')}
          />
        );
      
      default:
        return <LoginDriver onSuccess={handleDriverLogin} />;
    }
  };

  // Don't render anything if user is logged in
  if (currentUser && !currentDriver) {
    console.log('🚗 Driver Tab - User is logged in, not rendering anything');
    return null;
  }

  console.log('🚗 Driver Tab - About to render:', {
    currentScreen,
    hasCurrentDriver: !!currentDriver,
    userType: userType
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
