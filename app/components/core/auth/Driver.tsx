import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { ThemedText } from '../../ThemedText';
import apiService from '../../../services/apiService';
import storageService from '../../../services/storageService';
import { useApp } from '../../../contexts/AppContext';

interface DriverLoginFormData {
  name: string;
  email: string;
  phone: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: string;
    licensePlate: string;
    color: string;
  };
}

interface DriverLoginFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleLicensePlate?: string;
  vehicleColor?: string;
}

interface LoginDriverProps {
  onLogin?: (driverData: DriverLoginFormData) => void;
  onRegister?: (driverData: DriverLoginFormData) => void;
  onSuccess?: () => void;
}

export default function LoginDriver({ onLogin, onRegister, onSuccess }: LoginDriverProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state, loginDriver, addNotification } = useApp();

  const [formData, setFormData] = useState<DriverLoginFormData>({
    name: '',
    email: '',
    phone: '',
    vehicleInfo: {
      make: '',
      model: '',
      year: '',
      licensePlate: '',
      color: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [errors, setErrors] = useState<DriverLoginFormErrors>({});
  
  // Animation values using useRef to prevent re-creation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Get current driver from app context
  const { currentDriver } = state;

  // Animate on mount
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Animate mode toggle
  const animateToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Check for existing driver data on component mount and auto-fill form
  const checkExistingSession = useCallback(async () => {
    try {
      // Check if a user is already logged in - if so, don't auto-login as driver
      const existingUserData = await storageService.getUserData();
      if (existingUserData) {
        console.log('User already logged in, skipping driver auto-login');
        return;
      }

      // If there's already a current driver in context, auto-fill the form
      if (currentDriver) {
        setFormData({
          name: currentDriver.name,
          email: currentDriver.email || '',
          phone: currentDriver.phone,
          vehicleInfo: currentDriver.vehicleInfo || {
            make: '',
            model: '',
            year: '',
            licensePlate: '',
            color: '',
          },
        });
        return;
      }

      // Otherwise check storage for existing driver data
      const existingDriverData = await storageService.getDriverData();
      if (existingDriverData) {
        // Auto-fill form with existing data for convenience
        setFormData({
          name: existingDriverData.name,
          email: existingDriverData.email || '',
          phone: existingDriverData.phone,
          vehicleInfo: existingDriverData.vehicleInfo || {
            make: '',
            model: '',
            year: '',
            licensePlate: '',
            color: '',
          },
        });
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  }, [currentDriver]);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const validateForm = (): boolean => {
    const newErrors: DriverLoginFormErrors = {};

    // For login mode, only validate phone
    if (isLoginMode) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // For registration mode, validate required fields only (name and phone)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Vehicle info validation (optional - only validate format if provided)
    if (formData.vehicleInfo.year.trim() && !/^\d{4}$/.test(formData.vehicleInfo.year)) {
      newErrors.vehicleYear = 'Please enter a valid year (e.g., 2020)';
    }

    // Email validation (optional but if provided, must be valid)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      if (isLoginMode) {
        // For login mode, call the login API endpoint
        const response = await apiService.loginDriver({
          phone: formData.phone.trim()
        });

        if (response.success && response.data) {
          // Store driver data locally using the backend response format
          const driverData = {
            id: response.data.driverId, // Backend returns driverId
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            status: response.data.status || 'offline', // Ensure status is always a string
            // Ensure all vehicleInfo properties are strings, even if empty
            vehicleInfo: {
              make: response.data.vehicleInfo?.make || '',
              model: response.data.vehicleInfo?.model || '',
              year: String(response.data.vehicleInfo?.year || ''),
              licensePlate: response.data.vehicleInfo?.licensePlate || '',
              color: response.data.vehicleInfo?.color || '',
            },
            lastLogin: new Date().toISOString(),
          };

          await storageService.storeDriverData(driverData);

          // Use app context to set driver state - this will handle socket connection
          await loginDriver(driverData);

          // AppContext handles socket connection and registration automatically
          console.log('Driver login successful, AppContext will handle socket connection');
          
          // Add success notification via app context
          addNotification('Driver login successful!');
          
          onLogin?.(formData);
          onSuccess?.();
          
          Alert.alert('Success', 'Driver login successful!');
        } else {
          // Handle specific login errors
          if (response.code === 'DRIVER_NOT_FOUND') {
            Alert.alert(
              'Driver Not Found', 
              'No driver account found with this phone number. Would you like to create an account?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Sign Up', 
                  style: 'default',
                  onPress: () => {
                    setIsLoginMode(false);
                    setErrors({});
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', response.error || 'Login failed. Please check your phone number.');
          }
        }
      } else {
        // Registration mode - call API
        const response = await apiService.registerDriver({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone,
          vehicleInfo: {
            make: formData.vehicleInfo.make || '',
            model: formData.vehicleInfo.model || '',
            year: formData.vehicleInfo.year || '',
            licensePlate: formData.vehicleInfo.licensePlate || '',
            color: formData.vehicleInfo.color || '',
          },
        });

        if (response.success && response.data) {
          // Store driver data locally using the backend response format
          const driverData = {
            id: response.data.driverId, // Backend returns driverId
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            status: response.data.status || 'offline', // Ensure status is always a string
            // Ensure all vehicleInfo properties are strings, even if empty
            vehicleInfo: {
              make: formData.vehicleInfo.make || '',
              model: formData.vehicleInfo.model || '',
              year: formData.vehicleInfo.year || '',
              licensePlate: formData.vehicleInfo.licensePlate || '',
              color: formData.vehicleInfo.color || '',
            },
            lastLogin: new Date().toISOString(),
          };

          await storageService.storeDriverData(driverData);

          // Use app context to set driver state - this will handle socket connection
          await loginDriver(driverData);

          // AppContext handles socket connection and registration automatically
          console.log('Driver registration successful, AppContext will handle socket connection');

          // Add success notification via app context
          addNotification('Driver profile created successfully!');

          onRegister?.(formData);
          onSuccess?.();
          
          Alert.alert('Success', 'Driver profile created successfully!');
        } else {
          // Check if the error is due to duplicate phone number
          if (response.code === 'DUPLICATE_DRIVER' || 
              (response.error && (
                response.error.includes('phone') || 
                response.error.includes('already exists')
              ))) {
            Alert.alert(
              'Phone Number Already Registered', 
              'This phone number is already registered as a driver. Would you like to login instead?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Login', 
                  style: 'default',
                  onPress: () => {
                    setIsLoginMode(true);
                    setFormData(prev => ({ 
                      ...prev, 
                      name: '', 
                      email: '', 
                      vehicleInfo: {
                        make: '',
                        model: '',
                        year: '',
                        licensePlate: '',
                        color: '',
                      }
                    }));
                    setErrors({});
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', response.error || 'Failed to register driver. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Check if the error message contains duplicate key information
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        Alert.alert(
          'Phone Number Already Registered', 
          'This phone number is already registered as a driver. Would you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Login', 
              style: 'default',
              onPress: () => {
                setIsLoginMode(true);
                setFormData(prev => ({ 
                  ...prev, 
                  name: '', 
                  email: '', 
                  vehicleInfo: {
                    make: '',
                    model: '',
                    year: '',
                    licensePlate: '',
                    color: '',
                  }
                }));
                setErrors({});
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to process request. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    // Trigger animation
    animateToggle();
    
    setIsLoginMode(!isLoginMode);
    setErrors({});
    // When switching to login mode, clear name and email but keep phone
    // When switching to registration mode, clear all fields for fresh start
    if (!isLoginMode) {
      // Switching to login mode - keep phone, clear others
      setFormData(prev => ({
        phone: prev.phone,
        name: '',
        email: '',
        vehicleInfo: {
          make: '',
          model: '',
          year: '',
          licensePlate: '',
          color: '',
        },
      }));
    } else {
      // Switching to registration mode - clear all fields
      setFormData({
        name: '',
        email: '',
        phone: '',
        vehicleInfo: {
          make: '',
          model: '',
          year: '',
          licensePlate: '',
          color: '',
        },
      });
    }
  };

  const updateFormData = (field: string, value: string, isVehicleInfo = false) => {
    setFormData(prev => {
      if (isVehicleInfo) {
        return {
          ...prev,
          vehicleInfo: {
            ...prev.vehicleInfo,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
    
    // Clear error when user starts typing
    const errorKey = isVehicleInfo ? `vehicle${field.charAt(0).toUpperCase() + field.slice(1)}` : field;
    if (errors[errorKey as keyof DriverLoginFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: undefined,
      }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
              ],
            }
          ]}
        >
          {/* Minimalistic Header */}
          <View style={styles.headerSection}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {isLoginMode ? 'Sign In' : 'Create Account'}
            </ThemedText>
            
            <ThemedText style={[styles.subtitle, { color: theme.text + '80' }]}>
              {isLoginMode 
                ? 'Enter your phone number to continue' 
                : 'Fill in your details to get started'
              }
            </ThemedText>

            {/* Simple Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.modeTogglePill,
                  isLoginMode && { borderBottomWidth: 2, borderBottomColor: theme.tint },
                ]}
                onPress={() => !isLoginMode && toggleMode()}
              >
                <Text style={[
                  styles.modeToggleText,
                  { color: isLoginMode ? theme.tint : theme.text + '60' }
                ]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modeTogglePill,
                  !isLoginMode && { borderBottomWidth: 2, borderBottomColor: theme.tint },
                ]}
                onPress={() => isLoginMode && toggleMode()}
              >
                <Text style={[
                  styles.modeToggleText,
                  { color: !isLoginMode ? theme.tint : theme.text + '60' }
                ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Minimalistic Form Fields */}
          <View style={styles.formFieldsContainer}>
            {/* Phone Input - Always show in login mode */}
            {isLoginMode && (
              <View style={styles.inputContainer}>
                <ThemedText style={[styles.label, { color: theme.text }]}>
                  Phone Number
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: theme.background,
                      borderColor: errors.phone ? '#ff6b6b' : theme.text + '20',
                      color: theme.text,
                    }
                  ]}
                  placeholder="Enter your phone number"
                  placeholderTextColor={theme.text + '60'}
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
            )}

            {/* Registration Fields - Only show when not in login mode */}
            {!isLoginMode && (
              <>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.label, { color: theme.text }]}>
                    Full Name
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.background,
                        borderColor: errors.name ? '#ff6b6b' : theme.text + '20',
                        color: theme.text,
                      }
                    ]}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.text + '60'}
                    value={formData.name}
                    onChangeText={(value) => updateFormData('name', value)}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.label, { color: theme.text }]}>
                    Phone Number
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.background,
                        borderColor: errors.phone ? '#ff6b6b' : theme.text + '20',
                        color: theme.text,
                      }
                    ]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={theme.text + '60'}
                    value={formData.phone}
                    onChangeText={(value) => updateFormData('phone', value)}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                  />
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.label, { color: theme.text }]}>
                    Email (Optional)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.background,
                        borderColor: errors.email ? '#ff6b6b' : theme.text + '20',
                        color: theme.text,
                      }
                    ]}
                    placeholder="Enter your email address"
                    placeholderTextColor={theme.text + '60'}
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Simplified Vehicle Information */}
                <View style={styles.sectionDivider}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                    Vehicle Details (Optional)
                  </ThemedText>
                </View>

                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleFieldHalf}>
                    <ThemedText style={[styles.label, { color: theme.text }]}>Make</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: theme.background,
                          borderColor: errors.vehicleMake ? '#ff6b6b' : theme.text + '20',
                          color: theme.text,
                        }
                      ]}
                      placeholder="Toyota"
                      placeholderTextColor={theme.text + '60'}
                      value={formData.vehicleInfo.make}
                      onChangeText={(value) => updateFormData('make', value, true)}
                      autoCapitalize="words"
                    />
                    {errors.vehicleMake && <Text style={styles.errorText}>{errors.vehicleMake}</Text>}
                  </View>

                  <View style={styles.vehicleFieldHalf}>
                    <ThemedText style={[styles.label, { color: theme.text }]}>Model</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: theme.background,
                          borderColor: errors.vehicleModel ? '#ff6b6b' : theme.text + '20',
                          color: theme.text,
                        }
                      ]}
                      placeholder="Camry"
                      placeholderTextColor={theme.text + '60'}
                      value={formData.vehicleInfo.model}
                      onChangeText={(value) => updateFormData('model', value, true)}
                      autoCapitalize="words"
                    />
                    {errors.vehicleModel && <Text style={styles.errorText}>{errors.vehicleModel}</Text>}
                  </View>
                </View>

                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleFieldHalf}>
                    <ThemedText style={[styles.label, { color: theme.text }]}>Year</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: theme.background,
                          borderColor: errors.vehicleYear ? '#ff6b6b' : theme.text + '20',
                          color: theme.text,
                        }
                      ]}
                      placeholder="2020"
                      placeholderTextColor={theme.text + '60'}
                      value={formData.vehicleInfo.year}
                      onChangeText={(value) => updateFormData('year', value, true)}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    {errors.vehicleYear && <Text style={styles.errorText}>{errors.vehicleYear}</Text>}
                  </View>

                  <View style={styles.vehicleFieldHalf}>
                    <ThemedText style={[styles.label, { color: theme.text }]}>Color</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: theme.background,
                          borderColor: errors.vehicleColor ? '#ff6b6b' : theme.text + '20',
                          color: theme.text,
                        }
                      ]}
                      placeholder="White"
                      placeholderTextColor={theme.text + '60'}
                      value={formData.vehicleInfo.color}
                      onChangeText={(value) => updateFormData('color', value, true)}
                      autoCapitalize="words"
                    />
                    {errors.vehicleColor && <Text style={styles.errorText}>{errors.vehicleColor}</Text>}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.label, { color: theme.text }]}>License Plate</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.background,
                        borderColor: errors.vehicleLicensePlate ? '#ff6b6b' : theme.text + '20',
                        color: theme.text,
                      }
                    ]}
                    placeholder="ABC-1234"
                    placeholderTextColor={theme.text + '60'}
                    value={formData.vehicleInfo.licensePlate}
                    onChangeText={(value) => updateFormData('licensePlate', value.toUpperCase(), true)}
                    autoCapitalize="characters"
                  />
                  {errors.vehicleLicensePlate && <Text style={styles.errorText}>{errors.vehicleLicensePlate}</Text>}
                </View>
              </>
            )}
          </View>

          {/* Minimalistic Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { 
                backgroundColor: isLoading ? theme.text + '40' : theme.tint,
                opacity: isLoading ? 0.7 : 1,
              }
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
                {isLoginMode ? 'Continue' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 52,
    width: '100%',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '400',
  },
  sectionDivider: {
    marginVertical: 32,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
  },
  vehicleFieldHalf: {
    flex: 0.48,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  // Legacy styles for compatibility
  formCard: {
    padding: 0,
  },
  iconContainer: {
    display: 'none',
  },
  iconText: {
    display: 'none',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputGroup: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  required: {
    color: '#ff6b6b',
    fontWeight: '700',
  },
  vehicleFieldsContainer: {
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 12,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  form: {
    marginBottom: 24,
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  driverStatusText: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'capitalize',
  },
  availableRidesText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
    marginTop: 2,
  },
  userTypeText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 2,
  },
  notificationsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notificationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notificationItem: {
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 13,
    opacity: 0.8,
  },
});
