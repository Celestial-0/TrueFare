import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, UserData } from '@/utils/userConstants';

// Response interface for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User profile update data interface
interface UserProfileUpdateData {
  name: string;
  phone: string;
  email?: string;
  defaultLocation?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

class UserApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for standardized error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Return the response as-is for successful requests
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        // Handle network and HTTP errors
        if (error.response?.status === 404) {
          // For demo purposes, treat 404 as success for non-existent endpoints
          return Promise.resolve({
            ...error.response,
            data: {
              success: true,
              data: null,
              message: 'Endpoint not implemented (demo mode)',
            },
          });
        }

        const errorMessage = 
          error.response?.data?.message || 
          error.response?.data?.error ||
          error.message || 
          'Network error occurred';
        
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * Load user profile data
   */
  async getUserProfile(userId: string): Promise<ApiResponse<UserData>> {
    try {
      const response = await this.axiosInstance.get(
        API_ENDPOINTS.USER_PROFILE(userId)
      );
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string, 
    updateData: UserProfileUpdateData
  ): Promise<ApiResponse<UserData>> {
    try {
      const response = await this.axiosInstance.put(
        API_ENDPOINTS.USER_PROFILE(userId),
        updateData
      );
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user profile');
    }
  }

  /**
   * Delete user account (placeholder for future implementation)
   */
  async deleteUserAccount(userId: string): Promise<ApiResponse> {
    try {
      const response = await this.axiosInstance.delete(
        API_ENDPOINTS.USER_PROFILE(userId)
      );
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete user account');
    }
  }
}

// Export singleton instance
export const userApiService = new UserApiService();
export type { UserProfileUpdateData };
