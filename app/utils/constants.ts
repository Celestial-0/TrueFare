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

// Common API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  REGISTER_DRIVER: '/drivers/register',
  REGISTER_USER: '/users/register',
  
  // Driver endpoints
  DRIVER_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
  CONNECTED_DRIVERS: '/drivers/connected',
  
  // User endpoints
  USER_PROFILE: (userId: string) => `/users/profile/${userId}`,
  
  // Ride requests
  RIDE_REQUESTS: '/ride-requests',
  AVAILABLE_REQUESTS: '/ride-requests/available',
  USER_RIDE_REQUESTS: (userId: string) => `/ride-requests/user/${userId}`,
  PLACE_BID: (requestId: string) => `/ride-requests/${requestId}/bids`,
  ACCEPT_BID: (requestId: string, bidId: string) => `/ride-requests/${requestId}/bids/${bidId}/accept`,
  RIDE_REQUEST_BIDS: (requestId: string) => `/ride-requests/${requestId}/bids`,
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
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
  UPDATE_STATUS: 'driver:updateStatus',
  UPDATE_LOCATION: 'driver:updateLocation',
  
  // User events
  USER_REGISTER: 'user:register',
  USER_REGISTERED: 'user:registered',
  NEW_BID: 'newBid',
  BIDS_UPDATED: 'bids:updated',
};

// Status Constants (match backend)
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
};

export const RIDE_STATUS = {
  PENDING: 'pending',
  BIDDING: 'bidding',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// App Configuration
export const APP_CONFIG = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  BID_TIMEOUT: 120000, // 2 minutes
  MAX_RETRY_ATTEMPTS: 3,
};

// Utility Functions
export const parseVehicleYear = (year: string | number | undefined): number | undefined => {
  if (year === undefined || year === null || year === '') {
    return undefined;
  }
  
  const parsed = typeof year === 'string' ? parseInt(year, 10) : year;
  return isNaN(parsed) ? undefined : parsed;
};