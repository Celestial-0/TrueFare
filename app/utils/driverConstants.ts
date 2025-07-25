// API Base URL - Update this to match your backend server
export const API_BASE_URL = `http://${process.env.EXPO_PUBLIC_MAIN_URL}:8000/api`; // Change to your backend URL

// Socket.io connection URL
export const SOCKET_URL = `http://${process.env.EXPO_PUBLIC_MAIN_URL}:8000`; // Change to your backend URL

// API Endpoints
export const API_ENDPOINTS = {
  // Driver endpoints
  DRIVER_REGISTER: '/drivers/register',
  DRIVER_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
  DRIVER_EARNINGS: (driverId: string) => `/drivers/${driverId}/earnings`,
  DRIVER_RIDE_HISTORY: (driverId: string) => `/drivers/${driverId}/rides`,
  UPDATE_DRIVER_STATUS: (driverId: string) => `/drivers/${driverId}/status`,
  UPDATE_DRIVER_LOCATION: (driverId: string) => `/drivers/${driverId}/location`,
  
  // Ride request endpoints
  AVAILABLE_REQUESTS: '/ride-requests/available',
  PLACE_BID: (requestId: string) => `/ride-requests/${requestId}/bids`,
  DRIVER_BIDS: (driverId: string) => `/drivers/${driverId}/bids`,
  
  // Vehicle endpoints
  UPDATE_VEHICLE_INFO: (driverId: string) => `/drivers/${driverId}/vehicle`,
};

// Socket Events (match backend events)
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Driver events
  DRIVER_REGISTER: 'driver:register',
  DRIVER_REGISTERED: 'driver:registered',
  NEW_RIDE_REQUEST: 'newRideRequest',
  PLACE_BID: 'driver:placeBid',
  BID_CONFIRMED: 'bid:confirmed',
  BID_ACCEPTED: 'bid:accepted',
  BIDDING_CLOSED: 'bidding:closed',
  
  // Status updates
  UPDATE_STATUS: 'driver:updateStatus',
  UPDATE_LOCATION: 'driver:updateLocation',
};

// Driver Status Constants (match backend constants)
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

// Ride Status Constants (match backend)
export const RIDE_STATUS = {
  PENDING: 'pending',
  BIDDING: 'bidding',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Bid Status Constants
export const BID_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MIN_PHONE_LENGTH: 10,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[\d\s\-\(\)]+$/,
  MIN_VEHICLE_YEAR: 1900,
  MAX_VEHICLE_YEAR: new Date().getFullYear() + 1,
  MIN_BID_AMOUNT: 1,
  MAX_BID_AMOUNT: 1000,
  LICENSE_PLATE_REGEX: /^[A-Z0-9\-\s]+$/i,
};

// Default coordinates (New York City)
export const DEFAULT_COORDINATES = {
  latitude: 40.7128,
  longitude: -74.0060,
  address: 'New York, NY',
};

// Vehicle types and makes
export const VEHICLE_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Lexus', 'Other'
];

export const VEHICLE_COLORS = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Yellow', 'Other'
];

// Colors for different status (updated to remove on_ride)
export const STATUS_COLORS = {
  available: '#28a745',
  busy: '#ffc107',
  offline: '#dc3545',
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
  NO_ACTIVE_BID: 'No active bid found.',
  NO_DRIVER_LOGGED_IN: 'Please login first.',
  INVALID_BID_AMOUNT: 'Please enter a valid bid amount.',
  BID_TOO_LOW: 'Bid amount is too low.',
  BID_TOO_HIGH: 'Bid amount is too high.',
  ALREADY_PLACED_BID: 'You have already placed a bid for this request.',
  REQUEST_EXPIRED: 'This ride request has expired.',
  DRIVER_NOT_AVAILABLE: 'Driver is not available for new requests.',
  INVALID_VEHICLE_INFO: 'Please provide valid vehicle information.',
  LOCATION_PERMISSION_DENIED: 'Location permission is required.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  DRIVER_REGISTERED: 'Driver registered successfully!',
  DRIVER_LOGGED_IN: 'Driver logged in successfully!',
  BID_PLACED: 'Bid placed successfully!',
  BID_ACCEPTED: 'Congratulations! Your bid was accepted!',
  STATUS_UPDATED: 'Status updated successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  VEHICLE_INFO_UPDATED: 'Vehicle information updated successfully!',
  LOCATION_UPDATED: 'Location updated successfully!',
};

// Form field placeholders
export const PLACEHOLDERS = {
  DRIVER_NAME: 'Enter your full name',
  DRIVER_EMAIL: 'Enter your email address',
  DRIVER_PHONE: 'Enter your phone number',
  VEHICLE_MAKE: 'Select vehicle make',
  VEHICLE_MODEL: 'Enter vehicle model',
  VEHICLE_YEAR: 'Enter vehicle year',
  VEHICLE_PLATE: 'Enter license plate number',
  VEHICLE_COLOR: 'Select vehicle color',
  BID_AMOUNT: 'Enter your bid amount (₹)',
  DRIVER_ID: 'Driver ID will be auto-generated',
};

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 400,
  LONG: 600,
};

// Screen names for navigation
export const SCREEN_NAMES = {
  DRIVER_AUTH: 'DriverAuth',
  DRIVER_DASHBOARD: 'DriverDashboard',
  AVAILABLE_REQUESTS: 'AvailableRequests',
  ACTIVE_RIDE: 'ActiveRide',
  DRIVER_EARNINGS: 'DriverEarnings',
  VEHICLE_INFO: 'VehicleInfo',
  DRIVER_PROFILE: 'DriverProfile',
};

// Driver type definitions
export interface DriverData {
  driverId?: string;
  name: string;
  phone: string;
  email?: string;
  vehicleInfo?: VehicleInfo;
  currentLocation?: Location;
  status?: string;
  rating?: number;
  totalRides?: number;
  totalEarnings?: number;
  createdAt?: string;
}

// Driver type definitions - Aligned with backend models
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
  user?: UserInfo;
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

export interface UserInfo {
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  defaultLocation?: Location;
  rating: number;
  totalRides: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Earnings {
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalRides: number;
  completedRides: number;
  averageRating: number;
  ridesThisWeek: number;
  ridesThisMonth: number;
}

export interface ActiveRide {
  rideId: string;
  requestId: string;
  driverId: string;
  userId: string;
  pickupLocation: Location;
  destination: Location;
  fareAmount: number;
  status: string;
  startTime?: string;
  endTime?: string;
  user?: UserInfo;
}

export type DriverStatusType = typeof DRIVER_STATUS[keyof typeof DRIVER_STATUS];
export type RideStatusType = typeof RIDE_STATUS[keyof typeof RIDE_STATUS];
export type BidStatusType = typeof BID_STATUS[keyof typeof BID_STATUS];
