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
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format'),
    fareAmount: z.number().min(0).max(10000),
    bidTime: z.date().optional()
});

// Create ride request validation
export const createRideRequestSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').trim(),
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
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    estimatedDistance: z.number().min(0).max(1000).optional(),
    estimatedDuration: z.number().min(0).max(1440).optional()
});

// Add bid validation
export const addBidSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format'),
    fareAmount: z.number().min(0).max(10000)
});

// Place bid validation (for request body only)
export const placeBidSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format'),
    fareAmount: z.number().min(0).max(10000),
    estimatedPickupTime: z.string().optional(),
    message: z.string().optional()
});

// Accept bid validation
export const acceptBidSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'),
    bidId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format'),
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format')
});

// Get ride requests query validation
export const getRideRequestsQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    status: z.enum(['pending', 'bidding', 'accepted', 'completed', 'cancelled']).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
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
