import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  DriverData,
  Earnings,
} from '@/utils/driverConstants';

interface DriverEarningsProps {
  currentDriver: DriverData | null;
  onBackToDashboard?: () => void;
}

interface RideHistoryItem {
  rideId: string;
  requestId: string;
  userId: string;
  pickupLocation: { address: string };
  destination: { address: string };
  fareAmount: number;
  status: string;
  startTime: string;
  endTime?: string;
  user?: {
    name: string;
    phone?: string;
  };
}

export default function DriverEarnings({
  currentDriver,
  onBackToDashboard,
}: DriverEarningsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.tint + '15',
    },
    backButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 16,
    },
    backButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    scrollContainer: {
      padding: 16,
    },
    summaryContainer: {
      backgroundColor: theme.tint + '15',
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    earningsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    earningsCard: {
      width: '48%',
      backgroundColor: theme.background,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: 'center',
    },
    earningsValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.tint,
      marginBottom: 4,
    },
    earningsLabel: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
      textAlign: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
      marginTop: 4,
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: theme.tint + '20',
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: theme.tint,
    },
    periodButtonText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
    },
    periodButtonTextActive: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontWeight: 'bold',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    rideCard: {
      backgroundColor: theme.tint + '10',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.tint + '30',
    },
    rideHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    rideId: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
    },
    rideEarning: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#28a745',
    },
    rideRoute: {
      marginBottom: 8,
    },
    routeText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 2,
    },
    rideDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rideDate: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.7,
    },
    rideStatus: {
      fontSize: 12,
      fontWeight: 'bold',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 50,
    },
    emptyText: {
      fontSize: 16,
      color: theme.text,
      opacity: 0.7,
      textAlign: 'center',
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

  // Fetch earnings data
  const fetchEarningsData = useCallback(async () => {
    if (!currentDriver?.driverId) return;

    setIsLoading(true);
    try {
      // Fetch earnings summary
      const earningsResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DRIVER_EARNINGS(currentDriver.driverId)}`
      );
      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        if (earningsData.success && earningsData.data) {
          setEarnings(earningsData.data);
        }
      }

      // Fetch ride history
      const historyResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DRIVER_RIDE_HISTORY(currentDriver.driverId)}`
      );
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.success && historyData.data) {
          setRideHistory(historyData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [currentDriver?.driverId]);

  // Filter rides based on selected period
  const getFilteredRides = () => {
    if (!rideHistory) return [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return rideHistory.filter(ride => {
      const rideDate = new Date(ride.startTime);
      switch (selectedPeriod) {
        case 'today':
          return rideDate >= startOfToday;
        case 'week':
          return rideDate >= startOfWeek;
        case 'month':
          return rideDate >= startOfMonth;
        case 'all':
        default:
          return true;
      }
    });
  };

  // Calculate earnings for filtered period
  const getEarningsForPeriod = () => {
    const filteredRides = getFilteredRides();
    return filteredRides
      .filter(ride => ride.status === 'completed')
      .reduce((total, ride) => total + ride.fareAmount, 0);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in_progress':
        return '#17a2b8';
      case 'cancelled':
        return '#dc3545';
      default:
        return theme.text;
    }
  };

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
  }, [fetchEarningsData]);

  // Initialize on mount
  useEffect(() => {
    if (currentDriver) {
      fetchEarningsData();
    }
  }, [currentDriver, fetchEarningsData]);

  if (!currentDriver) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>
            No driver logged in. Please login first.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={{ marginTop: 16, color: theme.text }}>
            Loading earnings data...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const filteredRides = getFilteredRides();
  const periodEarnings = getEarningsForPeriod();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToDashboard}>
            <Text style={[styles.backButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
        </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Earnings Summary */}
        {earnings && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Earnings Overview</Text>
            
            <View style={styles.earningsGrid}>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsValue}>
                  ₹{earnings.todayEarnings?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.earningsLabel}>Today</Text>
              </View>
              
              <View style={styles.earningsCard}>
                <Text style={styles.earningsValue}>
                  ₹{earnings.weeklyEarnings?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.earningsLabel}>This Week</Text>
              </View>
              
              <View style={styles.earningsCard}>
                <Text style={styles.earningsValue}>
                  ₹{earnings.monthlyEarnings?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.earningsLabel}>This Month</Text>
              </View>
              
              <View style={styles.earningsCard}>
                <Text style={styles.earningsValue}>
                  ₹{earnings.totalEarnings?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.earningsLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{earnings.totalRides || 0}</Text>
                <Text style={styles.statLabel}>Total Rides</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {earnings.averageRating?.toFixed(1) || 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{earnings.ridesThisMonth || 0}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
            </View>
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['today', 'week', 'month', 'all'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period as any)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period Summary */}
        <View style={[styles.summaryContainer, { paddingVertical: 12 }]}>
          <Text style={styles.earningsValue}>
            ₹{periodEarnings.toFixed(2)}
          </Text>
          <Text style={styles.earningsLabel}>
            Earnings for {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}
          </Text>
        </View>

        {/* Ride History */}
        <Text style={styles.sectionTitle}>Ride History</Text>
        
        {filteredRides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No rides found for the selected period.
            </Text>
          </View>
        ) : (
          filteredRides.map((ride) => (
            <View key={ride.rideId} style={styles.rideCard}>
              <View style={styles.rideHeader}>
                <Text style={styles.rideId}>
                  #{ride.rideId.slice(-8)}
                </Text>
                <Text style={styles.rideEarning}>
                  +₹{ride.fareAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.rideRoute}>
                <Text style={styles.routeText}>
                  From: {ride.pickupLocation.address}
                </Text>
                <Text style={styles.routeText}>
                  To: {ride.destination.address}
                </Text>
                {ride.user && (
                  <Text style={styles.routeText}>
                    Passenger: {ride.user.name}
                  </Text>
                )}
              </View>

              <View style={styles.rideDetails}>
                <Text style={styles.rideDate}>
                  {new Date(ride.startTime).toLocaleDateString()} {' '}
                  {new Date(ride.startTime).toLocaleTimeString()}
                </Text>
                <Text
                  style={[
                    styles.rideStatus,
                    { 
                      backgroundColor: getStatusColor(ride.status) + '20',
                      color: getStatusColor(ride.status)
                    }
                  ]}
                >
                  {ride.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  </SafeAreaView>
  );
}