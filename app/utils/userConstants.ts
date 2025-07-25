// API Base URL - Update this to match your backend server
export const API_BASE_URL = `http://${process.env.EXPO_PUBLIC_MAIN_URL}:8000/api`; // Change to your backend URL

// Socket.io connection URL
export const SOCKET_URL = `http://${process.env.EXPO_PUBLIC_MAIN_URL}:8000`; // Change to your backend URL

// API Endpoints
export const API_ENDPOINTS = {
  // User endpoints
  USER_REGISTER: '/users/register',
  USER_PROFILE: (userId: string) => `/users/profile/${userId}`,
  USER_RIDE_HISTORY: (userId: string) => `/ride-requests/user/${userId}`,
  
  // Ride request endpoints
  RIDE_REQUESTS: '/ride-requests',
  RIDE_REQUEST_BIDS: (requestId: string) => `/ride-requests/${requestId}/bids`,
  ACCEPT_BID: (requestId: string, bidId: string) => `/ride-requests/${requestId}/bids/${bidId}/accept`,
  
  // Driver endpoints
  CONNECTED_DRIVERS: '/drivers/connected',
  DRIVER_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // User events
  USER_REGISTER: 'user:register',
  USER_REGISTERED: 'user:registered',
  NEW_BID: 'newBid',
  BIDS_UPDATED: 'bids:updated',
  BIDDING_CLOSED: 'bidding:closed',
  
  // Driver events
  DRIVER_REGISTER: 'driver:register',
  DRIVER_REGISTERED: 'driver:registered',
  NEW_RIDE_REQUEST: 'newRideRequest',
  PLACE_BID: 'driver:placeBid',
  BID_CONFIRMED: 'bid:confirmed',
  BID_ACCEPTED: 'bid:accepted',
};

// Ride Status Constants
export const RIDE_STATUS = {
  PENDING: 'pending',
  BIDDING_OPEN: 'bidding_open',
  BIDDING_CLOSED: 'bidding_closed',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Driver Status Constants
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MIN_PHONE_LENGTH: 10,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[\d\s\-\(\)]+$/,
  MIN_VEHICLE_YEAR: 1900,
  MAX_VEHICLE_YEAR: new Date().getFullYear() + 1,
};

// Default coordinates (New York City)
export const DEFAULT_COORDINATES = {
  latitude: 40.7128,
  longitude: -74.0060,
  address: 'New York, NY',
};

// Bid sorting options
export const BID_SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'fare-asc' },
  { label: 'Price: High to Low', value: 'fare-desc' },
  { label: 'Time: Oldest First', value: 'time-asc' },
  { label: 'Time: Newest First', value: 'time-desc' },
];

// Colors for different status
export const STATUS_COLORS = {
  connected: '#28a745',
  disconnected: '#dc3545',
  pending: '#ffc107',
  success: '#28a745',
  error: '#dc3545',
  warning: '#fd7e14',
  info: '#17a2b8',
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  GENERAL_ERROR: 'Something went wrong. Please try again.',
  NO_ACTIVE_REQUEST: 'No active ride request found.',
  NO_USER_LOGGED_IN: 'Please login first.',
  INVALID_BID_AMOUNT: 'Please enter a valid bid amount.',
  NO_BIDS_RECEIVED: 'No bids received yet.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully!',
  USER_LOGGED_IN: 'User logged in successfully!',
  RIDE_REQUEST_CREATED: 'Ride request created successfully!',
  BID_ACCEPTED: 'Bid accepted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
};

// Form field placeholders
export const PLACEHOLDERS = {
  USER_NAME: 'Enter your full name',
  USER_EMAIL: 'Enter your email address',
  USER_PHONE: 'Enter your phone number',
  USER_ADDRESS: 'Enter your default address',
  PICKUP_LOCATION: 'Enter pickup location',
  DESTINATION: 'Enter destination',
  BID_AMOUNT: 'Enter your bid amount',
};

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 400,
  LONG: 600,
};

// Screen names for navigation
export const SCREEN_NAMES = {
  USER_AUTH: 'UserAuth',
  RIDE_BOOKING: 'RideBooking',
  BID_DISPLAY: 'BidDisplay',
  RIDE_TRACKING: 'RideTracking',
  RIDE_HISTORY: 'RideHistory',
  USER_PROFILE: 'UserProfile',
};

// User type definitions - Aligned with backend models
export interface UserData {
  userId: string;
  name: string;
  phone: string;
  email?: string;
  defaultLocation?: Location;
  rating?: number;
  totalRides?: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
}

export interface RideRequest {
  _id: string;
  userId: string;
  pickupLocation: Location;
  destination: Location;
  status: 'pending' | 'bidding' | 'accepted' | 'completed' | 'cancelled';
  estimatedDistance?: number; // in kilometers
  estimatedDuration?: number; // in minutes
  bids: Bid[];
  acceptedBid?: AcceptedBid;
  createdAt: string;
  updatedAt: string;
  // Legacy support for components that might still use requestId
  requestId?: string;
}

export interface Bid {
  _id: string;
  driverId: string;
  fareAmount: number;
  bidTime: string; // ISO date string
  rank?: number;
  isLowest?: boolean;
  isHighest?: boolean;
  driver?: DriverInfo;
}

export interface AcceptedBid {
  driverId: string;
  fareAmount: number;
  bidTime: string;
}

export interface DriverInfo {
  driverId: string;
  name: string;
  phone?: string;
  email?: string;
  vehicleInfo?: VehicleInfo;
  currentLocation?: Location;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  totalEarnings?: number;
  totalRides?: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BidSortOption = 'fare-asc' | 'fare-desc' | 'time-asc' | 'time-desc';