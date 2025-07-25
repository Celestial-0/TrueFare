import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  PLACEHOLDERS,
  VEHICLE_MAKES,
  VEHICLE_COLORS,
  DriverData,
  VehicleInfo,
} from '@/utils/driverConstants';
import { parseVehicleYear } from '@/utils/constants';

interface VehicleInfoManagementProps {
  currentDriver: DriverData | null;
  onBackToDashboard?: () => void;
  onVehicleUpdated?: (vehicleInfo: VehicleInfo) => void;
}

export default function VehicleInfoManagement({
  currentDriver,
  onBackToDashboard,
  onVehicleUpdated,
}: VehicleInfoManagementProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [isSaving, setIsSaving] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    make: '',
    model: '',
    year: undefined,
    color: '',
    licensePlate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.tint + '15',
    },
    backButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 16,
    },
    backButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    scrollContainer: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.tint + '50',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
    },
    inputError: {
      borderColor: '#dc3545',
    },
    picker: {
      borderWidth: 1,
      borderColor: theme.tint + '50',
      borderRadius: 8,
      backgroundColor: theme.background,
    },
    pickerError: {
      borderColor: '#dc3545',
    },
    errorText: {
      fontSize: 12,
      color: '#dc3545',
      marginTop: 4,
    },
    currentVehicleContainer: {
      backgroundColor: theme.tint + '10',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    currentVehicleTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    vehicleDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    vehicleDetailLabel: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.7,
    },
    vehicleDetailValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
    },
    saveButton: {
      backgroundColor: theme.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    saveButtonDisabled: {
      backgroundColor: '#ccc',
      opacity: 0.6,
    },
    saveButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoText: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.7,
      marginBottom: 20,
      fontStyle: 'italic',
    },
    requiredIndicator: {
      color: '#dc3545',
    },
  });

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!vehicleInfo.make?.trim()) {
      newErrors.make = 'Vehicle make is required';
    }

    if (!vehicleInfo.model?.trim()) {
      newErrors.model = 'Vehicle model is required';
    }

    if (vehicleInfo.year) {
      if (
        vehicleInfo.year < VALIDATION.MIN_VEHICLE_YEAR ||
        vehicleInfo.year > VALIDATION.MAX_VEHICLE_YEAR
      ) {
        newErrors.year = `Year must be between ${VALIDATION.MIN_VEHICLE_YEAR} and ${VALIDATION.MAX_VEHICLE_YEAR}`;
      }
    }

    if (vehicleInfo.licensePlate && !VALIDATION.LICENSE_PLATE_REGEX.test(vehicleInfo.licensePlate)) {
      newErrors.licensePlate = 'Please enter a valid license plate number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save vehicle info
  const saveVehicleInfo = async () => {
    if (!currentDriver?.driverId) {
      Alert.alert('Error', ERROR_MESSAGES.NO_DRIVER_LOGGED_IN);
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors and try again.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.UPDATE_VEHICLE_INFO(currentDriver.driverId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleInfo }),
        }
      );

      if (response.ok) {
        await response.json();
        Alert.alert('Success', SUCCESS_MESSAGES.VEHICLE_INFO_UPDATED);
        onVehicleUpdated?.(vehicleInfo);
        
        // Update the current driver's vehicle info
        if (currentDriver) {
          currentDriver.vehicleInfo = vehicleInfo;
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update vehicle information');
      }
    } catch (error) {
      console.error('Error updating vehicle info:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (currentDriver?.vehicleInfo) {
      setVehicleInfo({
        make: currentDriver.vehicleInfo.make || '',
        model: currentDriver.vehicleInfo.model || '',
        year: currentDriver.vehicleInfo.year || undefined,
        color: currentDriver.vehicleInfo.color || '',
        licensePlate: currentDriver.vehicleInfo.licensePlate || '',
      });
    }
  }, [currentDriver?.vehicleInfo]);

  if (!currentDriver) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>
            No driver logged in. Please login first.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToDashboard}>
            <Text style={[styles.backButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Information</Text>
        </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer}>
          {/* Current Vehicle Info */}
          {currentDriver.vehicleInfo && (
            <View style={styles.currentVehicleContainer}>
              <Text style={styles.currentVehicleTitle}>Current Vehicle</Text>
              
              <View style={styles.vehicleDetail}>
                <Text style={styles.vehicleDetailLabel}>Make:</Text>
                <Text style={styles.vehicleDetailValue}>
                  {currentDriver.vehicleInfo.make || 'Not specified'}
                </Text>
              </View>
              
              <View style={styles.vehicleDetail}>
                <Text style={styles.vehicleDetailLabel}>Model:</Text>
                <Text style={styles.vehicleDetailValue}>
                  {currentDriver.vehicleInfo.model || 'Not specified'}
                </Text>
              </View>
              
              <View style={styles.vehicleDetail}>
                <Text style={styles.vehicleDetailLabel}>Year:</Text>
                <Text style={styles.vehicleDetailValue}>
                  {currentDriver.vehicleInfo.year || 'Not specified'}
                </Text>
              </View>
              
              <View style={styles.vehicleDetail}>
                <Text style={styles.vehicleDetailLabel}>Color:</Text>
                <Text style={styles.vehicleDetailValue}>
                  {currentDriver.vehicleInfo.color || 'Not specified'}
                </Text>
              </View>
              
              <View style={styles.vehicleDetail}>
                <Text style={styles.vehicleDetailLabel}>License Plate:</Text>
                <Text style={styles.vehicleDetailValue}>
                  {currentDriver.vehicleInfo.licensePlate || 'Not specified'}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Update Vehicle Information</Text>
          <Text style={styles.infoText}>
            Keep your vehicle information up to date for better service.
          </Text>

          {/* Vehicle Make */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Vehicle Make <Text style={styles.requiredIndicator}>*</Text>
            </Text>
            <View style={[styles.picker, errors.make && styles.pickerError]}>
              <Picker
                selectedValue={vehicleInfo.make}
                onValueChange={(value) => {
                  setVehicleInfo(prev => ({ ...prev, make: value }));
                  if (errors.make) {
                    setErrors(prev => ({ ...prev, make: '' }));
                  }
                }}
              >
                <Picker.Item label="Select vehicle make" value="" />
                {VEHICLE_MAKES.map((make) => (
                  <Picker.Item key={make} label={make} value={make} />
                ))}
              </Picker>
            </View>
            {errors.make && <Text style={styles.errorText}>{errors.make}</Text>}
          </View>

          {/* Vehicle Model */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Vehicle Model <Text style={styles.requiredIndicator}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.model && styles.inputError]}
              placeholder={PLACEHOLDERS.VEHICLE_MODEL}
              value={vehicleInfo.model}
              onChangeText={(text) => {
                setVehicleInfo(prev => ({ ...prev, model: text }));
                if (errors.model) {
                  setErrors(prev => ({ ...prev, model: '' }));
                }
              }}
              placeholderTextColor={theme.text + '80'}
            />
            {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
          </View>

          {/* Vehicle Year */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Year</Text>
            <TextInput
              style={[styles.input, errors.year && styles.inputError]}
              placeholder={PLACEHOLDERS.VEHICLE_YEAR}
              value={vehicleInfo.year?.toString() || ''}
              onChangeText={(text) => {
                const year = parseVehicleYear(text);
                setVehicleInfo(prev => ({ ...prev, year }));
                if (errors.year) {
                  setErrors(prev => ({ ...prev, year: '' }));
                }
              }}
              keyboardType="numeric"
              placeholderTextColor={theme.text + '80'}
            />
            {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
          </View>

          {/* Vehicle Color */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Color</Text>
            <View style={[styles.picker, errors.color && styles.pickerError]}>
              <Picker
                selectedValue={vehicleInfo.color}
                onValueChange={(value) => {
                  setVehicleInfo(prev => ({ ...prev, color: value }));
                  if (errors.color) {
                    setErrors(prev => ({ ...prev, color: '' }));
                  }
                }}
              >
                <Picker.Item label="Select vehicle color" value="" />
                {VEHICLE_COLORS.map((color) => (
                  <Picker.Item key={color} label={color} value={color} />
                ))}
              </Picker>
            </View>
            {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
          </View>

          {/* License Plate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>License Plate Number</Text>
            <TextInput
              style={[styles.input, errors.licensePlate && styles.inputError]}
              placeholder={PLACEHOLDERS.VEHICLE_PLATE}
              value={vehicleInfo.licensePlate}
              onChangeText={(text) => {
                setVehicleInfo(prev => ({ ...prev, licensePlate: text.toUpperCase() }));
                if (errors.licensePlate) {
                  setErrors(prev => ({ ...prev, licensePlate: '' }));
                }
              }}
              autoCapitalize="characters"
              placeholderTextColor={theme.text + '80'}
            />
            {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={saveVehicleInfo}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[styles.saveButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>Save Vehicle Information</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  </SafeAreaView>
  );
}