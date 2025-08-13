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
import { storageService } from '@/services/storage.service';
import { User } from '@/types/types';

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
  onLogin?: (userData: User) => void;
  onRegister?: (userData: User) => void;
  onSuccess?: () => void;
}

export default function LoginUser({ onLogin, onRegister, onSuccess }: LoginUserProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { loginUser, registerUser, addNotification } = useApp();
  
  const [formData, setFormData] = useState<UserLoginFormData>({
    phone: '',
    name: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [errors, setErrors] = useState<UserLoginFormErrors>({});
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const { currentUser } = useApp();

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
      const existingDriverData = await storageService.getDriverData();
      if (existingDriverData) {
        console.log('Driver already logged in, skipping user auto-login');
        return;
      }

      if (currentUser) {
        setFormData({
          name: currentUser.name,
          email: currentUser.email || '',
          phone: currentUser.phone,
        });
        return;
      }

      const existingUserData = await storageService.getUserData();
      if (existingUserData) {
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

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!isLoginMode) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required for registration';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

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
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const normalizedPhone = formData.phone.replace(/\s+/g, '').trim();
      
      let result;
      if (isLoginMode) {
        // Login mode - only send phone
        result = await loginUser({
          phone: normalizedPhone,
        });
      } else {
        // Signup mode - send all registration data
        result = await registerUser({
          phone: normalizedPhone,
          name: formData.name,
          email: formData.email || undefined,
        });
      }

      if (result) {
        const successMessage = isLoginMode ? 'Login successful!' : 'Registration successful!';
        addNotification({
          type: 'success', message: successMessage,
          createdAt: new Date()
        });
        Alert.alert('Success', successMessage);
        onSuccess?.();
        if (isLoginMode) {
          onLogin?.(result);
        } else {
          onRegister?.(result);
        }
      } else {
        Alert.alert('Authentication Failed', 'Please check your details and try again.');
      }
    } catch (error: any) {
      console.error('Login/Registration error:', error);
      if (error.code === 'USER_ALREADY_EXISTS') {
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
        Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
  };

  const handleInputChange = (field: keyof UserLoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Helper to render a consistent text input field
  const renderInput = (
    label: string,
    field: keyof UserLoginFormData,
    placeholder: string,
    keyboardType: 'phone-pad' | 'default' | 'email-address' = 'default',
    autoCapitalize: 'none' | 'words' | 'sentences' | 'characters' = 'none'
  ) => (
    <View style={styles.inputContainer}>
      <ThemedText style={[styles.label, { color: theme.text }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: theme.background,
            borderColor: errors[field] ? '#ff6b6b' : theme.text + '20',
            color: theme.text,
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.text + '60'}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
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
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.headerSection}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {isLoginMode ? 'Welcome Back!' : 'Create Account'}
          </ThemedText>
          
          <ThemedText style={[styles.subtitle, { color: theme.text + '80' }]}>
            {isLoginMode 
              ? 'Enter your phone number to sign in' 
              : 'Fill in your details to get started'
            }
          </ThemedText>

          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.modeTogglePill,
                isLoginMode && { borderBottomWidth: 2, borderBottomColor: theme.tint },
              ]}
              onPress={() => !isLoginMode && handleToggleMode()}
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
              onPress={() => isLoginMode && handleToggleMode()}
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

        <View style={styles.formFieldsContainer}>
          {!isLoginMode && renderInput('Full Name', 'name', 'Enter your full name', 'default', 'words')}
          {renderInput('Phone Number', 'phone', 'Enter your phone number', 'phone-pad')}
          {!isLoginMode && renderInput('Email (Optional)', 'email', 'Enter your email address', 'email-address')}
        </View>

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
            <ActivityIndicator color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} size="small" />
          ) : (
            <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
              {isLoginMode ? 'Continue' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>
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
    marginBottom: 0,
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