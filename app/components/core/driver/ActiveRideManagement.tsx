import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useApp } from '@/contexts/AppContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RideStatus, DriverStatus } from '@/types/types';
import type { RideRequest } from '@/contexts/AppContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- ICON COMPONENT ---
const Icon = ({ name, size = 24, color = '#000' }: { name: string; size?: number; color?: string }) => {
  const icons: { [key: string]: string } = {
    'phone': '📞',
    'message': '💬',
    'navigation': '🧭',
    'arrow-left': '←',
    'car': '🚗',
    'map-pin': '📍',
    'check': '✔️',
  };
  return <Text style={{ fontSize: size, color }}>{icons[name] || '❓'}</Text>;
};


// --- TYPES ---
interface AcceptedRideRequest extends RideRequest {
  userInfo?: {
    name: string;
    phone?: string;
  };
}

interface ActiveRideManagementProps {
  onBackToDashboard: () => void;
}

enum RideStage {
  ACCEPTED = 'accepted',
  EN_ROUTE_TO_PICKUP = 'en_route_to_pickup',
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',
  PASSENGER_PICKED_UP = 'passenger_picked_up',
  EN_ROUTE_TO_DESTINATION = 'en_route_to_destination',
  ARRIVED_AT_DESTINATION = 'arrived_at_destination',
  COMPLETED = 'completed'
}


// --- MAIN COMPONENT ---
export default function ActiveRideManagement({ onBackToDashboard }: ActiveRideManagementProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const {
    rideRequests,
    currentRide,
    currentDriver,
    updateDriverStatus,
    completeRide,
    cancelRide,
    addNotification,
    setError,
    dispatch
  } = useApp();

  const [currentStage, setCurrentStage] = useState<RideStage>(RideStage.ACCEPTED);
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const activeRide = useMemo(() => {
    if (currentRide && currentRide.status === RideStatus.ACCEPTED) {
      return currentRide as unknown as AcceptedRideRequest;
    }
    const foundRide = rideRequests.find(ride => {
      const extendedRide = ride as AcceptedRideRequest;
      return ride.status === RideStatus.ACCEPTED &&
        extendedRide.acceptedBid?.driverId === currentDriver?.driverId;
    });
    return foundRide as unknown as AcceptedRideRequest | null;
  }, [currentRide, rideRequests, currentDriver?.driverId]);

  const handleStageProgression = async () => {
    setIsLoading(true);
    try {
      const nextStageMap: Record<RideStage, RideStage> = {
        [RideStage.ACCEPTED]: RideStage.EN_ROUTE_TO_PICKUP,
        [RideStage.EN_ROUTE_TO_PICKUP]: RideStage.ARRIVED_AT_PICKUP,
        [RideStage.ARRIVED_AT_PICKUP]: RideStage.PASSENGER_PICKED_UP,
        [RideStage.PASSENGER_PICKED_UP]: RideStage.EN_ROUTE_TO_DESTINATION,
        [RideStage.EN_ROUTE_TO_DESTINATION]: RideStage.ARRIVED_AT_DESTINATION,
        [RideStage.ARRIVED_AT_DESTINATION]: RideStage.COMPLETED,
        [RideStage.COMPLETED]: RideStage.COMPLETED,
      };

      const nextStage = nextStageMap[currentStage];

      if (nextStage === RideStage.COMPLETED) {
        await completeRide(activeRide!._id);
        await updateDriverStatus({ status: DriverStatus.AVAILABLE });
        dispatch({ type: 'CLEAR_CURRENT_RIDE' });
        addNotification({
          type: 'success',
          message: `Ride completed! Earned ₹${activeRide!.acceptedBid?.fareAmount || 0}`,
          createdAt: new Date()
        });
        onBackToDashboard();
      } else {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStage(nextStage);
        addNotification({
          type: 'info',
          message: getStageInfo(nextStage).notification,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error progressing ride stage:', error);
      setError({ message: 'Failed to update ride status' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride? This action cannot be undone.",
      [
        { text: "Don't Cancel", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsCanceling(true);
            try {
              await cancelRide(activeRide!._id, 'Driver cancelled the ride');
              await updateDriverStatus({ status: DriverStatus.AVAILABLE });
              dispatch({ type: 'CLEAR_CURRENT_RIDE' });
              addNotification({
                type: 'info',
                message: 'Ride has been cancelled',
                createdAt: new Date()
              });
              onBackToDashboard();
            } catch (error) {
              console.error('Error cancelling ride:', error);
              setError({ message: 'Failed to cancel ride' });
            } finally {
              setIsCanceling(false);
            }
          }
        }
      ]
    );
  };

  const handleContactPassenger = (type: 'call' | 'message') => {
    const phoneNumber = activeRide?.userInfo?.phone || activeRide?.userId;
    if (!phoneNumber) {
        Alert.alert('Error', 'Passenger phone number is not available.');
        return;
    }
    const url = type === 'call' ? `tel:${phoneNumber}` : `sms:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) throw new Error();
        return Linking.openURL(url);
      })
      .catch(() => Alert.alert('Error', `Could not ${type} the passenger.`));
  };

  const handleNavigation = (location: { address: string; coordinates: { latitude: number; longitude: number } }) => {
    const { latitude, longitude } = location.coordinates;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}`,
    });
    Linking.canOpenURL(url!)
        .then(supported => {
            if (!supported) {
                const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                return Linking.openURL(webUrl);
            }
            return Linking.openURL(url!);
        })
        .catch(() => Alert.alert('Error', 'Could not open maps application.'));
  };

  const getStageInfo = (stage: RideStage) => {
    switch (stage) {
      case RideStage.ACCEPTED:
        return { title: 'Ride Accepted', subtitle: 'Proceed to pickup location', buttonText: 'Start Navigation', icon: 'check', notification: 'Navigating to pickup location' };
      case RideStage.EN_ROUTE_TO_PICKUP:
        return { title: 'En Route to Pickup', subtitle: 'You are on your way to the passenger', buttonText: 'Arrived at Pickup', icon: 'navigation', notification: 'Arrived at pickup location' };
      case RideStage.ARRIVED_AT_PICKUP:
        return { title: 'Arrived at Pickup', subtitle: 'Notify the passenger of your arrival', buttonText: 'Confirm Passenger Pickup', icon: 'map-pin', notification: 'Passenger picked up' };
      case RideStage.PASSENGER_PICKED_UP:
        return { title: 'Passenger Onboard', subtitle: 'Start the trip to the destination', buttonText: 'Start Trip to Destination', icon: 'car', notification: 'Heading to destination' };
      case RideStage.EN_ROUTE_TO_DESTINATION:
        return { title: 'En Route to Destination', subtitle: 'You are on your way to the destination', buttonText: 'Arrived at Destination', icon: 'navigation', notification: 'Arrived at destination' };
      case RideStage.ARRIVED_AT_DESTINATION:
        return { title: 'Arrived at Destination', subtitle: 'Complete the ride and payment', buttonText: 'Complete Ride', icon: 'check', notification: 'Ride Completed!' };
      default:
        return { title: 'Unknown Stage', subtitle: '', buttonText: 'Continue', icon: 'check', notification: '' };
    }
  };

  if (!activeRide) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header onBack={onBackToDashboard} title="Active Ride" theme={theme} />
        <View style={styles.emptyStateContainer}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Icon name="car" size={64} color={theme.tabIconDefault} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <ThemedText style={styles.emptyTitle}>No Active Ride</ThemedText>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <ThemedText style={styles.emptySubtitle}>
              You don't have any active rides at the moment.
            </ThemedText>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const stageInfo = getStageInfo(currentStage);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header onBack={onBackToDashboard} title="Active Ride" theme={theme} onCancel={handleCancelRide} isCanceling={isCanceling} />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Stage Progression Card */}
        <Animated.View layout={LinearTransition.duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.stageHeader}>
                <Animated.View entering={FadeIn.duration(600)}>
                    <Icon name={stageInfo.icon} size={32} color={theme.primary} />
                </Animated.View>
                <View style={styles.stageInfo}>
                    <ThemedText style={styles.stageTitle}>{stageInfo.title}</ThemedText>
                    <ThemedText style={styles.stageSubtitle}>{stageInfo.subtitle}</ThemedText>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.stageButton, { backgroundColor: theme.primary }]}
                onPress={handleStageProgression}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <ThemedText style={styles.stageButtonText}>{stageInfo.buttonText}</ThemedText>
                )}
            </TouchableOpacity>
        </Animated.View>

        {/* Passenger Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={[styles.card, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.cardTitle}>Passenger Details</ThemedText>
            <View style={styles.passengerInfo}>
                <ThemedText style={styles.passengerName}>
                    {activeRide?.userInfo?.name || 'Valued Passenger'}
                </ThemedText>
                <View style={styles.contactButtons}>
                    <ContactButton icon="phone" theme={theme} onPress={() => handleContactPassenger('call')} />
                    <ContactButton icon="message" theme={theme} onPress={() => handleContactPassenger('message')} />
                </View>
            </View>
        </Animated.View>

        {/* Route Card */}
        <Animated.View entering={FadeInDown.delay(300)} style={[styles.card, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.cardTitle}>Route Information</ThemedText>
            <RoutePoint
                label="Pickup"
                address={activeRide.pickupLocation?.address || 'Not specified'}
                onNavigate={() => activeRide.pickupLocation && handleNavigation(activeRide.pickupLocation)}
                theme={theme}
                isPickup
            />
            <View style={[styles.routeLine, {backgroundColor: theme.border}]}/>
            <RoutePoint
                label="Destination"
                address={activeRide.destination?.address || 'Not specified'}
                onNavigate={() => activeRide.destination && handleNavigation(activeRide.destination)}
                theme={theme}
            />
        </Animated.View>
        
        {/* Fare Card */}
        <Animated.View entering={FadeInDown.delay(400)} style={[styles.card, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.cardTitle}>Fare Details</ThemedText>
            <FareDetail label="Estimated Fare" value={`₹${activeRide?.acceptedBid?.fareAmount || 0}`} theme={theme} isAmount/>
            <FareDetail label="Distance" value={`${activeRide.estimatedDistance?.toFixed(1) || 'N/A'} km`} theme={theme} />
            <FareDetail label="Vehicle Type" value={activeRide.vehicleType || activeRide.rideType} theme={theme} />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}


// --- HELPER COMPONENTS ---
const Header = ({ onBack, title, theme, onCancel, isCanceling }: any) => (
  <View style={[styles.header, { borderBottomColor: theme.border }]}>
    <TouchableOpacity onPress={onBack} style={styles.headerButton}>
      <Icon name="arrow-left" size={24} color={theme.text} />
    </TouchableOpacity>
    <ThemedText style={styles.headerTitle}>{title}</ThemedText>
    {onCancel && (
      <TouchableOpacity onPress={onCancel} disabled={isCanceling} style={[styles.headerButton, styles.cancelButton, {backgroundColor: theme.danger}]}>
        {isCanceling ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>}
      </TouchableOpacity>
    )}
  </View>
);

const ContactButton = ({ icon, theme, onPress }: any) => (
    <TouchableOpacity style={[styles.contactButton, { backgroundColor: theme.primary + '20' }]} onPress={onPress}>
        <Icon name={icon} size={18} color={theme.primary} />
    </TouchableOpacity>
);

const RoutePoint = ({ label, address, onNavigate, theme, isPickup = false }: any) => (
    <View style={styles.routePoint}>
        <View style={styles.routeIconContainer}>
            <View style={[styles.routeDot, { backgroundColor: isPickup ? theme.success : theme.danger }]} />
        </View>
        <View style={styles.routeDetails}>
            <ThemedText style={styles.routeLabel}>{label}</ThemedText>
            <ThemedText style={styles.routeAddress} numberOfLines={2}>{address}</ThemedText>
            <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
                <Icon name="navigation" size={16} color={theme.primary} />
                <ThemedText style={[styles.navigateText, { color: theme.primary }]}>Navigate</ThemedText>
            </TouchableOpacity>
        </View>
    </View>
);

const FareDetail = ({ label, value, theme, isAmount = false }: any) => (
    <View style={styles.fareRow}>
        <ThemedText style={styles.fareLabel}>{label}</ThemedText>
        <ThemedText style={[isAmount ? styles.fareAmount : styles.fareValue, {color: isAmount ? theme.success : theme.text}]}>{value}</ThemedText>
    </View>
);


// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -1,
  },
  cancelButton: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  cancelButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageInfo: {
    flex: 1,
    marginLeft: 16,
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stageSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  stageButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  navigateText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  fareLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
