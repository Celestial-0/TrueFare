/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from './api.service';
import type { ServiceResponse, DriverStatus } from '@/types/types';
import type { 
    User, 
    Driver, 
    UserLoginData, 
    UserRegistrationData, 
    DriverLoginData, 
    DriverRegistrationData,
    LocationUpdate
} from '../types/auth.types';

/**
 * AuthService provides methods for all authentication and user/driver management API calls.
 */
export const authService = {
    /**
     * Authentication endpoints for user and driver login/registration.
     */
    auth: {
        loginUser(credentials: UserLoginData): Promise<ServiceResponse<User>> {
            return apiService.auth.loginUser(credentials);
        },
        registerUser(userData: UserRegistrationData): Promise<ServiceResponse<User>> {
            return apiService.auth.registerUser(userData);
        },
        loginDriver(credentials: DriverLoginData): Promise<ServiceResponse<Driver>> {
            return apiService.auth.loginDriver(credentials);
        },
        registerDriver(driverData: DriverRegistrationData): Promise<ServiceResponse<Driver>> {
            return apiService.auth.registerDriver(driverData);
        },
    },

    /**
     * Profile management for users and drivers.
     */
    profile: {
        getUserProfile(userId: string): Promise<ServiceResponse<User>> {
            return apiService.user.getUserProfile(userId);
        },
        updateUserProfile(userId: string, data: Partial<User>): Promise<ServiceResponse<User>> {
            return apiService.user.updateUserProfile(userId, data);
        },
        getDriverProfile(driverId: string): Promise<ServiceResponse<Driver>> {
            return apiService.driver.getDriverProfile(driverId);
        },
        updateDriverProfile(driverId: string, data: Partial<Driver>): Promise<ServiceResponse<Driver>> {
            return apiService.driver.updateDriverProfile(driverId, data);
        },
    },

    /**
     * Real-time status and location updates.
     */
    status: {
        updateUserLocation(userId: string, data: LocationUpdate): Promise<ServiceResponse<any>> {
            return apiService.user.updateUserLocation(userId, data);
        },
        updateDriverLocation(driverId: string, data: LocationUpdate): Promise<ServiceResponse<any>> {
            return apiService.driver.updateDriverLocation(driverId, data);
        },
        updateDriverStatus(driverId: string, data: { status: DriverStatus; vehicleId?: string }): Promise<ServiceResponse<any>> {
            return apiService.driver.updateDriverStatus(driverId, data);
        },
    },

    /**
     * Vehicle management for drivers.
     */
    vehicle: {
        getDriverVehicles(driverId: string): Promise<ServiceResponse<any>> {
            return apiService.driver.getDriverVehicles(driverId);
        },
        assignVehiclesToDriver(driverId: string, vehicleIds: string[]): Promise<ServiceResponse<any>> {
            return apiService.driver.assignVehiclesToDriver(driverId, { vehicleIds });
        },
    },

    /**
     * Admin and system-level operations.
     */
    system: {
        getAuthStats(): Promise<ServiceResponse<any>> {
            return apiService.auth.getStats();
        },
        bulkUpdateAuthStatus(data: any): Promise<ServiceResponse<any>> {
            return apiService.admin.bulkUpdateAuthStatus(data);
        },
        performAuthMaintenance(): Promise<ServiceResponse<any>> {
            return apiService.admin.performAuthMaintenance();
        },
    },
};