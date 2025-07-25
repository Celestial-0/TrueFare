import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import ProfileInput from "./ProfileInput";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  VALIDATION,
  PLACEHOLDERS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  UserData,
  DEFAULT_COORDINATES,
} from "@/utils/userConstants";
import { userApiService, UserProfileUpdateData } from "@/services/userApiService";

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

export default function UserProfileManagement({
  currentUser,
  onProfileUpdated,
  onLogout,
}: UserProfileManagementProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      defaultAddress: "",
    },
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form validation rules
  const validationRules = {
    name: {
      required: "Name is required",
      minLength: {
        value: VALIDATION.MIN_NAME_LENGTH,
        message: `Name must be at least ${VALIDATION.MIN_NAME_LENGTH} characters`,
      },
    },
    phone: {
      required: "Phone number is required",
      pattern: {
        value: VALIDATION.PHONE_REGEX,
        message: "Please enter a valid phone number",
      },
    },
    email: {
      pattern: {
        value: VALIDATION.EMAIL_REGEX,
        message: "Please enter a valid email address",
      },
    },
  };

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
      shadowColor: "#001111",
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
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 24,
    },
    userIdContainer: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
      backgroundColor: isEditing ? theme.background : theme.inputBackground,
      borderColor: theme.inputBorder,
    },
    userIdLabel: {
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 4,
      opacity: 0.7,
    },
    userIdValue: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "monospace",
    },
    loadingContainer: {
      alignItems: "center",
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    buttonContainer: {
      marginTop: 16,
      marginBottom: 24,
    },
    editButton: {
      borderRadius: 8,
      paddingVertical: 16,
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? theme.secondary : theme.tint,
    },
    editButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    editingButtons: {
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 16,
      alignItems: "center",
      backgroundColor: theme.secondary,
    },
    cancelButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    saveButton: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 16,
      alignItems: "center",
    },
    saveButtonText: {
      color: "#000000",
      fontSize: 16,
      fontWeight: "600",
    },
    otherActionsContainer: {
      gap: 12,
      marginBottom: 24,
    },
    changePasswordButton: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: theme.tint,
      borderWidth: 1,
      borderColor: theme.tint,
    },
    changePasswordButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    logoutButton: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: theme.warning,
    },
    logoutButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    deleteButton: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: theme.danger,
    },
    deleteButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    requiredNote: {
      fontSize: 12,
      opacity: 0.6,
      textAlign: "center",
      fontStyle: "italic",
    },
    noUserText: {
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
      opacity: 0.7,
    },
    addressTodoContainer: {
      marginBottom: 4,
    },
    todoComment: {
      fontSize: 12,
      color: theme.secondary,
      fontStyle: "italic",
    },
  });
  const loadUserProfile = useCallback(async () => {
    if (!currentUser?.userId) return;

    setIsLoading(true);
    try {
      const response = await userApiService.getUserProfile(currentUser.userId);

      if (response.success) {
        const profileData = {
          name: response.data?.name || currentUser.name || "",
          email: response.data?.email || currentUser.email || "",
          phone: response.data?.phone || currentUser.phone || "",
          defaultAddress: response.data?.defaultLocation?.address || "",
        };

        reset(profileData);
      } else {
        // Use current user data as fallback
        const fallbackData = {
          name: currentUser.name || "",
          email: currentUser.email || "",
          phone: currentUser.phone || "",
          defaultAddress: currentUser.defaultLocation?.address || "",
        };

        reset(fallbackData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);

      // Use current user data as fallback
      const fallbackData = {
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        defaultAddress: currentUser.defaultLocation?.address || "",
      };

      reset(fallbackData);
      
      Toast.show({
        type: 'error',
        text1: 'Failed to load profile',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, reset]);

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser, loadUserProfile]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser?.userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: ERROR_MESSAGES.NO_USER_LOGGED_IN,
      });
      return;
    }

    try {
      const updateData: UserProfileUpdateData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
      };

      if (data.email.trim()) {
        updateData.email = data.email.trim();
      }

      if (data.defaultAddress.trim()) {
        updateData.defaultLocation = {
          address: data.defaultAddress.trim(),
          coordinates: DEFAULT_COORDINATES,
        };
      }

      const response = await userApiService.updateUserProfile(
        currentUser.userId,
        updateData
      );

      if (response.success || response.message?.includes('demo mode')) {
        // Update successful or endpoint doesn't exist (demo mode)
        const updatedUser: UserData = {
          ...currentUser,
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email.trim() || undefined,
          defaultLocation: data.defaultAddress.trim()
            ? {
                address: data.defaultAddress.trim(),
                coordinates: DEFAULT_COORDINATES,
              }
            : undefined,
        };

        setIsEditing(false);
        onProfileUpdated?.(updatedUser);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: SUCCESS_MESSAGES.PROFILE_UPDATED,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || ERROR_MESSAGES.GENERAL_ERROR,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR,
      });
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              reset();
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleChangePassword = () => {
    Toast.show({
      type: 'info',
      text1: 'Change Password',
      text2: 'This feature will be available soon',
    });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          onLogout?.();
          Toast.show({
            type: 'success',
            text1: 'Logged out',
            text2: 'You have been successfully logged out',
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Toast.show({
              type: 'info',
              text1: 'Demo Mode',
              text2: 'Account deletion is not implemented in demo mode',
            });
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.title}>User Profile</ThemedText>

          {/* User ID Display */}
          <ThemedView
            style={styles.userIdContainer}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`User ID: ${currentUser.userId}`}
          >
            <ThemedText
              style={[
                styles.userIdLabel,
                { color: colorScheme === "dark" ? theme.disabledText : theme.text },
              ]}
            >
              User ID
            </ThemedText>
            <ThemedText
              style={[
                styles.userIdValue,
                { color: colorScheme === "dark" ? theme.disabledText : theme.text },
              ]}
            >
              {currentUser.userId}
            </ThemedText>
          </ThemedView>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.tint} />
              <ThemedText style={styles.loadingText}>
                Loading profile...
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Name Field */}
              <Controller
                control={control}
                name="name"
                rules={validationRules.name}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <ProfileInput
                    label="Full Name"
                    isRequired={true}
                    value={value}
                    onChangeText={onChange}
                    placeholder={PLACEHOLDERS.USER_NAME}
                    editable={isEditing}
                    error={error?.message}
                    accessibilityLabel="Full name input field"
                  />
                )}
              />

              {/* Phone Field */}
              <Controller
                control={control}
                name="phone"
                rules={validationRules.phone}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <ProfileInput
                    label="Phone Number"
                    isRequired={true}
                    value={value}
                    onChangeText={onChange}
                    placeholder={PLACEHOLDERS.USER_PHONE}
                    keyboardType="phone-pad"
                    editable={isEditing}
                    error={error?.message}
                    accessibilityLabel="Phone number input field"
                  />
                )}
              />

              {/* Email Field */}
              <Controller
                control={control}
                name="email"
                rules={validationRules.email}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <ProfileInput
                    label="Email Address"
                    value={value}
                    onChangeText={onChange}
                    placeholder={PLACEHOLDERS.USER_EMAIL}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={isEditing}
                    error={error?.message}
                    accessibilityLabel="Email address input field"
                  />
                )}
              />

              {/* Default Address Field */}
              <View style={styles.addressTodoContainer}>
                <ThemedText style={styles.todoComment}>
                  TODO: Integrate with Google Places Autocomplete API for better UX
                </ThemedText>
              </View>
              <Controller
                control={control}
                name="defaultAddress"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <ProfileInput
                    label="Default Address"
                    value={value}
                    onChangeText={onChange}
                    placeholder={PLACEHOLDERS.USER_ADDRESS}
                    multiline={true}
                    numberOfLines={2}
                    editable={isEditing}
                    error={error?.message}
                    accessibilityLabel="Default address input field"
                  />
                )}
              />

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {!isEditing ? (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile button"
                    accessibilityState={{ disabled: false }}
                  >
                    <ThemedText style={styles.editButtonText}>
                      Edit Profile
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.editingButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing button"
                      accessibilityState={{ disabled: false }}
                    >
                      <ThemedText style={styles.cancelButtonText}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        {
                          backgroundColor: isDirty ? theme.tint : theme.disabled,
                          opacity: isSubmitting ? 0.7 : 1,
                        },
                      ]}
                      onPress={handleSubmit(onSubmit)}
                      disabled={!isDirty || isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="Save changes button"
                      accessibilityState={{ 
                        disabled: !isDirty || isSubmitting 
                      }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.saveButtonText}>
                          Save Changes
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Other Actions */}
              <View style={styles.otherActionsContainer}>
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                  accessibilityRole="button"
                  accessibilityLabel="Change password button"
                  accessibilityState={{ disabled: false }}
                >
                  <ThemedText style={styles.changePasswordButtonText}>
                    Change Password
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Logout button"
                  accessibilityState={{ disabled: false }}
                >
                  <ThemedText style={styles.logoutButtonText}>
                    Logout
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account button"
                  accessibilityState={{ disabled: false }}
                >
                  <ThemedText style={styles.deleteButtonText}>
                    Delete Account
                  </ThemedText>
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
