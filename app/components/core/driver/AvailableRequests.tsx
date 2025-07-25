import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp, RideRequest, Bid } from '@/contexts/AppContext';
import socketService from '@/services/socketService';

interface AvailableRequestsProps {
  currentDriver: any;
  onBackToDashboard: () => void;
}

export default function AvailableRequests({ currentDriver, onBackToDashboard }: AvailableRequestsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state } = useApp();

  // Use AppContext available requests directly
  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.tint + '15',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.text,
    opacity: 0.7,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  connectionStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 16,
  },
  noRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  noRequestsText: {
    fontSize: 16,
    color: theme.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: theme.tint,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requestsList: {
    paddingBottom: 24,
  },
  requestItem: {
    backgroundColor: theme.tint + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.tint + '30',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestTime: {
    fontSize: 12,
    color: theme.text,
    opacity: 0.7,
  },
  distance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.tint,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationItem: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.text,
  },
  duration: {
    fontSize: 12,
    color: theme.text,
    opacity: 0.7,
    marginBottom: 8,
  },
  bidsCount: {
    fontSize: 12,
    color: theme.text,
    opacity: 0.7,
    marginBottom: 12,
  },
  myBidContainer: {
    backgroundColor: theme.tint + '20',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  myBidText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.tint,
    textAlign: 'center',
  },
  bidButton: {
    backgroundColor: theme.tint,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bidButtonText: {
    color: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalRequestInfo: {
    backgroundColor: theme.tint + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalRequestText: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 4,
  },
  bidInputContainer: {
    marginBottom: 24,
  },
  bidInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  bidInput: {
    borderWidth: 1,
    borderColor: theme.tint + '50',
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: theme.text,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.text + '30',
  },
  submitButton: {
    backgroundColor: theme.tint,
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  submitButtonText: {
    color: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

  const requests = state.availableRequests;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const connectionStatus = state.connectionStatus;

  // Debug logging
  console.log('🔍 AvailableRequests - AppContext state:', {
    isConnected: state.isConnected,
    isSocketRegistered: state.isSocketRegistered,
    availableRequestsCount: state.availableRequests.length,
    connectionStatus: state.connectionStatus,
    sampleRequest: state.availableRequests[0] ? {
      _id: state.availableRequests[0]._id,
      status: state.availableRequests[0].status,
      bidsCount: state.availableRequests[0].bids?.length || 0
    } : null
  });

  useEffect(() => {
    // Data is loaded via AppContext, no need to load manually
    setIsLoading(false);
  }, []);

  // Cleanup socket listeners on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending socket listeners
      socketService.off('bid:confirmed');
      socketService.off('error');
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Just refresh via socket - the AppContext will handle data updates
    if (socketService.socket?.connected) {
      socketService.emit('driver:requestUpdates', { driverId: currentDriver?.driverId });
    }
    setTimeout(() => setIsRefreshing(false), 1000); // Brief refresh indicator
  };

  const handlePlaceBid = (request: RideRequest) => {
    console.log('🎯 handlePlaceBid - Selected request:', {
      _id: request._id,
      userId: request.userId,
      status: request.status,
      currentBidsCount: request.bids?.length || 0,
      myBid: request.bids?.find((bid: Bid) => bid.driverId === currentDriver?.driverId)
    });
    
    // Check if driver already has a bid for this request
    const myBid = request.bids?.find((bid: Bid) => bid.driverId === currentDriver?.driverId);
    if (myBid) {
      Alert.alert('Information', 'You have already placed a bid for this request.');
      return;
    }
    
    setSelectedRequest(request);
    setBidAmount('');
    setShowBidModal(true);
  };

  const submitBid = async () => {
    if (!selectedRequest || !currentDriver) {
      Alert.alert('Error', 'Missing request or driver information');
      return;
    }

    console.log('🚀 submitBid - Selected request details:', {
      _id: selectedRequest._id,
      userId: selectedRequest.userId,
      currentBidsCount: selectedRequest.bids?.length || 0
    });

    // Use the _id field as the request ID (consistent with backend model)
    const requestId = selectedRequest._id;
    
    if (!requestId) {
      console.error('❌ No request ID found in request object:', selectedRequest);
      Alert.alert('Error', 'Request ID is missing. Please try refreshing the requests.');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    // Final check - ensure driver hasn't already placed a bid
    const myBid = selectedRequest.bids?.find((bid: Bid) => bid.driverId === currentDriver.driverId);
    if (myBid) {
      Alert.alert('Information', 'You have already placed a bid for this request.');
      setShowBidModal(false);
      return;
    }

    console.log('📤 Placing bid with requestId:', requestId, 'amount:', amount, 'driverId:', currentDriver.driverId);

    setIsPlacingBid(true);
    try {
      // Set up event listeners before placing bid
      const confirmationTimeout = setTimeout(() => {
        console.warn('⏰ Bid confirmation timeout - this might indicate a problem with the socket connection');
        Alert.alert('Warning', 'Bid was sent but confirmation is taking longer than expected. Please check your connection.');
        setIsPlacingBid(false);
        socketService.off('bid:confirmed', handleBidConfirmation);
        socketService.off('error', handleBidError);
      }, 10000); // 10 second timeout

      const handleBidConfirmation = (data: any) => {
        clearTimeout(confirmationTimeout);
        console.log('✅ Bid confirmation received:', data);
        if (data.success && data.requestId === requestId) {
          Alert.alert('Success', 'Bid placed successfully!');
          setShowBidModal(false);
          setBidAmount('');
          setSelectedRequest(null);
        } else {
          console.warn('❓ Unexpected bid confirmation:', data);
          Alert.alert('Error', data.message || 'Bid confirmation failed');
        }
        setIsPlacingBid(false);
        socketService.off('bid:confirmed', handleBidConfirmation);
        socketService.off('error', handleBidError);
      };

      const handleBidError = (error: any) => {
        clearTimeout(confirmationTimeout);
        console.error('❌ Socket bid error:', error);
        
        // Check if it's a duplicate bid error (which might be expected)
        if (error.code === 'BID_ALREADY_EXISTS') {
          Alert.alert('Info', 'You have already placed a bid for this request.');
        } else if (error.code === 'BIDDING_CLOSED') {
          Alert.alert('Info', 'Bidding is no longer open for this request.');
        } else if (error.code === 'REQUEST_NOT_FOUND') {
          Alert.alert('Error', 'This ride request is no longer available.');
        } else {
          Alert.alert('Error', error.message || 'Failed to place bid');
        }
        
        setIsPlacingBid(false);
        socketService.off('bid:confirmed', handleBidConfirmation);
        socketService.off('error', handleBidError);
      };

      // Set up listeners
      socketService.on('bid:confirmed', handleBidConfirmation);
      socketService.on('error', handleBidError);

      // Place the bid via socket
      console.log('📤 Placing bid via socket:', { requestId, fareAmount: amount });
      socketService.placeBid({
        requestId: requestId,
        fareAmount: amount,
      });

    } catch (error) {
      console.error('Error setting up bid placement:', error);
      Alert.alert('Error', 'Failed to place bid. Please try again.');
      setIsPlacingBid(false);
    }
  };

  const calculateDistance = (pickup: any, destination: any): string => {
    // Simple distance calculation (you might want to use a proper geo library)
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (destination.coordinates.latitude - pickup.coordinates.latitude) * Math.PI / 180;
    const dLon = (destination.coordinates.longitude - pickup.coordinates.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickup.coordinates.latitude * Math.PI / 180) * Math.cos(destination.coordinates.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderRequestItem = ({ item }: { item: RideRequest }) => {
    const distance = item.estimatedDistance || parseFloat(calculateDistance(item.pickupLocation, item.destination));
    const myBid = item.bids?.find((bid: Bid) => bid.driverId === currentDriver?.driverId);

    return (
      <ThemedView
        style={[
          styles.requestItem,
        ]}
      >
        <View style={styles.requestHeader}>
          <ThemedText style={styles.requestTime}>
            {formatTime(item.createdAt)}
          </ThemedText>
          <ThemedText style={styles.distance}>
            {typeof distance === 'number' ? distance.toFixed(1) : distance} km
          </ThemedText>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationItem}>
            <ThemedText style={[styles.locationLabel, { color: '#4CAF50' }]}>
              Pickup
            </ThemedText>
            <ThemedText style={[styles.locationText, { color: theme.text }]}>
              {item.pickupLocation.address}
            </ThemedText>
          </View>

          <View style={styles.locationItem}>
            <ThemedText style={[styles.locationLabel, { color: '#FF5722' }]}>
              Destination
            </ThemedText>
            <ThemedText style={[styles.locationText, { color: theme.text }]}>
              {item.destination.address}
            </ThemedText>
          </View>
        </View>

        {item.estimatedDuration && (
          <ThemedText style={styles.duration}>
            Estimated: {item.estimatedDuration} minutes
          </ThemedText>
        )}

        {item.bids && item.bids.length > 0 && (
          <ThemedText style={styles.bidsCount}>
            {item.bids.length} bid{item.bids.length !== 1 ? 's' : ''} received
          </ThemedText>
        )}

        {myBid ? (
          <ThemedView style={styles.myBidContainer}>
            <ThemedText style={styles.myBidText}>
              Your bid: ₹{myBid.fareAmount.toFixed(2)}
            </ThemedText>
          </ThemedView>
        ) : (
          <TouchableOpacity
            style={styles.bidButton}
            onPress={() => handlePlaceBid(item)}
          >
            <ThemedText style={styles.bidButtonText}>
              Place Bid
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={[styles.loadingText, { color: theme.text }]}>
            Loading available requests...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToDashboard}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText style={styles.title}>
              Available Ride Requests
            </ThemedText>
            {/* <View style={styles.statusContainer}>
              <ThemedText style={styles.subtitle}>
                {requests.length} request{requests.length !== 1 ? 's' : ''} available
              </ThemedText>
              <ThemedText style={[styles.connectionStatus, { 
                color: connectionStatus === 'connected' ? '#4CAF50' : 
                       connectionStatus === 'connecting' ? '#FF9800' : '#F44336' 
              }]}>
                {connectionStatus === 'connected' ? '🟢 Connected' : 
                 connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'}
              </ThemedText>
            </View> */}
          </View>
        </View>

      {requests.length === 0 ? (
        <ThemedView style={styles.noRequestsContainer}>
          <ThemedText style={styles.noRequestsText}>
            No ride requests available at the moment.
          </ThemedText>
          <ThemedText style={[styles.connectionStatus, { 
            color: connectionStatus === 'connected' ? '#4CAF50' : '#F44336',
            marginBottom: 16,
            textAlign: 'center'
          }]}>
            Connection: {connectionStatus}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.refreshButton, { opacity: isRefreshing ? 0.6 : 1 }]} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} size="small" />
            ) : (
              <ThemedText style={styles.refreshButtonText}>
                Refresh
              </ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item, index) => item._id || `request-${index}`}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.tint}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bid Modal */}
      <Modal
        visible={showBidModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBidModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              Place Your Bid
            </ThemedText>
            
            {selectedRequest && (
              <View style={styles.modalRequestInfo}>
                <ThemedText style={styles.modalRequestText}>
                  From: {selectedRequest.pickupLocation.address}
                </ThemedText>
                <ThemedText style={styles.modalRequestText}>
                  To: {selectedRequest.destination.address}
                </ThemedText>
              </View>
            )}

            <View style={styles.bidInputContainer}>
              <ThemedText style={styles.bidInputLabel}>
                Your Bid Amount (₹)
              </ThemedText>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                placeholder="Enter bid amount"
                placeholderTextColor={theme.text + '60'}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBidModal(false)}
              >
                <ThemedText style={styles.modalButtonText}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitBid}
                disabled={isPlacingBid}
              >
                {isPlacingBid ? (
                  <ActivityIndicator color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} size="small" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    Submit Bid
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  </SafeAreaView>
  );
}

