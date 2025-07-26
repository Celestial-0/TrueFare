import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useApp } from '@/contexts/AppContext';

export default function IndexScreen() {
  const { currentDriver, currentUser } = useApp();

  useEffect(() => {
    // Wait a moment for the context to initialize
    const timer = setTimeout(() => {
      if (currentDriver) {
        // If there's a driver logged in, go to drivers tab
        router.replace('/drivers');
      } else if (currentUser) {
        // If there's a user logged in, go to users tab
        router.replace('/users');
      } else {
        // If no one is logged in, default to users tab (or could be a login screen)
        router.replace('/users');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDriver, currentUser]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Loading...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
