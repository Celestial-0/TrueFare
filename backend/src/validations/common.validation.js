import { z } from 'zod';

// Common validation utilities
export const validateObjectId = (id) => {
    return z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format').safeParse(id);
};

export const validateEmail = (email) => {
    return z.string().email().safeParse(email);
};

export const validatePhoneNumber = (phone) => {
    return z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).safeParse(phone);
};

export const validatePagination = (page, limit) => {
    const paginationSchema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10)
    });
    return paginationSchema.safeParse({ page, limit });
};

export const validateSortQuery = (sortBy, order, allowedSortFields = []) => {
    const sortSchema = z.object({
        sortBy: z.enum(allowedSortFields).default(allowedSortFields[0] || 'createdAt'),
        order: z.enum(['asc', 'desc']).default('desc')
    });
    return sortSchema.safeParse({ sortBy, order });
};

// Generic validation error formatter
export const formatValidationError = (error) => {
    if (!error.issues) return { message: 'Validation failed' };
    
    const formattedErrors = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
    }));
    
    return {
        message: 'Validation failed',
        errors: formattedErrors
    };
};

// Middleware for Zod validation
export const validateRequest = (schema, property = 'body') => {
    return (req, res, next) => {
        const result = schema.safeParse(req[property]);
        
        if (!result.success) {
            const formattedError = formatValidationError(result.error);
            return res.status(400).json({
                success: false,
                message: formattedError.message,
                code: 'VALIDATION_ERROR',
                details: formattedError.errors
            });
        }
        
        // Replace the request property with parsed and validated data
        // Note: Skip assignment for 'query' as it's read-only in Express
        if (property !== 'query') {
            req[property] = result.data;
        }
        next();
    };
};

// Middleware for validating query parameters
export const validateQuery = (schema) => {
    return validateRequest(schema, 'query');
};

// Middleware for validating request parameters
export const validateParams = (schema) => {
    return validateRequest(schema, 'params');
};

// ID validation schemas
export const userIdParamSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format')
});

export const driverIdParamSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format')
});

export const requestIdParamSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format')
});

export const bidIdParamSchema = z.object({
    bidId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format')
});
