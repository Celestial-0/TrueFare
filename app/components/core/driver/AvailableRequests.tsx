import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    StyleProp,
    ViewStyle,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Pressable
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useApp } from '@/contexts/AppContext';
import type { RideRequest } from '@/contexts/AppContext';

// --- Animation Library ---
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    LinearTransition,
} from 'react-native-reanimated';

// --- Type Definitions ---
type RequestCardProps = {
    item: RideRequest;
    index: number;
    onPlaceBid: (request: RideRequest) => void;
    driverId: string | undefined;
};

type BidModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (amount: number) => void;
    request: RideRequest | null;
};

interface AvailableRequestsProps {
    onBackToDashboard: () => void;
}

// --- Minimalist Request Card Component ---
const RequestCard = React.memo(({ item, onPlaceBid, driverId }: RequestCardProps) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const myBid = useMemo(() => {
        if (!driverId) return null;
        return Array.isArray(item.bids) ? item.bids.find(bid => bid.driverId === driverId) : null;
    }, [item.bids, driverId]);

    return (
        <Animated.View style={[styles.requestItem, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <View style={styles.requestHeader}>
                <ThemedText type="defaultSemiBold" style={styles.distance}>
                    {item.estimatedDistance?.toFixed(1) ?? '...'} km
                </ThemedText>
                <ThemedText type="caption" style={styles.requestTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
            </View>

            <View style={styles.routeContainer}>
                {/* Pickup */}
                <View style={styles.routePoint}>
                    <View style={styles.routeIconContainer}>
                        <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
                    </View>
                    <ThemedText style={styles.routeText} numberOfLines={1}>
                        {item.pickupLocation?.address || 'Pickup location'}
                    </ThemedText>
                </View>
                {/* Connector Line */}
                <View style={styles.connectorLine} />
                {/* Destination */}
                <View style={styles.routePoint}>
                    <View style={styles.routeIconContainer}>
                        <View style={[styles.routeDot, { backgroundColor: theme.accent }]} />
                    </View>
                    <ThemedText style={styles.routeText} numberOfLines={1}>
                        {item.destination?.address || 'Destination'}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.requestFooter}>
                 <ThemedText style={styles.vehicleType}>
                     🚗 {item.vehicleType || 'TAXI'}
                 </ThemedText>
                {myBid ? (
                    <View style={styles.myBidContainer}>
                        <ThemedText style={styles.myBidLabel}>Your Bid:</ThemedText>
                        <ThemedText style={[styles.myBidAmount, { color: theme.primary }]}>
                           ₹{myBid.fareAmount}
                        </ThemedText>
                    </View>
                ) : <View/>}
            </View>

            <TouchableOpacity
                onPress={() => onPlaceBid(item)}
                style={[styles.bidButton, { backgroundColor: myBid ? theme.accent : theme.primary }]}
                activeOpacity={0.8}
            >
                <ThemedText style={styles.bidButtonText}>
                    {myBid ? 'Update Bid' : 'Place Bid'}
                </ThemedText>
            </TouchableOpacity>
        </Animated.View>
    );
});


// --- Refined Animated Bid Modal ---
const BidModal = ({ visible, onClose, onSubmit, request }: BidModalProps) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        const fareAmount = parseFloat(amount);
        if (isNaN(fareAmount) || fareAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => onSubmit(fareAmount), 300);
    };

    React.useEffect(() => {
        if (visible) {
            setIsSubmitting(false);
            setAmount('');
        }
    }, [visible, request]);

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.modalOverlay}
                onTouchEnd={onClose}
            />
            <Animated.View
                entering={FadeInDown.duration(400).springify().damping(15)}
                exiting={FadeOut.duration(200)}
                style={[styles.modalContent, { backgroundColor: theme.card }]}
            >
                <ThemedText type="title" style={styles.modalTitle}>Place Your Bid</ThemedText>
                <ThemedText type="subtitle" style={styles.modalSubtitle} numberOfLines={1}>
                    Ride to {request?.destination.address}
                </ThemedText>

                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    placeholder="Enter fare amount (e.g., 450)"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus={true}
                />

                <View style={styles.modalActions}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.submitButton, { backgroundColor: theme.primary }, isSubmitting && styles.disabledButton]}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.submitButtonText}>Submit Bid</ThemedText>
                        )}
                    </TouchableOpacity>

                    <Pressable onPress={onClose} disabled={isSubmitting}>
                        <ThemedText style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                            Cancel
                        </ThemedText>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
};


// --- Main Screen Component ---
export default function AvailableRequests({ onBackToDashboard }: AvailableRequestsProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { availableRequests, currentDriver, socketConnected, placeBid, addNotification, clearAvailableRequests } = useApp();

    const [showBidModal, setShowBidModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);

    React.useEffect(() => {
        if (currentDriver?.status === 'offline' || !socketConnected) {
            clearAvailableRequests();
        }
    }, [currentDriver?.status, socketConnected, clearAvailableRequests]);

    const handlePlaceBid = (request: RideRequest) => {
        setSelectedRequest(request);
        setShowBidModal(true);
    };

    const handleCloseModal = () => {
        setShowBidModal(false);
        setTimeout(() => setSelectedRequest(null), 200);
    };

    const handleSubmitBid = async (fareAmount: number) => {
        if (!selectedRequest || !currentDriver) {
            Alert.alert('Error', 'Could not place bid. Missing information.');
            handleCloseModal();
            return;
        }

        try {
            await placeBid(selectedRequest._id, fareAmount);
            addNotification({ type: 'success', message: 'Bid placed successfully!', createdAt: new Date() });
            handleCloseModal();
        } catch (error) {
            console.error('[BID_SUBMISSION_ERROR]', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            addNotification({ type: 'error', message: `Bid failed: ${errorMessage}`, createdAt: new Date() });
            handleCloseModal();
        }
    };

    const renderEmptyState = () => (
        <Animated.View entering={FadeIn.duration(800)} style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🧘‍♂️</Text>
            <ThemedText type="subtitle" style={styles.emptyText}>
                All quiet on the road
            </ThemedText>
            <ThemedText style={[styles.emptySubText, { color: theme.textSecondary }]}>
                We'll notify you when new requests appear.
            </ThemedText>
        </Animated.View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Minimalist Header */}
                <View style={[styles.header, { backgroundColor: theme.background }]}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={onBackToDashboard} style={styles.backButton}>
                             <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
                        </TouchableOpacity>
                        <View style={styles.connectionStatus}>
                            <View style={[styles.connectionDot, { backgroundColor: socketConnected ? theme.success : theme.danger }]}/>
                            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                                {socketConnected ? 'Online' : 'Offline'}
                            </ThemedText>
                        </View>
                    </View>
                    <ThemedText type="title" style={styles.headerTitle}>
                        Available Requests ({availableRequests.length})
                    </ThemedText>
                </View>

                <FlatList
                    data={availableRequests}
                    renderItem={({ item, index }) => (
                        <Animated.View
                            entering={FadeInDown.delay(index * 100).duration(500).springify()}
                            layout={LinearTransition.springify()}
                        >
                            <RequestCard
                                item={item}
                                index={index}
                                onPlaceBid={handlePlaceBid}
                                driverId={currentDriver?._id}
                            />
                        </Animated.View>
                    )}
                    keyExtractor={(item) => item.requestId}
                    contentContainerStyle={styles.scrollContainer}
                    ListEmptyComponent={renderEmptyState}
                />

                <BidModal
                    visible={showBidModal}
                    onClose={handleCloseModal}
                    onSubmit={handleSubmitBid}
                    request={selectedRequest}
                />
            </ThemedView>
        </View>
    );
}

// --- Minimalist Stylesheet ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 50,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
        textAlign: 'center',
        fontSize: 28,
        marginTop: 12,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 100,
    },
    requestItem: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 5,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    distance: { fontSize: 18 },
    requestTime: { fontSize: 13, opacity: 0.8 },
    routeContainer: {
        marginBottom: 16,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeIconContainer: {
        width: 24,
        alignItems: 'center',
    },
    routeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    connectorLine: {
        height: 20,
        width: 2,
        backgroundColor: '#E0E0E0',
        marginLeft: 11,
        marginVertical: 4,
    },
    routeText: {
        fontSize: 15,
        marginLeft: 8,
        flex: 1,
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    vehicleType: { fontSize: 14, opacity: 0.8 },
    myBidContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    myBidLabel: {
        fontSize: 13,
        opacity: 0.6,
    },
    myBidAmount: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    bidButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    bidButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: { opacity: 0.5 },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '30%',
        padding: 32,
    },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyText: { textAlign: 'center' },
    emptySubText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        position: 'absolute',
        bottom: 0,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalTitle: { textAlign: 'center', marginBottom: 4 },
    modalSubtitle: { textAlign: 'center', marginBottom: 24, opacity: 0.8 },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '500',
    },
    modalActions: {
        marginTop: 24,
        alignItems: 'center',
        gap: 16,
    },
    submitButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    cancelButtonText: { fontWeight: '600', fontSize: 16 },
});
