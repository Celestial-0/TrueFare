import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  StyleProp,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// --- Animation & Icon Libraries ---
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector ,GestureHandlerRootView } from 'react-native-gesture-handler';
import { Car, Bike, Zap, Truck, Check } from 'lucide-react-native';

// --- Type Definitions ---
type VehicleOption = {
  type: string;
  label: string;
  icon: React.ElementType;
};

type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

type VehicleSelectorProps = {
  selectedVehicleType: string;
  onVehicleTypeChange: (vehicleType: string) => void;
};

// --- Mock Data ---
const MOCK_VEHICLE_OPTIONS: VehicleOption[] = [
  { type: 'Taxi', label: 'Taxi', icon: Car },
  { type: 'AC_Taxi', label: 'AC Taxi', icon: Car },
  { type: 'Bike', label: 'Bike', icon: Bike },
  { type: 'EBike', label: 'E-Bike', icon: Zap },
  { type: 'ERiksha', label: 'E-Rickshaw', icon: Truck },
  { type: 'Auto', label: 'Auto', icon: Car },
];

// --- Reusable Animated Components ---
const AnimatedPressable = ({ children, style, onPress }: AnimatedPressableProps) => {
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      if (onPress) {
        onPress();
      }
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={style}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const VehicleOptionCard = ({
  option,
  index,
  isSelected,
  onSelect,
}: {
  option: VehicleOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isSelected ? 1.05 : 1) }],
      borderColor: withSpring(isSelected ? theme.primary : theme.border),
      backgroundColor: withSpring(isSelected ? `${theme.primary}15` : theme.card),
    };
  });

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(600)}
      layout={LinearTransition.springify()}
      style={styles.vehicleOptionContainer}
    >
      <AnimatedPressable onPress={onSelect} style={[styles.vehicleOption, cardStyle]}>
        <option.icon
          color={isSelected ? theme.primary : theme.text}
          size={32}
        />
        <ThemedText
          style={[
            styles.label,
            { color: isSelected ? theme.primary : theme.text },
          ]}
        >
          {option.label}
        </ThemedText>
        {isSelected && (
          <Animated.View entering={FadeInDown} style={[styles.checkBadge, {backgroundColor: theme.primary}]}>
            <Check color="#fff" size={12} strokeWidth={3} />
          </Animated.View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

// --- Main Screen Component ---
export default function VehicleSelector({ selectedVehicleType, onVehicleTypeChange }: VehicleSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <ThemedText style={styles.title}>Choose Your Ride</ThemedText>
          </Animated.View>

          <VehicleSelectorCard
            selectedVehicleType={selectedVehicleType}
            onVehicleTypeChange={onVehicleTypeChange}
          />
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const VehicleSelectorCard = ({ selectedVehicleType, onVehicleTypeChange }: VehicleSelectorProps) => {
  return (
    <View style={styles.vehicleGrid}>
      {MOCK_VEHICLE_OPTIONS.map((option, index) => (
        <VehicleOptionCard
          key={option.type}
          option={option}
          index={index}
          isSelected={selectedVehicleType === option.type}
          onSelect={() => onVehicleTypeChange(option.type)}
        />
      ))}
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { padding: 6 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleOptionContainer: {
    width: '30%',
    marginBottom: 16,
  },
  vehicleOption: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
