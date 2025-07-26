import User from '../models/user.model.js';
import RideRequest from '../models/rideRequest.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from 'zod';
import { 
    userUpdateSchema,
    userPreferencesSchema,
    userRegistrationSchema
} from '../validations/user.validation.js';
import { 
    formatValidationError,
    userIdParamSchema,
    validateObjectId,
    validatePagination,
    validateSortQuery
} from '../validations/common.validation.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import { generateUserId, validateIdFormat } from '../utils/idGenerator.js';
import DataPersistenceService from '../services/dataPersistenceService.js';
import BackgroundTaskScheduler from '../utils/backgroundTasks.js';

/**
 * Enhanced User Controller with improved validation, synchronization, and error handling
 */
class UserController extends BaseController {

    /**
     * Get user profile with enhanced data
     */
    static getUserProfile = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        
        UserController.logAction('UserController', 'getUserProfile', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        try {
            const user = await User.findOne({ userId }).lean();

            if (!user) {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            // Get user statistics
            const [totalRequests, completedRides] = await Promise.all([
                RideRequest.countDocuments({ userId }),
                RideRequest.countDocuments({ userId, status: 'completed' })
            ]);

            const sanitizedUser = UserController.sanitizeForResponse(user, ['__v']);

            return UserController.sendSuccess(res, {
                userId: sanitizedUser.userId,
                name: sanitizedUser.name,
                email: sanitizedUser.email,
                phone: sanitizedUser.phone,
                defaultLocation: sanitizedUser.defaultLocation,
                preferences: sanitizedUser.preferences,
                isOnline: sanitizedUser.isOnline,
                rating: sanitizedUser.rating,
                totalRides: sanitizedUser.totalRides,
                statistics: {
                    totalRequests,
                    completedRides,
                    completionRate: totalRequests > 0 ? ((completedRides / totalRequests) * 100).toFixed(2) : 0
                },
                lastSeen: sanitizedUser.lastSeen,
                createdAt: sanitizedUser.createdAt,
                updatedAt: sanitizedUser.updatedAt
            }, 'User profile retrieved successfully');

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update user profile with enhanced validation
     */
    static updateUserProfile = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        
        UserController.logAction('UserController', 'updateUserProfile', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        // Validate update data using Zod
        const validationResult = userUpdateSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return UserController.sendValidationError(res, validationResult);
        }

        const updates = validationResult.data;

        try {
            const result = await UserController.withTransaction(async (session) => {
                // Validate and sanitize updates
                const sanitizedUpdates = { ...updates };
                
                // Normalize phone if provided
                if (sanitizedUpdates.phone) {
                    sanitizedUpdates.phone = sanitizedUpdates.phone.replace(/\s+/g, '').trim();
                    
                    // Check for phone number conflicts
                    const existingUser = await User.findOne({ 
                        phone: sanitizedUpdates.phone,
                        userId: { $ne: userId }
                    }).session(session);
                    
                    if (existingUser) {
                        throw new Error('PHONE_EXISTS');
                    }
                }

                // Normalize email if provided
                if (sanitizedUpdates.email) {
                    sanitizedUpdates.email = sanitizedUpdates.email.trim().toLowerCase();
                    
                    // Check for email conflicts
                    const existingUser = await User.findOne({ 
                        email: sanitizedUpdates.email,
                        userId: { $ne: userId }
                    }).session(session);
                    
                    if (existingUser) {
                        throw new Error('EMAIL_EXISTS');
                    }
                }

                // Validate coordinates if location is being updated
                if (sanitizedUpdates.defaultLocation && sanitizedUpdates.defaultLocation.coordinates) {
                    const { latitude, longitude } = sanitizedUpdates.defaultLocation.coordinates;
                    if (isNaN(latitude) || isNaN(longitude) || 
                        latitude < -90 || latitude > 90 || 
                        longitude < -180 || longitude > 180) {
                        throw new Error('INVALID_COORDINATES');
                    }
                    sanitizedUpdates.defaultLocation.coordinates = {
                        latitude: Number(latitude),
                        longitude: Number(longitude)
                    };
                }

                const user = await User.findOneAndUpdate(
                    { userId },
                    { ...sanitizedUpdates, updatedAt: new Date() },
                    { new: true, runValidators: true, session }
                );

                if (!user) {
                    throw new Error('USER_NOT_FOUND');
                }

                return UserController.sanitizeForResponse(user, ['__v']);
            });

            // Broadcast user profile update
            try {
                socketService.broadcastToDrivers('user:profileUpdated', {
                    userId: result.userId,
                    updates: updates
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return UserController.sendSuccess(res, {
                userId: result.userId,
                name: result.name,
                email: result.email,
                phone: result.phone,
                defaultLocation: result.defaultLocation,
                preferences: result.preferences,
                isOnline: result.isOnline,
                updatedAt: result.updatedAt
            }, 'User profile updated successfully');

        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }
            if (error.message === 'PHONE_EXISTS') {
                return UserController.sendError(res, 'Phone number already in use', 409, 'PHONE_EXISTS');
            }
            if (error.message === 'EMAIL_EXISTS') {
                return UserController.sendError(res, 'Email already in use', 409, 'EMAIL_EXISTS');
            }
            if (error.message === 'INVALID_COORDINATES') {
                return UserController.sendError(res, 'Invalid location coordinates', 400, 'INVALID_COORDINATES');
            }

            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, 'Profile update failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Get user ride history with enhanced filtering and analytics
     */
    static getUserRideHistory = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { 
            page = 1, 
            limit = 10, 
            status, 
            dateFrom, 
            dateTo, 
            rideType,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        UserController.logAction('UserController', 'getUserRideHistory', { userId, page, limit });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        // Validate query parameters
        const querySchema = z.object({
            page: z.coerce.number().min(1).default(1),
            limit: z.coerce.number().min(1).max(100).default(10),
            status: z.enum(['pending', 'bidding', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
            dateFrom: z.string().datetime().optional(),
            dateTo: z.string().datetime().optional(),
            rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
            sortBy: z.enum(['createdAt', 'updatedAt', 'estimatedDistance', 'status']).default('createdAt'),
            order: z.enum(['asc', 'desc']).default('desc')
        });

        const queryValidation = querySchema.safeParse({ 
            page, limit, status, dateFrom, dateTo, rideType, sortBy, order 
        });
        
        if (!queryValidation.success) {
            return UserController.sendValidationError(res, queryValidation);
        }

        const { 
            page: pageNum, 
            limit: limitNum, 
            status: statusFilter, 
            dateFrom: fromDate, 
            dateTo: toDate,
            rideType: rideTypeFilter,
            sortBy: sortField,
            order: sortOrder
        } = queryValidation.data;

        try {
            // Build query
            const query = UserController.buildQuery({
                userId,
                status: statusFilter,
                rideType: rideTypeFilter,
                createdAt: {
                    ...(fromDate && { $gte: new Date(fromDate) }),
                    ...(toDate && { $lte: new Date(toDate) })
                }
            });

            // Remove empty createdAt object
            if (Object.keys(query.createdAt || {}).length === 0) {
                delete query.createdAt;
            }

            // Build sort object
            const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

            // Execute query with pagination
            const skip = (pageNum - 1) * limitNum;
            
            const [rideHistory, totalCount] = await Promise.all([
                RideRequest.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                RideRequest.countDocuments(query)
            ]);

            // Enhance ride history with driver information for accepted/completed rides
            const enhancedRideHistory = await Promise.all(
                rideHistory.map(async (ride) => {
                    let driverInfo = null;
                    let duration = null;
                    
                    // If ride has an accepted bid, fetch driver information
                    if (ride.acceptedBid && ride.acceptedBid.driverId) {
                        try {
                            const Driver = mongoose.model('Driver');
                            driverInfo = await Driver.findOne({ driverId: ride.acceptedBid.driverId })
                                .select('name phone rating')
                                .lean();
                            
                            // Calculate duration for completed rides
                            if (ride.status === 'completed' && ride.acceptedBid.acceptedAt) {
                                const startTime = new Date(ride.acceptedBid.acceptedAt);
                                const endTime = new Date(ride.updatedAt);
                                const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                                duration = `${durationMinutes} mins`;
                            }
                        } catch (driverError) {
                            console.warn('Could not fetch driver info for ride:', ride._id, driverError.message);
                        }
                    }
                    
                    return {
                        ...ride,
                        driverInfo,
                        duration
                    };
                })
            );

            // Calculate analytics
            const analytics = await UserController.calculateUserAnalytics(userId, query);

            const sanitizedHistory = UserController.sanitizeForResponse(enhancedRideHistory, ['__v']);

            const paginationMeta = UserController.getPaginationMeta(pageNum, limitNum, totalCount);

            return UserController.sendSuccess(res, {
                rides: sanitizedHistory.map(ride => ({
                    requestId: ride._id,
                    rideType: ride.rideType,
                    comfortPreference: ride.comfortPreference,
                    farePreference: ride.farePreference,
                    pickupLocation: ride.pickupLocation,
                    destination: ride.destination,
                    estimatedDistance: ride.estimatedDistance,
                    estimatedDuration: ride.estimatedDuration,
                    status: ride.status,
                    bidsCount: ride.bids?.length || 0,
                    acceptedBid: ride.acceptedBid,
                    finalFare: ride.acceptedBid?.fareAmount,
                    driverName: ride.driverInfo?.name,
                    driverPhone: ride.driverInfo?.phone,
                    driverRating: ride.driverInfo?.rating,
                    duration: ride.duration,
                    createdAt: ride.createdAt,
                    updatedAt: ride.updatedAt
                })),
                analytics,
                filters: { 
                    status: statusFilter, 
                    dateFrom: fromDate, 
                    dateTo: toDate, 
                    rideType: rideTypeFilter,
                    sortBy: sortField,
                    order: sortOrder
                }
            }, 'User ride history retrieved successfully', 200, paginationMeta);

        } catch (error) {
            if (error.message === 'INVALID_DATE_RANGE') {
                return UserController.sendError(res, 'Invalid date range provided', 400, 'INVALID_DATE_RANGE');
            }

            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, 'Failed to retrieve ride history', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Get user statistics with enhanced analytics
     */
    static getUserStats = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { period = 'all' } = req.query; // all, today, week, month, year

        UserController.logAction('UserController', 'getUserStats', { userId, period });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        try {
            // Verify user exists
            const user = await User.findOne({ userId }).lean();
            if (!user) {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            // Calculate date range based on period
            const dateRange = UserController.getDateRange(period);
            
            // Get comprehensive statistics
            const stats = await UserController.getUserStatistics(userId, dateRange);

            return UserController.sendSuccess(res, {
                userId,
                period,
                dateRange,
                statistics: stats,
                generatedAt: new Date()
            }, 'User statistics retrieved successfully');

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update user location with enhanced validation
     */
    static updateUserLocation = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { defaultLocation } = req.body;

        UserController.logAction('UserController', 'updateUserLocation', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        // Validate location data
        const locationSchema = z.object({
            defaultLocation: z.object({
                address: z.string().min(1, 'Address is required').max(500, 'Address must be less than 500 characters'),
                coordinates: z.object({
                    latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
                    longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180')
                })
            })
        });

        const validationResult = locationSchema.safeParse({ defaultLocation });
        
        if (!validationResult.success) {
            return UserController.sendValidationError(res, validationResult);
        }

        const { defaultLocation: validatedLocation } = validationResult.data;

        try {
            const result = await UserController.withTransaction(async (session) => {
                const user = await User.findOneAndUpdate(
                    { userId },
                    { 
                        defaultLocation: validatedLocation,
                        updatedAt: new Date()
                    },
                    { new: true, session }
                );

                if (!user) {
                    throw new Error('USER_NOT_FOUND');
                }

                return UserController.sanitizeForResponse(user, ['__v']);
            });

            // Broadcast location update
            try {
                socketService.broadcastToDrivers('user:locationUpdated', {
                    userId: result.userId,
                    location: result.defaultLocation
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return UserController.sendSuccess(res, {
                userId: result.userId,
                defaultLocation: result.defaultLocation,
                updatedAt: result.updatedAt
            }, 'User location updated successfully');

        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update user preferences with enhanced validation
     */
    static updateUserPreferences = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { preferences } = req.body;

        UserController.logAction('UserController', 'updateUserPreferences', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        // Validate preferences
        const preferencesValidation = userPreferencesSchema.safeParse(preferences);
        
        if (!preferencesValidation.success) {
            return UserController.sendValidationError(res, preferencesValidation);
        }

        const validatedPreferences = preferencesValidation.data;

        try {
            const result = await UserController.withTransaction(async (session) => {
                const user = await User.findOneAndUpdate(
                    { userId },
                    { 
                        preferences: validatedPreferences,
                        updatedAt: new Date()
                    },
                    { new: true, session }
                );

                if (!user) {
                    throw new Error('USER_NOT_FOUND');
                }

                return UserController.sanitizeForResponse(user, ['__v']);
            });

            return UserController.sendSuccess(res, {
                userId: result.userId,
                preferences: result.preferences,
                updatedAt: result.updatedAt
            }, 'User preferences updated successfully');

        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get personalized ride recommendations
     */
    static getPersonalizedRecommendations = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { latitude, longitude, maxDistance = 10 } = req.query;

        UserController.logAction('UserController', 'getPersonalizedRecommendations', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        try {
            // Get user preferences and history
            const user = await User.findOne({ userId }).lean();
            if (!user) {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            // Get user's ride history for pattern analysis
            const rideHistory = await RideRequest.find({ 
                userId, 
                status: 'completed' 
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

            // Analyze user preferences
            const preferences = UserController.analyzeUserPreferences(user, rideHistory);

            // Find matching vehicles based on preferences and location
            let recommendations = [];
            
            if (latitude && longitude) {
                recommendations = await UserController.findRecommendedVehicles({
                    preferences,
                    location: [parseFloat(longitude), parseFloat(latitude)],
                    maxDistance: parseFloat(maxDistance)
                });
            }

            return UserController.sendSuccess(res, {
                userId,
                userPreferences: preferences,
                recommendations: recommendations.map(rec => ({
                    vehicleId: rec.vehicleId,
                    driver: rec.driver,
                    vehicle: {
                        make: rec.make,
                        model: rec.model,
                        vehicleType: rec.vehicleType,
                        comfortLevel: rec.comfortLevel,
                        priceValue: rec.priceValue
                    },
                    distance: rec.distance,
                    matchScore: rec.matchScore,
                    estimatedFare: rec.estimatedFare,
                    estimatedArrival: rec.estimatedArrival
                })),
                location: latitude && longitude ? { latitude, longitude } : null,
                totalRecommendations: recommendations.length
            }, 'Personalized recommendations generated successfully');

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get user's favorite drivers and vehicles
     */
    static getUserFavorites = asyncHandler(async (req, res) => {
        const { userId } = req.params;

        UserController.logAction('UserController', 'getUserFavorites', { userId });

        // Validate user ID parameter
        const userIdValidation = userIdParamSchema.safeParse({ userId });
        
        if (!userIdValidation.success) {
            return UserController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        try {
            // Get completed rides to identify favorite drivers
            const completedRides = await RideRequest.find({
                userId,
                status: 'completed',
                'acceptedBid.driverId': { $exists: true }
            })
            .lean();

            // Analyze favorite drivers
            const driverStats = {};
            completedRides.forEach(ride => {
                const driverId = ride.acceptedBid.driverId;
                if (!driverStats[driverId]) {
                    driverStats[driverId] = {
                        rideCount: 0,
                        totalFare: 0,
                        avgRating: 0,
                        rideTypes: new Set()
                    };
                }
                
                driverStats[driverId].rideCount++;
                driverStats[driverId].totalFare += ride.acceptedBid.fareAmount || 0;
                driverStats[driverId].rideTypes.add(ride.rideType);
            });

            // Get detailed info for top drivers
            const favoriteDriverIds = Object.entries(driverStats)
                .sort(([,a], [,b]) => b.rideCount - a.rideCount)
                .slice(0, 5)
                .map(([driverId]) => driverId);

            const favoriteDrivers = await Driver.find({
                driverId: { $in: favoriteDriverIds }
            })
            .populate('vehicles')
            .lean();

            // Format favorite drivers with statistics
            const formattedFavorites = favoriteDrivers.map(driver => {
                const stats = driverStats[driver.driverId];
                return {
                    driverId: driver.driverId,
                    name: driver.name,
                    phone: driver.phone,
                    rating: driver.rating,
                    totalRides: driver.totalRides,
                    vehicles: driver.vehicles?.map(vehicle => ({
                        vehicleId: vehicle._id,
                        make: vehicle.make,
                        model: vehicle.model,
                        vehicleType: vehicle.vehicleType,
                        comfortLevel: vehicle.comfortLevel,
                        priceValue: vehicle.priceValue
                    })) || [],
                    userStats: {
                        ridesWithUser: stats.rideCount,
                        totalSpent: stats.totalFare,
                        avgFarePerRide: stats.totalFare / stats.rideCount,
                        rideTypes: Array.from(stats.rideTypes)
                    }
                };
            });

            return UserController.sendSuccess(res, {
                userId,
                favoriteDrivers: formattedFavorites,
                totalCompletedRides: completedRides.length,
                analyzedAt: new Date()
            }, 'User favorites retrieved successfully');

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Helper function to calculate user analytics
     */
    static async calculateUserAnalytics(userId, baseQuery = {}) {
        try {
            const query = { userId, ...baseQuery };
            
            const [
                totalRequests,
                completedRides,
                cancelledRides,
                totalSpent,
                rideTypeStats,
                monthlyStats
            ] = await Promise.all([
                RideRequest.countDocuments(query),
                RideRequest.countDocuments({ ...query, status: 'completed' }),
                RideRequest.countDocuments({ ...query, status: 'cancelled' }),
                RideRequest.aggregate([
                    { $match: { ...query, status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$acceptedBid.fareAmount' } } }
                ]),
                RideRequest.aggregate([
                    { $match: query },
                    { $group: { _id: '$rideType', count: { $sum: 1 } } }
                ]),
                RideRequest.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            completed: {
                                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { '_id.year': -1, '_id.month': -1 } },
                    { $limit: 12 }
                ])
            ]);

            const avgFarePerRide = completedRides > 0 && totalSpent[0]?.total ? 
                totalSpent[0].total / completedRides : 0;

            const completionRate = totalRequests > 0 ? 
                (completedRides / totalRequests * 100).toFixed(2) : 0;

            return {
                overview: {
                    totalRequests,
                    completedRides,
                    cancelledRides,
                    completionRate: parseFloat(completionRate),
                    totalSpent: totalSpent[0]?.total || 0,
                    avgFarePerRide: parseFloat(avgFarePerRide.toFixed(2))
                },
                rideTypeDistribution: rideTypeStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                monthlyTrends: monthlyStats.map(stat => ({
                    year: stat._id.year,
                    month: stat._id.month,
                    totalRides: stat.count,
                    completedRides: stat.completed,
                    completionRate: stat.count > 0 ? 
                        ((stat.completed / stat.count) * 100).toFixed(2) : 0
                }))
            };
        } catch (error) {
            console.error('Error calculating user analytics:', error);
            return {};
        }
    }

    /**
     * Helper function to get date range based on period
     */
    static getDateRange(period) {
        const now = new Date();
        let startDate, endDate = now;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return null;
        }

        return { startDate, endDate };
    }

    /**
     * Helper function to get comprehensive user statistics
     */
    static async getUserStatistics(userId, dateRange) {
        const query = { userId };
        if (dateRange) {
            query.createdAt = {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            };
        }

        return await UserController.calculateUserAnalytics(userId, query);
    }

    /**
     * Helper function to analyze user preferences
     */
    static analyzeUserPreferences(user, rideHistory) {
        const preferences = {
            defaultRideType: user.preferences?.defaultRideType || 'Taxi',
            defaultComfortLevel: user.preferences?.comfortPreference || 3,
            defaultFarePreference: user.preferences?.farePreference || 3,
            preferredTimes: [],
            frequentLocations: []
        };

        if (rideHistory.length > 0) {
            // Analyze most used ride type
            const rideTypeCounts = {};
            const comfortLevels = [];
            const farePreferences = [];

            rideHistory.forEach(ride => {
                rideTypeCounts[ride.rideType] = (rideTypeCounts[ride.rideType] || 0) + 1;
                if (ride.comfortPreference) comfortLevels.push(ride.comfortPreference);
                if (ride.farePreference) farePreferences.push(ride.farePreference);
            });

            // Most used ride type
            const mostUsedRideType = Object.entries(rideTypeCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0];
            
            if (mostUsedRideType) {
                preferences.defaultRideType = mostUsedRideType;
            }

            // Average comfort and fare preferences
            if (comfortLevels.length > 0) {
                preferences.defaultComfortLevel = Math.round(
                    comfortLevels.reduce((sum, level) => sum + level, 0) / comfortLevels.length
                );
            }

            if (farePreferences.length > 0) {
                preferences.defaultFarePreference = Math.round(
                    farePreferences.reduce((sum, pref) => sum + pref, 0) / farePreferences.length
                );
            }
        }

        return preferences;
    }

    /**
     * Helper function to find recommended vehicles
     */
    static async findRecommendedVehicles({ preferences, location, maxDistance }) {
        try {
            const [longitude, latitude] = location;

            // Find vehicles that match user preferences
            const vehicles = await Vehicle.find({
                isActive: true,
                vehicleType: preferences.defaultRideType,
                comfortLevel: { $gte: preferences.defaultComfortLevel - 1 },
                priceValue: { $lte: preferences.defaultFarePreference + 1 }
            })
            .populate({
                path: 'driverId',
                select: 'driverId name phone rating totalRides status isOnline currentLocation',
                match: { isOnline: true, status: 'available' }
            })
            .lean();

            // Filter by distance and calculate recommendations
            const recommendations = vehicles
                .filter(vehicle => vehicle.driverId !== null)
                .map(vehicle => {
                    let distance = null;
                    let estimatedArrival = null;

                    if (vehicle.driverId.currentLocation?.coordinates) {
                        const [driverLng, driverLat] = vehicle.driverId.currentLocation.coordinates;
                        distance = UserController.calculateDistance(latitude, longitude, driverLat, driverLng);
                        estimatedArrival = Math.ceil(distance * 3); // Rough estimate: 3 minutes per km
                    }

                    if (distance && distance > maxDistance) {
                        return null;
                    }

                    // Calculate match score
                    let matchScore = 50; // Base score
                    
                    if (vehicle.vehicleType === preferences.defaultRideType) matchScore += 20;
                    if (vehicle.comfortLevel >= preferences.defaultComfortLevel) matchScore += 15;
                    if (vehicle.priceValue <= preferences.defaultFarePreference) matchScore += 10;
                    if (vehicle.driverId.rating >= 4) matchScore += (vehicle.driverId.rating - 4) * 10;
                    if (distance) matchScore -= distance * 2;

                    // Estimate fare (simple calculation)
                    const baseFare = 50;
                    const distanceFare = distance ? distance * 10 : 0;
                    const comfortMultiplier = 1 + (vehicle.comfortLevel - 1) * 0.1;
                    const estimatedFare = (baseFare + distanceFare) * comfortMultiplier;

                    return {
                        vehicleId: vehicle._id,
                        make: vehicle.make,
                        model: vehicle.model,
                        vehicleType: vehicle.vehicleType,
                        comfortLevel: vehicle.comfortLevel,
                        priceValue: vehicle.priceValue,
                        driver: {
                            driverId: vehicle.driverId.driverId,
                            name: vehicle.driverId.name,
                            phone: vehicle.driverId.phone,
                            rating: vehicle.driverId.rating,
                            totalRides: vehicle.driverId.totalRides
                        },
                        distance,
                        matchScore: Math.max(0, Math.min(100, matchScore)),
                        estimatedFare: Math.round(estimatedFare),
                        estimatedArrival
                    };
                })
                .filter(Boolean)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 10);

            return recommendations;
        } catch (error) {
            console.error('Error finding recommended vehicles:', error);
            return [];
        }
    }

    /**
     * Get user analytics for admin dashboard
     */
    static getUserAnalytics = asyncHandler(async (req, res) => {
        UserController.logAction('UserController', 'getUserAnalytics', req.query);

        const analyticsSchema = z.object({
            period: z.enum(['week', 'month', 'quarter']).default('month'),
            userId: z.string().regex(/^USER_[0-9A-F]{8}$/).optional()
        });

        const validationResult = analyticsSchema.safeParse(req.query);
        if (!validationResult.success) {
            return UserController.sendValidationError(res, validationResult);
        }

        const { period, userId } = validationResult.data;

        try {
            const cacheKey = `user_analytics_${period}_${userId || 'all'}`;
            
            const analytics = await UserController.getCachedData(cacheKey, async () => {
                const periodMap = {
                    week: 7,
                    month: 30,
                    quarter: 90
                };

                const days = periodMap[period];
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

                const matchQuery = {
                    createdAt: { $gte: startDate, $lte: endDate },
                    ...(userId && { userId })
                };

                const [
                    userStats,
                    rideFrequency,
                    spendingPatterns,
                    preferenceAnalysis
                ] = await Promise.all([
                    User.aggregate([
                        { $match: userId ? { userId } : {} },
                        {
                            $group: {
                                _id: null,
                                totalUsers: { $sum: 1 },
                                activeUsers: {
                                    $sum: {
                                        $cond: [
                                            { $gte: ['$lastSeen', startDate] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                avgRating: { $avg: '$rating' },
                                avgTotalRides: { $avg: '$totalRides' }
                            }
                        }
                    ]),
                    RideRequest.aggregate([
                        { $match: matchQuery },
                        {
                            $group: {
                                _id: '$userId',
                                rideCount: { $sum: 1 },
                                totalSpent: { $sum: '$acceptedBid.fareAmount' },
                                avgFare: { $avg: '$acceptedBid.fareAmount' }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgRidesPerUser: { $avg: '$rideCount' },
                                totalRides: { $sum: '$rideCount' },
                                avgSpentPerUser: { $avg: '$totalSpent' }
                            }
                        }
                    ]),
                    RideRequest.aggregate([
                        { $match: { ...matchQuery, status: APP_CONSTANTS.RIDE_STATUS.COMPLETED } },
                        {
                            $group: {
                                _id: {
                                    hour: { $hour: '$createdAt' },
                                    dayOfWeek: { $dayOfWeek: '$createdAt' }
                                },
                                count: { $sum: 1 },
                                avgFare: { $avg: '$acceptedBid.fareAmount' }
                            }
                        },
                        { $sort: { count: -1 } }
                    ]),
                    User.aggregate([
                        { $match: userId ? { userId } : {} },
                        {
                            $group: {
                                _id: '$preferences.preferredVehicleType',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ])
                ]);

                return {
                    period,
                    userStats: userStats[0] || {},
                    rideFrequency: rideFrequency[0] || {},
                    popularTimes: spendingPatterns.slice(0, 10),
                    vehiclePreferences: preferenceAnalysis,
                    insights: {
                        peakHour: spendingPatterns.length > 0 ? spendingPatterns[0]._id.hour : null,
                        mostActiveDay: spendingPatterns.length > 0 ? spendingPatterns[0]._id.dayOfWeek : null,
                        preferredVehicle: preferenceAnalysis.length > 0 ? preferenceAnalysis[0]._id : null
                    }
                };
            }, 300000); // Cache for 5 minutes

            return UserController.sendSuccess(res, analytics, 'User analytics retrieved successfully');

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk update user preferences for marketing campaigns
     */
    static bulkUpdatePreferences = asyncHandler(async (req, res) => {
        UserController.logAction('UserController', 'bulkUpdatePreferences', req.body);

        const bulkUpdateSchema = z.object({
            userIds: z.array(z.string().regex(/^USER_[0-9A-F]{8}$/)),
            preferences: z.object({
                maxWaitTime: z.number().min(1).max(60).optional(),
                priceRangeMin: z.number().min(0).optional(),
                priceRangeMax: z.number().min(0).optional(),
                preferredVehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
                notifications: z.object({
                    rideUpdates: z.boolean().optional(),
                    promotions: z.boolean().optional(),
                    driverArrival: z.boolean().optional()
                }).optional()
            })
        });

        const validationResult = bulkUpdateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return UserController.sendValidationError(res, validationResult);
        }

        const { userIds, preferences } = validationResult.data;

        try {
            const result = await UserController.withTransaction(async (session) => {
                const updateResult = await User.updateMany(
                    { userId: { $in: userIds } },
                    { 
                        $set: {
                            'preferences': preferences,
                            updatedAt: new Date()
                        }
                    },
                    { session }
                );

                // Clear relevant caches
                UserController.clearCache(/^user_analytics_|^user_recommendations_/);

                return updateResult;
            });

            return UserController.sendSuccess(res, {
                updatedCount: result.modifiedCount,
                matchedCount: result.matchedCount
            }, `${result.modifiedCount} user preferences updated successfully`);

        } catch (error) {
            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Generate user behavior insights
     */
    static getUserBehaviorInsights = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        
        UserController.logAction('UserController', 'getUserBehaviorInsights', { userId });

        const insightsSchema = z.object({
            includeRecommendations: z.coerce.boolean().default(true),
            period: z.enum(['month', 'quarter', 'year']).default('quarter')
        });

        const validationResult = insightsSchema.safeParse(req.query);
        if (!validationResult.success) {
            return UserController.sendValidationError(res, validationResult);
        }

        const { includeRecommendations, period } = validationResult.data;

        try {
            const cacheKey = `user_insights_${userId}_${period}_${includeRecommendations}`;
            
            const insights = await UserController.getCachedData(cacheKey, async () => {
                const periodMap = {
                    month: 30,
                    quarter: 90,
                    year: 365
                };

                const days = periodMap[period];
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

                const [user, rideHistory, patterns] = await Promise.all([
                    User.findOne({ userId }),
                    RideRequest.find({
                        userId,
                        createdAt: { $gte: startDate, $lte: endDate },
                        status: APP_CONSTANTS.RIDE_STATUS.COMPLETED
                    }).sort({ createdAt: -1 }),
                    RideRequest.aggregate([
                        {
                            $match: {
                                userId,
                                createdAt: { $gte: startDate, $lte: endDate },
                                status: APP_CONSTANTS.RIDE_STATUS.COMPLETED
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    hour: { $hour: '$createdAt' },
                                    dayOfWeek: { $dayOfWeek: '$createdAt' },
                                    vehicleType: '$acceptedBid.vehicleType'
                                },
                                count: { $sum: 1 },
                                avgFare: { $avg: '$acceptedBid.fareAmount' },
                                avgDistance: { $avg: '$estimatedDistance' }
                            }
                        }
                    ])
                ]);

                if (!user) {
                    throw new Error('USER_NOT_FOUND');
                }

                const behaviorInsights = {
                    rideFrequency: rideHistory.length,
                    avgRidesPerWeek: (rideHistory.length / (days / 7)).toFixed(1),
                    totalSpent: rideHistory.reduce((sum, ride) => sum + (ride.acceptedBid?.fareAmount || 0), 0),
                    avgFarePerRide: rideHistory.length > 0 
                        ? (rideHistory.reduce((sum, ride) => sum + (ride.acceptedBid?.fareAmount || 0), 0) / rideHistory.length).toFixed(2)
                        : 0,
                    preferredTimes: patterns
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map(p => ({
                            hour: p._id.hour,
                            dayOfWeek: p._id.dayOfWeek,
                            count: p.count
                        })),
                    preferredVehicleTypes: patterns
                        .reduce((acc, p) => {
                            const existing = acc.find(item => item.type === p._id.vehicleType);
                            if (existing) {
                                existing.count += p.count;
                            } else {
                                acc.push({ type: p._id.vehicleType, count: p.count });
                            }
                            return acc;
                        }, [])
                        .sort((a, b) => b.count - a.count),
                    loyaltyScore: Math.min(100, (rideHistory.length * 5) + (user.rating * 10))
                };

                const recommendations = includeRecommendations 
                    ? await UserController.findRecommendedVehicles(userId, user.defaultLocation, 10)
                    : [];

                return {
                    userId,
                    period,
                    insights: behaviorInsights,
                    recommendations: recommendations.slice(0, 5)
                };
            }, 600000); // Cache for 10 minutes

            return UserController.sendSuccess(res, insights, 'User behavior insights retrieved successfully');

        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                return UserController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            const mongoError = UserController.handleMongoError(error);
            return UserController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });
}

// Export individual functions for backward compatibility
export const {
    getUserProfile,
    updateUserProfile,
    getUserRideHistory,
    getUserStats,
    updateUserLocation,
    updateUserPreferences,
    getPersonalizedRecommendations,
    getUserFavorites,
    getUserAnalytics,
    bulkUpdatePreferences,
    getUserBehaviorInsights
} = UserController;

export default UserController;
