import React, { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ThemedText } from "../../ThemedText";
import { ThemedView } from "../../ThemedView";
import { Colors } from "../../../constants/Colors";
import { useColorScheme } from "../../../hooks/useColorScheme";
import apiService from "../../../services/apiService";
import socketService from "../../../services/socketService";
import { useApp } from "../../../contexts/AppContext";

interface Bid {
  id: string;
  driverId: string;
  fareAmount: number;
  bidTime: string;
  driverName?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    color: string;
    licensePlate: string;
  };
}

interface RideBidsProps {
  requestId: string;
  onBidAccepted?: (bid: Bid) => void;
  onBack?: () => void;
}

export default function RideBids({
  requestId,
  onBidAccepted,
  onBack,
}: RideBidsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  useApp();

  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAcceptingBid, setIsAcceptingBid] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
    header: {
      marginBottom: 24,
    },
    backButton: {
      marginBottom: 16,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: "500",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
    },
    noBidsContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    noBidsText: {
      fontSize: 18,
      textAlign: "center",
      marginBottom: 24,
    },
    refreshButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#007AFF",
    },
    refreshButtonText: {
      fontSize: 16,
      fontWeight: "500",
    },
    bidsList: {
      paddingBottom: 24,
    },
    bidItem: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    bidHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    bidInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    fareAmount: {
      fontSize: 24,
      fontWeight: "700",
      marginRight: 12,
    },
    lowestBadge: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    bidTime: {
      fontSize: 14,
    },
    driverName: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 4,
    },
    vehicleInfo: {
      fontSize: 14,
      marginBottom: 12,
    },
    acceptButton: {
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    acceptButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  });
  const setupSocketListeners = () => {
    // Listen for new bids
    socketService.onNewBid((bidData) => {
      if (bidData.requestId === requestId) {
        setBids((prevBids) => {
          // Check if bid already exists, update it, otherwise add new
          const existingIndex = prevBids.findIndex(
            (bid) => bid.driverId === bidData.driverId
          );
          if (existingIndex >= 0) {
            const updatedBids = [...prevBids];
            updatedBids[existingIndex] = {
              ...updatedBids[existingIndex],
              fareAmount: bidData.fareAmount,
              bidTime: bidData.bidTime,
            };
            return updatedBids.sort((a, b) => a.fareAmount - b.fareAmount);
          } else {
            return [
              ...prevBids,
              {
                id: bidData.id || `${bidData.driverId}_${Date.now()}`,
                driverId: bidData.driverId,
                fareAmount: bidData.fareAmount,
                bidTime: bidData.bidTime,
                driverName: bidData.driverName,
                vehicleInfo: bidData.vehicleInfo,
              },
            ].sort((a, b) => a.fareAmount - b.fareAmount);
          }
        });
      }
    });

    // Listen for bidding closed
    socketService.onBiddingClosed((data) => {
      if (data.requestId === requestId) {
        Alert.alert(
          "Bidding Closed",
          "The bidding period for this ride has ended."
        );
      }
    });
  };

  const loadBids = async () => {
    try {
      const response = await apiService.getRideRequestBids(requestId);
      if (response.success && response.data) {
        // Sort bids by fare amount (lowest first)
        const bidsArray = Array.isArray(response.data) ? response.data : [];
        const sortedBids = bidsArray.sort(
          (a: Bid, b: Bid) => a.fareAmount - b.fareAmount
        );
        setBids(sortedBids);
      } else {
        console.error("Failed to load bids:", response.error);
      }
    } catch (error) {
      console.error("Error loading bids:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBids();
    setupSocketListeners();

    return () => {
      // Cleanup socket listeners
      socketService.off("newBid");
      socketService.off("biddingClosed");
    };
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBids();
    setIsRefreshing(false);
  };

  const handleAcceptBid = async (bid: Bid) => {
    Alert.alert(
      "Accept Bid",
      `Accept bid from driver for ₹${bid.fareAmount.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: async () => {
            setIsAcceptingBid(bid.id);
            try {
              const response = await apiService.acceptBid(requestId, bid.id);
              if (response.success) {
                onBidAccepted?.(bid);
                Alert.alert(
                  "Success",
                  "Bid accepted! The driver has been notified."
                );
              } else {
                Alert.alert("Error", response.error || "Failed to accept bid");
              }
            } catch (error) {
              console.error("Error accepting bid:", error);
              Alert.alert("Error", "Failed to accept bid. Please try again.");
            } finally {
              setIsAcceptingBid(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderBidItem = ({ item, index }: { item: Bid; index: number }) => {
    const isLowest = index === 0;
    const isAccepting = isAcceptingBid === item.id;

    return (
      <ThemedView
        style={[
          styles.bidItem,
          {
            backgroundColor: theme.background,
            borderColor: isLowest ? "#4CAF50" : theme.text + "20",
            borderWidth: isLowest ? 2 : 1,
          },
        ]}
      >
        <View style={styles.bidHeader}>
          <View style={styles.bidInfo}>
            <ThemedText
              style={[
                styles.fareAmount,
                { color: isLowest ? "#4CAF50" : theme.text },
              ]}
            >
              ₹{item.fareAmount.toFixed(2)}
            </ThemedText>
            {isLowest && (
              <ThemedText style={[styles.lowestBadge, { color: "#4CAF50" }]}>
                Lowest Bid
              </ThemedText>
            )}
          </View>
          <ThemedText style={[styles.bidTime, { color: theme.text + "60" }]}>
            {formatTime(item.bidTime)}
          </ThemedText>
        </View>

        {item.driverName && (
          <ThemedText style={[styles.driverName, { color: theme.text }]}>
            Driver: {item.driverName}
          </ThemedText>
        )}

        {item.vehicleInfo && (
          <ThemedText
            style={[styles.vehicleInfo, { color: theme.text + "80" }]}
          >
            {item.vehicleInfo.color} {item.vehicleInfo.make}{" "}
            {item.vehicleInfo.model}({item.vehicleInfo.licensePlate})
          </ThemedText>
        )}

        <TouchableOpacity
          style={[
            styles.acceptButton,
            {
              backgroundColor: isLowest ? "#4CAF50" : "#007AFF",
              opacity: isAccepting ? 0.6 : 1,
            },
          ]}
          onPress={() => handleAcceptBid(item)}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <ThemedText style={styles.acceptButtonText}>Accept Bid</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={[styles.loadingText, { color: theme.text }]}>
          Loading bids...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ThemedText style={[styles.backButtonText, { color: "#007AFF" }]}>
              ← Back
            </ThemedText>
          </TouchableOpacity>
        )}
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Ride Bids
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.text + "80" }]}>
          {bids.length} bid{bids.length !== 1 ? "s" : ""} received
        </ThemedText>
      </View>

      {bids.length === 0 ? (
        <ThemedView style={styles.noBidsContainer}>
          <ThemedText style={[styles.noBidsText, { color: theme.text }]}>
            No bids yet. Drivers will start bidding shortly.
          </ThemedText>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <ThemedText
              style={[styles.refreshButtonText, { color: "#007AFF" }]}
            >
              Refresh
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={bids}
          renderItem={renderBidItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bidsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}
