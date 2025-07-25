import { z } from 'zod';

// Vehicle type enum validation
const vehicleTypeEnum = ['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'];

// Vehicle creation validation
export const vehicleCreationSchema = z.object({
    driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    make: z.string().min(1, 'Make is required').max(50, 'Make must be less than 50 characters').trim(),
    model: z.string().max(50, 'Model must be less than 50 characters').trim().optional(),
    year: z.number()
        .min(1900, 'Year must be at least 1900')
        .max(new Date().getFullYear() + 1, 'Year cannot be in the future')
        .optional(),
    licensePlate: z.string()
        .max(20, 'License plate must be less than 20 characters')
        .trim()
        .regex(/^[A-Z0-9\-\s]+$/i, 'License plate contains invalid characters')
        .optional(),
    vehicleType: z.enum(vehicleTypeEnum, {
        errorMap: () => ({ message: `Vehicle type must be one of: ${vehicleTypeEnum.join(', ')}` })
    }),
    comfortLevel: z.number()
        .min(1, 'Comfort level must be at least 1')
        .max(5, 'Comfort level must be at most 5')
        .int('Comfort level must be an integer'),
    priceValue: z.number()
        .min(1, 'Price value must be at least 1')
        .max(5, 'Price value must be at most 5')
        .int('Price value must be an integer'),
    isActive: z.boolean().optional().default(true)
});

// Vehicle update validation
export const vehicleUpdateSchema = z.object({
    make: z.string().min(1).max(50).trim().optional(),
    model: z.string().min(1).max(50).trim().optional(),
    year: z.number()
        .min(1900)
        .max(new Date().getFullYear() + 1)
        .optional(),
    licensePlate: z.string()
        .min(1)
        .max(20)
        .trim()
        .regex(/^[A-Z0-9\-\s]+$/i, 'License plate contains invalid characters')
        .optional(),
    vehicleType: z.enum(vehicleTypeEnum, {
        errorMap: () => ({ message: `Vehicle type must be one of: ${vehicleTypeEnum.join(', ')}` })
    }).optional(),
    comfortLevel: z.number()
        .min(1)
        .max(5)
        .int()
        .optional(),
    priceValue: z.number()
        .min(1)
        .max(5)
        .int()
        .optional(),
    isActive: z.boolean().optional()
});

// Vehicle query validation
export const vehicleQuerySchema = z.object({
    driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format').optional(),
    vehicleType: z.enum(vehicleTypeEnum).optional(),
    comfortLevel: z.number().min(1).max(5).int().optional(),
    priceValue: z.number().min(1).max(5).int().optional(),
    isActive: z.boolean().optional(),
    minYear: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    maxYear: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['make', 'model', 'year', 'vehicleType', 'comfortLevel', 'priceValue', 'createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Vehicle ID validation
export const vehicleIdSchema = z.object({
    vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format')
});

// Vehicle status update validation
export const vehicleStatusUpdateSchema = z.object({
    isActive: z.boolean()
});

// Vehicle search validation
export const vehicleSearchSchema = z.object({
    query: z.string().min(1).max(100).trim(),
    filters: z.object({
        vehicleType: z.enum(vehicleTypeEnum).optional(),
        comfortLevel: z.number().min(1).max(5).int().optional(),
        priceValue: z.number().min(1).max(5).int().optional(),
        minYear: z.number().min(1900).optional(),
        maxYear: z.number().max(new Date().getFullYear() + 1).optional(),
        isActive: z.boolean().optional()
    }).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
});

// Driver vehicle assignment validation
export const driverVehicleAssignmentSchema = z.object({
    driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid driver ID format'),
    vehicleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'))
        .min(1, 'At least one vehicle ID is required')
        .max(10, 'Cannot assign more than 10 vehicles')
});

// Common validation helpers
export const validateVehicleId = (vehicleId) => {
    return z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format').safeParse(vehicleId);
};

export const validateVehicleType = (vehicleType) => {
    return z.enum(vehicleTypeEnum).safeParse(vehicleType);
};

export const validateComfortLevel = (comfortLevel) => {
    return z.number().min(1).max(5).int().safeParse(comfortLevel);
};

export const validatePriceValue = (priceValue) => {
    return z.number().min(1).max(5).int().safeParse(priceValue);
};

export const validateLicensePlate = (licensePlate) => {
    return z.string()
        .min(1)
        .max(20)
        .regex(/^[A-Z0-9\-\s]+$/i, 'License plate contains invalid characters')
        .safeParse(licensePlate);
};

export const validateVehicleYear = (year) => {
    return z.number()
        .min(1900)
        .max(new Date().getFullYear() + 1)
        .safeParse(year);
};

// Batch operations validation
export const vehicleBatchUpdateSchema = z.object({
    vehicleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'))
        .min(1, 'At least one vehicle ID is required')
        .max(50, 'Cannot update more than 50 vehicles at once'),
    updates: vehicleUpdateSchema
});

export const vehicleBatchDeleteSchema = z.object({
    vehicleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'))
        .min(1, 'At least one vehicle ID is required')
        .max(50, 'Cannot delete more than 50 vehicles at once')
});

// Vehicle analytics validation
export const vehicleAnalyticsSchema = z.object({
    driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid driver ID format').optional(),
    vehicleType: z.enum(vehicleTypeEnum).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    groupBy: z.enum(['vehicleType', 'comfortLevel', 'priceValue', 'year', 'month']).default('vehicleType')
});
