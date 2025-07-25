import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { state } = useApp();

  // Force re-render when userType changes to ensure tabs update immediately
  useEffect(() => {
    console.log('🎯 Tab Layout - User type changed to:', state.userType, {
      hasCurrentUser: !!state.currentUser,
      hasCurrentDriver: !!state.currentDriver,
      isConnected: state.isConnected
    });
  }, [state.userType, state.currentUser, state.currentDriver, state.isConnected]);

  // Force navigation to correct tab when user type changes
  useEffect(() => {
    if (state.userType === 'driver' && state.currentDriver) {
      console.log('🎯 Tab Layout - Forcing navigation to drivers tab');
      router.navigate('/drivers');
    } else if (state.userType === 'user' && state.currentUser) {
      console.log('🎯 Tab Layout - Forcing navigation to users tab');
      router.navigate('/users');
    }
  }, [state.userType, state.currentDriver, state.currentUser]);

  return (
    <Tabs
      initialRouteName={state.currentDriver ? 'drivers' : undefined}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          // Hide the tab if driver is logged in AND user type is explicitly 'driver'
          href: (state.currentDriver && state.userType === 'driver') ? null : '/users',
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          // Hide the tab if user is logged in AND user type is explicitly 'user'
          href: (state.currentUser && state.userType === 'user') ? null : '/drivers',
        }}
      />
    </Tabs>
  );
}
