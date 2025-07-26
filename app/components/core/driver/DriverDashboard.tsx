import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import {
  DRIVER_STATUS,
  STATUS_COLORS,
  ERROR_MESSAGES,
} from '@/utils/driverConstants';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Local Types ---
type Earnings = { total: number; count: number; };

// --- Icon Component ---
const Icon = ({ name, size = 24, color = '#000' }: { name: string; size?: number; color?: string }) => {
  // A simple emoji-based icon set for demonstration
  const icons: { [key: string]: string } = {
    'requests': '📄',
    'earnings': '💰',
    'profile': '👤',
    'vehicle': '🚗',
    'logout': '🚪',
    'power': '⚡️',
    'check': '✅',
    'cross': '❌',
    'bell': '🔔',
    'wallet': '💳',
    'mangement': '🛠️',
    'arrow-right': '›' // Using a more subtle arrow
  };
  return <Text style={{ fontSize: size, color, lineHeight: size * 1.2 }}>{icons[name] || '❓'}</Text>;
};


interface DriverDashboardProps {
  onNavigateToRequests?: () => void;
  onNavigateToEarnings?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToVehicle?: () => void;
  onNavigateToManagement?: () => void;
  onLogout?: () => void;
}

export default function DriverDashboard({
  onNavigateToRequests = () => console.log('Navigate to Requests'),
  onNavigateToEarnings = () => console.log('Navigate to Earnings'),
  onNavigateToProfile = () => console.log('Navigate to Profile'),
  onNavigateToVehicle = () => console.log('Navigate to Vehicle'),
  onNavigateToManagement = () => console.log('Navigate to Management'),
  onLogout = () => console.log('Logout'),
}: DriverDashboardProps) {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];
  
  const {
    currentDriver,
    socketConnected,
    availableRequests = [],
    rideRequests = [],
    currentRide,
    bids: currentBids = [],
    loading,
    fetchDriverEarnings,
    goOnlineDriver,
    goOfflineDriver,
    logout,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const driverStatus = currentDriver?.status || DRIVER_STATUS.OFFLINE;
  const todayEarnings = currentDriver?.todayEarnings;



  const pendingBids = (currentBids || []).filter(bid =>
    bid.driverId === currentDriver?._id
  ).length;

  // Calculate active rides (rides that are accepted and assigned to this driver)
  const activeRides = useMemo(() => {
    const driverId = currentDriver?.driverId || currentDriver?._id;
    if (!driverId) return 0;
    
    // Count current ride if it exists and is active
    let count = 0;
    if (currentRide && currentRide.status === 'accepted') {
      count += 1;
    }
    
    // Also count any accepted rides in rideRequests that belong to this driver
    const acceptedRides = rideRequests.filter(ride => 
      ride.status === 'accepted' && 
      (ride as any).acceptedBid?.driverId === driverId
    ).length;
    
    return Math.max(count, acceptedRides);
  }, [currentRide, rideRequests, currentDriver]);



  const toggleDriverStatus = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!currentDriver?.driverId) return;

    const newStatus = driverStatus === DRIVER_STATUS.AVAILABLE
      ? DRIVER_STATUS.OFFLINE
      : DRIVER_STATUS.AVAILABLE;

    const action = newStatus === DRIVER_STATUS.AVAILABLE ? goOnlineDriver : goOfflineDriver;
    
    try {
      await action();
    } catch (error) {
      console.error('Error updating driver status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDriverEarnings().finally(() => setRefreshing(false));
  }, [fetchDriverEarnings]);

  useEffect(() => {
    if (currentDriver?._id) {
      fetchDriverEarnings();
    }
  }, [currentDriver?._id, fetchDriverEarnings]);
  
  const styles = getStyles(colorScheme, theme);

  if (!currentDriver) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={styles.errorText}>Driver data not available.</Text>
           <TouchableOpacity style={styles.logoutButton} onPress={logout}>
             <Text style={styles.logoutButtonText}>Back to Login</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatCard = ({ label, value }: { label: string, value: string | number }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ActionRow = ({ icon, label, onPress }: { icon: string, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
        <View style={styles.actionRowIcon}>
            <Icon name={icon} size={20} color={theme.tint} />
        </View>
        <Text style={styles.actionRowLabel}>{label}</Text>
        <Icon name="arrow-right" size={20} color={theme.tabIconDefault} />
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
      >
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <TouchableOpacity onPress={onNavigateToProfile} style={styles.profileIcon}>
                <Icon name="profile" size={28} color={theme.text} />
            </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>
            Welcome, {currentDriver?.name}!
        </Text>

        {/* Status Toggle */}
        <View style={styles.statusToggleContainer}>
            <Text style={styles.statusToggleLabel}>
                {driverStatus === DRIVER_STATUS.AVAILABLE ? 'You are Online' : 'You are Offline'}
            </Text>
            <Switch
                value={driverStatus === DRIVER_STATUS.AVAILABLE}
                onValueChange={toggleDriverStatus}
                trackColor={{ false: theme.card, true: STATUS_COLORS.available }}
                thumbColor={"#ffffff"}
                ios_backgroundColor={theme.card}
                disabled={loading}
            />
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
            <StatCard label="Available" value={(availableRequests || []).length} />
            <View style={styles.statSeparator} />
            <StatCard label="Active" value={activeRides} />
            <View style={styles.statSeparator} />
            <StatCard label="Earnings" value={`₹${todayEarnings?.total?.toFixed(2) || '0.0'}`} />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionListContainer}>
            <ActionRow icon="requests" label="View Requests" onPress={onNavigateToRequests} />
            <ActionRow icon="mangement" label="Ride Management" onPress={onNavigateToManagement} />
            <ActionRow icon="earnings" label="My Earnings" onPress={onNavigateToEarnings} />
            <ActionRow icon="vehicle" label="Vehicle Info" onPress={onNavigateToVehicle} />
        </View>

        {/* System Status */}
        <View style={styles.systemStatusContainer}>
            <View style={styles.systemStatusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: socketConnected ? STATUS_COLORS.connected : STATUS_COLORS.disconnected }]} />
                <Text style={styles.systemStatusText}>Real-time Connection</Text>
            </View>

        </View>
        
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark', theme: typeof Colors.light) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
  },
  profileIcon: {
      padding: 4,
  },
  welcomeText: {
    fontSize: 18,
    color: theme.tabIconDefault,
    marginBottom: 24,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 13,
    color: theme.tabIconDefault,
    marginTop: 6,
  },
  statSeparator: {
      width: 1,
      height: '60%',
      backgroundColor: theme.border,
  },
  actionListContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  actionRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  actionRowLabel: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
  },
  systemStatusContainer: {
      paddingHorizontal: 16,
      marginBottom: 24,
  },
  systemStatusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
  },
  systemStatusText: {
      fontSize: 14,
      color: theme.tabIconDefault,
  },
  logoutButton: {
    backgroundColor: colorScheme === 'dark' ? '#331013' : '#f9d6d9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
