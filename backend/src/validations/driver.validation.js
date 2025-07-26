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
    make: z.string().max(50).optional().default(''),
    model: z.string().max(50).optional().default(''),
    year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    licensePlate: z.string().max(20).optional().default(''),
    vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortLevel: z.number().min(1).max(5).int().optional(),
    priceValue: z.number().min(1).max(5).int().optional()
});

// Driver registration validation
export const driverRegistrationSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim(),
    vehicleInfo: z.object({
        make: z.string().min(1).max(50).trim(),
        model: z.string().min(1).max(50).trim(),
        year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
        licensePlate: z.string().min(1).max(20).trim(),
        color: z.string().min(1).max(30).trim(),
        vehicleType: z.enum(['TAXI', 'AC_TAXI', 'BIKE', 'EBIKE', 'ERICKSHAW', 'AUTO'])
    }).optional(),
    currentLocation: locationSchema.optional()
});

// Driver update validation
export const driverUpdateSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional(),
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
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional()
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

// Driver earnings query validation
export const driverEarningsQuerySchema = z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
});

// Driver bid history query validation
export const driverBidHistoryQuerySchema = z.object({
    status: z.enum(['pending', 'accepted', 'rejected', 'expired']).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    minFare: z.number().min(0).optional(),
    maxFare: z.number().min(0).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['createdAt', 'fareAmount', 'status']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Driver ride history query validation
export const driverRideHistoryQuerySchema = z.object({
    status: z.enum(['accepted', 'completed', 'cancelled']).optional(),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['createdAt', 'updatedAt', 'fareAmount', 'rating']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Nearby drivers query validation
export const nearbyDriversQuerySchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(0.1).max(50).default(10), // in kilometers
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortLevel: z.number().min(1).max(5).int().optional(),
    priceValue: z.number().min(1).max(5).int().optional(),
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE]).default(APP_CONSTANTS.DRIVER_STATUS.AVAILABLE),
    limit: z.coerce.number().min(1).max(100).default(20)
});

// Bulk driver operations validation
export const bulkUpdateDriverStatusSchema = z.object({
    driverIds: z.array(z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format'))
        .min(1, 'At least one driver ID is required')
        .max(100, 'Cannot update more than 100 drivers at once'),
    status: z.enum([APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE]),
    reason: z.string().max(200).optional()
});

// Driver analytics validation
export const driverAnalyticsQuerySchema = z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'rating', 'earnings', 'rideCount']).default('day'),
    includeEarnings: z.boolean().default(true),
    includeRatings: z.boolean().default(true),
    includePerformance: z.boolean().default(true)
});

// Driver stats query validation
export const driverStatsQuerySchema = z.object({
    period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
    year: z.number().min(2020).max(new Date().getFullYear()).optional(),
    month: z.number().min(1).max(12).optional(),
    includeComparison: z.boolean().default(false)
});

// Driver location search validation
export const driverLocationSearchSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(0.1).max(100).default(10),
    includeOffline: z.boolean().default(false)
});
