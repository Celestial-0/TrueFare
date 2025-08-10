// General Types
export type UserType = 'user' | 'driver' | null;

// Enums
export enum VehicleType {
    TAXI = 'Taxi',
    AC_TAXI = 'AC_Taxi',
    BIKE = 'Bike',
    EBIKE = 'EBike',
    ERIKSHA = 'ERiksha',
    AUTO = 'Auto',
}

export enum DriverStatus {
    AVAILABLE = 'available',
    BUSY = 'busy',
    OFFLINE = 'offline',
    IN_RIDE = 'in-ride',
}

export enum RideStatus {
    PENDING = 'pending',
    BIDDING = 'bidding',
    ACCEPTED = 'accepted',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum BidStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

// Interfaces
export interface Earnings {
    total: number;
    count: number;
}

export interface Location {
    latitude: number;
    longitude: number;
}

export interface User {
    _id: string;
    userId: string;
    name: string;
    phone: string;
    email?: string;
    currentLocation?: Location;
    createdAt: Date;
    address?: string;
}

export interface VehicleInfo {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    type: VehicleType;
}

export interface Driver {
    _id: string;
    driverId: string;
    name: string;
    phone: string;
    email?: string;
    vehicleInfo: VehicleInfo;
    currentLocation?: Location;
    status: DriverStatus;
    rating: number;
    createdAt: Date;
    todayEarnings?: Earnings;
}

export interface RideRequest {
    _id: string;
    requestId: string; // Added for WebSocket compatibility
    userId: string;
    pickupLocation: {
        address: string;
        coordinates: Location;
    };
    destination: {
        address: string;
        coordinates: Location;
    };
    rideType: VehicleType;
    vehicleType?: VehicleType; // Added for backward compatibility
    status: RideStatus;
    createdAt: Date;
    updatedAt?: Date;
    estimatedDistance?: number; // In kilometers
    bids?: Bid[]; // Array of bids for this ride request
    // Properties added when ride is accepted
    acceptedBid?: {
        bidId: string;
        driverId: string;
        fareAmount: number;
        estimatedArrival?: number;
        status: string;
        acceptedAt: Date;
    };
    driverInfo?: {
        driverId: string;
        name: string;
        phone?: string;
        rating?: number;
        vehicleInfo?: any;
    };
    // Properties added when ride is completed or cancelled
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
}

export interface Ride {
    _id: string;
    rideId: string; // Added for compatibility
    userId: string;
    driverId: string;
    pickupLocation: Location;
    dropoffLocation: Location;
    pickupAddress: string; // Added for compatibility
    destinationAddress: string; // Added for compatibility
    status: RideStatus;
    vehicleType: VehicleType;
    fare: number;
    finalFare: number; // Added for compatibility
    createdAt: Date;
    timestamp: string; // Added for compatibility
    driverName?: string; // Optional driver name
    duration?: string; // Optional duration
}

export interface RideHistoryRide {
    rideId: string;
    requestId?: string; // Backend field mapping
    status: 'pending' | 'bidding' | 'accepted' | 'completed' | 'cancelled';
    finalFare: number;
    destinationAddress: string;
    pickupAddress: string;
    timestamp: Date;
    driverName?: string;
    duration?: string;
    rideType?: VehicleType;
    // Backend fields that need mapping
    destination?: {
        address: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
    };
    pickupLocation?: {
        address: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
    };
    createdAt?: Date;
    updatedAt?: Date;
    acceptedBid?: {
        fareAmount: number;
        driverId: string;
        bidTime: Date;
    };
}

export interface NewRideRequestPayload {
    pickupLocation: Location;
    destination: Location;
    vehicleType: VehicleType;
}

export interface Bid {
    _id: string;
    bidId?: string; // For WebSocket compatibility
    rideRequestId: string;
    driverId: string;
    amount: number;
    fareAmount: number; // Alias for amount for WebSocket compatibility
    status: BidStatus;
    createdAt: Date;
    bidTime?: Date; // Backend field for bid creation time
    acceptedAt?: Date; // When bid was accepted
    rejectedAt?: Date; // When bid was rejected
    driverName?: string;
    driverPhone?: string;
    driverRating?: number;
    estimatedPickupTime?: number;
    estimatedArrival?: number; // In minutes
    vehicleType?: VehicleType;
    message?: string;
}

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    createdAt: Date;
}

export interface AppError {
    message: string;
    code?: string;
    details?: any;
}

export interface AppState {
    isAuthenticated: boolean;
    userType: UserType;
    currentUser: User | null;
    currentDriver: Driver | null;
    rideRequests: RideRequest[];
    availableRequests: RideRequest[]; // Available ride requests for drivers to bid on
    currentRide: Ride | null; // Current active ride for drivers
    bids: Bid[];
    notifications: Notification[];
    error: AppError | null;
    loading: boolean;
    socketConnected: boolean;
    isUserRegistered: boolean;
    isDriverRegistered: boolean;
    rideHistory: RideHistoryRide[];
}

/**
 * Represents the structure of a standardized error response from the API.
 */
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

/**
 * A generic wrapper for API service responses.
 * It indicates whether the request was successful and contains either the data or an error.
 * @template T - The type of the data expected in a successful response.
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  message?: string;
}
