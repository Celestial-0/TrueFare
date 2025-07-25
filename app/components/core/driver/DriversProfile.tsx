import React from "react";
import { StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { DriverData } from "@/utils/driverConstants";

interface DriversProfileProps {
  currentDriver: DriverData | null;
  onBackToDashboard: () => void;
}

export const DriversProfile: React.FC<DriversProfileProps> = ({
  currentDriver,
  onBackToDashboard,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // Styles definition with theme support
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      padding: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    backButton: {
      padding: 12,
      marginRight: 16,
      borderRadius: 12,
      backgroundColor: theme.tint + "20",
    },
    backButtonText: {
      fontSize: 16,
      color: theme.tint,
      fontWeight: "600",
    },
    profileTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      flex: 1,
      textAlign: "center",
      marginRight: 40,
    },
    profileCard: {
      backgroundColor: theme.tint + "15",
      borderRadius: 12,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    section: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.text + "20",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      paddingVertical: 4,
    },
    label: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.7,
      width: 120,
    },
    value: {
      fontSize: 16,
      flex: 1,
      color: theme.text,
      fontWeight: "500",
    },
    statusContainer: {
      alignItems: "flex-start",
    },
    statusBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.tint + "20",
    },
    statusText: {
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
      color: theme.tint,
    },
    actionButton: {
      backgroundColor: theme.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      margin: 20,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
    },
    noDataContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    noDataText: {
      fontSize: 18,
      color: theme.text,
      opacity: 0.7,
      marginBottom: 30,
      textAlign: "center",
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.profileTitle}>Driver Profile</ThemedText>
        </ThemedView>

        {currentDriver ? (
          <ThemedView style={styles.profileCard}>
            {/* Driver Basic Info */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Personal Information
              </ThemedText>
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.label}>Name:</ThemedText>
                <ThemedText style={styles.value}>
                  {currentDriver.name}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.label}>Phone:</ThemedText>
                <ThemedText style={styles.value}>
                  {currentDriver.phone}
                </ThemedText>
              </ThemedView>
              {currentDriver.email && (
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.label}>Email:</ThemedText>
                  <ThemedText style={styles.value}>
                    {currentDriver.email}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            {/* Status Section */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Status</ThemedText>
              <ThemedView style={styles.statusContainer}>
                <ThemedView style={styles.statusBadge}>
                  <ThemedText style={styles.statusText}>
                    {currentDriver.status || "offline"}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            {/* Vehicle Information */}
            {currentDriver.vehicleInfo && (
              <ThemedView style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  Vehicle Information
                </ThemedText>
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.label}>Vehicle:</ThemedText>
                  <ThemedText style={styles.value}>
                    {currentDriver.vehicleInfo.make}{" "}
                    {currentDriver.vehicleInfo.model}
                  </ThemedText>
                </ThemedView>
                {currentDriver.vehicleInfo.year && (
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.label}>Year:</ThemedText>
                    <ThemedText style={styles.value}>
                      {String(currentDriver.vehicleInfo.year)}
                    </ThemedText>
                  </ThemedView>
                )}
                {currentDriver.vehicleInfo.color && (
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.label}>Color:</ThemedText>
                    <ThemedText style={styles.value}>
                      {currentDriver.vehicleInfo.color}
                    </ThemedText>
                  </ThemedView>
                )}
                {currentDriver.vehicleInfo.licensePlate && (
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.label}>License Plate:</ThemedText>
                    <ThemedText style={styles.value}>
                      {currentDriver.vehicleInfo.licensePlate}
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onBackToDashboard}
            >
              <ThemedText style={styles.actionButtonText}>
                Return to Dashboard
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.noDataContainer}>
            <ThemedText style={styles.noDataText}>
              No driver data available
            </ThemedText>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onBackToDashboard}
            >
              <ThemedText style={styles.actionButtonText}>
                Return to Dashboard
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
