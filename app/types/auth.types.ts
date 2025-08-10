import type { DriverStatus, VehicleType, Location } from './types';

// --- Base User/Driver Interfaces ---
export interface BaseUser {
    name: string;
    phone: string;
    email?: string;
}

export interface User extends BaseUser {
    location: any;
    currentLocation: Location | undefined;
    _id: string; // Compatibility with types.ts
    userId: string;
    createdAt: Date; // Compatibility with types.ts
    updatedAt: Date; // Compatibility with types.ts
    preferences?: UserPreferences;
    isActive: boolean;
}

export interface Driver extends BaseUser {
    location: any;
    _id: string; // Compatibility with types.ts
    driverId: string;
    vehicleInfo: VehicleInfo;
    currentLocation?: Location;
    status: DriverStatus;
    rating: number; // Compatibility with types.ts
    isVerified: boolean;
    createdAt: Date; // Compatibility with types.ts
    updatedAt: Date; // Compatibility with types.ts
}

// --- Authentication Data ---
export interface UserLoginData {
    phone: string;
}

export interface UserRegistrationData extends BaseUser {}

export interface DriverLoginData {
    phone: string;
}

export interface DriverRegistrationData extends BaseUser {
    vehicleInfo: VehicleInfo;
}

// --- Supporting Types ---
export interface VehicleInfo {
    make: string; // Compatibility with types.ts
    model: string;
    licensePlate: string;
    year: number;
    color: string;
    type: VehicleType;
}

export interface UserPreferences {
    preferredVehicleType?: VehicleType;
    paymentMethod?: string;
}



export interface LocationUpdate {
    location: Location;
}

export interface Vehicle {
    vehicleId: string;
    driverId: string;
    type: VehicleType;
    model: string;
    licensePlate: string;
    isAvailable: boolean;
}
