import { z } from 'zod';

// Enhanced login validation schemas with better error messages
export const userLoginSchema = z.object({
    phone: z.string()
        .min(1, 'Phone number is required')
        .regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number must be less than 20 characters')
        .trim()
        .transform(val => val.replace(/\s+/g, '')) // Remove spaces
        .refine(val => {
            // Additional validation for minimum digits after cleaning
            const digitsOnly = val.replace(/[^\d]/g, '');
            return digitsOnly.length >= 10;
        }, 'Phone number must contain at least 10 digits')
});

export const driverLoginSchema = z.object({
    phone: z.string()
        .min(1, 'Phone number is required')
        .regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number must be less than 20 characters')
        .trim()
        .transform(val => val.replace(/\s+/g, '')) // Remove spaces
        .refine(val => {
            // Additional validation for minimum digits after cleaning
            const digitsOnly = val.replace(/[^\d]/g, '');
            return digitsOnly.length >= 10;
        }, 'Phone number must contain at least 10 digits')
});

// Auth statistics query validation
export const authStatsQuerySchema = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'userType']).default('day'),
    userType: z.enum(['user', 'driver', 'all']).default('all'),
    includeRegistrations: z.boolean().default(true),
    includeLogins: z.boolean().default(true),
    includeActivity: z.boolean().default(true)
});

// Bulk status update validation
export const bulkStatusUpdateSchema = z.object({
    userIds: z.array(z.string()).optional(),
    driverIds: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'banned']),
    reason: z.string().min(1).max(500),
    notifyUsers: z.boolean().default(true),
    effectiveDate: z.string().date().optional()
}).refine(
    (data) => data.userIds || data.driverIds,
    {
        message: 'Either userIds or driverIds must be provided',
        path: ['userIds', 'driverIds']
    }
).refine(
    (data) => {
        const totalIds = (data.userIds?.length || 0) + (data.driverIds?.length || 0);
        return totalIds <= 100;
    },
    {
        message: 'Cannot update more than 100 accounts at once',
        path: ['userIds', 'driverIds']
    }
);

// Maintenance operation validation
export const maintenanceOperationSchema = z.object({
    operation: z.enum(['cleanup-sessions', 'optimize-indexes', 'purge-old-data', 'reset-counters']),
    targetDate: z.string().date().optional(),
    dryRun: z.boolean().default(true),
    batchSize: z.number().min(1).max(1000).default(100),
    confirmationCode: z.string().min(6).max(20).optional()
});

// Password/PIN validation (if implemented)
export const passwordSchema = z.object({
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

export const pinSchema = z.object({
    pin: z.string()
        .regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

// Device registration validation
export const deviceRegistrationSchema = z.object({
    deviceId: z.string().min(1).max(255),
    deviceType: z.enum(['ios', 'android', 'web']),
    deviceModel: z.string().max(100).optional(),
    osVersion: z.string().max(50).optional(),
    appVersion: z.string().max(20).optional(),
    pushToken: z.string().max(500).optional(),
    userId: z.string().optional(),
    driverId: z.string().optional()
}).refine(
    (data) => data.userId || data.driverId,
    {
        message: 'Either userId or driverId must be provided',
        path: ['userId', 'driverId']
    }
);

// Session validation
export const sessionValidationSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().optional(),
    driverId: z.string().optional(),
    deviceId: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().max(500).optional()
});

// Common validation helpers
export const validatePhoneForAuth = (phone) => {
    return z.string()
        .regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number must be less than 20 characters')
        .safeParse(phone);
};

export const validateAuthToken = (token) => {
    return z.string()
        .min(10, 'Token too short')
        .max(500, 'Token too long')
        .safeParse(token);
};

export const validateDeviceId = (deviceId) => {
    return z.string()
        .min(1, 'Device ID is required')
        .max(255, 'Device ID too long')
        .safeParse(deviceId);
};
