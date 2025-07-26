import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Alert,
  Pressable, // Use built-in Pressable
  StyleProp,
  ViewStyle,
  TouchableOpacity, // Added for back button
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/contexts/AppContext';
import type { Driver, DriverStatus } from '@/types/types';

// --- Animation & Icon Libraries ---
// Make sure to install these: yarn add react-native-reanimated lucide-react-native
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  User,
  Phone,
  Mail,
  Car,
  Calendar,
  Palette,
  Hash,
  ShieldCheck,
  LogOut,
  ChevronRight, // For indicating action
} from 'lucide-react-native';

// --- Type Definitions ---
type AnimatedPressableRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

type InfoCardProps = {
  title: string;
  children: React.ReactNode;
  index: number;
};

type DetailRowProps = {
  icon: React.ElementType;
  label: string;
  value?: string | React.ReactNode;
  isLast?: boolean;
};

type ActionRowProps = {
  icon: React.ElementType;
  label: string;
  onPress: () => void;
  color?: string;
  isLast?: boolean;
};

type DriverProfileProps = {
  onBackToDashboard: () => void;
};

// --- Reusable Animated Components ---

/**
 * An animated, pressable row component using the built-in Pressable and Reanimated.
 * This replaces the previous Gesture Handler-based component.
 */
const AnimatedPressableRow = ({ children, style, onPress }: AnimatedPressableRowProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};


const InfoCard = ({ title, children, index }: InfoCardProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 150).duration(600)}
      style={[styles.cardContainer, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
    >
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</ThemedText>
      {children}
    </Animated.View>
  );
};

const DetailRow = ({ icon: Icon, label, value, isLast = false }: DetailRowProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <View style={[styles.infoRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.infoRowLeft}>
        <Icon color={theme.primary} size={20} style={styles.icon} />
        <ThemedText style={styles.label}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.value, { color: theme.textSecondary }]}>{value}</ThemedText>
    </View>
  );
};

const ActionRow = ({ icon: Icon, label, onPress, color, isLast = false }: ActionRowProps) => {
    const theme = Colors[useColorScheme() ?? 'light'];
    const textColor = color || theme.text;
    return (
        <AnimatedPressableRow onPress={onPress}>
            <View style={[styles.actionRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.actionRowLeft}>
                    <Icon color={color || theme.primary} size={22} style={styles.icon} />
                    <ThemedText style={[styles.actionRowText, { color: textColor }]}>{label}</ThemedText>
                </View>
                <ChevronRight color={theme.icon} size={20} />
            </View>
        </AnimatedPressableRow>
    );
}

const StatusBadge = ({ status }: { status: DriverStatus }) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const getStatusStyle = () => {
    switch (status) {
      case 'available':
        return { color: theme.success, backgroundColor: theme.successBackground };
      case 'offline':
        return { color: theme.textSecondary, backgroundColor: theme.disabledBackground };
      case 'busy':
      case 'in-ride':
        return { color: theme.warning, backgroundColor: 'rgba(255, 149, 0, 0.15)' }; // Using warning color with custom alpha
      default:
        return { color: theme.textSecondary, backgroundColor: theme.disabledBackground };
    }
  };

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const { color, backgroundColor } = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <ThemedText style={[styles.statusText, { color }]}>{getStatusText()}</ThemedText>
    </View>
  );
};

// --- Main Screen Component ---
export default function DriversProfile({ onBackToDashboard }: DriverProfileProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { currentDriver, logout, addNotification } = useApp();

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            addNotification({
              message: 'Successfully logged out',
              type: 'success',
              createdAt: new Date(),
            });
            onBackToDashboard();
          },
        },
      ],
    );
  };

  const handleAccountSecurity = () => {
    addNotification({
      message: 'Account security feature coming soon',
      type: 'info',
      createdAt: new Date(),
    });
  };

  if (!currentDriver) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>No driver data available</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onBackToDashboard}
          >
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const vehicleInfo = currentDriver.vehicleInfo;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onBackToDashboard} style={styles.backButton}>
            <ThemedText style={[styles.backButtonText, { color: theme.text }]}>←</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Driver Profile</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {currentDriver.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.profileName}>{currentDriver.name}</ThemedText>
          <StatusBadge status={currentDriver.status} />
        </Animated.View>

        {/* Personal Information */}
        <InfoCard title="Personal Details" index={1}>
          <DetailRow icon={User} label="Full Name" value={currentDriver.name} />
          <DetailRow icon={Phone} label="Phone" value={currentDriver.phone} />
          <DetailRow icon={Mail} label="Email" value={currentDriver.email ?? 'Not provided'} isLast />
        </InfoCard>

        {/* Vehicle Information */}
        <InfoCard title="Vehicle Information" index={2}>
          <DetailRow
            icon={Car}
            label="Vehicle"
            value={`${vehicleInfo?.make ?? 'N/A'} ${vehicleInfo?.model ?? ''}`}
          />
          <DetailRow icon={Calendar} label="Year" value={String(vehicleInfo?.year ?? 'N/A')} />
          <DetailRow icon={Palette} label="Color" value={vehicleInfo?.color ?? 'N/A'} />
          <DetailRow
            icon={Hash}
            label="License Plate"
            value={vehicleInfo?.licensePlate ?? 'N/A'}
            isLast
          />
        </InfoCard>

        {/* Actions */}
        <InfoCard title="Settings" index={3}>
            <ActionRow 
                icon={ShieldCheck} 
                label="Account Security"
                onPress={handleAccountSecurity}
            />
            <ActionRow 
                icon={LogOut} 
                label="Log Out"
                onPress={handleLogout}
                color={theme.danger}
                isLast
            />
        </InfoCard>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardContainer: {
    borderRadius: 20,
    padding: 0, // Padding will be on the rows for better border control
    marginBottom: 24,
    // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    // Android shadow
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
});