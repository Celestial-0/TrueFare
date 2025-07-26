import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Pressable,
  TouchableOpacity, // Added for back button
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// --- Animation & Icon Libraries ---
// Make sure to install these: yarn add react-native-reanimated lucide-react-native
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Car, Calendar, Palette, Hash } from 'lucide-react-native';

// --- Constants ---
const SPACING = 16;

// --- Type Definitions ---
type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
};

type AnimatedPressableProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

type FormInputProps = {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  value: string;
  index: number;
};

type VehicleInfoManagementProps = {
  onBackToDashboard: () => void;
};

// --- Mock Data ---
const MOCK_VEHICLE_INFO: VehicleInfo = {
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  color: 'Silver',
  licensePlate: 'DL12AB1234',
};

// --- Reusable Animated Components (Revamped) ---

/**
 * An animated pressable component using Reanimated and the built-in Pressable.
 * It provides tactile feedback by scaling down on press, without gesture-handler.
 */
const AnimatedPressable = ({ children, style, onPress }: AnimatedPressableProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.97, { duration: 150 });
  };

  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 200 });
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

/**
 * A form input with a subtle focus animation on its border.
 */
const FormInput = ({ label, icon: Icon, placeholder, value, index }: FormInputProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [isFocused, setIsFocused] = useState(false);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = withTiming(isFocused ? theme.primary : theme.border, {
      duration: 250,
    });
    return { borderColor };
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Animated.View style={[styles.inputContainer, { backgroundColor: theme.card }, animatedContainerStyle]}>
        <Icon color={theme.textSecondary} size={20} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </Animated.View>
    </Animated.View>
  );
};

const CurrentVehicleCard = ({ vehicle }: { vehicle: VehicleInfo }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={[styles.currentVehicleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <ThemedText style={styles.currentVehicleTitle}>Current Vehicle</ThemedText>
      <View style={styles.vehicleDetailRow}>
        <ThemedText style={[styles.vehicleDetailValue, { color: theme.text }]}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </ThemedText>
        <ThemedText style={[styles.vehicleDetailLabel, { color: theme.textSecondary }]}>
          {vehicle.licensePlate}
        </ThemedText>
      </View>
    </Animated.View>
  );
};

// --- Main Screen Component (Revamped) ---
export default function VehicleInfoManagementScreen({ onBackToDashboard }: VehicleInfoManagementProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const formFields = [
    { label: "Vehicle Make", icon: Car, placeholder: "e.g., Toyota", value: MOCK_VEHICLE_INFO.make },
    { label: "Model", icon: Car, placeholder: "e.g., Camry", value: MOCK_VEHICLE_INFO.model },
    { label: "Year", icon: Calendar, placeholder: "e.g., 2023", value: String(MOCK_VEHICLE_INFO.year) },
    { label: "Color", icon: Palette, placeholder: "e.g., Silver", value: MOCK_VEHICLE_INFO.color },
    { label: "License Plate", icon: Hash, placeholder: "e.g., DL12AB1234", value: MOCK_VEHICLE_INFO.licensePlate },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onBackToDashboard} style={styles.backButton}>
            <ThemedText style={[styles.backButtonText, { color: theme.text }]}>←</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Manage Vehicle</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={styles.content}>
            <CurrentVehicleCard vehicle={MOCK_VEHICLE_INFO} />

            <ThemedText style={styles.sectionTitle}>Update Information</ThemedText>
            
            <View style={styles.formContainer}>
              {formFields.map((field, index) => (
                <FormInput
                  key={field.label}
                  index={index}
                  label={field.label}
                  icon={field.icon}
                  placeholder={field.placeholder}
                  value={field.value}
                />
              ))}
            </View>

            <AnimatedPressable
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={() => console.log('Save Changes Pressed')}
            >
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            </AnimatedPressable>
          </View>
        </KeyboardAwareScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

// --- Stylesheet (Revamped) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  scrollContentContainer: {
    paddingBottom: SPACING * 2,
  },
  content: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING,
    gap: SPACING * 1.5, // Use gap for consistent spacing between major sections
  },
  currentVehicleContainer: {
    padding: SPACING,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentVehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary, // Muted title for hierarchy
    marginBottom: 8,
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleDetailValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  vehicleDetailLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING / 2, // Small top margin to separate from card
  },
  formContainer: {
    gap: SPACING, // Use gap for consistent spacing between form inputs
  },
  label: {
    fontSize: 14,
    fontWeight: '500', // Lighter weight for better hierarchy
    color: Colors.light.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: SPACING * 0.75,
    gap: SPACING * 0.75,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING * 0.9,
    fontSize: 16,
  },
  saveButton: {
    padding: SPACING,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING, // Add margin to separate from the form
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});