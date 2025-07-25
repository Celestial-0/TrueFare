import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import apiService from '@/services/apiService';
import socketService from '@/services/socketService';
import storageService from '@/services/storageService';
import {
  DRIVER_STATUS,
  STATUS_COLORS,
  ERROR_MESSAGES,
  DriverData,
  Earnings,
  DriverStatusType,
} from '@/utils/driverConstants';

interface DriverDashboardProps {
  currentDriver: DriverData | null;
  onLogout?: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToEarnings?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToVehicle?: () => void;
}

export default function DriverDashboard({
  currentDriver,
  onLogout,
  onNavigateToRequests,
  onNavigateToEarnings,
  onNavigateToProfile,
  onNavigateToVehicle,
}: DriverDashboardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state, updateDriverStatus } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<DriverStatusType>(
    (currentDriver?.status as DriverStatusType) || DRIVER_STATUS.OFFLINE
  );
  const [todayEarnings, setTodayEarnings] = useState<Earnings | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Use AppContext for socket connection status and available requests
  const socketConnected = state.isConnected;
  const availableRequests = state.availableRequests;
  const isSocketRegistered = state.isSocketRegistered;
  const currentBids = state.currentBids;

  // Calculate pending bids from AppContext data (real-time)
  const pendingBids = currentBids.filter(bid => 
    bid.driverId === currentDriver?.driverId
  ).length;

  // Debug logging for AppContext integration
  console.log('🔍 DriverDashboard - AppContext state:', {
    isConnected: state.isConnected,
    isSocketRegistered: state.isSocketRegistered,
    availableRequestsCount: state.availableRequests.length,
    pendingBidsCount: pendingBids,
    currentDriver: currentDriver?.driverId || 'null'
  });

  // Styles definition
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      padding: 16,
    },
    header: {
      marginBottom: 20,
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.tint + '20',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    statusInfo: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.7,
    },
    statusText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 4,
    },
    connectionStatus: {
      fontSize: 12,
      marginTop: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.tint + '15',
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.tint,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
      textAlign: 'center',
    },
    quickActionsContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    quickActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: theme.tint,
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    quickActionText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
    },
    recentActivityContainer: {
      marginBottom: 20,
    },
    activityItem: {
      backgroundColor: theme.tint + '10',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    activityText: {
      fontSize: 14,
      color: theme.text,
    },
    activityTime: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
      marginTop: 4,
    },
    logoutButton: {
      backgroundColor: '#dc3545',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    logoutText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: '#dc3545',
      textAlign: 'center',
      margin: 20,
    },
  });

  // Fetch initial data
  const fetchDashboardData = useCallback(async () => {
    if (!currentDriver?.driverId) return;

    console.log('Fetching dashboard data for driver:', currentDriver.driverId);
    setIsLoading(true);
    try {
      // Fetch profile and earnings data in parallel
      const [profileResponse, earningsResponse] = await Promise.all([
        apiService.getDriverProfile(currentDriver.driverId),
        apiService.getDriverEarnings(currentDriver.driverId)
      ]);

      // Update driver profile and status
      if (profileResponse.success && profileResponse.data) {
        const driverData = profileResponse.data as DriverData;
        if (driverData.status) {
          console.log('🔄 Updating driver status from API:', driverData.status);
          setDriverStatus(driverData.status as DriverStatusType);
          // Update AppContext state as well
          updateDriverStatus(driverData.status);
        }
      }

      // Update earnings
      if (earningsResponse.success && earningsResponse.data) {
        console.log('💰 Updating earnings:', earningsResponse.data);
        setTodayEarnings(earningsResponse.data as Earnings);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [currentDriver?.driverId, updateDriverStatus]);

  // Toggle driver status
  const toggleDriverStatus = async () => {
    if (!currentDriver?.driverId) return;

    const newStatus = driverStatus === DRIVER_STATUS.AVAILABLE 
      ? DRIVER_STATUS.OFFLINE 
      : DRIVER_STATUS.AVAILABLE;

    try {
      const response = await apiService.updateDriverStatus(currentDriver.driverId, newStatus);

      if (response.success) {
        // Update local state
        setDriverStatus(newStatus);
        
        // Update AppContext state
        updateDriverStatus(newStatus);
        
        // Update socket status using the correct method
        socketService.updateDriverStatus({
          driverId: currentDriver.driverId,
          status: newStatus
        });

        // Persist status to storage
        try {
          const storedDriverData = await storageService.getDriverData();
          if (storedDriverData) {
            await storageService.storeDriverData({
              ...storedDriverData,
              status: newStatus
            });
          }
        } catch (storageError) {
          console.warn('Failed to persist driver status to storage:', storageError);
        }
      } else {
        Alert.alert('Error', 'Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  // Real-time effects for AppContext socket updates
  useEffect(() => {
    // Update last update time when available requests change (real-time)
    console.log('📊 Available requests updated via AppContext:', availableRequests.length);
    setLastUpdate(new Date());
  }, [availableRequests]);

  // Real-time effect for pending bids changes
  useEffect(() => {
    console.log('📊 Pending bids updated via AppContext:', pendingBids);
    setLastUpdate(new Date());
  }, [pendingBids]);

  // Real-time effect for socket connection status changes
  useEffect(() => {
    console.log('🔌 Socket connection status changed:', {
      isConnected: socketConnected,
      isRegistered: isSocketRegistered
    });
    setLastUpdate(new Date());
  }, [socketConnected, isSocketRegistered]);

  // Effect to handle driver status updates from AppContext
  useEffect(() => {
    if (state.currentDriver?.status && state.currentDriver.status !== driverStatus) {
      console.log('🔄 Driver status updated from AppContext:', state.currentDriver.status);
      setDriverStatus(state.currentDriver.status as DriverStatusType);
      setLastUpdate(new Date());
    }
  }, [state.currentDriver?.status, driverStatus]);

  // Initialize component and fetch initial data
  useEffect(() => {
    if (currentDriver?.driverId) {
      fetchDashboardData();
    }
  }, [currentDriver?.driverId, fetchDashboardData]);

  // Sync driver status with currentDriver prop
  useEffect(() => {
    if (currentDriver?.status) {
      setDriverStatus(currentDriver.status as DriverStatusType);
    }
  }, [currentDriver?.status]);

  // Load driver status from storage on component mount
  useEffect(() => {
    const loadStoredStatus = async () => {
      try {
        const storedDriverData = await storageService.getDriverData();
        if (storedDriverData?.status && currentDriver?.driverId === storedDriverData.id) {
          setDriverStatus(storedDriverData.status as DriverStatusType);
        }
      } catch (error) {
        console.warn('Failed to load driver status from storage:', error);
      }
    };

    if (currentDriver?.driverId) {
      loadStoredStatus();
    }
  }, [currentDriver?.driverId]);

  // Loading state
  if (isLoading && !currentDriver) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={{ marginTop: 16 }}>Loading dashboard...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Error state
  if (!currentDriver) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <Text style={styles.errorText}>
            Driver data not available. Please log in again.
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Back to Login</Text>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome, {currentDriver.name}!
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.connectionStatus, { color: theme.text, opacity: 0.6 }]}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
            {/* <View style={{ 
              width: 8, 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: socketConnected ? '#28a745' : '#dc3545',
              marginLeft: 8
            }} /> */}
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.statusContainer}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Driver Status</Text>
            <Text style={[
              styles.statusText, 
              { color: STATUS_COLORS[driverStatus] }
            ]}>
              {driverStatus.toUpperCase()}
            </Text>
            <Text style={[
              styles.connectionStatus, 
              { color: socketConnected ? STATUS_COLORS.connected : STATUS_COLORS.disconnected }
            ]}>
              {socketConnected 
                ? (isSocketRegistered ? '🟢 Live Updates Active' : '🟡 Connecting...') 
                : '🔴 Offline Mode'}
            </Text>
          </View>
          <Switch
            value={driverStatus === DRIVER_STATUS.AVAILABLE}
            onValueChange={toggleDriverStatus}
            trackColor={{ false: '#767577', true: STATUS_COLORS.available }}
            thumbColor={driverStatus === DRIVER_STATUS.AVAILABLE ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹{(todayEarnings as any)?.todayEarnings?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.statLabel}>Today Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{availableRequests.length}</Text>
            <Text style={styles.statLabel}>Available Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingBids}</Text>
            <Text style={styles.statLabel}>Pending Bids</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionRow}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={onNavigateToRequests}
            >
              <Text style={[styles.quickActionText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>View Requests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={onNavigateToEarnings}
            >
              <Text style={[styles.quickActionText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>Earnings</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickActionRow}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={onNavigateToProfile}
            >
              <Text style={[styles.quickActionText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={onNavigateToVehicle}
            >
              <Text style={[styles.quickActionText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>Vehicle Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {availableRequests.slice(0, 3).map((request, index) => (
            <View key={request._id} style={styles.activityItem}>
              <Text style={styles.activityText}>
                New request: {request.pickupLocation.address} → {request.destination.address}
              </Text>
              <Text style={styles.activityTime}>
                {new Date(request.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          ))}
          {availableRequests.length === 0 && (
            <Text style={[styles.activityText, { fontStyle: 'italic' }]}>
              No recent activity
            </Text>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  </SafeAreaView>
  );
}
