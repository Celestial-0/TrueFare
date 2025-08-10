import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  View,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import type { RideRequest, Bid } from '@/contexts/AppContext';
import { VEHICLE_TYPES, VEHICLE_TYPE_CONFIG } from '@/utils/constants';

// --- Animation & Icon Libraries ---
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { MapPin, ArrowRight, Star, Tag, Users, CheckCircle, Phone, MessageCircle, Clock, DollarSign, Shield, ChevronDown } from 'lucide-react-native';

// --- Type Definitions ---
type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// --- Reusable Animated Components ---

const AnimatedPressable = ({ children, style, onPress }: AnimatedPressableProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  
  return (
    <ThemedText style={[styles.fareAmount, { color: theme.primary }]}>
      ₹{value || 0}
    </ThemedText>
  );
};

const RequestSummaryCard = ({ request }: { request: RideRequest }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.routeRow}>
        <MapPin color={theme.primary} size={20} />
        <ThemedText style={styles.routeText} numberOfLines={1}>
          {request.pickupLocation.address}
        </ThemedText>
      </View>
      <View style={styles.routeArrowContainer}>
        <View style={[styles.routeLine, { borderColor: theme.border }]} />
        <ArrowRight color={theme.textSecondary} size={16} />
      </View>
      <View style={styles.routeRow}>
        <MapPin color={theme.primary} size={20} />
        <ThemedText style={styles.routeText} numberOfLines={1}>
          {request.destination.address}
        </ThemedText>
      </View>
    </Animated.View>
  );
};

const BidCard = ({
  bid,
  index,
  onAccept,
  isProcessing = false,
  isDisabled = false,
}: {
  bid: Bid;
  index: number;
  onAccept: (bidId: string) => void;
  isProcessing?: boolean;
  isDisabled?: boolean;
}) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const handleAcceptBid = () => {
    if (isDisabled || isProcessing) return;
    const bidIdentifier = bid.bidId || bid._id;
    if (!bidIdentifier) {
      console.error('[BID_CARD] No valid bid ID found!');
      return;
    }
    onAccept(bidIdentifier);
  };

  return (
    <Animated.View
      layout={LinearTransition.springify()}
      entering={FadeInDown.delay(index * 100).duration(600)}
      style={[styles.bidCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.bidHeader}>
        <ThemedText style={styles.driverName}>{bid.driverName || 'Driver'}</ThemedText>
        <View style={styles.driverRating}>
          <Star color="#FFC107" size={16} fill="#FFC107" />
          <ThemedText style={styles.ratingText}>{(bid.driverRating || 4.5).toFixed(1)}</ThemedText>
        </View>
      </View>
      <View style={styles.bidDetails}>
        <View style={styles.bidInfoColumn}>
          <View style={styles.infoItem}>
            <Clock color={theme.textSecondary} size={16} />
            <ThemedText style={styles.infoText}>
              <ThemedText style={styles.infoValue}>{bid.estimatedArrival || bid.estimatedPickupTime || 5} min</ThemedText>
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Tag color={theme.textSecondary} size={16} />
            <AnimatedNumber value={bid.fareAmount} />
          </View>
        </View>
        <AnimatedPressable onPress={handleAcceptBid}>
          <View
            style={[
              styles.acceptButton,
              {
                backgroundColor: isDisabled ? theme.card : theme.primary,
                borderColor: isDisabled ? theme.border : theme.primary,
                opacity: isDisabled && !isProcessing ? 0.6 : 1,
              },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ThemedText style={[styles.acceptButtonText, { color: isDisabled ? theme.textSecondary : 'white' }]}>
                Accept
              </ThemedText>
            )}
          </View>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
};

const WaitingForBids = () => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.7 + (scale.value - 1) * 3, 
  }));

  return (
    <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContainer}>
      <Animated.View style={animatedStyle}>
        <Users color={theme.primary} size={48} />
      </Animated.View>
      <ThemedText style={styles.emptyTitle}>Finding Drivers...</ThemedText>
      <ThemedText style={styles.emptySubtitle}>Bids from nearby drivers will appear here shortly.</ThemedText>
    </Animated.View>
  );
};

const AcceptedRideStatus = ({ request, acceptedBid }: { request: RideRequest; acceptedBid: Bid | undefined }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, [scale]);

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!acceptedBid) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={styles.loadingText}>Loading driver details...</ThemedText>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <Animated.View style={[styles.successHeader, { backgroundColor: theme.successBackground }]}>
        <Animated.View style={animatedCheckmarkStyle}>
          <CheckCircle color={theme.primary} size={32} />
        </Animated.View>
        <View style={styles.successTextContainer}>
          <ThemedText style={[styles.successTitle, { color: theme.primary }]}>Ride Confirmed!</ThemedText>
          <ThemedText style={styles.successSubtitle}>Your driver is on the way.</ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.driverCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.driverHeader}>
          <View>
            <ThemedText style={styles.driverLabel}>Your Driver</ThemedText>
            <ThemedText style={styles.driverName}>{acceptedBid.driverName || 'N/A'}</ThemedText>
          </View>
          <View style={styles.driverRating}>
            <Star color="#FFD700" size={16} fill="#FFD700" />
            <ThemedText style={styles.ratingText}>{(acceptedBid.driverRating || 5.0).toFixed(1)}</ThemedText>
          </View>
        </View>

        <View style={[styles.rideDetailsGrid, { borderTopColor: theme.border }]}>
          <View style={styles.gridItem}>
            <Clock size={20} color={theme.primary} />
            <ThemedText style={styles.gridLabel}>Arrives in</ThemedText>
            <ThemedText style={styles.gridValue}>{acceptedBid.estimatedArrival || 5} min</ThemedText>
          </View>
          <View style={styles.gridItem}>
            <Tag size={20} color={theme.primary} />
            <ThemedText style={styles.gridLabel}>Final Fare</ThemedText>
            <ThemedText style={styles.gridValue}>₹{acceptedBid.fareAmount}</ThemedText>
          </View>
          <View style={styles.gridItem}>
            <Users size={20} color={theme.primary} />
            <ThemedText style={styles.gridLabel}>Vehicle</ThemedText>
            <ThemedText style={styles.gridValue}>{acceptedBid.vehicleType || 'Taxi'}</ThemedText>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <AnimatedPressable onPress={() => console.log('Call driver')}>
            <View style={[styles.actionButton, styles.callButton, { backgroundColor: theme.primary }]}>
              <Phone color="white" size={18} />
              <ThemedText style={styles.actionButtonText}>Call</ThemedText>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => console.log('Message driver')}>
            <View style={[styles.actionButton, { borderColor: theme.border }]}>
              <MessageCircle color={theme.primary} size={18} />
              <ThemedText style={[styles.actionButtonText, { color: theme.primary }]}>Message</ThemedText>
            </View>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// --- NEW: Smart Sorting Sliders Component ---
const PreferenceSliders = ({
  pricePreference,
  setPricePreference,
  comfortPreference,
  setComfortPreference,
}:{
  pricePreference: number;
  setPricePreference: (value: number) => void;
  comfortPreference: number;
  setComfortPreference: (value: number) => void;
}) => {
    const theme = Colors[useColorScheme() ?? 'light'];
    const [isExpanded, setIsExpanded] = useState(false);
    const rotation = useSharedValue(0);
    const height = useSharedValue(0);

    const toggleExpansion = () => {
        setIsExpanded(!isExpanded);
    };
    
    useEffect(() => {
        rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 300 });
        height.value = withTiming(isExpanded ? 150 : 0, { duration: 300 });
    }, [isExpanded, rotation, height]);

    const animatedChevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const animatedContainerStyle = useAnimatedStyle(() => ({
        height: height.value,
        overflow: 'hidden',
    }));

    const getPriceLabel = (value: number) => {
        if (value <= 2) return "Budget Focused";
        if (value === 3) return "Balanced";
        return "Premium Preferred";
    };

    const getComfortLabel = (value: number) => {
        if (value <= 2) return "Basic Comfort";
        if (value === 3) return "Standard";
        return "High Comfort";
    };

    return (
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.sliderSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={toggleExpansion} style={styles.sliderSectionHeader}>
                <ThemedText style={styles.sectionTitle}>Customize Your Sort</ThemedText>
                <Animated.View style={animatedChevronStyle}>
                    <ChevronDown color={theme.textSecondary} size={20} />
                </Animated.View>
            </TouchableOpacity>
            <Animated.View style={animatedContainerStyle}>
                <View style={styles.sliderContainer}>
                    <View style={styles.sliderHeader}>
                        <DollarSign color={theme.textSecondary} size={18} />
                        <ThemedText style={styles.sliderTitle}>Price Preference</ThemedText>
                        <ThemedText style={styles.sliderLabel}>{getPriceLabel(pricePreference)}</ThemedText>
                    </View>
                    <Slider
                        value={pricePreference}
                        onValueChange={setPricePreference}
                        minimumValue={1}
                        maximumValue={5}
                        step={1}
                        minimumTrackTintColor={theme.primary}
                        maximumTrackTintColor={theme.border}
                        thumbTintColor={theme.primary}
                    />
                </View>
                <View style={styles.sliderContainer}>
                    <View style={styles.sliderHeader}>
                        <Shield color={theme.textSecondary} size={18} />
                        <ThemedText style={styles.sliderTitle}>Comfort Preference</ThemedText>
                        <ThemedText style={styles.sliderLabel}>{getComfortLabel(comfortPreference)}</ThemedText>
                    </View>
                     <Slider
                        value={comfortPreference}
                        onValueChange={setComfortPreference}
                        minimumValue={1}
                        maximumValue={5}
                        step={1}
                        minimumTrackTintColor={theme.primary}
                        maximumTrackTintColor={theme.border}
                        thumbTintColor={theme.primary}
                    />
                </View>
            </Animated.View>
        </Animated.View>
    );
};


// --- Main Screen Component ---
export default function BidDisplay() {
  const theme = Colors[useColorScheme() ?? 'light'];
  const { rideRequests, acceptBid, addNotification, setError } = useApp();
  
  const [processingBidId, setProcessingBidId] = useState<string | null>(null);
  const [pricePreference, setPricePreference] = useState(3);
  const [comfortPreference, setComfortPreference] = useState(3);
  const timeoutRef = useRef<number | null>(null);

  const activeRideRequest = useMemo(() => 
    rideRequests.find((r) => ['pending', 'bidding', 'accepted'].includes(r.status) && r.status !== 'cancelled') || null,
  [rideRequests]);

  // NEW: Smart sorting logic
  const sortedBids = useMemo(() => {
    const pendingBids = (activeRideRequest?.bids || []).filter((bid: Bid) => bid.status === 'pending');

    if (pendingBids.length < 2) {
      return pendingBids;
    }
    
    // 1. Find min/max fare for normalization
    const fares = pendingBids.map(bid => bid.fareAmount || 0);
    const minFare = Math.min(...fares);
    const maxFare = Math.max(...fares);
    const fareRange = maxFare - minFare;

    // 2. Find max comfort level for normalization (assuming from config)
    const maxComfortLevel = Math.max(...Object.values(VEHICLE_TYPE_CONFIG).map((v: any) => v.comfort || 1), 5);

    // 3. Calculate dynamic weights based on slider preferences
    const priceWeight = 0.6 + (3 - pricePreference) * 0.1; // Range: 0.4 to 0.8
    const comfortWeight = 0.4 + (comfortPreference - 3) * 0.1; // Range: 0.2 to 0.6
    const totalWeight = priceWeight + comfortWeight;

    const finalPriceWeight = totalWeight > 0 ? priceWeight / totalWeight : 0.5;
    const finalComfortWeight = totalWeight > 0 ? comfortWeight / totalWeight : 0.5;

    // 4. Score and sort bids
    return pendingBids
      .map(bid => {
        // Score for price (higher score for lower price)
        const priceScore = fareRange > 0 ? (maxFare - (bid.fareAmount || 0)) / fareRange : 1;
        
        // Score for comfort (higher score for more comfort)
        const comfortLevel = VEHICLE_TYPE_CONFIG[bid.vehicleType as keyof typeof VEHICLE_TYPE_CONFIG]?.comfortLevel || 2;
        const comfortScore = comfortLevel / maxComfortLevel;

        // Calculate final weighted score
        const score = (priceScore * finalPriceWeight) + (comfortScore * finalComfortWeight);

        return { ...bid, score };
      })
      .sort((a, b) => b.score - a.score); // Sort descending by highest score
  }, [activeRideRequest?.bids, pricePreference, comfortPreference]);

  const isAcceptingBid = !!processingBidId;
  
  const handleAcceptBid = async (bidId: string) => {
    if (!activeRideRequest || isAcceptingBid) return;

    setProcessingBidId(bidId);
    
    try {
      acceptBid(activeRideRequest.requestId, bidId);
      addNotification({
        type: 'success',
        message: 'Ride confirmed! Your driver is on the way.',
        createdAt: new Date(),
      });
      
      timeoutRef.current = setTimeout(() => {
        setProcessingBidId(null);
        setError({ message: "Confirmation is taking longer than usual. Please check your ride status." });
      }, 8000);

    } catch (error) {
      console.error('[BID_DISPLAY] Error accepting bid:', error);
      setError({ message: 'Failed to accept bid. Please try again.' });
      setProcessingBidId(null);
    }
  };

  useEffect(() => {
    const rideStatus = activeRideRequest?.status;
    if (rideStatus === 'accepted' && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setProcessingBidId(null);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeRideRequest?.status]);

  useEffect(() => {
    if (!activeRideRequest && processingBidId) {
      console.log('[BID_DISPLAY] No active ride request found, clearing processing state');
      setProcessingBidId(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [activeRideRequest, processingBidId]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <ThemedText style={styles.headerTitle}>
            {activeRideRequest?.status === 'accepted' ? 'Your Confirmed Ride' : 'Incoming Bids'}
          </ThemedText>
        </Animated.View>

        {activeRideRequest && <RequestSummaryCard request={activeRideRequest} />}

        {activeRideRequest?.status === 'accepted' ? (
          <AcceptedRideStatus
            request={activeRideRequest}
            acceptedBid={activeRideRequest.bids?.find((bid) => bid.status === 'accepted')}
          />
        ) : (
          <>
            {activeRideRequest && sortedBids.length > 0 && (
                <PreferenceSliders 
                    pricePreference={pricePreference}
                    setPricePreference={setPricePreference}
                    comfortPreference={comfortPreference}
                    setComfortPreference={setComfortPreference}
                />
            )}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <ThemedText style={styles.dynamicSectionTitle}>
                {sortedBids.length > 0 ? `${sortedBids.length} Drivers Responded` : 'Waiting for Drivers'}
              </ThemedText>
            </Animated.View>
            {!activeRideRequest ? (
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyTitle}>No Active Request</ThemedText>
                    <ThemedText style={styles.emptySubtitle}>Request a ride to see available bids.</ThemedText>
                </Animated.View>
            ) : sortedBids.length === 0 ? (
              <WaitingForBids />
            ) : (
              sortedBids.map((bid: Bid, index: number) => (
                <BidCard
                  key={bid.bidId || bid._id}
                  bid={bid}
                  index={index}
                  onAccept={handleAcceptBid}
                  isProcessing={processingBidId === (bid.bidId || bid._id)}
                  isDisabled={isAcceptingBid || activeRideRequest?.status === 'accepted'}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  dynamicSectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 24 },
  
  // Summary Card
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 0, borderWidth: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeText: { fontSize: 15, marginLeft: 12, flex: 1 },
  routeArrowContainer: { alignSelf: 'flex-start', marginVertical: 8, marginLeft: 9, flexDirection: 'row', alignItems: 'center' },
  routeLine: { height: 20, width: 2, marginRight: 8 },

  // --- NEW: Preference Sliders Styles ---
  sliderSection: { borderRadius: 16, borderWidth: 1, marginTop: 24, overflow: 'hidden' },
  sliderSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, },
  sectionTitle: { fontSize: 16, fontWeight: '600', },
  sliderContainer: { paddingHorizontal: 16, paddingBottom: 4, },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, },
  sliderTitle: { fontWeight: '600', fontSize: 14 },
  sliderLabel: { marginLeft: 'auto', fontSize: 13, opacity: 0.7 },

  // Bid Card
  bidCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  bidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  driverName: { fontSize: 18, fontWeight: '600' },
  driverRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: 'bold' },
  bidDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bidInfoColumn: { gap: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 16 },
  infoValue: { fontWeight: 'bold' },
  fareAmount: { fontSize: 22, fontWeight: 'bold' },
  acceptButton: { height: 48, width: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  acceptButtonText: { fontWeight: 'bold', fontSize: 16 },

  // Empty/Waiting State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  
  // Loading State
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 16, marginTop: 16, opacity: 0.7 },

  // Accepted Ride Status
  successHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' , marginTop: 16, marginBottom: 16 },
  successTextContainer: { marginLeft: 12 },
  successTitle: { fontSize: 18, fontWeight: 'bold' },
  successSubtitle: { fontSize: 14, opacity: 0.8 },
  driverCard: { borderRadius: 16, marginTop: -1, borderWidth: 1, overflow: 'hidden' },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  driverLabel: { fontSize: 13, opacity: 0.6, marginBottom: 2 },
  rideDetailsGrid: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingVertical: 16 },
  gridItem: { alignItems: 'center', gap: 6, flex: 1 },
  gridLabel: { fontSize: 12, opacity: 0.6 },
  gridValue: { fontSize: 15, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', padding: 20, paddingTop: 4, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  callButton: { borderColor: 'transparent', padding: 14 },
  actionButtonText: { fontSize: 15, fontWeight: 'bold' },
});