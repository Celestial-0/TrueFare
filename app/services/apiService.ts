import { API_BASE_URL, parseVehicleYear } from '../utils/constants';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  field?: string;
}

export interface DriverRegistrationResponse {
  driverId: string;
  name: string;
  email?: string;
  phone: string;
  status: string;
  isOnline: boolean;
  createdAt: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string;
    color?: string;
  };
}

export interface UserRegistrationResponse {
  userId: string;
  name: string;
  email?: string;
  phone: string;
  isOnline: boolean;
  createdAt: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 Making API request to:', url);
      console.log('📤 Request options:', options);
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      });

      const data = await response.json();
      console.log('📥 API Response:', { status: response.status, ok: response.ok, data });

      // If the response is not ok, but we got a structured error response from backend
      if (!response.ok) {
        // Return the backend error structure as-is
        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`,
          code: data.code,
          field: data.field,
          message: data.message,
        };
      }

      return data;
    } catch (error) {
      console.error('💥 API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Driver API methods
  async registerDriver(driverData: {
    name: string;
    email?: string;
    phone: string;
    vehicleInfo: {
      make: string;
      model: string;
      year: string;
      licensePlate: string;
      color: string;
    };
  }): Promise<ApiResponse<DriverRegistrationResponse>> {
    // Transform frontend data to match backend schema
    const backendData: any = {
      name: driverData.name,
      phone: driverData.phone,
      ...(driverData.email && { email: driverData.email }),
    };

    // Only include vehicleInfo if at least one field has content
    const hasVehicleInfo = Object.values(driverData.vehicleInfo).some(value => value && value.trim());
    if (hasVehicleInfo) {
      backendData.vehicleInfo = {
        make: driverData.vehicleInfo.make || '',
        model: driverData.vehicleInfo.model || '',
        year: parseVehicleYear(driverData.vehicleInfo.year),
        licensePlate: driverData.vehicleInfo.licensePlate || '',
        color: driverData.vehicleInfo.color || '',
      };
    }

    return this.post<DriverRegistrationResponse>('/drivers/register', backendData);
  }

  async getDriverProfile(driverId: string) {
    return this.get(`/drivers/profile/${driverId}`);
  }

  async updateDriverProfile(driverId: string, updateData: any) {
    return this.put(`/drivers/profile/${driverId}`, updateData);
  }

  async updateDriverStatus(driverId: string, status: string) {
    return this.patch(`/drivers/${driverId}/status`, { status });
  }

  async getDriverEarnings(driverId: string) {
    return this.get(`/drivers/${driverId}/earnings`);
  }

  async getDriverBids(driverId: string) {
    return this.get(`/drivers/${driverId}/bids`);
  }

  async getDriverRideHistory(driverId: string) {
    return this.get(`/drivers/${driverId}/rides`);
  }

  async updateVehicleInfo(driverId: string, vehicleInfo: any) {
    return this.patch(`/drivers/${driverId}/vehicle`, { vehicleInfo });
  }

  async getConnectedDrivers() {
    return this.get('/drivers/connected');
  }

  // User API methods
  async registerUser(userData: {
    name: string;
    email?: string;
    phone: string;
  }): Promise<ApiResponse<UserRegistrationResponse>> {
    const backendData = {
      name: userData.name,
      phone: userData.phone,
      ...(userData.email && { email: userData.email }),
    };
    return this.post<UserRegistrationResponse>('/users/register', backendData);
  }

  async getUserProfile(userId: string) {
    return this.get(`/users/profile/${userId}`);
  }

  // Check if user exists by phone (for login simulation)
  async findUserByPhone(phone: string) {
    // Since the backend doesn't have a direct login endpoint, 
    // we'll use the connected users endpoint and filter
    return this.get(`/users?phone=${phone}`);
  }

  // Check if driver exists by phone (for login simulation)  
  async findDriverByPhone(phone: string) {
    // Since the backend doesn't have a direct login endpoint,
    // we'll use the connected drivers endpoint and filter
    return this.get(`/drivers?phone=${phone}`);
  }

  // Login methods
  async loginUser(userData: {
    phone: string;
  }): Promise<ApiResponse<UserRegistrationResponse>> {
    return this.post<UserRegistrationResponse>('/auth/login/user', userData);
  }

  async loginDriver(driverData: {
    phone: string;
  }): Promise<ApiResponse<DriverRegistrationResponse>> {
    return this.post<DriverRegistrationResponse>('/auth/login/driver', driverData);
  }

  // Ride Request API methods
  async createRideRequest(rideData: {
    userId: string;
    pickupLocation: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    destination: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    estimatedDistance?: number;
    estimatedDuration?: number;
  }) {
    return this.post('/ride-requests', rideData);
  }

  async getRideRequests(userId?: string) {
    const endpoint = userId ? `/ride-requests/user/${userId}` : '/ride-requests';
    return this.get(endpoint);
  }

  async getAvailableRideRequests() {
    return this.get('/ride-requests/available');
  }

  async placeBid(requestId: string, bidData: {
    driverId: string;
    fareAmount: number;
    estimatedPickupTime?: string;
    message?: string;
  }) {
    return this.post(`/ride-requests/${requestId}/bids`, bidData);
  }

  async acceptBid(requestId: string, bidId: string) {
    return this.post(`/ride-requests/${requestId}/bids/${bidId}/accept`);
  }

  async getRideRequestBids(requestId: string) {
    return this.get(`/ride-requests/${requestId}/bids`);
  }
}

export default new ApiService();
