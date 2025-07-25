import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { ThemedText } from '../../ThemedText';
import { useApp } from '../../../contexts/AppContext';
import apiService from '../../../services/apiService';
import storageService from '../../../services/storageService';
import { UserData } from '../../../utils/userConstants';

interface UserLoginFormData {
  phone: string;
  name: string;
  email?: string;
}

interface UserLoginFormErrors {
  phone?: string;
  name?: string;
  email?: string;
}

interface LoginUserProps {
  onLogin?: (userData: UserData) => void;
  onRegister?: (userData: UserData) => void;
  onSuccess?: () => void;
}

export default function LoginUser({ onLogin, onRegister, onSuccess }: LoginUserProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { state, loginUser, addNotification } = useApp();
  
  const [formData, setFormData] = useState<UserLoginFormData>({
    phone: '',
    name: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [errors, setErrors] = useState<UserLoginFormErrors>({});
  
  // Animation values using useRef to prevent re-creation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Get current user from app context
  const { currentUser } = state;

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

  // Check for existing user data on component mount and auto-fill form
  const checkExistingSession = useCallback(async () => {
    try {
      // Check if a driver is already logged in - if so, don't auto-login as user
      const existingDriverData = await storageService.getDriverData();
      if (existingDriverData) {
        console.log('Driver already logged in, skipping user auto-login');
        return;
      }

      // If there's already a current user in context, auto-fill the form
      if (currentUser) {
        setFormData({
          name: currentUser.name,
          email: currentUser.email || '',
          phone: currentUser.phone,
        });
        return;
      }

      // Otherwise check storage for existing user data
      const existingUserData = await storageService.getUserData();
      if (existingUserData) {
        // Auto-fill form with existing data for convenience
        setFormData({
          name: existingUserData.name,
          email: existingUserData.email || '',
          phone: existingUserData.phone,
        });
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const validateForm = (): boolean => {
    const newErrors: UserLoginFormErrors = {};

    // Validate phone number
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // In registration mode, validate name
    if (!isLoginMode) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required for registration';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

      // Validate email if provided
      if (formData.email && formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          newErrors.email = 'Please enter a valid email address';
        }
      }
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
        // For login mode, only send phone number
        const loginData = {
          phone: formData.phone.trim()
        };

        const response = await apiService.loginUser(loginData);

        if (response.success && response.data) {
          // Use AppContext loginUser function to handle login and socket connection
          const userData = {
            id: response.data.userId, // Backend returns userId
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            lastLogin: new Date().toISOString(),
          };

          // Call AppContext loginUser function - this handles storage and socket connection
          await loginUser(userData, false); // false = existing user login
          
          // Pass the correctly structured user data to parent component
          const userDataForParent = {
            userId: response.data.userId,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
          };
          
          onLogin?.(userDataForParent);
          onSuccess?.();
          
          // Add success notification via app context
          addNotification('Login successful! You can now request rides.');
          
          Alert.alert('Success', 'Login successful! You can now request rides.');
        } else {
          // Handle specific login errors
          if (response.code === 'USER_NOT_FOUND') {
            Alert.alert(
              'User Not Found', 
              'No account found with this phone number. Would you like to create an account?',
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
        // Registration mode - prepare registration data
        const registrationData = {
          phone: formData.phone.trim(),
          name: formData.name.trim(),
          ...(formData.email && { email: formData.email.trim() })
        };

        const response = await apiService.registerUser(registrationData);

        if (response.success && response.data) {
          // Use AppContext loginUser function to handle registration and socket connection
          const userData = {
            id: response.data.userId, // Backend returns userId
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            lastLogin: new Date().toISOString(),
          };

          // Call AppContext loginUser function - this handles storage and socket connection
          await loginUser(userData, true); // true = new user registration

          // Pass the correctly structured user data to parent component
          const userDataForParent = {
            userId: response.data.userId,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
          };

          onRegister?.(userDataForParent);
          onSuccess?.();
          
          // Add success notification via app context
          addNotification('Registration successful! You can now request rides.');
          
          Alert.alert('Success', 'Registration successful! You can now request rides.');
        } else {
          // Handle specific registration errors
          if (response.code === 'USER_ALREADY_EXISTS') {
            Alert.alert(
              'User Already Exists',
              'An account with this phone number already exists. Would you like to login instead?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Login', 
                  style: 'default',
                  onPress: () => {
                    setIsLoginMode(true);
                    setErrors({});
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', response.error || 'Registration failed. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('User authentication error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
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
        email: ''
      }));
    } else {
      // Switching to registration mode - clear all for fresh start
      setFormData({
        phone: '',
        name: '',
        email: ''
      });
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field as keyof UserLoginFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  form: {
    marginBottom: 24,
  },
  required: {
    color: '#ff6b6b',
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 16,
  },
  toggleLink: {
    fontWeight: '500',
  },
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
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
  userStatusText: {
    fontSize: 12,
    opacity: 0.7,
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
