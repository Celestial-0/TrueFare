import { z } from 'zod';

// Coordinate validation schema
const coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});

// Location validation schema
const locationSchema = z.object({
    address: z.string().min(1).max(500).trim(),
    coordinates: coordinatesSchema
});

// Bid validation schema
const bidSchema = z.object({
    driverId: z.string(),
    fareAmount: z.number().min(0).max(10000),
    bidTime: z.date().optional()
});

// Create ride request validation
export const createRideRequestSchema = z.object({
    userId: z.string().trim(),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortPreference: z.number().min(1).max(5).int().optional(),
    farePreference: z.number().min(1).max(5).int().optional(),
    pickupLocation: locationSchema,
    destination: locationSchema,
    estimatedDistance: z.number().min(0).max(1000).optional(),
    estimatedDuration: z.number().min(0).max(1440).optional() // max 24 hours
}).refine(
    (data) => {
        // Check if pickup and destination are different
        const pickup = data.pickupLocation.coordinates;
        const dest = data.destination.coordinates;
        return pickup.latitude !== dest.latitude || pickup.longitude !== dest.longitude;
    },
    {
        message: 'Pickup location and destination cannot be the same',
        path: ['destination']
    }
);

// Update ride request validation
export const updateRideRequestSchema = z.object({
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    comfortPreference: z.number().min(1).max(5).int().optional(),
    farePreference: z.number().min(1).max(5).int().optional(),
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    estimatedDistance: z.number().min(0).max(1000).optional(),
    estimatedDuration: z.number().min(0).max(1440).optional()
});

// Add bid validation
export const addBidSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'),
    driverId: z.string(),
    fareAmount: z.number().min(0).max(10000)
});

// Place bid validation (for request body only)
export const placeBidSchema = z.object({
    driverId: z.string(),
    fareAmount: z.number().min(0).max(10000),
    estimatedPickupTime: z.string().optional(),
    message: z.string().optional()
});

// Accept bid validation
export const acceptBidSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'),
    driverId: z.string(),
    fareAmount: z.number().min(0).max(10000)
});

// Get ride requests query validation
export const getRideRequestsQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    userId: z.string().optional(),
    minFare: z.number().min(0).optional(),
    maxFare: z.number().min(0).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'estimatedDistance', 'estimatedDuration']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Get bids query validation
export const getBidsQuerySchema = z.object({
    sortBy: z.enum(['fare', 'time']).default('fare'),
    order: z.enum(['asc', 'desc']).default('asc')
});

// Request ID validation
export const requestIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format');

// Bid ID validation
export const bidIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format');

// Common validation helpers
export const validateRequestId = (requestId) => {
    return requestIdSchema.safeParse(requestId);
};

export const validateBidId = (bidId) => {
    return bidIdSchema.safeParse(bidId);
};

export const validateCoordinates = (coordinates) => {
    return coordinatesSchema.safeParse(coordinates);
};

export const validateLocation = (location) => {
    return locationSchema.safeParse(location);
};

export const validateBid = (bid) => {
    return bidSchema.safeParse(bid);
};

export const validateRideType = (rideType) => {
    return z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).safeParse(rideType);
};

export const validatePreference = (preference) => {
    return z.number().min(1).max(5).int().safeParse(preference);
};

// Ride request analytics validation
export const rideRequestAnalyticsQuerySchema = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'status', 'rideType']).default('day'),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    includeEarnings: z.boolean().default(true),
    includeBidAnalysis: z.boolean().default(true)
});

// Update ride status validation
export const updateRideStatusSchema = z.object({
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']),
    reason: z.string().optional(),
    updatedAt: z.string().datetime().optional()
});

// Bulk cancel requests validation
export const bulkCancelRequestsSchema = z.object({
    requestIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'))
        .min(1, 'At least one request ID is required')
        .max(100, 'Cannot cancel more than 100 requests at once'),
    reason: z.string().min(1).max(500),
    notifyUsers: z.boolean().default(true),
    notifyDrivers: z.boolean().default(true)
});

// Ride matching optimization validation
export const optimizeMatchingSchema = z.object({
    algorithm: z.enum(['distance', 'price', 'rating', 'combined']).default('combined'),
    maxDistance: z.number().min(0.1).max(100).default(20),
    weightDistance: z.number().min(0).max(1).default(0.4),
    weightPrice: z.number().min(0).max(1).default(0.3),
    weightRating: z.number().min(0).max(1).default(0.3),
    testMode: z.boolean().default(false)
}).refine(
    (data) => (data.weightDistance + data.weightPrice + data.weightRating) === 1,
    {
        message: 'Weight values must sum to 1.0',
        path: ['weightDistance', 'weightPrice', 'weightRating']
    }
);

// Available ride requests query validation (for drivers)
export const availableRideRequestsQuerySchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(0.1).max(50).default(15), // in kilometers
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    minFare: z.number().min(0).optional(),
    maxFare: z.number().min(0).optional(),
    comfortPreference: z.number().min(1).max(5).int().optional(),
    farePreference: z.number().min(1).max(5).int().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
    sortBy: z.enum(['distance', 'createdAt', 'estimatedFare', 'comfortPreference']).default('distance'),
    order: z.enum(['asc', 'desc']).default('asc')
});

// Bid acceptance validation with enhanced checks
export const acceptBidEnhancedSchema = z.object({
    bidId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format'),
    fareAmount: z.number().min(0).max(10000),
    estimatedPickupTime: z.string().optional(),
    acceptanceMessage: z.string().max(200).optional(),
    paymentMethod: z.enum(['cash', 'card', 'wallet']).default('cash')
});
