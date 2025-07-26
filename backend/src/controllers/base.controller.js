/**
 * Base Controller Class
 * Provides common functionality for all controllers including:
 * - Standardized error handling
 * - Response formatting
 * - Validation utilities
 * - Logging
 * - Transaction support
 * - Cache management
 * - Rate limiting helpers
 */

import mongoose from 'mongoose';
import { formatValidationError, validatePagination, validateSortQuery } from '../validations/common.validation.js';

export class BaseController {
    /**
     * Standard success response format
     */
    static sendSuccess(res, data, message = 'Operation successful', statusCode = 200, meta = {}) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        });
    }

    /**
     * Standard error response format
     */
    static sendError(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            code,
            ...(details && { details }),
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Validation error response
     */
    static sendValidationError(res, validationResult) {
        const formattedError = formatValidationError(validationResult.error);
        return this.sendError(
            res,
            formattedError.message,
            400,
            'VALIDATION_ERROR',
            formattedError.errors
        );
    }

    /**
     * Handle pagination
     */
    static getPaginationMeta(page, limit, totalCount) {
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            pagination: {
                currentPage: page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage,
                nextPage: hasNextPage ? page + 1 : null,
                prevPage: hasPrevPage ? page - 1 : null
            }
        };
    }

    /**
     * Execute operation with transaction support
     */
    static async withTransaction(operation) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await operation(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Log controller action
     */
    static logAction(controller, action, data = {}) {
        console.log(`[${controller}] ${action}:`, {
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Validate required fields
     */
    static validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    /**
     * Sanitize data for response
     */
    static sanitizeForResponse(data, excludeFields = ['__v', 'password']) {
        if (!data) return data;
        
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeForResponse(item, excludeFields));
        }

        if (typeof data === 'object' && data.toObject) {
            data = data.toObject();
        }

        const sanitized = { ...data };
        excludeFields.forEach(field => {
            delete sanitized[field];
        });

        return sanitized;
    }

    /**
     * Build MongoDB query from filters
     */
    static buildQuery(filters = {}) {
        const query = {};
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                // Handle different filter types
                if (key.startsWith('min') && typeof value === 'number') {
                    const field = key.replace('min', '').toLowerCase();
                    if (field) {
                        query[field] = { ...query[field], $gte: value };
                    }
                } else if (key.startsWith('max') && typeof value === 'number') {
                    const field = key.replace('max', '').toLowerCase();
                    if (field) {
                        query[field] = { ...query[field], $lte: value };
                    }
                } else if (typeof value === 'string' && value.includes(',')) {
                    // Handle comma-separated values as $in query
                    query[key] = { $in: value.split(',').map(v => v.trim()) };
                } else {
                    query[key] = value;
                }
            }
        });

        return query;
    }

    /**
     * Calculate distance between two coordinates
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Handle common MongoDB errors
     */
    static handleMongoError(error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return {
                statusCode: 400,
                code: 'VALIDATION_ERROR',
                message: 'Data validation failed',
                details: errors
            };
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return {
                statusCode: 409,
                code: 'DUPLICATE_RESOURCE',
                message: `${field} already exists`,
                details: { field, value: error.keyValue[field] }
            };
        }

        if (error.name === 'CastError') {
            return {
                statusCode: 400,
                code: 'INVALID_ID',
                message: 'Invalid ID format',
                details: { field: error.path, value: error.value }
            };
        }

        return {
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : null
        };
    }

    /**
     * Build pagination response
     */
    static buildPaginationResponse(data, page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page < totalPages ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null
            }
        };
    }

    /**
     * Execute database operation with retry logic
     */
    static async withRetry(operation, maxRetries = 3, delayMs = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Don't retry validation errors or client errors
                if (error.statusCode && error.statusCode < 500) {
                    throw error;
                }
                
                if (attempt < maxRetries) {
                    this.logAction('BaseController', `Operation failed, retrying in ${delayMs}ms`, {
                        attempt,
                        maxRetries,
                        error: error.message
                    });
                    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                } else {
                    this.logAction('BaseController', 'Operation failed after all retries', {
                        attempt,
                        error: error.message
                    });
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Get standard sort options
     */
    static getStandardSortOptions(sortBy = 'createdAt', order = 'desc') {
        const sortOrder = order === 'asc' ? 1 : -1;
        return { [sortBy]: sortOrder };
    }

    /**
     * Validate and parse pagination parameters
     */
    static validatePaginationParams(query) {
        const validationResult = validatePagination(query.page, query.limit);
        if (!validationResult.success) {
            throw new Error('Invalid pagination parameters');
        }
        return validationResult.data;
    }

    /**
     * Validate and parse sort parameters
     */
    static validateSortParams(query, allowedFields = ['createdAt', 'updatedAt']) {
        const validationResult = validateSortQuery(query.sortBy, query.order, allowedFields);
        if (!validationResult.success) {
            throw new Error('Invalid sort parameters');
        }
        return validationResult.data;
    }

    /**
     * Check if resource exists
     */
    static async checkResourceExists(Model, query, errorMessage = 'Resource not found') {
        const resource = await Model.findOne(query);
        if (!resource) {
            throw new Error(errorMessage);
        }
        return resource;
    }

    /**
     * Cache wrapper for frequently accessed data
     */
    static cache = new Map();
    
    static async getCachedData(key, fetchFunction, ttlMs = 300000) { // 5 minutes default TTL
        const cached = this.cache.get(key);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < ttlMs) {
            return cached.data;
        }
        
        const data = await fetchFunction();
        this.cache.set(key, {
            data,
            timestamp: now
        });
        
        return data;
    }

    /**
     * Clear cache by key or pattern
     */
    static clearCache(keyOrPattern) {
        if (typeof keyOrPattern === 'string') {
            this.cache.delete(keyOrPattern);
        } else if (keyOrPattern instanceof RegExp) {
            for (const key of this.cache.keys()) {
                if (keyOrPattern.test(key)) {
                    this.cache.delete(key);
                }
            }
        }
    }

    /**
     * Rate limit helper (basic implementation)
     */
    static rateLimitMap = new Map();
    
    static checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.rateLimitMap.has(identifier)) {
            this.rateLimitMap.set(identifier, []);
        }
        
        const requests = this.rateLimitMap.get(identifier);
        
        // Remove old requests outside the time window
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        
        if (validRequests.length >= maxRequests) {
            return false; // Rate limit exceeded
        }
        
        validRequests.push(now);
        this.rateLimitMap.set(identifier, validRequests);
        
        return true; // Within rate limit
    }

    /**
     * Generate aggregation pipeline for common queries
     */
    static buildAggregationPipeline({ match = {}, lookup = [], sort = {}, skip = 0, limit = 10, project = null }) {
        const pipeline = [];
        
        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }
        
        lookup.forEach(lookupStage => {
            pipeline.push({ $lookup: lookupStage });
        });
        
        if (Object.keys(sort).length > 0) {
            pipeline.push({ $sort: sort });
        }
        
        if (skip > 0) {
            pipeline.push({ $skip: skip });
        }
        
        if (limit > 0) {
            pipeline.push({ $limit: limit });
        }
        
        if (project) {
            pipeline.push({ $project: project });
        }
        
        return pipeline;
    }
}

export default BaseController;
