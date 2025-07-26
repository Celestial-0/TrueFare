import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';

// Import components used in the original file
import ProfileInput from '@/components/core/user/ProfileInput'; 
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android to match the dashboard's animation style
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function UserProfileManagement() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const { currentUser, logout, updateUserProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
      });
    }
  }, [currentUser]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(prev => !prev);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      await updateUserProfile(formData);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsEditing(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    // Reset form data to original state
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
      });
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  const styles = getStyles(colorScheme, theme);

  // Reusable ActionRow component, styled like the DriverDashboard
  const ActionRow = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionRowIcon}>
        <Ionicons name={icon} size={20} color={theme.tint} />
      </View>
      <Text style={styles.actionRowLabel}>{label}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color={theme.tabIconDefault} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Profile</Text>
          </View>
          <Text style={styles.subHeaderText}>
            Manage your account details and settings.
          </Text>

          {/* Personal Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              {!isEditing && (
                <TouchableOpacity onPress={handleEditToggle} style={styles.editButton}>
                   <Ionicons name="create-outline" size={20} color={theme.tint} />
                   <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputContainer}>
              <ProfileInput
                label="Full Name"
                value={formData.name}
                editable={isEditing}
                leftIcon="person-outline"
                onChangeText={(value) => handleInputChange('name', value)}
              />
              <ProfileInput
                label="Phone Number"
                value={formData.phone}
                editable={isEditing}
                keyboardType="phone-pad"
                leftIcon="call-outline"
                onChangeText={(value) => handleInputChange('phone', value)}
              />
              <ProfileInput
                label="Email Address"
                value={formData.email}
                editable={false} // Email usually not editable
                leftIcon="mail-outline"
                onChangeText={(value) => handleInputChange('email', value)}
              />
              <ProfileInput
                label="Default Address"
                value={formData.address}
                editable={isEditing}
                multiline
                leftIcon="location-outline"
                onChangeText={(value) => handleInputChange('address', value)}
              />
            </View>
            
            {/* Conditional Save/Cancel Buttons */}
            {isEditing && (
              <View style={styles.editActionsContainer}>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleCancel}>
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSave}>
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Security Actions Card */}
          <View style={styles.card}>
            <ActionRow 
              icon="lock-closed-outline" 
              label="Change Password" 
              onPress={() => Alert.alert("Navigate", "This would open the Change Password screen.")} 
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles adapted from DriverDashboard and combined with UserProfile needs
const getStyles = (colorScheme: 'light' | 'dark', theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
  },
  subHeaderText: {
    fontSize: 18,
    color: theme.tabIconDefault,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    marginBottom: 24,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.background,
    borderRadius: 8,
  },
  editButtonText: {
    color: theme.tint,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  inputContainer: {
    gap: 16,
  },
  editActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: theme.tint,
  },
  primaryButtonText: {
    color: '#FFFFFF', // Assuming tint contrasts with white
  },
  secondaryButton: {
    backgroundColor: theme.background,
  },
  secondaryButtonText: {
    color: theme.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Reduced padding as it's inside a card
  },
  actionRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colorScheme === 'dark' ? '#4c1a1f' : '#f9d6d9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
});