import config from '@/config/env';
// Network configuration - automatically detects environment


const SERVER_URL = config.MAIN_URL;

// API Configuration - Updated to work with backend
export const API_BASE_URL = config.API_BASE_URL;
export const SOCKET_URL = `http://${SERVER_URL}`;


// API Endpoints


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

// Vehicle makes
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
