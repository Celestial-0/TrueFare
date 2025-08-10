import React, { useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  View,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import type { RideRequest } from '@/contexts/AppContext';
import { RideStatus } from '@/types/types';

// --- Animation & Icon Libraries ---
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Car, ShieldCheck, Phone, Star, Clock, MapPin } from 'lucide-react-native';

// --- Type Definitions ---
type DriverInfo = {
  driverId: string;
  name: string;
  rating?: number;
  phone?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    licensePlate?: string;
    color?: string;
    vehicleType?: string;
  };
};

type RideProgressStatus = {
  title: string;
  time: string;
  isCompleted: boolean;
};

type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// --- Reusable Animated Components ---
const AnimatedPressable = ({ children, style, onPress }: AnimatedPressableProps) => (
  <TouchableOpacity
    style={style}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Animated.View>
      {children}
    </Animated.View>
  </TouchableOpacity>
);

const StatusCard = ({ status, message }: { status: string; message: string }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={[styles.statusCard, { backgroundColor: theme.primary }]}>
      <ThemedText style={styles.statusTitle}>{status}</ThemedText>
      <ThemedText style={styles.statusSubtitle}>{message}</ThemedText>
    </Animated.View>
  );
};

const DriverInfoCard = ({ driver }: { driver: DriverInfo }) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const handleCallDriver = () => {
    if (driver.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    } else {
      Alert.alert('Contact Info', 'Driver phone number not available');
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.driverHeader}>
        <View>
          <ThemedText style={styles.driverName}>{driver.name}</ThemedText>
          <View style={styles.driverRating}>
            <Star color="#FFC107" size={16} fill="#FFC107" />
            <ThemedText style={styles.ratingText}>{(driver.rating || 4.5).toFixed(1)}</ThemedText>
          </View>
        </View>
        <View>
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <AnimatedPressable 
              style={[styles.contactButton, { backgroundColor: theme.primary }]}
              onPress={handleCallDriver}
            >
              <Phone color="#fff" size={20} />
            </AnimatedPressable>
          </Animated.View>
        </View>
      </View>
      <View style={styles.vehicleInfo}>
        <Car size={20} color={theme.textSecondary} />
        <ThemedText style={styles.vehicleText}>
          {driver.vehicleInfo?.color || 'White'} {driver.vehicleInfo?.make || 'Vehicle'} {driver.vehicleInfo?.model || ''}
        </ThemedText>
        <View style={[styles.licensePlate, { backgroundColor: theme.textSecondary + '20' }]}>
          <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
            {driver.vehicleInfo?.licensePlate || 'N/A'}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
};

const RideProgressTimeline = ({ progress }: { progress: RideProgressStatus[] }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText style={styles.sectionTitle}>Ride Progress</ThemedText>
      {progress.map((item, index) => (
        <View key={index} style={styles.progressItem}>
          <View style={styles.timeline}>
            <View style={[styles.timelineDot, { backgroundColor: item.isCompleted ? theme.primary : theme.textSecondary + '40' }]} />
            {index < progress.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.textSecondary + '20' }]} />}
          </View>
          <View style={styles.progressContent}>
            <ThemedText style={[styles.progressTitle, { color: item.isCompleted ? theme.text : theme.textSecondary }]}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.progressTime}>{item.time}</ThemedText>
          </View>
        </View>
      ))}
    </Animated.View>
  );
};

// --- Main Screen Component ---
export default function RideTrackingScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { rideRequests, cancelRide, addNotification } = useApp();

  // Find the accepted ride request
  const acceptedRide = useMemo(() => {
    return rideRequests.find((ride: RideRequest) => ride.status === RideStatus.ACCEPTED);
  }, [rideRequests]);

  // Extract driver info from accepted ride
  const driverInfo = useMemo((): DriverInfo | null => {
    if (!acceptedRide?.driverInfo) return null;
    
    return {
      driverId: acceptedRide.driverInfo.driverId,
      name: acceptedRide.driverInfo.name || 'Driver',
      rating: acceptedRide.driverInfo.rating || 4.5,
      phone: acceptedRide.driverInfo.phone,
      vehicleInfo: acceptedRide.driverInfo.vehicleInfo || {
        make: 'Vehicle',
        model: '',
        licensePlate: 'N/A',
        color: 'White',
        vehicleType: acceptedRide.vehicleType || acceptedRide.rideType || 'TAXI'
      }
    };
  }, [acceptedRide]);

  // Generate ride progress based on ride status and timestamps
  const rideProgress = useMemo((): RideProgressStatus[] => {
    if (!acceptedRide) return [];

    const now = new Date();
    const createdAt = new Date(acceptedRide.createdAt);
    const acceptedAt = acceptedRide.acceptedBid?.acceptedAt ? new Date(acceptedRide.acceptedBid.acceptedAt) : now;
    
    // Estimate arrival time based on acceptedBid estimatedArrival
    const estimatedArrival = acceptedRide.acceptedBid?.estimatedArrival || 5;
    const estimatedArrivalTime = new Date(acceptedAt.getTime() + estimatedArrival * 60 * 1000);

    return [
      {
        title: 'Driver Assigned',
        time: acceptedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCompleted: true
      },
      {
        title: 'Driver is on the way',
        time: acceptedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCompleted: true
      },
      {
        title: `Arriving in ${estimatedArrival} mins`,
        time: estimatedArrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCompleted: false
      },
      {
        title: 'Arrived at pickup',
        time: '',
        isCompleted: false
      },
      {
        title: 'Ride Started',
        time: '',
        isCompleted: false
      }
    ];
  }, [acceptedRide]);

  // Generate status message based on ride progress
  const statusInfo = useMemo(() => {
    if (!acceptedRide) {
      return {
        status: 'No Active Ride',
        message: 'You don\'t have any active rides at the moment.'
      };
    }

    const estimatedArrival = acceptedRide.acceptedBid?.estimatedArrival || 5;
    return {
      status: `Arriving in ${estimatedArrival} minutes`,
      message: 'Your driver is just around the corner.'
    };
  }, [acceptedRide]);

  const handleCancelRide = () => {
    if (!acceptedRide) return;

    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? This action cannot be undone.',
      [
        {
          text: 'Keep Ride',
          style: 'cancel'
        },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: () => {
            try {
              cancelRide(acceptedRide.requestId || acceptedRide._id, 'User cancelled the ride');
              addNotification({
                type: 'info',
                message: 'Ride has been cancelled successfully.',
                createdAt: new Date()
              });
            } catch (error) {
              console.error('Error cancelling ride:', error);
              addNotification({
                type: 'error',
                message: 'Failed to cancel ride. Please try again.',
                createdAt: new Date()
              });
            }
          }
        }
      ]
    );
  };

  // Show message if no accepted ride found
  if (!acceptedRide || !driverInfo) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <ThemedText style={styles.headerTitle}>Ride Tracking</ThemedText>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.card, ]}>
            <View style={{ alignItems: 'center', padding: 20 }}>
              <MapPin size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.sectionTitle, { textAlign: 'center', marginTop: 16 }]}>
                No Active Ride
              </ThemedText>
              <ThemedText style={[styles.progressTime, { textAlign: 'center', marginTop: 8 }]}>
                You don't have any active rides to track at the moment.
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <ThemedText style={styles.headerTitle}>En Route</ThemedText>
        </Animated.View>

        <StatusCard status={statusInfo.status} message={statusInfo.message} />
        <DriverInfoCard driver={driverInfo} />
        <RideProgressTimeline progress={rideProgress} />

        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <AnimatedPressable 
            style={[styles.cancelButton, { backgroundColor: 'rgba(220, 53, 69, 0.125)', borderColor: 'rgba(220, 53, 69, 0.3)' }]}
            onPress={handleCancelRide}
          >
            <ThemedText style={[styles.cancelButtonText, { color: '#dc3545' }]}>Cancel Ride</ThemedText>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  statusCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverName: { fontSize: 20, fontWeight: '600' },
  driverRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 14, fontWeight: 'bold', marginLeft: 4, opacity: 0.8 },
  contactButton: {
    padding: 12,
    borderRadius: 24,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  vehicleText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  licensePlate: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeline: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#eee',
  },
  progressContent: {
    flex: 1,
    paddingBottom: 24,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressTime: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  cancelButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
