import { z } from 'zod';
import { APP_CONSTANTS } from '../constants.js';

// Coordinate validation schema
const coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});



// Location validation schema
const locationSchema = z.object({
    address: z.string().min(1).max(500),
    coordinates: coordinatesSchema
});

// Vehicle info validation schema (simplified for driver registration)
const vehicleInfoSchema = z.object({
    make: z.string().max(50).optional().or(z.literal('')),
    model: z.string().max(50).optional().or(z.literal('')),
    year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    licensePlate: z.string().max(20).optional().or(z.literal('')),
    vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortLevel: z.number().min(1).max(5).int().optional(),
    priceValue: z.number().min(1).max(5).int().optional()
});

// Driver registration validation
export const driverRegistrationSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim(),
    vehicleInfo: vehicleInfoSchema.optional(),
    currentLocation: locationSchema.optional()
});

// Driver update validation
export const driverUpdateSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional(),
    vehicleInfo: vehicleInfoSchema.optional(),
    currentLocation: locationSchema.optional(),
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE]).optional()
});

// Driver location update validation
export const driverLocationUpdateSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(1).max(500).optional()
});

// Driver socket registration validation
export const driverSocketRegistrationSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().min(1).max(500).optional()
    }),
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE]).optional(),
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional(),
    vehicleInfo: vehicleInfoSchema.optional()
});

// Driver status update validation
export const driverStatusUpdateSchema = z.object({
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE])
});

// Driver vehicle assignment validation
export const driverVehicleAssignmentSchema = z.object({
    vehicleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'))
        .min(0, 'Vehicle IDs array cannot be negative')
        .max(10, 'Cannot assign more than 10 vehicles')
});

// Driver query validation
export const driverQuerySchema = z.object({
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE]).optional(),
    isOnline: z.boolean().optional(),
    minRating: z.number().min(0).max(5).optional(),
    maxRating: z.number().min(0).max(5).optional(),
    hasVehicles: z.boolean().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['name', 'rating', 'totalRides', 'status', 'createdAt', 'lastSeen']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Driver online status validation
export const driverOnlineStatusSchema = z.object({
    isOnline: z.boolean()
});

// Common validation helpers
export const validateDriverId = (driverId) => {
    return z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').safeParse(driverId);
};

export const validateVehicleInfo = (vehicleInfo) => {
    return vehicleInfoSchema.safeParse(vehicleInfo);
};

export const validateDriverLocation = (location) => {
    return driverLocationUpdateSchema.safeParse(location);
};

export const validateDriverStatus = (status) => {
    return z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE]).safeParse(status);
};

export const validateVehicleIds = (vehicleIds) => {
    return z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format')).safeParse(vehicleIds);
};
