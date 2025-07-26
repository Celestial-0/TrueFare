import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  View,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import { RideHistoryRide } from '@/types/types';

// --- Animation & Icon Libraries ---
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  MapPin,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Car,
  ChevronDown,
  History,
} from 'lucide-react-native';

// --- Type Definitions ---
type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  entering?: any; // Add entering property to the type
};

// --- Reusable Animated Components ---
const AnimatedPressable = ({ children, style, onPress, entering }: AnimatedPressableProps) => (
  <GestureDetector
    gesture={Gesture.Tap().onEnd((event, success) => {
      if (success && onPress) {
        onPress();
      }
    })}
  >
    <Animated.View style={style} entering={entering}>
      {children}
    </Animated.View>
  </GestureDetector>
);

const SummaryCard = ({ history }: { history: RideHistoryRide[] }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const totalSpent = history
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.finalFare, 0);
  const completedRides = history.filter(r => r.status === 'completed').length;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.summaryItem}>
        <ThemedText style={styles.summaryValue}>₹{totalSpent.toFixed(2)}</ThemedText>
        <ThemedText style={styles.summaryLabel}>Total Spent</ThemedText>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <ThemedText style={styles.summaryValue}>{completedRides}</ThemedText>
        <ThemedText style={styles.summaryLabel}>Completed Rides</ThemedText>
      </View>
    </Animated.View>
  );
};

const RideHistoryCard = ({ item, index }: { item: RideHistoryRide; index: number }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = item.status === 'completed';

  const rotation = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(isExpanded ? '180deg' : '0deg') }],
  }));

  return (
    <Animated.View layout={LinearTransition.springify()}>
      <AnimatedPressable
        onPress={() => setIsExpanded(!isExpanded)}
        entering={FadeInDown.delay(index * 150).duration(600)}
        style={[styles.rideCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.rideHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {isCompleted ? (
              <CheckCircle color="#28a745" size={22} />
            ) : (
              <XCircle color="#dc3545" size={22} />
            )}
            <View style={{ marginLeft: 12, flex: 1 }}>
              <ThemedText style={styles.routeMainText} numberOfLines={1}>{item.destinationAddress}</ThemedText>
              <ThemedText style={styles.routeSubText}>
                {new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.fareText}>
            {isCompleted ? `₹${item.finalFare.toFixed(2)}` : 'Cancelled'}
          </ThemedText>
        </View>
        {isExpanded && (
          <Animated.View entering={FadeInDown} style={styles.expandedDetails}>
            <View style={styles.detailRow}>
                <MapPin size={16} color={theme.textSecondary} />
                <ThemedText style={styles.detailText}>From: {item.pickupAddress}</ThemedText>
            </View>
            <View style={styles.detailRow}>
                <Car size={16} color={theme.textSecondary} />
                <ThemedText style={styles.detailText}>Driver: {item.driverName}</ThemedText>
            </View>
             <View style={styles.detailRow}>
                <Clock size={16} color={theme.textSecondary} />
                <ThemedText style={styles.detailText}>Duration: {item.duration}</ThemedText>
            </View>
          </Animated.View>
        )}
        <Animated.View style={[styles.chevron, rotation]}>
            <ChevronDown color={theme.textSecondary} size={20} />
        </Animated.View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const EmptyHistory = () => {
    const theme = Colors[useColorScheme() ?? 'light'];
    return (
      <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContainer}>
          <History color={theme.textSecondary} size={48} />
          <ThemedText style={styles.emptyTitle}>No Rides Yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
              Your past trips will be shown here. Time to book your first ride!
          </ThemedText>
      </Animated.View>
    )
  }

// --- Main Screen Component ---
export default function RideHistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { rideHistory, fetchRideHistory } = useApp();

  useEffect(() => {
    fetchRideHistory();
  }, [fetchRideHistory]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <ThemedText style={styles.headerTitle}>Ride History</ThemedText>
          </Animated.View>

          {rideHistory.length > 0 ? (
            <>
              <SummaryCard history={rideHistory} />
              <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <ThemedText style={styles.sectionTitle}>Recent Trips</ThemedText>
              </Animated.View>
              {rideHistory.map((ride, index) => (
                <RideHistoryCard key={ride.rideId} item={ride} index={index} />
              ))}
            </>
          ) : (
            <EmptyHistory />
          )}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  rideCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeMainText: { fontSize: 16, fontWeight: '600' },
  routeSubText: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  fareText: { fontSize: 16, fontWeight: 'bold' },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 12,
    opacity: 0.8,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
});
