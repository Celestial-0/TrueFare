import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  UserData,
  RideRequest,
  Bid,
  BidSortOption,
} from '@/utils/userConstants';
import { useApp } from '@/contexts/AppContext';
import socketService from '@/services/socketService';

interface BidDisplayProps {
  currentUser: UserData | null;
  currentRequest: RideRequest | null;
  onBidAccepted?: (bid: Bid) => void;
}

export default function BidDisplay({ 
  currentUser, 
  currentRequest, 
  onBidAccepted 
}: BidDisplayProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state } = useApp();
  
  // Debug logging - moved to useEffect to prevent infinite logging
  useEffect(() => {
    console.log('🔍 BidDisplay - currentRequest:', currentRequest ? {
      id: currentRequest._id,
      status: currentRequest.status,
      hasPickup: !!currentRequest.pickupLocation,
      hasDestination: !!currentRequest.destination
    } : 'null');
    console.log('🔍 BidDisplay - state.rideRequests:', state.rideRequests.length, 'requests');
    console.log('🔍 BidDisplay - state.currentBids:', state.currentBids.length, 'bids');
  }, [currentRequest, state.rideRequests.length, state.currentBids.length]);
  
  // Convert AppContext bids to component format (now they match!)
  const convertedBids = useMemo(() => {
    return state.currentBids.map(bid => ({
      _id: bid._id,
      driverId: bid.driverId,
      fareAmount: typeof bid.fareAmount === 'number' && !isNaN(bid.fareAmount) ? bid.fareAmount : 0,
      bidTime: bid.bidTime,
      status: 'pending', // Default status for display
    }));
  }, [state.currentBids]);
  
  const [sortBy] = useState<BidSortOption>('fare-asc');
  const [isLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const lastRequestIdRef = useRef<string | null>(null);

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
      color: theme.text,
    },
    statusContainer: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
      borderColor: theme.text + '20',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 10,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    statusSubtext: {
      fontSize: 14,
      fontWeight: '500',
      opacity: 0.7,
      color: theme.text,
    },
    userInfoContainer: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    userInfoText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    userIdText: {
      fontSize: 12,
      opacity: 0.6,
      color: theme.text,
      marginTop: 2,
    },
    requestInfoContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderColor: theme.text + '30',
    },
    requestId: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.text,
    },
    requestRoute: {
      fontSize: 14,
      opacity: 0.8,
      color: theme.text,
    },
    statsContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f8f9fa',
      borderColor: theme.text + '30',
    },
    statsTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.text,
    },
    statsText: {
      fontSize: 14,
      marginBottom: 4,
      color: theme.text,
    },
    quickAcceptButton: {
      backgroundColor: '#28a745',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 12,
      alignItems: 'center',
    },
    quickAcceptText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    sortContainer: {
      flexDirection: 'column',
      marginBottom: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: theme.text + '30',
    },
    sortLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12,
      color: theme.text,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.text,
    },
    noBidsContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderColor: theme.text + '30',
    },
    noBidsText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 8,
      color: theme.text,
    },
    waitingText: {
      fontSize: 14,
      textAlign: 'center',
      opacity: 0.7,
      color: theme.text,
    },
    bidsContainer: {
      gap: 12,
    },
    bidItem: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      position: 'relative',
      borderColor: theme.text + '30',
      backgroundColor: theme.background,
    },
    bestDealBadge: {
      position: 'absolute',
      top: -10,
      right: -10,
      backgroundColor: '#28a745',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      zIndex: 1,
    },
    bestDealText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    bidHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    driverInfo: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    fareAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#28a745',
    },
    bidTime: {
      fontSize: 14,
      marginBottom: 4,
      color: theme.text,
      opacity: 0.7,
    },
    acceptButton: {
      backgroundColor: '#007bff',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    disabledButton: {
      opacity: 0.7,
    },
    acceptButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    noRequestText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 50,
      opacity: 0.7,
      color: theme.text,
    },
  });

  // Memoize the bid update request function to reduce re-renders
  const requestBidUpdates = useCallback((requestId: string, isNewRequest: boolean = false) => {
    if (!socketService.socket?.connected) return;
    
    if (state.isSocketRegistered) {
      // Only log for new requests to reduce spam
      if (isNewRequest) {
        console.log(`📡 Requesting bid updates for request: ${requestId} (new request)`);
      }
      socketService.emit('user:requestBidUpdate', { requestId });
      lastRequestIdRef.current = requestId;
    } else if (currentUser) {
      // Try to register user if not registered
      socketService.registerUser({
        ...currentUser,
        userId: currentUser.userId
      });
      // Retry after registration attempt
      setTimeout(() => {
        if (state.isSocketRegistered) {
          socketService.emit('user:requestBidUpdate', { requestId });
          lastRequestIdRef.current = requestId;
        }
      }, 1000);
    }
  }, [state.isSocketRegistered, currentUser]);

  // Effect for new ride requests
  useEffect(() => {
    if (!currentRequest?._id) {
      lastRequestIdRef.current = null;
      return;
    }
    
    const requestId = currentRequest._id;
    const isNewRequest = lastRequestIdRef.current !== requestId;
    
    if (isNewRequest) {
      console.log('📡 New ride request detected, requesting bid updates immediately');
      requestBidUpdates(requestId, true);
    }
  }, [currentRequest?._id, requestBidUpdates]);

  // Separate effect for connection state changes with debouncing
  useEffect(() => {
    if (!currentRequest?._id || !state.isConnected || !state.isSocketRegistered) {
      return;
    }
    
    // Only trigger if we haven't already requested for this request
    if (lastRequestIdRef.current !== currentRequest._id) {
      const timeoutId = setTimeout(() => {
        if (socketService.socket?.connected && state.isSocketRegistered) {
          console.log('📡 Connection restored, requesting bid updates');
          requestBidUpdates(currentRequest._id);
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.isConnected, state.isSocketRegistered, currentRequest?._id, requestBidUpdates]);

  const refreshBids = async () => {
    if (!currentRequest?._id) return;
    
    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing bids, socket connected:', socketService.socket?.connected, 'registered:', state.isSocketRegistered);
      if (socketService.socket?.connected) {
        // Always try to refresh, even if not fully registered yet
        socketService.emit('user:requestBidUpdate', { requestId: currentRequest._id });
      } else {
        console.warn('⚠️ Socket not connected during refresh');
      }
    } catch (error) {
      console.error('Error refreshing bids:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sortBids = useCallback((bidsToSort: Bid[]): Bid[] => {
    const sorted = [...bidsToSort];
    switch (sortBy) {
      case 'fare-asc':
        return sorted.sort((a, b) => {
          const fareA = typeof a.fareAmount === 'number' && !isNaN(a.fareAmount) ? a.fareAmount : Infinity;
          const fareB = typeof b.fareAmount === 'number' && !isNaN(b.fareAmount) ? b.fareAmount : Infinity;
          return fareA - fareB;
        });
      case 'fare-desc':
        return sorted.sort((a, b) => {
          const fareA = typeof a.fareAmount === 'number' && !isNaN(a.fareAmount) ? a.fareAmount : -Infinity;
          const fareB = typeof b.fareAmount === 'number' && !isNaN(b.fareAmount) ? b.fareAmount : -Infinity;
          return fareB - fareA;
        });
      case 'time-asc':
        return sorted.sort((a, b) => new Date(a.bidTime).getTime() - new Date(b.bidTime).getTime());
      case 'time-desc':
        return sorted.sort((a, b) => new Date(b.bidTime).getTime() - new Date(a.bidTime).getTime());
      default:
        return sorted;
    }
  }, [sortBy]);

  const acceptBid = useCallback(async (bid: Bid) => {
    if (!currentUser || !currentRequest || acceptingBidId) return;
    
    // Validate bid amount
    if (typeof bid.fareAmount !== 'number' || isNaN(bid.fareAmount) || bid.fareAmount <= 0) {
      Alert.alert('Error', 'Invalid bid amount. Cannot accept this bid.');
      return;
    }
    
    Alert.alert(
      'Accept Bid',
      `Accept bid of ₹${bid.fareAmount} from driver ${bid.driverId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setAcceptingBidId(bid._id);
            try {
              const response = await fetch(
                `${API_BASE_URL}${API_ENDPOINTS.ACCEPT_BID(currentRequest._id, bid._id)}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: currentUser.userId })
                }
              );
              
              const data = await response.json();
              if (data.success) {
                onBidAccepted?.(bid);
                Alert.alert('Success', 'Bid accepted successfully!');
              } else {
                Alert.alert('Error', data.message || 'Failed to accept bid');
              }
            } catch (error) {
              console.error('Error accepting bid:', error);
              Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
            } finally {
              setAcceptingBidId(null);
            }
          },
        },
      ]
    );
  }, [currentUser, currentRequest, acceptingBidId, onBidAccepted]);

  const getBidStats = useCallback(() => {
    if (convertedBids.length === 0) return null;
    
    const fareAmounts = convertedBids
      .map(bid => bid.fareAmount)
      .filter(fare => typeof fare === 'number' && !isNaN(fare) && fare > 0);
    
    if (fareAmounts.length === 0) return null;
    
    const lowestFare = Math.min(...fareAmounts);
    const highestFare = Math.max(...fareAmounts);
    const averageFare = fareAmounts.reduce((sum, fare) => sum + fare, 0) / fareAmounts.length;
    
    return { total: convertedBids.length, lowestFare, highestFare, averageFare };
  }, [convertedBids]);

  const acceptLowestBid = () => {
    if (sortedBids.length > 0) {
      const lowestBid = sortedBids[0];
      acceptBid(lowestBid);
    }
  };

  // Memoize sorted bids to prevent unnecessary recalculations
  const sortedBids = useMemo(() => sortBids(convertedBids), [convertedBids, sortBids]);
  const bidStats = useMemo(() => getBidStats(), [getBidStats]);

  const renderBidItem = (bid: Bid, index: number) => {
    const isLowestBid = index === 0 && sortBy === 'fare-asc';
    const isAccepting = acceptingBidId === bid._id;

    return (
      <View key={bid._id} style={styles.bidItem}>
        {isLowestBid && (
          <View style={styles.bestDealBadge}>
            <ThemedText style={styles.bestDealText}>Best Deal!</ThemedText>
          </View>
        )}
        
        <View style={styles.bidHeader}>
          <ThemedText style={styles.driverInfo}>
            Driver {bid.driverId}
          </ThemedText>
          <ThemedText style={styles.fareAmount}>
            {typeof bid.fareAmount === 'number' && !isNaN(bid.fareAmount) ? 
              `₹${bid.fareAmount}` : 
              'Invalid Bid'
            }
          </ThemedText>
        </View>

        <ThemedText style={styles.bidTime}>
          Bid placed: {new Date(bid.bidTime).toLocaleTimeString()}
        </ThemedText>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            isAccepting && styles.disabledButton
          ]}
          onPress={() => acceptBid(bid)}
          disabled={isAccepting || !!acceptingBidId}
        >
          {isAccepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.acceptButtonText}>
              Accept Bid
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (!currentRequest || !currentRequest._id) {
    console.log('❌ BidDisplay - No active request found:', {
      hasCurrentRequest: !!currentRequest,
      currentRequestId: currentRequest?._id || 'missing',
      rideRequestsCount: state.rideRequests.length,
      rideRequests: state.rideRequests.map(req => ({
        id: req._id,
        status: req.status,
        userId: req.userId
      }))
    });
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText style={styles.noRequestText}>
            No active ride request found.
          </ThemedText>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshBids} />
        }
      >
        <ThemedText style={styles.title}>Incoming Bids</ThemedText>

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusHeader}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: (state.isConnected || socketService.socket?.connected) ? '#28a745' : '#dc3545'
                  }
                ]}
              />
              <View>
                <ThemedText style={styles.statusText}>
                  {(state.isConnected || socketService.socket?.connected) ? 'Connected' : 'Disconnected'}
                </ThemedText>
                <ThemedText style={styles.statusSubtext}>
                  {state.isSocketRegistered ? 'Registered & Ready' : 'Connecting...'}
                </ThemedText>
              </View>
            </View>
            {/* <View style={[styles.statusIndicator, { 
              backgroundColor: state.isSocketRegistered ? '#28a745' : '#ffc107',
              width: 8,
              height: 8,
              marginRight: 0
            }]} /> */}
          </View>
          
          {currentUser && (
            <View style={styles.userInfoContainer}>
              <ThemedText style={styles.userInfoText}>
                👤 {currentUser.name}
              </ThemedText>
              <ThemedText style={styles.userIdText}>
                ID: {currentUser.userId}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Request Info */}
        <View style={styles.requestInfoContainer}>
          <ThemedText style={styles.requestId}>
            Request ID: {currentRequest._id}
          </ThemedText>
          <ThemedText style={styles.requestRoute}>
            From: {currentRequest.pickupLocation.address}
          </ThemedText>
          <ThemedText style={styles.requestRoute}>
            To: {currentRequest.destination.address}
          </ThemedText>
        </View>

        {/* Bid Stats */}
        {bidStats && (
          <View style={styles.statsContainer}>
            <ThemedText style={styles.statsTitle}>Bid Statistics</ThemedText>
            <ThemedText style={styles.statsText}>
              Total Bids: {bidStats.total}
            </ThemedText>
            <ThemedText style={styles.statsText}>
              Lowest Fare: ₹{bidStats.lowestFare}
            </ThemedText>
            <ThemedText style={styles.statsText}>
              Highest Fare: ₹{bidStats.highestFare}
            </ThemedText>
            <ThemedText style={styles.statsText}>
              Average Fare: ₹{bidStats.averageFare.toFixed(2)}
            </ThemedText>
            
            {sortedBids.length > 0 && (
              <TouchableOpacity
                style={styles.quickAcceptButton}
                onPress={acceptLowestBid}
                disabled={!!acceptingBidId}
              >
                <ThemedText style={styles.quickAcceptText}>
                  Accept Lowest Bid (₹{bidStats.lowestFare})
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
            <ThemedText style={styles.loadingText}>Loading bids...</ThemedText>
          </View>
        )}

        {/* No Bids State */}
        {!isLoading && convertedBids.length === 0 && (
          <View style={styles.noBidsContainer}>
            <ThemedText style={styles.noBidsText}>
              No bids received yet
            </ThemedText>
            <ThemedText style={styles.waitingText}>
              Waiting for drivers to respond...
            </ThemedText>
          </View>
        )}

        {/* Bids List */}
        {!isLoading && convertedBids.length > 0 && (
          <View style={styles.bidsContainer}>
            {sortedBids.map((bid, index) => renderBidItem(bid, index))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
