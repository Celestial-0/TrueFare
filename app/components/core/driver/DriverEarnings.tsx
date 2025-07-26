import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// --- Animation & Icon Libraries ---
// We use react-native-reanimated for all animations.
// FadeInDown is for entrance animations, and LinearTransition helps animate layout changes smoothly.
// useSharedValue, useAnimatedStyle, and withSpring/withTiming are used for custom interactive animations.
import Animated, {
  FadeInDown,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
// Lucide icons provide clean, modern iconography.
import { Wallet, CheckCircle, XCircle, ArrowRight, TrendingUp, Star, MapPin, Flag, ArrowLeft } from 'lucide-react-native';

// --- Type Definitions ---
type RideHistoryItem = {
  rideId: string;
  pickupAddress: string;
  destinationAddress: string;
  fareAmount: number;
  status: 'completed' | 'cancelled';
  timestamp: string;
};

type EarningsData = {
  today: number;
  week: number;
  month: number;
  totalRides: number;
  averageRating: number;
};

type Period = 'today' | 'week' | 'month';

type DriverEarningsProps = {
  onBackToDashboard?: () => void; // Made optional for standalone use
};

// --- Mock Data (Unchanged) ---
const MOCK_EARNINGS: EarningsData = {
  today: 1250.5,
  week: 8750.0,
  month: 34500.75,
  totalRides: 128,
  averageRating: 4.8,
};

const MOCK_RIDE_HISTORY: RideHistoryItem[] = [
  {
    rideId: 'RIDE7890',
    pickupAddress: 'Connaught Place, New Delhi',
    destinationAddress: 'Cyber Hub, Gurugram',
    fareAmount: 450,
    status: 'completed',
    timestamp: '2025-08-01T14:30:00Z',
  },
  {
    rideId: 'RIDE7891',
    pickupAddress: 'Select Citywalk, Saket',
    destinationAddress: 'Hauz Khas Village',
    fareAmount: 280,
    status: 'completed',
    timestamp: '2025-08-01T11:15:00Z',
  },
  {
    rideId: 'RIDE7892',
    pickupAddress: 'Khan Market',
    destinationAddress: 'India Gate',
    fareAmount: 150,
    status: 'cancelled',
    timestamp: '2025-07-31T18:00:00Z',
  },
  {
    rideId: 'RIDE7893',
    pickupAddress: 'IGI Airport, T3',
    destinationAddress: 'Sector 18, Noida',
    fareAmount: 720,
    status: 'completed',
    timestamp: '2025-07-30T09:45:00Z',
  },
];

// --- Reusable Animated Components ---

/**
 * A custom Pressable component that adds a subtle scaling animation on press.
 * This provides pleasant tactile feedback without external dependencies.
 */
const PressableWithScale = ({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    // Spring animation for a bouncy effect
    scale.value = withSpring(0.98);
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

/**
 * A modern, clean card displaying the main earnings summary.
 * It features a prominent amount display and clear secondary stats.
 */
const EarningsSummaryCard = ({ data, period }: { data: EarningsData; period: Period }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const periodText = {
    today: "Today's Earnings",
    week: "This Week's Earnings",
    month: "This Month's Earnings",
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[styles.summaryCard, { backgroundColor: theme.primary }]}
    >
      <View style={styles.summaryHeader}>
        <Wallet color="#fff" size={24} style={{ opacity: 0.8 }} />
        <ThemedText style={styles.summaryTitle}>{periodText[period]}</ThemedText>
      </View>
      
      {/* The key prop ensures the animation re-triggers when the period changes */}
      <Animated.Text
        key={period}
        entering={FadeInDown.duration(600).delay(100)}
        style={styles.summaryAmount}
      >
        ₹{data[period].toLocaleString('en-IN')}
      </Animated.Text>
      
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <TrendingUp color="#fff" size={16} style={{ opacity: 0.8 }}/>
          <ThemedText style={styles.statValue}>{data.totalRides}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Rides</ThemedText>
        </View>
        <View style={styles.statSeparator} />
        <View style={styles.statItem}>
          <Star color="#fff" size={16} style={{ opacity: 0.8 }}/>
          <ThemedText style={styles.statValue}>{data.averageRating.toFixed(1)}</ThemedText>
          <ThemedText style={styles.statLabel}>Avg. Rating</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * A sleek period selector with a sliding active indicator.
 * This is a common pattern in modern mobile UIs.
 */
const PeriodSelector = ({
  selectedPeriod,
  onSelect,
}: {
  selectedPeriod: Period;
  onSelect: (period: Period) => void;
}) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const periods: Period[] = ['today', 'week', 'month'];

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(500)}
      style={[styles.periodSelector, { backgroundColor: theme.card }]}
    >
      {periods.map(period => {
        const isActive = selectedPeriod === period;
        return (
          <TouchableOpacity
            key={period}
            onPress={() => onSelect(period)}
            style={styles.periodButton}
          >
            {/* The active indicator view animates its layout changes */}
            {isActive && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={[styles.activePeriodIndicator, { backgroundColor: theme.primary }]}
              />
            )}
            <ThemedText style={[styles.periodButtonText, isActive ? { color: theme.primary } : { color: theme.textSecondary }]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

/**
 * A redesigned ride history card with better visual hierarchy,
 * using shadows for depth and a clearer layout for route information.
 */
const RideHistoryCard = ({ item, index }: { item: RideHistoryItem; index: number }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const isCompleted = item.status === 'completed';

  return (
    <PressableWithScale>
      <Animated.View
        entering={FadeInDown.delay(400 + index * 100).duration(600)}
        style={[styles.rideCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
      >
        <View style={styles.rideHeader}>
          <View style={[ styles.statusBadge, isCompleted ? styles.completedBadge : styles.cancelledBadge ]}>
            {isCompleted ? (
              <CheckCircle color="#fff" size={14} />
            ) : (
              <XCircle color="#fff" size={14} />
            )}
            <ThemedText style={styles.statusBadgeText}>{item.status}</ThemedText>
          </View>
          {isCompleted && (
            <ThemedText style={styles.rideEarning}>+₹{item.fareAmount.toFixed(2)}</ThemedText>
          )}
        </View>

        <View style={styles.rideRoute}>
          <View style={styles.routeLine}>
             <MapPin color={theme.primary} size={18} />
             <View style={styles.dottedLine} />
             <Flag color={theme.textSecondary} size={18} />
          </View>
          <View style={styles.routeAddresses}>
            <ThemedText style={styles.routeText} numberOfLines={1}>{item.pickupAddress}</ThemedText>
            <ThemedText style={[styles.routeText, {color: theme.textSecondary}]} numberOfLines={1}>{item.destinationAddress}</ThemedText>
          </View>
        </View>

        <View style={styles.rideFooter}>
            <ThemedText style={styles.rideDate}>
              {new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' at '}
              {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </ThemedText>
            <ThemedText style={styles.rideId}>ID: {item.rideId}</ThemedText>
        </View>
      </Animated.View>
    </PressableWithScale>
  );
};

// --- Main Screen Component ---
export default function DriverEarnings({ onBackToDashboard }: DriverEarningsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');

  return (
    // No GestureHandlerRootView needed anymore.
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerContainer}>
            {onBackToDashboard && (
              <TouchableOpacity onPress={onBackToDashboard} style={styles.backButton}>
                <ArrowLeft color={theme.primaryButtonText} size={24} />
              </TouchableOpacity>
            )}
            <ThemedText style={styles.headerTitleText}>My Earnings</ThemedText>
            {onBackToDashboard && <View style={styles.headerSpacer} />}
          </View>
        </Animated.View>

        <EarningsSummaryCard data={MOCK_EARNINGS} period={selectedPeriod} />
        <PeriodSelector selectedPeriod={selectedPeriod} onSelect={setSelectedPeriod} />

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <ThemedText style={styles.sectionTitle}>Recent History</ThemedText>
        </Animated.View>

        {MOCK_RIDE_HISTORY.map((ride, index) => (
          <RideHistoryCard key={ride.rideId} item={ride} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
// The styles have been completely revamped for a cleaner, more spacious, and modern look.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  // Summary Card Styles
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
    opacity: 0.9,
  },
  summaryAmount: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginLeft: 4,
  },
  statSeparator: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Period Selector Styles
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 32,
    padding: 6,
    height: 52,
  },
  periodButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: '700',
    zIndex: 1, // Ensure text is above the indicator
  },
  activePeriodIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    zIndex: 0,
  },
  // Section Title
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Ride Card Styles
  rideCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    // Using shadow for a floating effect
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideEarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  completedBadge: {
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
  },
  cancelledBadge: {
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  // Ride Route
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeLine: {
    alignItems: 'center',
    marginRight: 12,
  },
  dottedLine: {
    height: 24,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 4,
  },
  routeAddresses: {
    flex: 1,
    justifyContent: 'space-between',
    height: 44,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Ride Footer
  rideFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      paddingTop: 12,
      marginTop: 4,
  },
  rideDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  rideId: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.5,
  },
});
