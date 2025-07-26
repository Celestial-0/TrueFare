/**
 * API Endpoints Configuration
 * Centralized endpoint definitions matching backend routes exactly
 */

// Vehicle Types - Updated to match backend
export const VEHICLE_TYPES = {
  TAXI: 'Taxi',
  AC_TAXI: 'AC_Taxi', 
  BIKE: 'Bike',
  EBIKE: 'EBike',
  ERICKSHAW: 'ERiksha',
  AUTO: 'Auto'
} as const;

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

export const API_ENDPOINTS = {
  // Authentication endpoints - Updated to match backend exactly
  AUTH: {
    LOGIN_USER: '/auth/login/user',
    LOGIN_DRIVER: '/auth/login/driver',
    REGISTER_USER: '/auth/register/user',
    REGISTER_DRIVER: '/auth/register/driver',
    GET_USER_PROFILE: (userId: string) => `/auth/user/${userId}`,
    GET_DRIVER_PROFILE: (driverId: string) => `/driver/${driverId}`,
    UPDATE_USER_PROFILE: (userId: string) => `/user/${userId}`,
    UPDATE_DRIVER_PROFILE: (driverId: string) => `/driver/${driverId}`,
    UPDATE_DRIVER_STATUS: (driverId: string) => `/driver/${driverId}/status`,
    UPDATE_USER_LOCATION: (userId: string) => `/user/${userId}/location`,
    UPDATE_DRIVER_LOCATION: (driverId: string) => `/driver/${driverId}/location`,
    GET_AUTH_STATS: '/auth/stats',
    BULK_UPDATE_STATUS: '/auth/bulk-status',
    PERFORM_MAINTENANCE: '/auth/maintenance',
  },

  // User endpoints - Updated to match backend exactly
  USERS: {
    REGISTER: '/users/register',
    GET_PROFILE: (userId: string) => `/users/profile/${userId}`,
    UPDATE_PROFILE: (userId: string) => `/users/profile/${userId}`,
    GET_RIDE_HISTORY: (userId: string) => `/users/${userId}/ride-history`,
    GET_STATS: (userId: string) => `/users/${userId}/stats`,
    UPDATE_LOCATION: (userId: string) => `/users/${userId}/location`,
    UPDATE_PREFERENCES: (userId: string) => `/users/${userId}/preferences`,
    GET_RECOMMENDATIONS: (userId: string) => `/users/${userId}/recommendations`,
    GET_FAVORITES: (userId: string) => `/users/${userId}/favorites`,
    GET_ANALYTICS: '/users/analytics',
    BULK_UPDATE_PREFERENCES: '/users/bulk-preferences',
    GET_BEHAVIOR_INSIGHTS: (userId: string) => `/users/${userId}/behavior-insights`,
  },

  // Driver endpoints - Updated to match backend exactly
  DRIVERS: {
    REGISTER: '/drivers/register',
    GET_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
    UPDATE_PROFILE: (driverId: string) => `/drivers/profile/${driverId}`,
    UPDATE_STATUS: (driverId: string) => `/drivers/${driverId}/status`,
    GET_EARNINGS: (driverId: string) => `/drivers/${driverId}/earnings`,
    GET_BIDS: (driverId: string) => `/drivers/${driverId}/bids`,
    GET_RIDE_HISTORY: (driverId: string) => `/drivers/${driverId}/rides`,
    UPDATE_LOCATION: (driverId: string) => `/drivers/${driverId}/location`,
    GET_STATS: (driverId: string) => `/drivers/${driverId}/stats`,
    GET_VEHICLES: (driverId: string) => `/drivers/${driverId}/vehicles`,
    ADD_VEHICLE: (driverId: string) => `/drivers/${driverId}/vehicles`,
    REMOVE_VEHICLES: (driverId: string) => `/drivers/${driverId}/vehicles`,
    GET_AVAILABLE: '/drivers/available',
    GET_NEARBY: '/drivers/nearby',
    BULK_UPDATE_STATUS: '/drivers/bulk-status',
    GET_ANALYTICS: '/drivers/analytics',
    GET_CONNECTED: '/drivers/connected',
  },

  // Ride Request endpoints - Updated to match backend exactly
  RIDE_REQUESTS: {
    CREATE: '/ride-requests',
    GET_BY_ID: (requestId: string) => `/ride-requests/${requestId}`,
    GET_BY_USER: (userId: string) => `/ride-requests/user/${userId}`,
    GET_BIDS: (requestId: string) => `/ride-requests/${requestId}/bids`,
    PLACE_BID: (requestId: string) => `/ride-requests/${requestId}/bids`,
    ACCEPT_BID: (requestId: string, bidId: string) => `/ride-requests/${requestId}/bids/${bidId}/accept`,
    GET_AVAILABLE: '/ride-requests/available',
    GET_ANALYTICS: '/ride-requests/analytics',
    BULK_CANCEL: '/ride-requests/bulk-cancel',
  },

  // Vehicle endpoints - Updated to match backend exactly
  VEHICLES: {
    CREATE: '/vehicles',
    GET_BY_ID: (vehicleId: string) => `/vehicles/${vehicleId}`,
    UPDATE: (vehicleId: string) => `/vehicles/${vehicleId}`,
    DELETE: (vehicleId: string) => `/vehicles/${vehicleId}`,
    GET_ALL: '/vehicles',
    SEARCH_FOR_RIDE: '/vehicles/search',
    UPDATE_STATUS: (vehicleId: string) => `/vehicles/${vehicleId}/status`,
    GET_BY_TYPE: '/vehicles/by-type',
    GET_STATISTICS: '/vehicles/statistics',
    BULK_UPDATE_STATUS: '/vehicles/bulk-status',
    GET_ANALYTICS: '/vehicles/analytics',
  },

  // Socket endpoints - Updated to match backend exactly
  SOCKET: {
    CONNECT: '/socket/connect',
    DISCONNECT: '/socket/disconnect',
    GET_CONNECTED_USERS: '/socket/users',
    GET_CONNECTED_DRIVERS: '/socket/drivers',
    SEND_ANNOUNCEMENT: '/socket/announcement',
    GET_CONNECTION_ANALYTICS: '/socket/analytics',
  },

  // Admin endpoints - Updated to match backend exactly
  ADMIN: {
    GET_DASHBOARD_STATS: '/admin/dashboard',
    GET_USER_ANALYTICS: '/admin/users/analytics',
    GET_DRIVER_ANALYTICS: '/admin/drivers/analytics',
    GET_RIDE_ANALYTICS: '/admin/rides/analytics',
    GET_FINANCIAL_REPORTS: '/admin/financial/reports',
    MANAGE_USERS: '/admin/users',
    MANAGE_DRIVERS: '/admin/drivers',
    SYSTEM_HEALTH: '/admin/system/health',
    AUDIT_LOGS: '/admin/audit/logs',
  },
};

// Helper function to build URL with query parameters
export const buildUrlWithParams = (baseUrl: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Helper function to validate endpoint parameters
export const validateEndpointParams = (endpoint: string, params: Record<string, any>): boolean => {
  const paramPattern = /:(\w+)/g;
  const requiredParams = [];
  let match;

  while ((match = paramPattern.exec(endpoint)) !== null) {
    requiredParams.push(match[1]);
  }

  return requiredParams.every(param => params[param] !== undefined);
};

// Common query parameter builders
export const buildPaginationParams = (page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => ({
  page,
  limit,
  sortBy,
  sortOrder,
});

export const buildLocationParams = (latitude?: number, longitude?: number, radius?: number) => ({
  latitude,
  longitude,
  radius,
});

export const buildDateRangeParams = (startDate?: string, endDate?: string) => ({
  startDate,
  endDate,
});
