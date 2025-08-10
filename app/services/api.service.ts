/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { ServiceResponse } from '@/types/types';

// --------------------------------------------------------------------------------
// API Client Setup
// --------------------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15-second timeout
});

// --- Request Interceptor ---
apiClient.interceptors.request.use(
  (config) => {
    // In a real app, you'd get the token from a storage service
    // const token = storageService.getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor ---
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message);
    // Handle specific error codes globally if needed
    if (error.response?.status === 401) {
      // e.g., redirect to login
      console.error('Unauthorized access - 401');
    }
    return Promise.reject(error);
  }
);

// --------------------------------------------------------------------------------
// Generic API Handler
// --------------------------------------------------------------------------------

async function handleRequest<T>(promise: Promise<AxiosResponse<any>>): Promise<ServiceResponse<T>> {
  try {
    const response = await promise;
    return {
      success: true,
      data: response.data.data as T,
      message: response.data.message || 'Request successful',
    };
  } catch (error: any) { 
    const axiosError = error as AxiosError<any>;
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unknown error occurred';
    const errorCode = axiosError.response?.data?.code || axiosError.response?.status || 500;
    const errorDetails = axiosError.response?.data?.errors || null;

    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      },
    };
  }
}

// --------------------------------------------------------------------------------
// Ride Request Service
// --------------------------------------------------------------------------------

const rideRequestService = {
  getAvailableRideRequests: (params?: any) => handleRequest<any>(apiClient.get('/ride-requests/available', { params })),
  getRideRequest: (requestId: string) => handleRequest<any>(apiClient.get(`/ride-requests/${requestId}`)),
  getUserRideRequests: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/ride-requests/user/${userId}`, { params })),
  getRideRequestBids: (requestId: string, params?: any) => handleRequest<any>(apiClient.get(`/ride-requests/${requestId}/bids`, { params })),
  getRideRequestAnalytics: (params?: any) => handleRequest<any>(apiClient.get('/ride-requests/analytics', { params })),
  bulkCancelRequests: (data: { requestIds: string[]; reason: string }) => handleRequest<any>(apiClient.post('/ride-requests/bulk-cancel', data)),
  optimizeMatching: (data: any) => handleRequest<any>(apiClient.post('/ride-requests/optimize-matching', data)),
};

// --------------------------------------------------------------------------------
// Driver Service
// --------------------------------------------------------------------------------

const driverService = {
  getDriverProfile: (driverId: string) => handleRequest<any>(apiClient.get(`/drivers/profile/${driverId}`)),
  updateDriverProfile: (driverId: string, data: any) => handleRequest<any>(apiClient.put(`/drivers/profile/${driverId}`, data)),
  getDriverEarnings: (driverId: string, params?: any) => handleRequest<any>(apiClient.get(`/drivers/${driverId}/earnings`, { params })),
  getDriverBids: (driverId: string, params?: any) => handleRequest<any>(apiClient.get(`/drivers/${driverId}/bids`, { params })),
  getDriverRideHistory: (driverId: string, params?: any) => handleRequest<any>(apiClient.get(`/drivers/${driverId}/rides`, { params })),
  updateDriverStatus: (driverId: string, data: { status: string }) => handleRequest<any>(apiClient.patch(`/drivers/${driverId}/status`, data)),
  updateDriverLocation: (driverId: string, data: { location: any }) => handleRequest<any>(apiClient.put(`/drivers/${driverId}/location`, data)),
  getDriverStats: (driverId: string, params?: any) => handleRequest<any>(apiClient.get(`/drivers/${driverId}/stats`, { params })),
  getDriverVehicles: (driverId: string) => handleRequest<any>(apiClient.get(`/drivers/${driverId}/vehicles`)),
  assignVehiclesToDriver: (driverId: string, data: { vehicleIds: string[] }) => handleRequest<any>(apiClient.post(`/drivers/${driverId}/vehicles`, data)),
  removeVehiclesFromDriver: (driverId: string, data: { vehicleIds: string[] }) => handleRequest<any>(apiClient.delete(`/drivers/${driverId}/vehicles`, { data })),
  getAvailableDrivers: (params?: any) => handleRequest<any>(apiClient.get('/drivers/available', { params })),
  getNearbyDrivers: (params: any) => handleRequest<any>(apiClient.get('/drivers/nearby', { params })),
  getConnectedDrivers: () => handleRequest<any>(apiClient.get('/drivers/connected')),
};

// --------------------------------------------------------------------------------
// User Service
// --------------------------------------------------------------------------------

const userService = {
  getUserProfile: (userId: string) => handleRequest<any>(apiClient.get(`/users/profile/${userId}`)),
  updateUserProfile: (userId: string, data: any) => handleRequest<any>(apiClient.put(`/users/profile/${userId}`, data)),
  getUserRideHistory: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/users/${userId}/ride-history`, { params })),
  getUserStats: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/users/${userId}/stats`, { params })),
  updateUserLocation: (userId: string, data: { location: any }) => handleRequest<any>(apiClient.put(`/users/${userId}/location`, data)),
  updateUserPreferences: (userId: string, data: any) => handleRequest<any>(apiClient.put(`/users/${userId}/preferences`, data)),
  getPersonalizedRecommendations: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/users/${userId}/recommendations`, { params })),
  getUserFavorites: (userId: string) => handleRequest<any>(apiClient.get(`/users/${userId}/favorites`)),
  getUserBehaviorInsights: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/users/${userId}/behavior-insights`, { params })),
};

// --------------------------------------------------------------------------------
// Vehicle Service
// --------------------------------------------------------------------------------

const vehicleService = {
  searchVehiclesForRide: (params: any) => handleRequest<any>(apiClient.get('/vehicles/search', { params })),
  getVehiclesByType: (params: any) => handleRequest<any>(apiClient.get('/vehicles/by-type', { params })),
  getVehicleStatistics: (params?: any) => handleRequest<any>(apiClient.get('/vehicles/statistics', { params })),
  getVehicles: (params?: any) => handleRequest<any>(apiClient.get('/vehicles', { params })),
  createVehicle: (data: any) => handleRequest<any>(apiClient.post('/vehicles', data)),
  getVehicle: (vehicleId: string) => handleRequest<any>(apiClient.get(`/vehicles/${vehicleId}`)),
  updateVehicle: (vehicleId: string, data: any) => handleRequest<any>(apiClient.put(`/vehicles/${vehicleId}`, data)),
  updateVehicleStatus: (vehicleId: string, data: { status: string }) => handleRequest<any>(apiClient.patch(`/vehicles/${vehicleId}/status`, data)),
  deleteVehicle: (vehicleId: string) => handleRequest<any>(apiClient.delete(`/vehicles/${vehicleId}`)),
  getMaintenanceRecommendations: (params?: any) => handleRequest<any>(apiClient.get('/vehicles/maintenance-recommendations', { params })),
};

// --------------------------------------------------------------------------------
// Admin Service
// --------------------------------------------------------------------------------

const adminService = {
  // Stats & History
  getSystemStats: (params?: any) => handleRequest<any>(apiClient.get('/admin/stats', { params })),
  getDriverBidHistory: (driverId: string, params?: any) => handleRequest<any>(apiClient.get(`/admin/driver/${driverId}/bids`, { params })),
  getAdminUserRideHistory: (userId: string, params?: any) => handleRequest<any>(apiClient.get(`/admin/user/${userId}/rides`, { params })),
  getPendingBids: (params?: any) => handleRequest<any>(apiClient.get('/admin/pending-bids', { params })),
  
  // Data Management
  cleanupOldRequests: () => handleRequest<any>(apiClient.delete('/admin/cleanup')),
  backupData: (params?: any) => handleRequest<any>(apiClient.get('/admin/backup', { params })),
  getSystemHealth: () => handleRequest<any>(apiClient.get('/admin/health')),

  // Analytics
  getAuthAnalytics: () => handleRequest<any>(apiClient.get('/admin/analytics/auth')),
  getDriverAnalytics: (params?: any) => handleRequest<any>(apiClient.get('/admin/analytics/drivers', { params })),
  getRideAnalytics: () => handleRequest<any>(apiClient.get('/admin/analytics/rides')),
  getUserAnalytics: () => handleRequest<any>(apiClient.get('/admin/analytics/users')),
  getVehicleAnalytics: () => handleRequest<any>(apiClient.get('/admin/analytics/vehicles')),
  getConnectionAnalytics: () => handleRequest<any>(apiClient.get('/admin/analytics/connections')),
  getUserBehaviorInsights: (params?: any) => handleRequest<any>(apiClient.get('/admin/insights/user-behavior', { params })),

  // Bulk Operations
  bulkUpdateAuthStatus: (data: any) => handleRequest<any>(apiClient.patch('/admin/bulk/auth-status', data)),
  bulkUpdateDriverStatus: (data: any) => handleRequest<any>(apiClient.patch('/admin/bulk/driver-status', data)),
  bulkUpdateUserPreferences: (data: any) => handleRequest<any>(apiClient.patch('/admin/bulk/user-preferences', data)),

  // System Optimization
  optimizeMatching: (data: any) => handleRequest<any>(apiClient.post('/admin/optimize/matching', data)),
  optimizeVehicleAllocation: (data: any) => handleRequest<any>(apiClient.post('/admin/optimize/vehicles', data)),
  optimizeSocketPerformance: () => handleRequest<any>(apiClient.post('/admin/optimize/sockets')),

  // Maintenance
  performAuthMaintenance: () => handleRequest<any>(apiClient.post('/admin/maintenance/auth')),
  getVehicleMaintenanceRecommendations: () => handleRequest<any>(apiClient.get('/admin/maintenance/vehicles')),

  // Communication
  broadcastAnnouncement: (data: { message: string; level: string }) => handleRequest<any>(apiClient.post('/admin/broadcast', data)),
};

// --------------------------------------------------------------------------------
// Export All Services
// --------------------------------------------------------------------------------

// --------------------------------------------------------------------------------
// Auth Service (for login/registration)
// --------------------------------------------------------------------------------

const authService = {
  loginUser: (data: any) => handleRequest<any>(apiClient.post('/auth/login/user', data)),
  registerUser: (data: any) => handleRequest<any>(apiClient.post('/auth/register/user', data)),
  loginDriver: (data: any) => handleRequest<any>(apiClient.post('/auth/login/driver', data)),
  registerDriver: (data: any) => handleRequest<any>(apiClient.post('/auth/register/driver', data)),
  getStats: () => handleRequest<any>(apiClient.get('/auth/stats')),
};


// --------------------------------------------------------------------------------
// Export All Services
// --------------------------------------------------------------------------------

const apiService = {
  auth: authService,
  rideRequest: rideRequestService,
  driver: driverService,
  user: userService,
  vehicle: vehicleService,
  admin: adminService,
};

export default apiService;
