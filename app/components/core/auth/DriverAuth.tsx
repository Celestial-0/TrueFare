import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { useApp } from '@/contexts/AppContext';
import { VEHICLE_TYPES } from '@/utils/constants';
import { storageService } from '@/services/storage.service';

// Combined form data interface
interface DriverFormData {
  phone: string;
  name: string;
  email?: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  color: string;
  vehicleType: keyof typeof VEHICLE_TYPES;
}

// Form errors interface
interface DriverFormErrors {
  phone?: string;
  name?: string;
  email?: string;
  make?: string;
  model?: string;
  year?: string;
  licensePlate?: string;
  color?: string;
  vehicleType?: string;
}

type AuthPage = 'login' | 'personal' | 'vehicle';

interface LoginDriverProps {
  onSuccess?: () => void;
}

export default function LoginDriver({ onSuccess }: LoginDriverProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { loginDriver, registerDriver, addNotification } = useApp();

  const [currentPage, setCurrentPage] = useState<AuthPage>('login');
  const [formData, setFormData] = useState<Partial<DriverFormData>>({
    phone: '',
    name: '',
    email: '',
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    color: '',
    vehicleType: 'TAXI',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [errors, setErrors] = useState<DriverFormErrors>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;

  const { currentDriver } = useApp();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const checkExistingSession = useCallback(async () => {
    try {
      const existingUserData = await storageService.getUserData();
      if (existingUserData) {
        return;
      }
      const getVehicleTypeKey = (value: string): keyof typeof VEHICLE_TYPES => {
        const entry = Object.entries(VEHICLE_TYPES).find(([_, v]) => v === value);
        return (entry?.[0] as keyof typeof VEHICLE_TYPES) || 'TAXI';
      };
      const driverSource = currentDriver || await storageService.getDriverData();
      if (driverSource && driverSource.vehicleInfo) {
        setFormData({
          name: driverSource.name,
          email: driverSource.email || '',
          phone: driverSource.phone,
          ...driverSource.vehicleInfo,
          year: driverSource.vehicleInfo.year?.toString() || '',
          vehicleType: getVehicleTypeKey(driverSource.vehicleInfo.type || 'TAXI'),
        });
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  }, [currentDriver]);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const validateForm = (page: AuthPage): boolean => {
    const newErrors: DriverFormErrors = {};

    if (page === 'personal' || page === 'login') {
      if (!formData.phone?.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number';
      }
      if (!isLoginMode) {
        if (!formData.name?.trim()) {
          newErrors.name = 'Name is required for registration';
        }
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
      }
    }

    if (page === 'vehicle') {
      // For vehicle page, validate all registration fields
      if (!isLoginMode) {
        if (!formData.name?.trim()) {
          newErrors.name = 'Name is required for registration';
        }
        if (!formData.phone?.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
      }
      if (!formData.make?.trim()) {
        newErrors.make = 'Vehicle make is required';
      }
      if (!formData.model?.trim()) {
        newErrors.model = 'Vehicle model is required';
      }
      if (!formData.year?.trim()) {
        newErrors.year = 'Vehicle year is required';
      } else if (!/^\d{4}$/.test(formData.year)) {
        newErrors.year = 'Please enter a valid year';
      }
      if (!formData.licensePlate?.trim()) {
        newErrors.licensePlate = 'License plate is required';
      }
      if (!formData.color?.trim()) {
        newErrors.color = 'Vehicle color is required';
      }
      if (!formData.vehicleType) {
        newErrors.vehicleType = 'Vehicle type is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const animatePageTransition = (page: AuthPage) => {
    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(page);
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = async () => {
    if (!validateForm(isLoginMode ? 'login' : 'vehicle')) return;

    setIsLoading(true);

    try {
      const normalizedPhone = formData.phone!.replace(/\s+/g, '').trim();
      
      let result;
      if (isLoginMode) {
        // Login mode - only send phone
        result = await loginDriver({
          phone: normalizedPhone,
        });
      } else {
        // Signup mode - send all registration data including vehicle info
        // Map frontend vehicle type to backend format
        const vehicleTypeMap: { [key: string]: string } = {
          'Taxi': 'TAXI',
          'AC_Taxi': 'AC_TAXI',
          'Bike': 'BIKE',
          'EBike': 'EBIKE',
          'ERiksha': 'ERICKSHAW',
          'Auto': 'AUTO'
        };

        result = await registerDriver({
          phone: normalizedPhone,
          name: formData.name!.trim(),
          email: formData.email?.trim() || undefined,
          vehicleInfo: {
            make: formData.make!.trim(),
            model: formData.model!.trim(),
            year: formData.year!.toString(), // Backend expects year as string
            licensePlate: formData.licensePlate!.trim(),
            color: formData.color!.trim(),
            vehicleType: vehicleTypeMap[formData.vehicleType!] || formData.vehicleType!,
          },
        });
      }

      if (result) {
        const successMessage = isLoginMode ? 'Login successful!' : 'Registration successful!';
        addNotification({ type: 'success', message: successMessage, createdAt: new Date() });
        Alert.alert('Success', successMessage);
        onSuccess?.();
      } else {
        Alert.alert('Authentication Failed', 'Please check your details and try again.');
      }
    } catch (error: any) {
      console.error('Login/Registration error:', error);
      if (error.code === 'DRIVER_ALREADY_EXISTS') {
        Alert.alert(
          'Driver Already Exists',
          'An account with this phone number already exists. Would you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Login',
              style: 'default',
              onPress: () => {
                setIsLoginMode(true);
                setErrors({});
                animatePageTransition('login');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    if (isLoginMode) {
      animatePageTransition('personal');
    } else {
      animatePageTransition('login');
    }
  };

  const handleInputChange = (field: keyof DriverFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderLoginPage = () => (
    <>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Phone Number</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.phone ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="Enter your phone number"
          placeholderTextColor={theme.text + '60'}
          value={formData.phone}
          onChangeText={value => handleInputChange('phone', value)}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: isLoading ? theme.text + '40' : theme.tint, opacity: isLoading ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderPersonalInfoPage = () => (
    <>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Full Name</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.name ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="Enter your full name"
          placeholderTextColor={theme.text + '60'}
          value={formData.name}
          onChangeText={value => handleInputChange('name', value)}
          autoCapitalize="words"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Phone Number</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.phone ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="Enter your phone number"
          placeholderTextColor={theme.text + '60'}
          value={formData.phone}
          onChangeText={value => handleInputChange('phone', value)}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Email (Optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.email ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="Enter your email address"
          placeholderTextColor={theme.text + '60'}
          value={formData.email}
          onChangeText={value => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: isLoading ? theme.text + '40' : theme.tint, opacity: isLoading ? 0.7 : 1 }]}
        onPress={() => {
          if (validateForm('personal')) {
            animatePageTransition('vehicle');
          }
        }}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
          Next
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderVehicleInfoPage = () => (
    <>
      <ThemedText style={[styles.title, { color: theme.text, fontSize: 22, marginTop: 20, marginBottom: 40 }]}>Vehicle Information</ThemedText>
      
      

      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Vehicle Make</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.make ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="e.g., Toyota"
          placeholderTextColor={theme.text + '60'}
          value={formData.make}
          onChangeText={value => handleInputChange('make', value)}
          autoCapitalize="words"
        />
        {errors.make && <Text style={styles.errorText}>{errors.make}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Vehicle Model</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.model ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="e.g., Camry"
          placeholderTextColor={theme.text + '60'}
          value={formData.model}
          onChangeText={value => handleInputChange('model', value)}
          autoCapitalize="words"
        />
        {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Vehicle Year</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.year ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="e.g., 2021"
          placeholderTextColor={theme.text + '60'}
          value={formData.year}
          onChangeText={value => handleInputChange('year', value)}
          keyboardType="numeric"
          maxLength={4}
        />
        {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>License Plate</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.licensePlate ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="e.g., ABC123"
          placeholderTextColor={theme.text + '60'}
          value={formData.licensePlate}
          onChangeText={value => handleInputChange('licensePlate', value)}
          autoCapitalize="characters"
        />
        {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Vehicle Color</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: errors.color ? '#ff6b6b' : theme.text + '20', color: theme.text }]}
          placeholder="e.g., Red"
          placeholderTextColor={theme.text + '60'}
          value={formData.color}
          onChangeText={value => handleInputChange('color', value)}
          autoCapitalize="words"
        />
        {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>Vehicle Type</ThemedText>
        <View style={styles.vehicleTypeContainer}>
          {Object.entries(VEHICLE_TYPES).map(([key, value]) => {
            const isSelected = formData.vehicleType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.vehicleTypeOption,
                  {
                    backgroundColor: isSelected ? theme.tint : theme.background,
                    borderColor: isSelected ? theme.tint : theme.text + '40',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => handleInputChange('vehicleType', key)}
              >
                <Text
                  style={[
                    styles.vehicleTypeText,
                    { color: isSelected ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.vehicleType && <Text style={styles.errorText}>{errors.vehicleType}</Text>}
      </View>
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.background, borderColor: theme.text + '40' }]}
          onPress={() => animatePageTransition('personal')}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isLoading ? theme.text + '40' : theme.tint, flex: 1, opacity: isLoading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
              Complete Registration
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
    >
      <Animated.View
        style={[
          styles.formContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.headerSection}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {isLoginMode ? 'Driver Sign In' : 'Create Driver Account'}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.text + '80' }]}>
            {isLoginMode ? 'Enter your phone number to continue' : 'Fill in your details to get started'}
          </ThemedText>
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeTogglePill, isLoginMode && { borderBottomWidth: 2, borderBottomColor: theme.tint }]}
              onPress={() => !isLoginMode && handleToggleMode()}
            >
              <Text style={[styles.modeToggleText, { color: isLoginMode ? theme.tint : theme.text + '60' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTogglePill, !isLoginMode && { borderBottomWidth: 2, borderBottomColor: theme.tint }]}
              onPress={() => isLoginMode && handleToggleMode()}
            >
              <Text style={[styles.modeToggleText, { color: !isLoginMode ? theme.tint : theme.text + '60' }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Animated.View style={[styles.formFieldsContainer, { opacity: formOpacity }]}>
          {currentPage === 'login' && renderLoginPage()}
          {currentPage === 'personal' && renderPersonalInfoPage()}
          {currentPage === 'vehicle' && renderVehicleInfoPage()}
        </Animated.View>
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formContainer: {
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontWeight: '400',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
  },
  modeTogglePill: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formFieldsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  vehicleTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});