import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  StyleProp,
  ViewStyle,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// --- Animation & Icon Libraries ---
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MapPin, ArrowRight, Car, Bike, Zap } from 'lucide-react-native';

// --- Type Definitions ---
type VehicleType = {
  name: 'Sedan' | 'SUV' | 'Bike';
  icon: React.ElementType;
  fare: string;
  eta: string;
};

type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// --- Mock Data ---
const MOCK_VEHICLES: VehicleType[] = [
  { name: 'Sedan', icon: Car, fare: '₹350-400', eta: '5-8 min' },
  { name: 'SUV', icon: Car, fare: '₹450-520', eta: '6-10 min' },
  { name: 'Bike', icon: Bike, fare: '₹120-150', eta: '3-5 min' },
];

// --- Reusable Animated Components ---
const AnimatedPressable = ({ children, style, onPress }: AnimatedPressableProps) => (
  <GestureDetector
    gesture={Gesture.Tap().onEnd((event, success) => {
      if (success && onPress) {
        onPress();
      }
    })}
  >
    <Animated.View style={style}>
      {children}
    </Animated.View>
  </GestureDetector>
);

const LocationInput = ({
  label,
  placeholder,
  index,
}: {
  label: string;
  placeholder: string;
  index: number;
}) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <MapPin color={theme.primary} size={20} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
    </Animated.View>
  );
};

const VehicleTypeCard = ({
  vehicle,
  index,
  isSelected,
  onSelect,
}: {
  vehicle: VehicleType;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const scale = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSelected ? 1.05 : 1) }],
    borderColor: withSpring(isSelected ? theme.primary : theme.border),
  }));

  return (
    <Animated.View layout={LinearTransition.springify()}>
      <AnimatedPressable onPress={onSelect}>
        <Animated.View
          entering={FadeInDown.delay(index * 100).duration(600)}
          style={[styles.vehicleCard, { backgroundColor: theme.card }, scale]}
        >
          <vehicle.icon color={theme.primary} size={32} />
          <View style={styles.vehicleDetails}>
            <ThemedText style={styles.vehicleName}>{vehicle.name}</ThemedText>
            <ThemedText style={styles.vehicleEta}>{vehicle.eta}</ThemedText>
          </View>
          <ThemedText style={styles.vehicleFare}>{vehicle.fare}</ThemedText>
        </Animated.View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// --- Main Screen Component ---
export default function RideRequestScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <ThemedText style={styles.headerTitle}>Where to?</ThemedText>
          </Animated.View>

          {step === 1 && (
            <Animated.View key="step1" exiting={FadeOutUp.duration(300)}>
              <LocationInput index={0} label="Pickup Location" placeholder="Your current location" />
              <LocationInput index={1} label="Destination" placeholder="Search for a destination" />
              <View>
                <AnimatedPressable
                  onPress={() => setStep(2)}
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={styles.actionButtonText}>Find Ride</ThemedText>
                  <ArrowRight color="#fff" size={20} />
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View key="step2">
              <ThemedText style={styles.sectionTitle}>Choose a Ride</ThemedText>
              {MOCK_VEHICLES.map((vehicle, index) => (
                <VehicleTypeCard
                  key={vehicle.name}
                  vehicle={vehicle}
                  index={index}
                  isSelected={selectedVehicle === vehicle.name}
                  onSelect={() => setSelectedVehicle(vehicle.name)}
                />
              ))}
              <View>
                <AnimatedPressable
                  onPress={() => {
                    /* Handle final request */
                  }}
                  style={[styles.actionButton, { backgroundColor: '#28a745', marginTop: 24 }]}
                >
                  <ThemedText style={styles.actionButtonText}>Confirm Ride</ThemedText>
                  <Zap color="#fff" size={20} />
                </AnimatedPressable>
              </View>
              <View>
                <AnimatedPressable
                  onPress={() => setStep(1)}
                  style={[styles.backButton, { borderColor: theme.border }]}
                >
                  <ThemedText style={[styles.backButtonText, {color: theme.textSecondary}]}>Back</ThemedText>
                </AnimatedPressable>
              </View>
            </Animated.View>
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
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, opacity: 0.8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  vehicleDetails: { flex: 1, marginLeft: 16 },
  vehicleName: { fontSize: 16, fontWeight: '600' },
  vehicleEta: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  vehicleFare: { fontSize: 16, fontWeight: 'bold' },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1.5,
  },
  backButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
