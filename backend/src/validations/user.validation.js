import { z } from 'zod';

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

// User registration validation
export const userRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim(),
    defaultLocation: locationSchema.optional(),
    preferences: z.object({
        maxWaitTime: z.number().min(1).max(60).optional(),
        priceRange: z.object({
            min: z.number().min(0).optional(),
            max: z.number().min(0).optional()
        }).optional(),
        defaultRideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
        comfortPreference: z.number().min(1).max(5).int().optional(),
        farePreference: z.number().min(1).max(5).int().optional()
    }).optional()
});

// User update validation
export const userUpdateSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional(),
    defaultLocation: locationSchema.optional(),
    preferences: z.object({
        maxWaitTime: z.number().min(1).max(60).optional(),
        priceRange: z.object({
            min: z.number().min(0).optional(),
            max: z.number().min(0).optional()
        }).optional(),
        defaultRideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
        comfortPreference: z.number().min(1).max(5).int().optional(),
        farePreference: z.number().min(1).max(5).int().optional()
    }).optional()
});

// User location update validation
export const userLocationUpdateSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(1).max(500)
});

// User socket registration validation
export const userSocketRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    requestId: z.string().optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim()
});

// User preferences update validation
export const userPreferencesUpdateSchema = z.object({
    maxWaitTime: z.number().min(1).max(60).optional(),
    priceRange: z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional()
    }).optional(),
    defaultRideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortPreference: z.number().min(1).max(5).int().optional(),
    farePreference: z.number().min(1).max(5).int().optional()
});

// User status update validation
export const userStatusUpdateSchema = z.object({
    isOnline: z.boolean()
});

// User query validation
export const userQuerySchema = z.object({
    isOnline: z.boolean().optional(),
    minRating: z.number().min(0).max(5).optional(),
    maxRating: z.number().min(0).max(5).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['name', 'rating', 'totalRides', 'createdAt', 'lastSeen']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Common validation helpers
export const validateUserId = (userId) => {
    return z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').safeParse(userId);
};

export const validateCoordinates = (coordinates) => {
    return coordinatesSchema.safeParse(coordinates);
};

export const validateLocation = (location) => {
    return locationSchema.safeParse(location);
};

export const validateUserPreferences = (preferences) => {
    return userPreferencesUpdateSchema.safeParse(preferences);
};

export const validateRideType = (rideType) => {
    return z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).safeParse(rideType);
};
