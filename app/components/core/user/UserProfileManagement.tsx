import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  VALIDATION,
  PLACEHOLDERS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  UserData,
} from '@/utils/userConstants';

interface UserProfileManagementProps {
  currentUser: UserData | null;
  onProfileUpdated?: (updatedUser: UserData) => void;
  onLogout?: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  defaultAddress: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  defaultAddress?: string;
}

export default function UserProfileManagement({ 
  currentUser, 
  onProfileUpdated,
  onLogout 
}: UserProfileManagementProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    defaultAddress: '',
  });
  
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    defaultAddress: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadUserProfile = useCallback(async () => {
    if (!currentUser?.userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.USER_PROFILE(currentUser.userId)}`
      );
      const data = await response.json();

      if (data.success) {
        const profileData = {
          name: data.data.name || currentUser.name || '',
          email: data.data.email || currentUser.email || '',
          phone: data.data.phone || currentUser.phone || '',
          defaultAddress: data.data.defaultLocation?.address || '',
        };
        
        setFormData(profileData);
        setOriginalData(profileData);
      } else {
        // Use current user data as fallback
        const fallbackData = {
          name: currentUser.name || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          defaultAddress: currentUser.defaultLocation?.address || '',
        };
        
        setFormData(fallbackData);
        setOriginalData(fallbackData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      
      // Use current user data as fallback
      const fallbackData = {
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        defaultAddress: currentUser.defaultLocation?.address || '',
      };
      
      setFormData(fallbackData);
      setOriginalData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser, loadUserProfile]);

  useEffect(() => {
    // Check if form data has changed
    const changed = Object.keys(formData).some(
      key => formData[key as keyof ProfileFormData] !== originalData[key as keyof ProfileFormData]
    );
    setHasChanges(changed);
  }, [formData, originalData]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < VALIDATION.MIN_NAME_LENGTH) {
      newErrors.name = `Name must be at least ${VALIDATION.MIN_NAME_LENGTH} characters`;
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!VALIDATION.PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate email (optional but check format if provided)
    if (formData.email.trim() && !VALIDATION.EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!currentUser?.userId) {
      Alert.alert('Error', ERROR_MESSAGES.NO_USER_LOGGED_IN);
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      };

      if (formData.email.trim()) {
        updateData.email = formData.email.trim();
      }

      if (formData.defaultAddress.trim()) {
        updateData.defaultLocation = {
          address: formData.defaultAddress.trim(),
          coordinates: {
            latitude: 40.7128, // Demo coordinates
            longitude: -74.0060,
          },
        };
      }

      // In a real app, this would be a PUT/PATCH request to update profile
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.USER_PROFILE(currentUser.userId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (data.success || response.status === 404) {
        // Update successful or endpoint doesn't exist (demo mode)
        const updatedUser: UserData = {
          ...currentUser,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          defaultLocation: formData.defaultAddress.trim() ? {
            address: formData.defaultAddress.trim(),
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060,
            },
          } : undefined,
        };

        setOriginalData({ ...formData });
        setIsEditing(false);
        onProfileUpdated?.(updatedUser);
        
        Alert.alert('Success', SUCCESS_MESSAGES.PROFILE_UPDATED);
      } else {
        Alert.alert('Error', data.message || ERROR_MESSAGES.GENERAL_ERROR);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setFormData({ ...originalData });
              setIsEditing(false);
              setErrors({});
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => onLogout?.(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Demo', 'Account deletion is not implemented in demo mode');
          },
        },
      ]
    );
  };

  if (!currentUser) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noUserText}>
          Please login to view profile
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.title}>User Profile</ThemedText>

          {/* User ID Display */}
          <ThemedView style={[styles.userIdContainer, { borderColor: theme.text }]}>
            <ThemedText style={[styles.userIdLabel, { color: colorScheme === 'dark' ? '#6c757d' : theme.text }]}>User ID</ThemedText>
            <ThemedText style={[styles.userIdValue, { color: colorScheme === 'dark' ? '#6c757d' : theme.text }]}>{currentUser.userId}</ThemedText>
          </ThemedView>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.tint} />
              <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
            </View>
          ) : (
            <>
              {/* Name Field */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Full Name *</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.name ? '#ff4444' : theme.text,
                      backgroundColor: isEditing ? theme.background : '#f8f9fa',
                      color: colorScheme === 'dark' ? '#6c757d' : theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.USER_NAME}
                  placeholderTextColor={theme.text + '80'}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  editable={isEditing}
                />
                {errors.name && (
                  <ThemedText style={styles.errorText}>{errors.name}</ThemedText>
                )}
              </View>

              {/* Phone Field */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Phone Number *</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.phone ? '#ff4444' : theme.text,
                      backgroundColor: isEditing ? theme.background : '#f8f9fa',
                      color: colorScheme === 'dark' ? '#6c757d' : theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.USER_PHONE}
                  placeholderTextColor={theme.text + '80'}
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                  editable={isEditing}
                />
                {errors.phone && (
                  <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>
                )}
              </View>

              {/* Email Field */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Email Address</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.email ? '#ff4444' : theme.text,
                      backgroundColor: isEditing ? theme.background : '#f8f9fa',
                      color: colorScheme === 'dark' ? '#6c757d' : theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.USER_EMAIL}
                  placeholderTextColor={colorScheme === 'dark' ? '#6c757d' : theme.text + '80'}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isEditing}
                />
                {errors.email && (
                  <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
                )}
              </View>

              {/* Default Address Field */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Default Address</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.defaultAddress ? '#ff4444' : theme.text,
                      backgroundColor: isEditing ? theme.background : '#f8f9fa',
                      color: colorScheme === 'dark' ? '#6c757d' : theme.text,
                    }
                  ]}
                  placeholder={PLACEHOLDERS.USER_ADDRESS}
                  placeholderTextColor={colorScheme === 'dark' ? '#6c757d' : theme.text + '80'}
                  value={formData.defaultAddress}
                  onChangeText={(text) => handleInputChange('defaultAddress', text)}
                  multiline
                  numberOfLines={2}
                  editable={isEditing}
                />
                {errors.defaultAddress && (
                  <ThemedText style={styles.errorText}>{errors.defaultAddress}</ThemedText>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {!isEditing ? (
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colorScheme === 'dark' ? '#6c757d' : theme.tint  }]}
                    onPress={() => setIsEditing(true)}
                  >
                    <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.editingButtons}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: '#6c757d' }]}
                      onPress={handleCancel}
                    >
                      <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        { 
                          backgroundColor: hasChanges ? theme.tint : '#ccc',
                          opacity: isLoading ? 0.7 : 1,
                        }
                      ]}
                      onPress={handleSave}
                      disabled={!hasChanges || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Other Actions */}
              <View style={styles.otherActionsContainer}>
                <TouchableOpacity
                  style={[styles.logoutButton, { backgroundColor: '#ffc107' }]}
                  onPress={handleLogout}
                >
                  <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: '#dc3545' }]}
                  onPress={handleDeleteAccount}
                >
                  <ThemedText style={styles.deleteButtonText}>Delete Account</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Required Fields Note */}
              <ThemedText style={styles.requiredNote}>
                * Required fields
              </ThemedText>
            </>
          )}
        </ThemedView>
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
    padding: 20,
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
    marginBottom: 24,
  },
  userIdContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
  },
  userIdLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  userIdValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  editButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  otherActionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  logoutButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requiredNote: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noUserText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    opacity: 0.7,
  },
});