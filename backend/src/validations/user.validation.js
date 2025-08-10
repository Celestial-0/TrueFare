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
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
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
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
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
    defaultLocation: z.object({
        address: z.string().min(1).max(500),
        coordinates: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180)
        })
    })
});

// User socket registration validation
export const userSocketRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    requestId: z.string().optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
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

// Alias for backward compatibility
export const userPreferencesSchema = userPreferencesUpdateSchema;

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

// Bulk operations validation
export const bulkUpdatePreferencesSchema = z.object({
    userIds: z.array(z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format'))
        .min(1, 'At least one user ID is required')
        .max(100, 'Cannot update more than 100 users at once'),
    preferences: userPreferencesUpdateSchema
});

// User analytics validation
export const userAnalyticsQuerySchema = z.object({
    dateFrom: z.string().date('Invalid date format').optional(),
    dateTo: z.string().date('Invalid date format').optional(),
    groupBy: z.enum(['day', 'week', 'month', 'rating', 'rideCount']).default('day'),
    minRating: z.number().min(0).max(5).optional(),
    maxRating: z.number().min(0).max(5).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
});

// User ride history query validation  
export const userRideHistoryQuerySchema = z.object({
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    dateFrom: z.string().date('Invalid date format').optional(),
    dateTo: z.string().date('Invalid date format').optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'fareAmount']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// User recommendations query validation
export const userRecommendationsQuerySchema = z.object({
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    maxDistance: z.number().min(0).max(100).default(10),
    maxPrice: z.number().min(0).optional(),
    comfortLevel: z.number().min(1).max(5).int().optional(),
    limit: z.coerce.number().min(1).max(50).default(10)
});

// User favorites validation
export const userFavoritesSchema = z.object({
    favoriteDrivers: z.array(z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format')).max(20).optional(),
    favoriteVehicleTypes: z.array(z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'])).max(6).optional(),
    favoriteRoutes: z.array(z.object({
        name: z.string().min(1).max(100),
        pickupLocation: locationSchema,
        destination: locationSchema
    })).max(10).optional()
});
