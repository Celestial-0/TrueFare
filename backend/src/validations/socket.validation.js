import { z } from 'zod';
import { APP_CONSTANTS } from '../constants.js';

// Socket connection registration validation
export const socketRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    socketId: z.string().min(1, 'Socket ID is required'),
    userAgent: z.string().max(500).optional(),
    ipAddress: z.string().optional(),
    deviceInfo: z.object({
        type: z.enum(['mobile', 'web', 'desktop']).optional(),
        os: z.string().max(50).optional(),
        browser: z.string().max(50).optional()
    }).optional()
}).refine(
    (data) => data.userId || data.driverId,
    {
        message: 'Either userId or driverId must be provided',
        path: ['userId', 'driverId']
    }
);

// Driver socket registration validation
export const driverSocketRegistrationSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().min(1).max(500).optional(),
        accuracy: z.number().min(0).optional(),
        timestamp: z.string().date().optional()
    }),
    status: z.enum([
        APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, 
        APP_CONSTANTS.DRIVER_STATUS.BUSY, 
        APP_CONSTANTS.DRIVER_STATUS.OFFLINE
    ]).optional(),
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional(),
    vehicleInfo: z.object({
        make: z.string().max(50).optional().default(''),
        model: z.string().max(50).optional().default(''),
        year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
        licensePlate: z.string().max(20).optional().default(''),
        vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
        comfortLevel: z.number().min(1).max(5).int().optional(),
        priceValue: z.number().min(1).max(5).int().optional()
    }).optional()
});

// User socket registration validation
export const userSocketRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format').optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim(),
    currentLocation: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().min(1).max(500).optional(),
        accuracy: z.number().min(0).optional(),
        timestamp: z.string().date().optional()
    }).optional()
});

// Broadcast message validation
export const broadcastMessageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
    type: z.enum(['info', 'warning', 'error', 'success', 'announcement']).default('info'),
    recipients: z.enum(['all', 'users', 'drivers', 'online', 'available']).default('all'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    ttl: z.number().min(1).max(86400).default(3600), // Time to live in seconds
    title: z.string().max(100).optional(),
    actionUrl: z.string().url().optional(),
    actionText: z.string().max(50).optional(),
    targetGroups: z.array(z.string()).max(10).optional(),
    scheduledAt: z.string().date().optional()
});

// Socket room management validation
export const socketRoomSchema = z.object({
    roomName: z.string().min(1).max(100),
    roomType: z.enum(['user', 'driver', 'admin', 'broadcast', 'region']),
    participants: z.array(z.string()).max(1000),
    permissions: z.object({
        canSend: z.boolean().default(true),
        canReceive: z.boolean().default(true),
        canJoin: z.boolean().default(true),
        canLeave: z.boolean().default(true)
    }).optional(),
    metadata: z.object({
        region: z.string().max(50).optional(),
        category: z.string().max(50).optional(),
        description: z.string().max(200).optional()
    }).optional()
});

// Socket analytics query validation
export const socketAnalyticsQuerySchema = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    groupBy: z.enum(['hour', 'day', 'week', 'userType', 'event']).default('day'),
    userType: z.enum(['user', 'driver', 'all']).default('all'),
    eventType: z.array(z.string()).optional(),
    includeMessages: z.boolean().default(true),
    includeConnections: z.boolean().default(true),
    includeErrors: z.boolean().default(false)
});

// Location update validation for socket
export const socketLocationUpdateSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
    accuracy: z.number().min(0).optional(),
    speed: z.number().min(0).optional(),
    heading: z.number().min(0).max(360).optional(),
    timestamp: z.string().date().optional(),
    isRealTime: z.boolean().default(true)
}).refine(
    (data) => data.userId || data.driverId,
    {
        message: 'Either userId or driverId must be provided',
        path: ['userId', 'driverId']
    }
);

// Socket event validation
export const socketEventSchema = z.object({
    eventType: z.string().min(1).max(50),
    data: z.any(), // Can be any valid JSON
    targetId: z.string().optional(),
    roomName: z.string().optional(),
    broadcast: z.boolean().default(false),
    acknowledgment: z.boolean().default(false),
    metadata: z.object({
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        retryCount: z.number().min(0).max(5).default(0),
        ttl: z.number().min(1).max(3600).optional()
    }).optional()
});

// Socket performance optimization validation
export const socketOptimizationSchema = z.object({
    operation: z.enum(['cleanup-rooms', 'optimize-connections', 'reset-metrics', 'compress-data']),
    target: z.enum(['all', 'inactive', 'old', 'specific']).default('inactive'),
    parameters: z.object({
        maxInactiveTime: z.number().min(60).max(86400).default(1800), // 30 minutes
        maxRoomSize: z.number().min(1).max(10000).default(1000),
        compressionLevel: z.number().min(1).max(9).default(6),
        targetRooms: z.array(z.string()).optional()
    }).optional(),
    dryRun: z.boolean().default(true)
});

// Common validation helpers
export const validateSocketId = (socketId) => {
    return z.string().min(1, 'Socket ID is required').safeParse(socketId);
};

export const validateRoomName = (roomName) => {
    return z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room name format').safeParse(roomName);
};

export const validateEventType = (eventType) => {
    return z.string().min(1).max(50).regex(/^[a-zA-Z0-9:_-]+$/, 'Invalid event type format').safeParse(eventType);
};

export const validateLocation = (location) => {
    return z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180)
    }).safeParse(location);
};
