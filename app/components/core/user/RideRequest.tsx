import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '../../ThemedText';
import { ThemedView } from '../../ThemedView';
import { Colors } from '../../../constants/Colors';
import { useColorScheme } from '../../../hooks/useColorScheme';
import apiService from '../../../services/apiService';
import { useApp } from '../../../contexts/AppContext';

interface RideRequestData {
  pickupAddress: string;
  pickupLatitude: string;
  pickupLongitude: string;
  destinationAddress: string;
  destinationLatitude: string;
  destinationLongitude: string;
  estimatedDistance?: string;
  estimatedDuration?: string;
}

interface RideRequestErrors {
  pickupAddress?: string;
  pickupLatitude?: string;
  pickupLongitude?: string;
  destinationAddress?: string;
  destinationLatitude?: string;
  destinationLongitude?: string;
}

interface RideRequestProps {
  onRequestCreated?: (requestData: any) => void;
}

export default function RideRequest({ onRequestCreated }: RideRequestProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state } = useApp();

  const [formData, setFormData] = useState<RideRequestData>({
    pickupAddress: '',
    pickupLatitude: '',
    pickupLongitude: '',
    destinationAddress: '',
    destinationLatitude: '',
    destinationLongitude: '',
    estimatedDistance: '',
    estimatedDuration: '',
  });

  const [errors, setErrors] = useState<RideRequestErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: RideRequestErrors = {};

    // Validate pickup location
    if (!formData.pickupAddress.trim()) {
      newErrors.pickupAddress = 'Pickup address is required';
    }
    if (!formData.pickupLatitude.trim()) {
      newErrors.pickupLatitude = 'Pickup latitude is required';
    } else if (isNaN(parseFloat(formData.pickupLatitude))) {
      newErrors.pickupLatitude = 'Pickup latitude must be a valid number';
    }
    if (!formData.pickupLongitude.trim()) {
      newErrors.pickupLongitude = 'Pickup longitude is required';
    } else if (isNaN(parseFloat(formData.pickupLongitude))) {
      newErrors.pickupLongitude = 'Pickup longitude must be a valid number';
    }

    // Validate destination location
    if (!formData.destinationAddress.trim()) {
      newErrors.destinationAddress = 'Destination address is required';
    }
    if (!formData.destinationLatitude.trim()) {
      newErrors.destinationLatitude = 'Destination latitude is required';
    } else if (isNaN(parseFloat(formData.destinationLatitude))) {
      newErrors.destinationLatitude = 'Destination latitude must be a valid number';
    }
    if (!formData.destinationLongitude.trim()) {
      newErrors.destinationLongitude = 'Destination longitude is required';
    } else if (isNaN(parseFloat(formData.destinationLongitude))) {
      newErrors.destinationLongitude = 'Destination longitude must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!state.currentUser) {
      Alert.alert('Error', 'Please login first to create a ride request');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      const rideRequestData = {
        userId: state.currentUser.id,
        pickupLocation: {
          address: formData.pickupAddress.trim(),
          coordinates: {
            latitude: parseFloat(formData.pickupLatitude),
            longitude: parseFloat(formData.pickupLongitude),
          },
        },
        destination: {
          address: formData.destinationAddress.trim(),
          coordinates: {
            latitude: parseFloat(formData.destinationLatitude),
            longitude: parseFloat(formData.destinationLongitude),
          },
        },
        ...(formData.estimatedDistance && {
          estimatedDistance: parseFloat(formData.estimatedDistance),
        }),
        ...(formData.estimatedDuration && {
          estimatedDuration: parseFloat(formData.estimatedDuration),
        }),
      };

      const response = await apiService.createRideRequest(rideRequestData);

      if (response.success && response.data) {
        // Clear form
        setFormData({
          pickupAddress: '',
          pickupLatitude: '',
          pickupLongitude: '',
          destinationAddress: '',
          destinationLatitude: '',
          destinationLongitude: '',
          estimatedDistance: '',
          estimatedDuration: '',
        });

        onRequestCreated?.(response.data);
        Alert.alert('Success', 'Ride request created successfully! Drivers will start bidding shortly.');
      } else {
        Alert.alert('Error', response.error || 'Failed to create ride request');
      }
    } catch (error) {
      console.error('Error creating ride request:', error);
      Alert.alert('Error', 'Failed to create ride request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof RideRequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof RideRequestErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      borderColor: theme.text + '20',
      color: theme.text,
    },
  ];

  const errorInputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      borderColor: '#ff4444',
      color: theme.text,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.formContainer, { backgroundColor: theme.background }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Request a Ride
        </ThemedText>
        
        <ThemedText style={[styles.subtitle, { color: theme.text }]}>
          Enter pickup and destination details
        </ThemedText>

        {/* Pickup Location Section */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Pickup Location
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText style={[styles.label, { color: theme.text }]}>
            Pickup Address *
          </ThemedText>
          <TextInput
            style={errors.pickupAddress ? errorInputStyle : inputStyle}
            value={formData.pickupAddress}
            onChangeText={(value) => updateFormData('pickupAddress', value)}
            placeholder="Enter pickup address"
            placeholderTextColor={theme.text + '60'}
          />
          {errors.pickupAddress && (
            <ThemedText style={styles.errorText}>{errors.pickupAddress}</ThemedText>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Latitude *
            </ThemedText>
            <TextInput
              style={errors.pickupLatitude ? errorInputStyle : inputStyle}
              value={formData.pickupLatitude}
              onChangeText={(value) => updateFormData('pickupLatitude', value)}
              placeholder="e.g., 40.7128"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
            {errors.pickupLatitude && (
              <ThemedText style={styles.errorText}>{errors.pickupLatitude}</ThemedText>
            )}
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Longitude *
            </ThemedText>
            <TextInput
              style={errors.pickupLongitude ? errorInputStyle : inputStyle}
              value={formData.pickupLongitude}
              onChangeText={(value) => updateFormData('pickupLongitude', value)}
              placeholder="e.g., -74.0060"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
            {errors.pickupLongitude && (
              <ThemedText style={styles.errorText}>{errors.pickupLongitude}</ThemedText>
            )}
          </View>
        </View>

        {/* Destination Section */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Destination
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText style={[styles.label, { color: theme.text }]}>
            Destination Address *
          </ThemedText>
          <TextInput
            style={errors.destinationAddress ? errorInputStyle : inputStyle}
            value={formData.destinationAddress}
            onChangeText={(value) => updateFormData('destinationAddress', value)}
            placeholder="Enter destination address"
            placeholderTextColor={theme.text + '60'}
          />
          {errors.destinationAddress && (
            <ThemedText style={styles.errorText}>{errors.destinationAddress}</ThemedText>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Latitude *
            </ThemedText>
            <TextInput
              style={errors.destinationLatitude ? errorInputStyle : inputStyle}
              value={formData.destinationLatitude}
              onChangeText={(value) => updateFormData('destinationLatitude', value)}
              placeholder="e.g., 40.7589"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
            {errors.destinationLatitude && (
              <ThemedText style={styles.errorText}>{errors.destinationLatitude}</ThemedText>
            )}
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Longitude *
            </ThemedText>
            <TextInput
              style={errors.destinationLongitude ? errorInputStyle : inputStyle}
              value={formData.destinationLongitude}
              onChangeText={(value) => updateFormData('destinationLongitude', value)}
              placeholder="e.g., -73.9851"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
            {errors.destinationLongitude && (
              <ThemedText style={styles.errorText}>{errors.destinationLongitude}</ThemedText>
            )}
          </View>
        </View>

        {/* Optional Fields */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Additional Info (Optional)
        </ThemedText>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Distance (km)
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={formData.estimatedDistance}
              onChangeText={(value) => updateFormData('estimatedDistance', value)}
              placeholder="e.g., 5.2"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              Duration (min)
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={formData.estimatedDuration}
              onChangeText={(value) => updateFormData('estimatedDuration', value)}
              placeholder="e.g., 15"
              placeholderTextColor={theme.text + '60'}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: '#007AFF' }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              Create Ride Request
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
