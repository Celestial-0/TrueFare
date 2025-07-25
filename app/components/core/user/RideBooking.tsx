import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_COORDINATES,
  PLACEHOLDERS,
  ERROR_MESSAGES,
  UserData,
} from '@/utils/userConstants';
import { Socket } from 'socket.io-client';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import type { RideRequest as AppRideRequest } from '@/contexts/AppContext';
import socketService from '@/services/socketService';

interface RideBookingProps {
  currentUser: UserData | null;
  onRideRequestCreated?: (request: AppRideRequest) => void;
  onSocketConnected?: (socket: Socket) => void;
}

export default function RideBooking({ 
  currentUser, 
  onRideRequestCreated,
  onSocketConnected 
}: RideBookingProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state, dispatch, addNotification } = useApp();
  const listenersSetupRef = useRef<string | null>(null);
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use app context state instead of local state
  const currentRequest = state.rideRequests.find(req => req.status === 'bidding') || null;
  const bids = state.currentBids;
  const [selectedBid, setSelectedBid] = useState<any | null>(null);
  const [biddingStatus, setBiddingStatus] = useState<'waiting' | 'receiving' | 'closed'>('waiting');

  
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentRequestContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestInfo: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  userInfoContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  userInfo: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  instructionsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: 8,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    opacity: 0.7,
  },
  biddingContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  biddingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingText: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginVertical: 10,
  },
  bidsContainer: {
    marginTop: 10,
  },
  bidsHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  bidItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
  },
  bidDriver: {
    fontSize: 14,
    opacity: 0.8,
  },
  bidEta: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  bidMessage: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  acceptBidButton: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  moreBidsText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
  },
  selectedBidContainer: {
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  selectedBidTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedBidAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#28a745',
    marginBottom: 2,
  },
  selectedBidDriver: {
    fontSize: 14,
    opacity: 0.8,
  },
});
  // Socket event handlers using the socketService
  useEffect(() => {
    if (!state.isConnected) return;

    const userId = currentUser?.userId;
    
    if (!userId) return;

    // Prevent duplicate listener setup for the same user
    if (listenersSetupRef.current === userId) {
      return;
    }

    console.log('RideBooking: Setting up socket listeners for user:', userId);
    listenersSetupRef.current = userId;

    // The app context already handles these events globally, so we don't need to duplicate them here
    
    // Cleanup listeners on unmount
    return () => {
      console.log('RideBooking: Cleaning up socket listeners');
      listenersSetupRef.current = null;
    };
  }, [state.isConnected, currentUser?.userId]);

  const validateInputs = (): boolean => {
    if (!pickupLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter pickup location');
      return false;
    }
    
    if (!destination.trim()) {
      Alert.alert('Validation Error', 'Please enter destination');
      return false;
    }
    
    if (pickupLocation.trim() === destination.trim()) {
      Alert.alert('Validation Error', 'Pickup and destination cannot be the same');
      return false;
    }
    
    return true;
  };

  const createRideRequest = async () => {
    if (!currentUser) {
      Alert.alert('Error', ERROR_MESSAGES.NO_USER_LOGGED_IN);
      return;
    }

    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const requestData = {
        userId: currentUser.userId,
        pickupLocation: {
          address: pickupLocation.trim(),
          coordinates: {
            latitude: DEFAULT_COORDINATES.latitude,
            longitude: DEFAULT_COORDINATES.longitude,
          },
        },
        destination: {
          address: destination.trim(),
          coordinates: {
            latitude: DEFAULT_COORDINATES.latitude + 0.01, // Slight offset for demo
            longitude: DEFAULT_COORDINATES.longitude + 0.01,
          },
        },
        estimatedDistance: 5.2, // Demo value
        estimatedDuration: 15, // Demo value in minutes
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RIDE_REQUESTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        const newRequest: AppRideRequest = {
          _id: data.data.requestId || data.data.id || data.data._id,
          userId: currentUser.userId!,
          pickupLocation: {
            address: requestData.pickupLocation.address,
            coordinates: {
              latitude: requestData.pickupLocation.coordinates.latitude,
              longitude: requestData.pickupLocation.coordinates.longitude
            }
          },
          destination: {
            address: requestData.destination.address,
            coordinates: {
              latitude: requestData.destination.coordinates.latitude,
              longitude: requestData.destination.coordinates.longitude
            }
          },
          status: 'bidding',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          bids: []
        };
        
        // Add to app context
        dispatch({ type: 'ADD_RIDE_REQUEST', payload: newRequest });
        setBiddingStatus('waiting');
        onRideRequestCreated?.(newRequest);
        
        addNotification('Ride request created successfully!');
        
        // Clear form immediately after successful submission
        setPickupLocation('');
        setDestination('');
        
        // Request bid updates with a small delay to ensure backend processing is complete
        setTimeout(() => {
          const requestBidUpdates = (retryCount: number = 0) => {
            if (socketService.socket && socketService.socket.connected && state.isSocketRegistered) {
              console.log('🔄 Requesting bid updates for request:', newRequest._id);
              socketService.socket.emit('user:requestBidUpdate', { requestId: newRequest._id });
            } else if (retryCount < 5) {
              console.warn(`⚠️ Cannot request bid updates (attempt ${retryCount + 1}/5):`, {
                socketConnected: socketService.socket?.connected,
                isSocketRegistered: state.isSocketRegistered
              });
              
              // Retry after 2 seconds, up to 5 times (total 10 seconds)
              setTimeout(() => requestBidUpdates(retryCount + 1), 2000);
            } else {
              console.error('❌ Failed to request bid updates after 5 attempts');
              addNotification('Unable to connect for bid updates. Try refreshing the bid display.');
            }
          };
          
          requestBidUpdates();
        }, 1000);
        
      } else {
        Alert.alert('Error', data.message || ERROR_MESSAGES.GENERAL_ERROR);
      }
    } catch (error) {
      console.error('Error creating ride request:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelRideRequest = () => {
    Alert.alert(
      'Cancel Ride Request',
      'Are you sure you want to cancel this ride request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            if (currentRequest) {
              dispatch({ 
                type: 'UPDATE_RIDE_REQUEST', 
                payload: { 
                  _id: currentRequest._id, 
                  updates: { status: 'cancelled' } 
                } 
              });
              dispatch({ type: 'SET_CURRENT_BIDS', payload: [] });
            }
            setBiddingStatus('waiting');
            addNotification('Ride request has been cancelled');
          },
        },
      ]
    );
  };

  const acceptBid = async (bid: any) => {
    if (!currentRequest) return;
    
    Alert.alert(
      'Accept Bid',
      `Accept bid of ₹${bid.fareAmount} from driver ${bid.driverId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const response = await fetch(
                `${API_BASE_URL}/ride-requests/${currentRequest._id}/bids/${bid._id}/accept`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              const data = await response.json();
              
              if (data.success) {
                setSelectedBid(bid);
                setBiddingStatus('closed');
                Alert.alert('Success', 'Bid accepted! Driver has been notified.');
              } else {
                Alert.alert('Error', data.message || 'Failed to accept bid');
              }
            } catch (error) {
              console.error('Error accepting bid:', error);
              Alert.alert('Error', 'Failed to accept bid');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const refreshBids = async () => {
    if (!currentRequest) return;
    
    try {
      // Request bid updates via socket
      if (socketService.socket) {
        socketService.socket.emit('user:requestBidUpdate', { requestId: currentRequest._id });
      }
    } catch (error) {
      console.error('Error refreshing bids:', error);
    }
  };

  if (!currentUser) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          Please login to book a ride
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.formContainer}>
          {/* Header */}
          <ThemedText style={styles.title}>Book a Ride</ThemedText>
          
          {/* Connection Status */}
          <View style={[
            styles.statusIndicator,
            { backgroundColor: socketService.isConnected() ? '#d4edda' : '#f8d7da' }
          ]}>
            <ThemedText style={[
              styles.statusText,
              { color: socketService.isConnected() ? '#155724' : '#721c24' }
            ]}>
              {socketService.isConnected() ? 'Connected' : 'Disconnected'}
            </ThemedText>
          </View>

          {/* Current Request Display */}
          {currentRequest && (
            <ThemedView style={[styles.currentRequestContainer, { borderColor: theme.text }]}>
              <ThemedText style={styles.sectionTitle}>Current Request</ThemedText>
              <ThemedText style={styles.requestInfo}>
                Request ID: {currentRequest._id}
              </ThemedText>
              <ThemedText style={styles.requestInfo}>
                Status: {currentRequest.status}
              </ThemedText>
              <ThemedText style={styles.requestInfo}>
                From: {currentRequest.pickupLocation.address}
              </ThemedText>
              <ThemedText style={styles.requestInfo}>
                To: {currentRequest.destination.address}
              </ThemedText>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: '#dc3545' }]}
                onPress={cancelRideRequest}
              >
                <ThemedText style={styles.buttonText}>Cancel Request</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* Bidding Section */}
          {currentRequest && biddingStatus !== 'waiting' && (
            <ThemedView style={[styles.biddingContainer, { borderColor: theme.text }]}>
              <View style={styles.biddingHeader}>
                <ThemedText style={styles.sectionTitle}>
                  {biddingStatus === 'receiving' ? 'Incoming Bids' : 'Bidding Closed'}
                </ThemedText>
                {biddingStatus === 'receiving' && (
                  <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: theme.tint }]}
                    onPress={refreshBids}
                  >
                    <ThemedText style={[styles.refreshButtonText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>
                      ↻
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              
              {biddingStatus === 'receiving' && bids.length === 0 && (
                <ThemedText style={styles.waitingText}>
                  Waiting for drivers to place bids...
                </ThemedText>
              )}
              
              {bids.length > 0 && (
                <View style={styles.bidsContainer}>
                  <ThemedText style={styles.bidsHeader}>
                    Total Bids: {bids.length}
                  </ThemedText>
                  
                  {bids.slice(0, 5).map((bid, index) => (
                    <View key={bid._id || index} style={[styles.bidItem, { borderColor: theme.text + '30' }]}>
                      <View style={styles.bidHeader}>
                        <ThemedText style={styles.bidAmount}>₹{bid.fareAmount}</ThemedText>
                        <ThemedText style={styles.bidDriver}>Driver: {bid.driverId}</ThemedText>
                      </View>
                      
                      {biddingStatus === 'receiving' && !selectedBid && (
                        <TouchableOpacity
                          style={[styles.acceptBidButton, { backgroundColor: theme.tint }]}
                          onPress={() => acceptBid(bid)}
                          disabled={isLoading}
                        >
                          <ThemedText style={[styles.buttonText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>
                            Accept Bid
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  
                  {bids.length > 5 && (
                    <ThemedText style={styles.moreBidsText}>
                      ... and {bids.length - 5} more bids
                    </ThemedText>
                  )}
                </View>
              )}
              
              {selectedBid && (
                <View style={[styles.selectedBidContainer, { backgroundColor: theme.tint + '20' }]}>
                  <ThemedText style={styles.selectedBidTitle}>✓ Accepted Bid</ThemedText>
                  <ThemedText style={styles.selectedBidAmount}>₹{selectedBid.fareAmount}</ThemedText>
                  <ThemedText style={styles.selectedBidDriver}>Driver: {selectedBid.driverId}</ThemedText>
                </View>
              )}
            </ThemedView>
          )}

          {/* Booking Form */}
          {!currentRequest && (
            <>
              <ThemedText style={styles.instructionsText}>
                📍 Enter your pickup and destination locations to request a ride. 
                Drivers will bid on your request in real-time!
              </ThemedText>
              
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Pickup Location</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      borderColor: theme.text,
                      backgroundColor: theme.background,
                      color: theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.PICKUP_LOCATION}
                  placeholderTextColor={theme.text + '80'}
                  value={pickupLocation}
                  onChangeText={setPickupLocation}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Destination</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      borderColor: theme.text,
                      backgroundColor: theme.background,
                      color: theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.DESTINATION}
                  placeholderTextColor={theme.text + '80'}
                  value={destination}
                  onChangeText={setDestination}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: theme.tint,
                    opacity: isLoading ? 0.7 : 1,
                  }
                ]}
                onPress={createRideRequest}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>Create Ride Request</ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* User Info */}
          <ThemedView style={[styles.userInfoContainer, { borderColor: theme.text }]}>
            <ThemedText style={styles.sectionTitle}>User Information</ThemedText>
            <ThemedText style={styles.userInfo}>Name: {currentUser.name}</ThemedText>
            <ThemedText style={styles.userInfo}>Phone: {currentUser.phone}</ThemedText>
            {currentUser.email && (
              <ThemedText style={styles.userInfo}>Email: {currentUser.email}</ThemedText>
            )}
            {currentUser.userId && (
              <ThemedText style={styles.userInfo}>User ID: {currentUser.userId}</ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
