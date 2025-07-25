import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  RIDE_STATUS,
  STATUS_COLORS,
  ERROR_MESSAGES,
  UserData,
  RideRequest,
} from '@/utils/userConstants';

interface RideHistoryProps {
  currentUser: UserData | null;
}

interface RideHistoryItem extends RideRequest {
  finalFare?: number;
  driverName?: string;
  driverId?: string;
  completedAt?: string;
  rating?: number;
}

export default function RideHistory({ currentUser }: RideHistoryProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);

  const fetchRideHistory = useCallback(async () => {
    if (!currentUser?.userId) {
      Alert.alert('Error', ERROR_MESSAGES.NO_USER_LOGGED_IN);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.USER_RIDE_HISTORY(currentUser.userId)}`
      );
      const data = await response.json();

      if (data.success) {
        // Sort by creation date, most recent first
        const sortedHistory = (data.data || []).sort((a: RideHistoryItem, b: RideHistoryItem) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRideHistory(sortedHistory);
      } else {
        console.error('Error fetching ride history:', data.message);
        Alert.alert('Error', data.message || ERROR_MESSAGES.GENERAL_ERROR);
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.userId]);

  useEffect(() => {
    if (currentUser) {
      fetchRideHistory();
    }
  }, [currentUser, fetchRideHistory]);

  const refreshHistory = async () => {
    setIsRefreshing(true);
    await fetchRideHistory();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case RIDE_STATUS.COMPLETED:
        return STATUS_COLORS.success;
      case RIDE_STATUS.CANCELLED:
        return STATUS_COLORS.error;
      case RIDE_STATUS.IN_PROGRESS:
        return STATUS_COLORS.warning;
      case RIDE_STATUS.ASSIGNED:
        return STATUS_COLORS.info;
      default:
        return STATUS_COLORS.info;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case RIDE_STATUS.COMPLETED:
        return '✅';
      case RIDE_STATUS.CANCELLED:
        return '❌';
      case RIDE_STATUS.IN_PROGRESS:
        return '🚗';
      case RIDE_STATUS.ASSIGNED:
        return '👤';
      case RIDE_STATUS.PENDING:
        return '⏳';
      default:
        return '📋';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (createdAt: string, completedAt?: string): string => {
    if (!completedAt) return 'N/A';
    
    const start = new Date(createdAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const calculateTotalSpent = (): number => {
    return rideHistory
      .filter(ride => ride.status === RIDE_STATUS.COMPLETED)
      .reduce((total, ride) => total + (ride.finalFare || 0), 0);
  };

  const getCompletedRidesCount = (): number => {
    return rideHistory.filter(ride => ride.status === RIDE_STATUS.COMPLETED).length;
  };

  const toggleRideExpansion = (rideId: string) => {
    setExpandedRide(expandedRide === rideId ? null : rideId);
  };

  const renderRideItem = (ride: RideHistoryItem) => {
    const isExpanded = expandedRide === ride._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.rideItem,
          { borderColor: theme.text, backgroundColor: theme.background }
        ]}
        onPress={() => toggleRideExpansion(ride._id)}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.rideHeader}>
          <View style={styles.statusContainer}>
            <ThemedText style={styles.statusIcon}>{getStatusIcon(ride.status)}</ThemedText>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(ride.status) }
            ]}>
              <Text style={styles.statusText}>{ride.status.toUpperCase()}</Text>
            </View>
          </View>
          <ThemedText style={styles.rideDate}>
            {formatDate(ride.createdAt)}
          </ThemedText>
        </View>

        {/* Route Information */}
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: STATUS_COLORS.success }]} />
            <ThemedText style={styles.routeText} numberOfLines={1}>
              {ride.pickupLocation.address}
            </ThemedText>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: STATUS_COLORS.error }]} />
            <ThemedText style={styles.routeText} numberOfLines={1}>
              {ride.destination.address}
            </ThemedText>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.basicInfo}>
          <ThemedText style={styles.requestId}>
            ID: {ride._id}
          </ThemedText>
          {ride.finalFare && (
            <ThemedText style={styles.fareAmount}>
              ₹{String(ride.finalFare)}
            </ThemedText>
          )}
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={[styles.expandedDetails, { borderTopColor: theme.text }]}>
            {ride.driverName && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Driver:</ThemedText>
                <ThemedText style={styles.detailValue}>{ride.driverName}</ThemedText>
              </View>
            )}
            
            {ride.driverId && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Driver ID:</ThemedText>
                <ThemedText style={styles.detailValue}>{ride.driverId}</ThemedText>
              </View>
            )}

            {ride.estimatedDistance && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Distance:</ThemedText>
                <ThemedText style={styles.detailValue}>{String(ride.estimatedDistance)} km</ThemedText>
              </View>
            )}

            {ride.estimatedDuration && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Est. Duration:</ThemedText>
                <ThemedText style={styles.detailValue}>{String(ride.estimatedDuration)} min</ThemedText>
              </View>
            )}

            {ride.completedAt && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Completed:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {formatDate(ride.completedAt)}
                </ThemedText>
              </View>
            )}

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Duration:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDuration(ride.createdAt, ride.completedAt)}
              </ThemedText>
            </View>

            {ride.rating && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Your Rating:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {'⭐'.repeat(ride.rating)} ({String(ride.rating)}/5)
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Expansion Indicator */}
        <View style={styles.expansionIndicator}>
          <ThemedText style={styles.expansionArrow}>
            {isExpanded ? '▲' : '▼'}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummaryStats = () => {
    const totalSpent = calculateTotalSpent();
    const completedRides = getCompletedRidesCount();
    const cancelledRides = rideHistory.filter(ride => ride.status === RIDE_STATUS.CANCELLED).length;
    
    return (
      <ThemedView style={[styles.summaryContainer, { borderColor: theme.text }]}>
        <ThemedText style={styles.summaryTitle}>Ride Summary</ThemedText>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{rideHistory.length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Rides</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{completedRides}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Completed</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{cancelledRides}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Cancelled</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>${totalSpent.toFixed(2)}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Spent</ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  if (!currentUser) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noDataText}>
          Please login to view ride history
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshHistory} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.title}>Ride History</ThemedText>

        {/* Summary Statistics */}
        {rideHistory.length > 0 && renderSummaryStats()}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
            <ThemedText style={styles.loadingText}>Loading ride history...</ThemedText>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && rideHistory.length === 0 && (
          <ThemedView style={[styles.emptyContainer, { borderColor: theme.text }]}>
            <ThemedText style={styles.emptyIcon}>🚗</ThemedText>
            <ThemedText style={styles.emptyTitle}>No Rides Yet</ThemedText>
            <ThemedText style={styles.emptyMessage}>
              Your ride history will appear here once you start booking rides.
            </ThemedText>
          </ThemedView>
        )}

        {/* Ride History List */}
        {!isLoading && rideHistory.length > 0 && (
          <View style={styles.historyList}>
            {rideHistory.map((ride) => (
              <View key={ride._id}>
                {renderRideItem(ride)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    gap: 12,
  },
  rideItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rideDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: '#ccc',
    marginLeft: 4,
    marginBottom: 4,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
  },
  basicInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontSize: 12,
    opacity: 0.7,
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandedDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  expansionIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 16,
  },
  expansionArrow: {
    fontSize: 12,
    opacity: 0.5,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    opacity: 0.7,
  },
});