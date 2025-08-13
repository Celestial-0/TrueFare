import config from '@/config/env';
// Network configuration - automatically detects environment


const SERVER_URL = config.MAIN_URL;

// API Configuration - Updated to work with backend
export const API_BASE_URL = config.API_BASE_URL;
export const SOCKET_URL = `http://${SERVER_URL}`;
// Socket Events - Updated to match backend exactly

// Ride Status Constants


// Driver Status Constants

// Validation Constants


// Default coordinates (New York City)

// Bid sorting options

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

