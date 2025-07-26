import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  SlideInDown,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import { Bid, RideStatus, BidStatus } from '@/types/types';
import { VehicleType } from '@/types/vehicle.types';
import VehicleSelector from './VehicleSelector';

// --- PROPS INTERFACE ---
interface RideBookingProps {
  onRideRequestCreated?: (requestId: string) => void;
}


// --- ENHANCED & NEW ANIMATED HELPER COMPONENTS ---

/**
 * AnimatedPressable Component
 * ENHANCEMENT: Now handles a `disabled` state by reducing opacity,
 * providing clear visual feedback for non-interactive elements.
 */
const AnimatedPressable = ({ children, style, onPress, disabled, ...props }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(disabled ? 0.6 : 1, { duration: 200 }),
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.ease) });
  };
  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/**
 * PulsingView Component
 * A view that applies a subtle, continuous pulsing opacity animation.
 * No changes needed, it's already a great micro-animation.
 */
const PulsingView = ({ children, style }: { children: React.ReactNode, style?: any }) => {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

/**
 * NEW: AnimatedTextInput Component
 * A modern input with a floating label and an animated border
 * that responds to focus state, providing a clean micro-interaction.
 */
const AnimatedTextInput = ({ label, value, theme, ...props }: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const labelPosition = useSharedValue(value ? 1 : 0);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    useEffect(() => {
        labelPosition.value = withTiming(isFocused || value ? 1 : 0, { duration: 200 });
    }, [isFocused, value, labelPosition]);

    const animatedLabelStyle = useAnimatedStyle(() => {
        return {
            top: labelPosition.value === 1 ? -10 : 16,
            fontSize: labelPosition.value === 1 ? 12 : 16,
            backgroundColor: theme.background,
            paddingHorizontal: 4,
            color: isFocused ? theme.tint : theme.textSecondary,
        };
    });

    const styles = getStyles(theme, useColorScheme() ?? 'light');

    return (
        <View style={styles.inputContainer}>
            <Animated.Text style={[styles.animatedLabel, animatedLabelStyle]}>
                {label}
            </Animated.Text>
            <TextInput
                style={[styles.input, { borderColor: isFocused ? theme.tint : theme.border }]}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={value}
                {...props}
            />
        </View>
    );
};


/**
 * BidItem Component
 * Uses a staggered SlideInDown animation for a dynamic entrance.
 * The layout animation ensures smooth re-ordering or removal.
 */
const BidItem = React.memo<{
  bid: Bid;
  onAccept: (bid: Bid) => void;
  styles: any;
  index: number
}>(({ bid, onAccept, styles, index }) => (
  <Animated.View
    entering={SlideInDown.duration(300).delay(index * 100).springify().damping(15)}
    layout={LinearTransition.springify()}
    style={styles.bidItem}
  >
    <View style={styles.bidHeader}>
      <View>
        <ThemedText style={styles.bidDriverName}>{bid.driverName} (⭐ {bid.driverRating})</ThemedText>
      </View>
      <ThemedText style={styles.bidAmount}>₹{bid.amount}</ThemedText>
    </View>
    <AnimatedPressable onPress={() => onAccept(bid)}>
      <View style={[styles.button, styles.acceptBidButton]}>
        <ThemedText style={styles.buttonText}>Accept Bid</ThemedText>
      </View>
    </AnimatedPressable>
  </Animated.View>
));
BidItem.displayName = 'BidItem';


// --- MAIN COMPONENT ---
export const RideBooking = ({ onRideRequestCreated }: RideBookingProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme, colorScheme ?? 'light');

  const {
    loading, socketConnected, currentUser, rideRequests,
    createRideRequest, acceptBid, cancelRide, addNotification
  } = useApp();

  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>(VehicleType.TAXI);

  const activeRideRequest = useMemo(() => {
    const userId = (currentUser as any)?.userId || currentUser?._id;
    const activeRequests = rideRequests.filter(req =>
      req.userId === userId && ['pending', 'bidding', 'accepted'].includes(req.status)
    );
    if (activeRequests.length > 0) {
      return activeRequests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    }
    return null;
  }, [rideRequests, currentUser]);

  const bids = activeRideRequest?.bids || [];
  const selectedBid = useMemo(() => bids.find(bid => bid.status === BidStatus.ACCEPTED), [bids]);

  const handleCreateRequest = useCallback(() => {
    if (activeRideRequest) {
      addNotification({ type: 'error', message: 'You already have an active ride request.', createdAt: new Date() });
      return;
    }
    if (!pickupLocation.trim() || !destination.trim()) {
      addNotification({ type: 'error', message: 'Please enter both pickup and destination.', createdAt: new Date() });
      return;
    }
    const requestData = {
      rideType: selectedVehicleType,
      pickupLocation: { address: pickupLocation, coordinates: { latitude: 0, longitude: 0 } },
      destination: { address: destination, coordinates: { latitude: 0, longitude: 0 } },
    };
    createRideRequest(requestData);
  }, [pickupLocation, destination, selectedVehicleType, createRideRequest, activeRideRequest, addNotification]);

  const handleAcceptBid = useCallback((bid: Bid) => {
    if (activeRideRequest) acceptBid(activeRideRequest.requestId, bid._id);
  }, [activeRideRequest, acceptBid]);

  const handleCancelRequest = useCallback(() => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
        if (activeRideRequest) cancelRide(activeRideRequest.requestId, 'User cancelled');
      }},
    ]);
  }, [activeRideRequest, cancelRide]);

  useEffect(() => {
    if (activeRideRequest && onRideRequestCreated) {
      onRideRequestCreated(activeRideRequest.requestId);
    }
  }, [activeRideRequest, onRideRequestCreated]);

  const renderContent = () => {
    // STATE 3: Ride Accepted
    if (selectedBid) {
      return (
        <Animated.View key="confirmation" entering={FadeIn.duration(400).springify()} style={styles.selectedBidContainer}>
          <ThemedText style={styles.selectedBidTitle}>✓ Driver on the way!</ThemedText>
          <ThemedText style={styles.selectedBidAmount}>₹{selectedBid.amount}</ThemedText>
          <ThemedText style={styles.selectedBidDriver}>Driver: {selectedBid.driverName}</ThemedText>
        </Animated.View>
      );
    }

    // STATE 2: Bidding Active
    if (activeRideRequest) {
      return (
        <Animated.View key="bidding" entering={FadeIn.duration(500)}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Searching for Drivers</ThemedText>
            <ThemedText style={styles.infoText}>From: {activeRideRequest.pickupLocation.address}</ThemedText>
            <ThemedText style={styles.infoText}>To: {activeRideRequest.destination.address}</ThemedText>
            <AnimatedPressable onPress={handleCancelRequest}>
              <View style={[styles.button, styles.cancelButton]}>
                <ThemedText style={styles.cancelButtonText}>Cancel Request</ThemedText>
              </View>
            </AnimatedPressable>
          </ThemedView>

          <View style={styles.biddingContainer}>
            <ThemedText style={styles.sectionTitle}>Incoming Bids</ThemedText>
            {bids.length > 0 ? (
              bids.map((bid, index) => <BidItem key={bid._id} bid={bid} onAccept={handleAcceptBid} styles={styles} index={index} />)
            ) : (
              <PulsingView>
                <ThemedText style={styles.waitingText}>Waiting for bids...</ThemedText>
              </PulsingView>
            )}
          </View>
        </Animated.View>
      );
    }

    // STATE 1: Create Ride Form
    return (
      <Animated.View key="form" entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)}>
        <ThemedText style={styles.instructionsText}>
          Enter your locations to find a ride. Drivers will bid in real-time.
        </ThemedText>
        <VehicleSelector
            selectedVehicleType={selectedVehicleType}
            onVehicleTypeChange={(v: string) => setSelectedVehicleType(v as VehicleType)}
        />
        <AnimatedTextInput
            label="Pickup Location"
            
            placeholderTextColor={theme.textSecondary + '80'}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            editable={!loading}
            theme={theme}
        />
        <AnimatedTextInput
            label="Destination"
            
            placeholderTextColor={theme.textSecondary + '80'}
            value={destination}
            onChangeText={setDestination}
            editable={!loading}
            theme={theme}
        />
        <AnimatedPressable onPress={handleCreateRequest} disabled={loading || !pickupLocation || !destination}>
          <View style={[styles.button, styles.submitButton]}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Request Ride</ThemedText>
            )}
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.mainContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ThemedText style={styles.title}>Book a Ride</ThemedText>
            <View style={[styles.statusDot, socketConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
          </View>
          <Animated.View layout={LinearTransition.springify().duration(400)}>
            {renderContent()}
          </Animated.View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


// --- STYLESHEET (ENHANCED FOR MINIMALISM & CLARITY) ---
const getStyles = (theme: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  mainContent: { padding: 20, flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 24, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: theme.text, marginBottom: 16 },
  infoText: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, marginBottom: 4 },
  instructionsText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', justifyContent: 'space-evenly', margin: 2, paddingHorizontal: 50, paddingBottom: 12 },
  waitingText: { textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', marginVertical: 32, fontSize: 15 },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  
  // Card style with subtle shadow for light mode, border for dark
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: theme.border,
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colorScheme === 'light' ? 0.05 : 0,
            shadowRadius: 12,
        },
        android: {
            elevation: colorScheme === 'light' ? 3 : 0,
        },
    }),
  },
  
  biddingContainer: { marginTop: 8 },
  
  // New AnimatedTextInput styles
  inputContainer: { marginBottom: 16, position: 'relative' },
  input: {
    color: theme.text,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  animatedLabel: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  
  // Button styles
  button: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitButton: { backgroundColor: theme.tint },
  cancelButton: { backgroundColor: 'transparent', marginTop: 12 },
  cancelButtonText: { color: theme.danger, fontWeight: '600', fontSize: 15 },
  acceptBidButton: { backgroundColor: theme.success, paddingVertical: 12, marginTop: 8 },

  // Connection Status Dot
  statusDot: { width: 9, height: 9, borderRadius: 5, marginBottom: 20 },
  statusDotConnected: { backgroundColor: theme.success },
  statusDotDisconnected: { backgroundColor: theme.danger },

  // Bid Item Styles
  bidItem: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bidAmount: { fontSize: 20, fontWeight: '700', color: theme.tint },
  bidDriverName: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  
  // Selected Bid Confirmation Styles
  selectedBidContainer: {
    backgroundColor: theme.success + '1A', // 10% opacity
    borderColor: theme.success,
    borderWidth: 1.5,
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  selectedBidTitle: { fontSize: 18, fontWeight: '600', color: theme.success, marginBottom: 12 },
  selectedBidAmount: { fontSize: 28, fontWeight: 'bold', color: theme.success, marginBottom: 8 },
  selectedBidDriver: { fontSize: 16, color: theme.text, opacity: 0.9 },
});