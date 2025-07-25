import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Linking,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import socketService from '@/services/socketService';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  RIDE_STATUS,
  STATUS_COLORS,
  ERROR_MESSAGES,
  UserData,
  RideRequest,
  Bid,
  DriverInfo,
} from "@/utils/userConstants";

interface RideTrackingProps {
  currentUser: UserData | null;
  currentRequest: RideRequest | null;
  acceptedBid: Bid | null;
  onRideCompleted?: () => void;
  onRideCancelled?: () => void;
}

interface RideStatus {
  status: string;
  timestamp: string;
  message: string;
}

export default function RideTracking({
  currentUser,
  currentRequest,
  acceptedBid,
  onRideCompleted,
  onRideCancelled,
}: RideTrackingProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [rideStatus, setRideStatus] = useState<string>(RIDE_STATUS.ASSIGNED);
  const [rideHistory, setRideHistory] = useState<RideStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState<string>("");

  // Status color mapping for better performance and readability
  const statusColorMap: Record<string, string> = useMemo(() => ({
    [RIDE_STATUS.ASSIGNED]: STATUS_COLORS.info,
    [RIDE_STATUS.IN_PROGRESS]: STATUS_COLORS.warning,
    driver_arrived: STATUS_COLORS.warning,
    ride_started: STATUS_COLORS.warning,
    [RIDE_STATUS.COMPLETED]: STATUS_COLORS.success,
    [RIDE_STATUS.CANCELLED]: STATUS_COLORS.error,
  }), []);

  const getStatusColor = useCallback((status: string): string => {
    return statusColorMap[status] || STATUS_COLORS.info;
  }, [statusColorMap]);

  const getStatusMessage = useCallback((status: string): string => {
    switch (status) {
      case RIDE_STATUS.ASSIGNED:
        return "Driver assigned to your ride";
      case RIDE_STATUS.IN_PROGRESS:
        return "Driver is on the way";
      case "driver_arrived":
        return "Driver has arrived at pickup location";
      case "ride_started":
        return "Ride has started";
      case RIDE_STATUS.COMPLETED:
        return "Ride completed successfully";
      case RIDE_STATUS.CANCELLED:
        return "Ride has been cancelled";
      default:
        return "Status updated";
    }
  }, []);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },
    statusContainer: {
      borderWidth: 2,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      alignItems: "center",
      position: "relative",
    },
    statusIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginBottom: 12,
    },
    currentStatus: {
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 8,
    },
    estimatedTime: {
      fontSize: 16,
      fontWeight: "500",
      opacity: 0.8,
    },
    loadingContainer: {
      alignItems: "center",
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    driverContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    driverName: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
    },
    driverInfo: {
      fontSize: 14,
      marginBottom: 4,
      opacity: 0.8,
    },
    vehicleInfo: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#e0e0e0",
    },
    vehicleTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      color: colorScheme === "dark" ?  "#FFFFFF" :"#000000",
    },
    vehicleDetail: {
      fontSize: 14,
      marginBottom: 4,
      opacity: 0.8,
    },
    contactButton: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 16,
      alignItems: "center",
    },
    contactButtonText: {
      color: colorScheme === "dark" ? "#000000" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    rideDetailsContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    rideDetail: {
      fontSize: 14,
      marginBottom: 6,
      opacity: 0.8,
    },
    historyContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    historyItem: {
      flexDirection: "row",
      marginBottom: 16,
      alignItems: "flex-start",
    },
    historyDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
      marginRight: 12,
    },
    historyContent: {
      flex: 1,
    },
    historyMessage: {
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 4,
    },
    historyTime: {
      fontSize: 12,
      opacity: 0.6,
    },
    cancelButton: {
      borderRadius: 8,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    cancelButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    noDataText: {
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
      opacity: 0.7,
    },
  });

  const fetchDriverInfo = useCallback(async () => {
    if (!acceptedBid?.driverId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DRIVER_PROFILE(acceptedBid.driverId)}`
      );
      const data = await response.json();

      if (data.success) {
        setDriverInfo(data.data);
      } else {
        console.error("Error fetching driver info:", data.message);
      }
    } catch (error) {
      console.error("Error fetching driver info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [acceptedBid?.driverId]);

  const initializeRideTracking = useCallback(() => {
    const initialStatus: RideStatus = {
      status: RIDE_STATUS.ASSIGNED,
      timestamp: new Date().toISOString(),
      message: "Driver assigned to your ride",
    };

    setRideHistory([initialStatus]);
    // Remove hardcoded ETA - wait for socket updates or API response
    setEstimatedArrival("");
  }, []);

  const handleRideStatusUpdate = useCallback((data: any) => {
    console.log("Ride status update:", data);

    const newStatus: RideStatus = {
      status: data.status,
      timestamp: data.timestamp || new Date().toISOString(),
      message: data.message || getStatusMessage(data.status),
    };

    setRideStatus(data.status);
    setRideHistory((prev) => [...prev, newStatus]);

    if (data.estimatedArrival) {
      setEstimatedArrival(data.estimatedArrival);
    }
  }, [getStatusMessage]);

  const handleDriverLocationUpdate = useCallback((data: any) => {
    console.log("Driver location update:", data);
    // Update estimated arrival time based on driver location
    if (data.estimatedArrival) {
      setEstimatedArrival(data.estimatedArrival);
    }
  }, []);

  const submitRating = useCallback(
    async (rating: number) => {
      if (!currentRequest || !acceptedBid) return;

      try {
        // This would be a real API call to submit rating
        console.log("Submitting rating:", rating);
        Alert.alert("Thank You!", "Your rating has been submitted.");
        onRideCompleted?.();
      } catch (error) {
        console.error("Error submitting rating:", error);
      }
    },
    [currentRequest, acceptedBid, onRideCompleted]
  );

  const showRatingDialog = useCallback(() => {
    Alert.alert("Rate Your Driver", "How was your ride experience?", [
      { text: "⭐", onPress: () => submitRating(1) },
      { text: "⭐⭐", onPress: () => submitRating(2) },
      { text: "⭐⭐⭐", onPress: () => submitRating(3) },
      { text: "⭐⭐⭐⭐", onPress: () => submitRating(4) },
      { text: "⭐⭐⭐⭐⭐", onPress: () => submitRating(5) },
    ]);
  }, [submitRating]);

  const handleRideCompleted = useCallback(
    (data: any) => {
      console.log("Ride completed:", data);
      Alert.alert(
        "Ride Completed",
        "Your ride has been completed successfully!",
        [
          {
            text: "Rate Driver",
            onPress: () => showRatingDialog(),
          },
          {
            text: "OK",
            onPress: () => onRideCompleted?.(),
          },
        ]
      );
    },
    [onRideCompleted, showRatingDialog]
  );

  const handleRideCancelled = useCallback(
    (data: any) => {
      console.log("Ride cancelled:", data);
      Alert.alert(
        "Ride Cancelled",
        data.reason || "Your ride has been cancelled",
        [
          {
            text: "OK",
            onPress: () => onRideCancelled?.(),
          },
        ]
      );
    },
    [onRideCancelled]
  );

  useEffect(() => {
    if (acceptedBid && currentRequest) {
      fetchDriverInfo();
      initializeRideTracking();
    }
  }, [acceptedBid, currentRequest, fetchDriverInfo, initializeRideTracking]);

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const cleanup = () => {
      socket.off("ride:statusUpdate", handleRideStatusUpdate);
      socket.off("driver:locationUpdate", handleDriverLocationUpdate);
      socket.off("ride:completed", handleRideCompleted);
      socket.off("ride:cancelled", handleRideCancelled);
    };

    // Listen for ride status updates
    socket.on("ride:statusUpdate", handleRideStatusUpdate);
    socket.on("driver:locationUpdate", handleDriverLocationUpdate);
    socket.on("ride:completed", handleRideCompleted);
    socket.on("ride:cancelled", handleRideCancelled);

    return cleanup;
  }, [
    handleRideStatusUpdate,
    handleDriverLocationUpdate,
    handleRideCompleted,
    handleRideCancelled,
  ]);

  const cancelRide = () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: confirmCancelRide,
        },
      ]
    );
  };

  const confirmCancelRide = async () => {
    if (!currentRequest) return;

    try {
      // This would be a real API call to cancel the ride
      console.log("Cancelling ride:", currentRequest._id || currentRequest.requestId);

      // Simulate API call
      setRideStatus(RIDE_STATUS.CANCELLED);
      const cancelStatus: RideStatus = {
        status: RIDE_STATUS.CANCELLED,
        timestamp: new Date().toISOString(),
        message: "Ride cancelled by user",
      };
      setRideHistory((prev) => [...prev, cancelStatus]);

      Alert.alert("Cancelled", "Your ride has been cancelled.");
      onRideCancelled?.();
    } catch (error) {
      console.error("Error cancelling ride:", error);
      Alert.alert("Error", ERROR_MESSAGES.GENERAL_ERROR);
    }
  };

  const contactDriver = () => {
    if (!driverInfo?.phone) {
      Alert.alert("Error", "Driver contact information not available");
      return;
    }

    Alert.alert("Contact Driver", `Call ${driverInfo.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          Linking.openURL(`tel:${driverInfo.phone}`).catch(err =>
            console.error('Error opening phone app:', err)
          );
        },
      },
    ]);
  };

  const refreshStatus = async () => {
    setIsRefreshing(true);
    // Simulate fetching latest status
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  if (!currentRequest || !acceptedBid) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noDataText}>
          No active ride to track. Please book a ride first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshStatus} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.title}>Track Your Ride</ThemedText>

        {/* Current Status */}
        <ThemedView
          style={[
            styles.statusContainer,
            {
              borderColor: theme.text,
              backgroundColor: getStatusColor(rideStatus) + "20",
            },
          ]}
        >
          {/* <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(rideStatus) },
            ]}
          /> */}
          <ThemedText style={styles.currentStatus}>
            {getStatusMessage(rideStatus)}
          </ThemedText>
          <ThemedText style={styles.estimatedTime}>
            ETA: {estimatedArrival}
          </ThemedText>
        </ThemedView>

        {/* Driver Information */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
            <ThemedText style={styles.loadingText}>
              Loading driver info...
            </ThemedText>
          </View>
        ) : driverInfo ? (
          <ThemedView
            style={[styles.driverContainer, { borderColor: theme.text }]}
          >
            <ThemedText style={styles.sectionTitle}>Your Driver</ThemedText>
            <ThemedText style={styles.driverName}>{driverInfo.name || 'Unknown Driver'}</ThemedText>
            <ThemedText style={styles.driverInfo}>
              ID: {driverInfo.driverId || 'N/A'}
            </ThemedText>
            {driverInfo.phone && (
              <ThemedText style={styles.driverInfo}>
                Phone: {driverInfo.phone}
              </ThemedText>
            )}
            {driverInfo.rating && (
              <ThemedText style={styles.driverInfo}>
                Rating: {"⭐".repeat(Math.floor(driverInfo.rating))} ({String(driverInfo.rating)}/5)
              </ThemedText>
            )}

            {driverInfo.vehicleInfo && (
              <View style={styles.vehicleInfo}>
                <ThemedText style={styles.vehicleTitle}>
                  Vehicle Information
                </ThemedText>
                {driverInfo.vehicleInfo.make &&
                  driverInfo.vehicleInfo.model && (
                    <ThemedText style={styles.vehicleDetail}>
                      {driverInfo.vehicleInfo.make} {driverInfo.vehicleInfo.model} ({String(driverInfo.vehicleInfo.year)})
                    </ThemedText>
                  )}
                {driverInfo.vehicleInfo.color && (
                  <ThemedText style={styles.vehicleDetail}>
                    Color: {driverInfo.vehicleInfo.color}
                  </ThemedText>
                )}
                {driverInfo.vehicleInfo.licensePlate && (
                  <ThemedText style={styles.vehicleDetail}>
                    License Plate: {driverInfo.vehicleInfo.licensePlate}
                  </ThemedText>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: theme.tint }]}
              onPress={contactDriver}
            >
              <ThemedText style={styles.contactButtonText}>
                Contact Driver
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : null}

        {/* Ride Details */}
        <ThemedView
          style={[styles.rideDetailsContainer, { borderColor: theme.text }]}
        >
          <ThemedText style={styles.sectionTitle}>Ride Details</ThemedText>
          <ThemedText style={styles.rideDetail}>
            Request ID: {currentRequest._id || currentRequest.requestId || 'N/A'}
          </ThemedText>
          <ThemedText style={styles.rideDetail}>
            From: {currentRequest.pickupLocation?.address || 'N/A'}
          </ThemedText>
          <ThemedText style={styles.rideDetail}>
            To: {currentRequest.destination?.address || 'N/A'}
          </ThemedText>
          <ThemedText style={styles.rideDetail}>
            Fare: ₹{String(acceptedBid?.fareAmount || 0)}
          </ThemedText>
          {currentRequest.estimatedDistance && (
            <ThemedText style={styles.rideDetail}>
              Distance: {String(currentRequest.estimatedDistance)} km
            </ThemedText>
          )}
        </ThemedView>

        {/* Ride History */}
        <ThemedView
          style={[styles.historyContainer, { borderColor: theme.text }]}
        >
          <ThemedText style={styles.sectionTitle}>Ride Progress</ThemedText>
          {rideHistory.length === 0 ? (
            <ThemedText style={styles.noDataText}>No updates yet.</ThemedText>
          ) : (
            <FlatList
              data={rideHistory}
              keyExtractor={(_, index) => index.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  />
                  <View style={styles.historyContent}>
                    <ThemedText style={styles.historyMessage}>
                      {item.message || 'Status update'}
                    </ThemedText>
                    <ThemedText style={styles.historyTime}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}
                    </ThemedText>
                  </View>
                </View>
              )}
            />
          )}
        </ThemedView>

        {/* Action Buttons */}
        {rideStatus !== RIDE_STATUS.COMPLETED &&
          rideStatus !== RIDE_STATUS.CANCELLED && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: STATUS_COLORS.error },
              ]}
              onPress={cancelRide}
            >
              <ThemedText style={styles.cancelButtonText}>
                Cancel Ride
              </ThemedText>
            </TouchableOpacity>
          )}
      </ScrollView>
    </ThemedView>
  );
}
