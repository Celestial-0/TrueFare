import { Platform } from 'react-native';

// Network configuration - automatically detects environment
const getServerUrl = () => {
  // For development, use the IP address shown in Metro bundler
  // For production, use your actual server URL
  if (__DEV__) {
    // This IP should match what's shown in your Metro bundler output
    return `${process.env.EXPO_PUBLIC_MAIN_URL}:8000` || 'http://localhost:8000';
  } else {
    // Production server URL
    return `${process.env.EXPO_PUBLIC_MAIN_URL}:8000` ;
  }
};

const SERVER_URL = getServerUrl();

// API Configuration - Updated to work with backend
export const API_BASE_URL = `http://${SERVER_URL}/api`;
export const SOCKET_URL = `http://${SERVER_URL}`;

// Environment Configuration
export const IS_DEV = __DEV__;
export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';

// Vehicle Types - Updated to match backend exactly
export const VEHICLE_TYPES = {
  TAXI: 'Taxi',
  AC_TAXI: 'AC_Taxi', 
  BIKE: 'Bike',
  EBIKE: 'EBike',
  ERICKSHAW: 'ERiksha',
  AUTO: 'Auto'
} as const;

export type VehicleType = typeof VEHICLE_TYPES[keyof typeof VEHICLE_TYPES];

// Vehicle Type Configurations with comfort and price values
export const VEHICLE_TYPE_CONFIG = {
  [VEHICLE_TYPES.TAXI]: {
    displayName: 'Taxi',
    description: 'Standard taxi service',
    comfortLevel: 3,
    priceValue: 3,
    icon: '🚕'
  },
  [VEHICLE_TYPES.AC_TAXI]: {
    displayName: 'AC Taxi', 
    description: 'Air-conditioned taxi',
    comfortLevel: 4,
    priceValue: 4,
    icon: '🚖'
  },
  [VEHICLE_TYPES.BIKE]: {
    displayName: 'Bike',
    description: 'Motorcycle ride',
    comfortLevel: 2,
    priceValue: 1,
    icon: '🏍️'
  },
  [VEHICLE_TYPES.EBIKE]: {
    displayName: 'E-Bike',
    description: 'Electric bike',
    comfortLevel: 2,
    priceValue: 2,
    icon: '🛵'
  },
  [VEHICLE_TYPES.ERICKSHAW]: {
    displayName: 'E-Rickshaw',
    description: 'Electric rickshaw',
    comfortLevel: 3,
    priceValue: 2,
    icon: '🛺'
  },
  [VEHICLE_TYPES.AUTO]: {
    displayName: 'Auto Rickshaw',
    description: 'Traditional auto rickshaw',
    comfortLevel: 2,
    priceValue: 2,
    icon: '🛺'
  }
} as const;

// Common API Endpoints - Updated to match backend exactly
export const API_ENDPOINTS = {
  // Authentication
  REGISTER_DRIVER: '/drivers/register',
  REGISTER_USER: '/users/register',
  LOGIN_USER: '/auth/login/user',
  LOGIN_DRIVER: '/auth/login/driver',
  
  // Driver endpoints
  DRIVER_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
  UPDATE_DRIVER_STATUS: (driverId: string) => `/drivers/${driverId}/status`,
  UPDATE_DRIVER_LOCATION: (driverId: string) => `/drivers/${driverId}/location`,
  CONNECTED_DRIVERS: '/drivers/connected',
  AVAILABLE_DRIVERS: '/drivers/available',
  
  // User endpoints
  USER_PROFILE: (userId: string) => `/users/profile/${userId}`,
  UPDATE_USER_LOCATION: (userId: string) => `/users/${userId}/location`,
  
  // Ride requests
  RIDE_REQUESTS: '/ride-requests',
  AVAILABLE_REQUESTS: '/ride-requests/available',
  USER_RIDE_REQUESTS: (userId: string) => `/ride-requests/user/${userId}`,
  PLACE_BID: (requestId: string) => `/ride-requests/${requestId}/bids`,
  ACCEPT_BID: (requestId: string, bidId: string) => `/ride-requests/${requestId}/bids/${bidId}/accept`,
  RIDE_REQUEST_BIDS: (requestId: string) => `/ride-requests/${requestId}/bids`,

};

// Socket Events - Updated to match backend exactly
export const SOCKET_EVENTS = {
  /**
   * Frontend to Backend Events
   */
  
  /**
   * Register a user's socket connection with the backend
   * Payload: { userId: string, location?: { latitude: number, longitude: number } }
   */
  USER_REGISTER: 'user:register',
  
  /**
   * Register a driver's socket connection with the backend and set their availability
   * Payload: { driverId: string, location?: { latitude: number, longitude: number }, vehicleInfo?: { type: string, licensePlate: string } }
   */
  DRIVER_REGISTER: 'driver:register',
  
  /**
   * Update user's online status and location
   * Payload: { userId: string, location?: { latitude: number, longitude: number }, timestamp: number }
   */
  USER_ONLINE: 'user:online',
  
  /**
   * Update driver's online status, location, and vehicle info
   * Payload: { driverId: string, location?: { latitude: number, longitude: number }, vehicleInfo?: { type: string, comfort: number, price: number }, timestamp: number }
   */
  DRIVER_ONLINE: 'driver:online',

  /**
   * Update a driver's location in real-time
   * Payload: { driverId: string, location: { latitude: number, longitude: number } }
   */
  DRIVER_LOCATION_UPDATE: 'driver:location:update',
  
  /**
   * Create a new ride request
   * Payload: { requestId: string, userId: string, rideType: string, pickupLocation: { address: string, coordinates: { latitude: number, longitude: number } }, destination: { address: string, coordinates: { latitude: number, longitude: number } }, timestamp: number }
   */
  RIDE_NEW_REQUEST: 'ride:newRequest',
  
  /**
   * Place a bid on a ride request
   * Payload: { requestId: string, driverId: string, fareAmount: number, estimatedArrival: number, timestamp: number }
   */
  RIDE_BID_PLACED: 'ride:bidPlaced',
  
  /**
   * Update driver's status (e.g., from available to busy)
   * Payload: { driverId: string, status: string, timestamp: number }
   */
  DRIVER_STATUS_UPDATE: 'driver:statusUpdate',

  /**
   * Mark a ride as complete
   * Payload: { rideId: string, timestamp: number }
   */
  RIDE_COMPLETE: 'ride:complete',

  /**
   * Cancel a ride
   * Payload: { rideId: string, reason: string, timestamp: number }
   */
  RIDE_CANCEL: 'ride:cancel',
  
  /**
   * Backend to Frontend Events
   */
  
  /**
   * Broadcast a new ride request to all available drivers
   * Payload: { requestId: string, userId: string, pickupLocation: { latitude: number, longitude: number }, destination: { latitude: number, longitude: number }, rideType: string, timestamp: string }
   */
  RIDE_NEW_REQUEST_BROADCAST: 'ride:newRequest',
  
  /**
   * Update the user about new bids or changes to existing bids on their ride request
   * Payload: { requestId: string, bidId: string, driverId: string, fareAmount: number, status: string }
   */
  RIDE_BID_UPDATE: 'ride:bidUpdate',
  
  /**
   * Notify the user that their ride request has been accepted by a driver
   * Payload: { requestId: string, acceptedBid: { bidId: string, driverId: string, fareAmount: number }, driverInfo: { name: string, rating: number } }
   */
  RIDE_ACCEPTED: 'ride:accepted',
  
  /**
   * Notify the driver that their bid has been accepted
   * Payload: { requestId: string, bidId: string, userId: string, pickupLocation: { latitude: number, longitude: number }, destination: { latitude: number, longitude: number } }
   */
  RIDE_BID_ACCEPTED: 'ride:bidAccepted',

  /**
   * Notify all drivers that a ride has been cancelled
   * Payload: { requestId: string, status: 'cancelled', reason: string, cancelledAt: Date }
   */
  RIDE_CANCELLED: 'ride:cancelled',

  /**
   * Notify a specific driver that their accepted ride has been cancelled by the user
   * Payload: { requestId: string, message: string, fareAmount: number, pickupAddress?: string, destinationAddress?: string, cancelledAt: Date, reason: string }
   */
  RIDE_CANCELLED_BY_USER: 'ride:cancelledByUser',

  /**
   * Driver status updated (broadcast from backend)
   * Payload: { driverId: string, status: string, timestamp: number }
   */
  DRIVER_STATUS_UPDATED: 'driver:statusUpdated',
} as const;

// Status Constants (match backend)
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export const RIDE_STATUS = {
  PENDING: 'pending',
  BIDDING: 'bidding',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const BID_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

// App Configuration
export const APP_CONFIG = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  BID_TIMEOUT: 120000, // 2 minutes
  MAX_RETRY_ATTEMPTS: 3,
  CONNECTION_TIMEOUT: 5000, // 5 seconds
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY: 1000, // 1 second
};

// Validation Constants
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 15,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[0-9]{10,15}$/,
  MIN_VEHICLE_YEAR: 1900,
  MAX_VEHICLE_YEAR: new Date().getFullYear() + 1,
  MIN_BID_AMOUNT: 1,
  MAX_BID_AMOUNT: 10000,
  LICENSE_PLATE_REGEX: /^[A-Z0-9\-\s]+$/i,
  MIN_COMFORT_LEVEL: 1,
  MAX_COMFORT_LEVEL: 5,
  MIN_PRICE_VALUE: 1,
  MAX_PRICE_VALUE: 5,
};

// Default coordinates (can be updated based on region)
export const DEFAULT_COORDINATES = {
  latitude: 28.6139,
  longitude: 77.2090,
  address: 'New Delhi, India',
};

// Utility Functions
export const parseVehicleYear = (year: string | number | undefined): number | undefined => {
  if (year === undefined || year === null || year === '') {
    return undefined;
  }
  
  const parsedYear = typeof year === 'string' ? parseInt(year, 10) : year;
  
  if (isNaN(parsedYear) || parsedYear < VALIDATION.MIN_VEHICLE_YEAR || parsedYear > VALIDATION.MAX_VEHICLE_YEAR) {
    return undefined;
  }
  
  return parsedYear;
};

export const getVehicleTypeConfig = (vehicleType: VehicleType) => {
  return VEHICLE_TYPE_CONFIG[vehicleType];
};

export const getAllVehicleTypes = () => {
  return Object.values(VEHICLE_TYPES);
};

export const getComfortLevelDescription = (level: number): string => {
  const descriptions = {
    1: 'Basic',
    2: 'Standard', 
    3: 'Comfortable',
    4: 'Premium',
    5: 'Luxury'
  };
  return descriptions[level as keyof typeof descriptions] || 'Unknown';
};

export const getPriceValueDescription = (value: number): string => {
  const descriptions = {
    1: 'Budget',
    2: 'Economy',
    3: 'Standard',
    4: 'Premium', 
    5: 'Luxury'
  };
  return descriptions[value as keyof typeof descriptions] || 'Unknown';
};