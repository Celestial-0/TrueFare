import RideRequest from '../models/rideRequest.model.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import Vehicle from '../models/vehicle.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from 'zod';
import { 
    createRideRequestSchema,
    getRideRequestsQuerySchema,
    getBidsQuerySchema,
    acceptBidSchema
} from '../validations/rideRequest.validation.js';
import { 
    formatValidationError,
    requestIdParamSchema,
    userIdParamSchema,
    driverIdParamSchema,
    validateObjectId,
    validatePagination,
    validateSortQuery
} from '../validations/common.validation.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import { generateDriverId, generateUserId, validateIdFormat } from '../utils/idGenerator.js';
import DataPersistenceService from '../services/dataPersistenceService.js';

/**
 * Enhanced Ride Request Controller with improved validation, synchronization, and error handling
 */
class RideRequestController extends BaseController {

    /**
     * Find matching vehicles for a ride request
     */
    static findMatchingVehicles = async (criteria) => {
        const { rideType, comfortPreference, farePreference, pickupCoordinates, maxDistance = 15 } = criteria;

        try {
            // Build vehicle query
            const vehicleQuery = {
                isActive: true,
                vehicleType: rideType,
                comfortLevel: { $gte: comfortPreference },
                priceValue: { $lte: farePreference }
            };

            const vehicles = await Vehicle.find(vehicleQuery)
                .populate({
                    path: 'driverId',
                    select: 'driverId name phone rating totalRides status isOnline currentLocation',
                    match: { isOnline: true, status: 'available' }
                })
                .lean();

            // Filter by driver availability and distance
            let matchingVehicles = vehicles.filter(vehicle => vehicle.driverId !== null);

            if (pickupCoordinates) {
                const { longitude: pickupLng, latitude: pickupLat } = pickupCoordinates;
                
                matchingVehicles = matchingVehicles.filter(vehicle => {
                    if (!vehicle.driverId.currentLocation?.coordinates) return false;
                    
                    const { longitude: driverLng, latitude: driverLat } = vehicle.driverId.currentLocation.coordinates;
                    const distance = RideRequestController.calculateDistance(
                        pickupLat, pickupLng, driverLat, driverLng
                    );
                    
                    vehicle.distance = distance;
                    return distance <= maxDistance;
                });

                // Sort by distance
                matchingVehicles.sort((a, b) => (a.distance || 999) - (b.distance || 999));
            }

            // Calculate match scores
            return matchingVehicles.map(vehicle => {
                let matchScore = 50; // Base score
                
                // Comfort bonus
                if (vehicle.comfortLevel > comfortPreference) {
                    matchScore += (vehicle.comfortLevel - comfortPreference) * 10;
                }
                
                // Price bonus (lower price = higher score)
                if (vehicle.priceValue < farePreference) {
                    matchScore += (farePreference - vehicle.priceValue) * 5;
                }
                
                // Driver rating bonus
                if (vehicle.driverId.rating > 4) {
                    matchScore += (vehicle.driverId.rating - 4) * 20;
                }
                
                // Distance penalty
                if (vehicle.distance) {
                    matchScore -= vehicle.distance * 2;
                }
                
                return {
                    vehicleId: vehicle._id,
                    driver: {
                        driverId: vehicle.driverId.driverId,
                        name: vehicle.driverId.name,
                        rating: vehicle.driverId.rating,
                        totalRides: vehicle.driverId.totalRides
                    },
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    distance: vehicle.distance,
                    matchScore: Math.max(0, Math.min(100, matchScore))
                };
            });

        } catch (error) {
            console.error('Error finding matching vehicles:', error);
            return [];
        }
    };

    /**
     * Get ride request with detailed information
     */
    static getRideRequest = asyncHandler(async (req, res) => {
        const { requestId } = req.params;
        
        RideRequestController.logAction('RideRequestController', 'getRideRequest', { requestId });

        // Validate requestId using Zod
        const validationResult = validateObjectId(requestId);
        
        if (!validationResult.success) {
            return RideRequestController.sendError(res, 'Invalid request ID format', 400, 'INVALID_REQUEST_ID');
        }

        try {
            const rideRequest = await RideRequest.findById(requestId)
                .populate('userId', 'userId name phone rating')
                .lean();

            if (!rideRequest) {
                return RideRequestController.sendError(res, 'Ride request not found', 404, 'REQUEST_NOT_FOUND');
            }

            // Populate bid driver information
            const populatedBids = await Promise.all(
                (rideRequest.bids || []).map(async (bid) => {
                    const driver = await Driver.findOne({ driverId: bid.driverId })
                        .select('driverId name phone rating totalRides currentLocation')
                        .lean();
                    
                    return {
                        ...bid,
                        driver: driver || null
                    };
                })
            );

            const sanitizedRequest = RideRequestController.sanitizeForResponse(rideRequest, ['__v']);

            return RideRequestController.sendSuccess(res, {
                requestId: sanitizedRequest._id,
                userId: sanitizedRequest.userId?.userId || sanitizedRequest.userId,
                user: sanitizedRequest.userId ? {
                    userId: sanitizedRequest.userId.userId,
                    name: sanitizedRequest.userId.name,
                    phone: sanitizedRequest.userId.phone,
                    rating: sanitizedRequest.userId.rating
                } : null,
                rideType: sanitizedRequest.rideType,
                comfortPreference: sanitizedRequest.comfortPreference,
                farePreference: sanitizedRequest.farePreference,
                pickupLocation: sanitizedRequest.pickupLocation,
                destination: sanitizedRequest.destination,
                estimatedDistance: sanitizedRequest.estimatedDistance,
                estimatedDuration: sanitizedRequest.estimatedDuration,
                status: sanitizedRequest.status,
                bids: populatedBids,
                acceptedBid: sanitizedRequest.acceptedBid,
                createdAt: sanitizedRequest.createdAt,
                updatedAt: sanitizedRequest.updatedAt
            }, 'Ride request retrieved successfully');

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get all ride requests for a user
     */
    static getUserRideRequests = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { page = 1, limit = 10, status, sortBy = 'createdAt', order = 'desc' } = req.query;

        RideRequestController.logAction('RideRequestController', 'getUserRideRequests', { userId, page, limit });

        // Validate userId using Zod
        const userIdValidation = z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').safeParse(userId);
        
        if (!userIdValidation.success) {
            return RideRequestController.sendError(res, 'Invalid user ID format', 400, 'INVALID_USER_ID');
        }

        // Validate query parameters using Zod
        const queryValidation = getRideRequestsQuerySchema.safeParse({ page, limit, status, sortBy, order });
        
        if (!queryValidation.success) {
            return RideRequestController.sendValidationError(res, queryValidation);
        }

        const { page: pageNum, limit: limitNum, status: statusFilter, sortBy: sortField, order: sortOrder } = queryValidation.data;

        try {
            // Build query
            const query = { userId };
            if (statusFilter) {
                query.status = statusFilter;
            }

            // Build sort
            const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

            // Execute query with pagination
            const skip = (pageNum - 1) * limitNum;
            
            const [rideRequests, totalCount] = await Promise.all([
                RideRequest.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                RideRequest.countDocuments(query)
            ]);

            const sanitizedRequests = RideRequestController.sanitizeForResponse(rideRequests, ['__v']);

            const paginationMeta = RideRequestController.getPaginationMeta(pageNum, limitNum, totalCount);

            return RideRequestController.sendSuccess(res, {
                requests: sanitizedRequests.map(request => ({
                    requestId: request._id,
                    rideType: request.rideType,
                    comfortPreference: request.comfortPreference,
                    farePreference: request.farePreference,
                    pickupLocation: request.pickupLocation,
                    destination: request.destination,
                    estimatedDistance: request.estimatedDistance,
                    estimatedDuration: request.estimatedDuration,
                    status: request.status,
                    bidsCount: request.bids?.length || 0,
                    acceptedBid: request.acceptedBid,
                    createdAt: request.createdAt,
                    updatedAt: request.updatedAt
                })),
                filters: { status: statusFilter, sortBy: sortField, order: sortOrder }
            }, 'User ride requests retrieved successfully', 200, paginationMeta);

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get all bids for a specific ride request
     */
    static getRideRequestBids = asyncHandler(async (req, res) => {
        const { requestId } = req.params;
        const { sortBy = 'fareAmount', order = 'asc', status } = req.query;

        RideRequestController.logAction('RideRequestController', 'getRideRequestBids', { requestId, sortBy, order });

        // Validate requestId using Zod
        const requestIdValidation = validateObjectId(requestId);
        
        if (!requestIdValidation.success) {
            return RideRequestController.sendError(res, 'Invalid request ID format', 400, 'INVALID_REQUEST_ID');
        }

        // Validate query parameters using Zod
        const queryValidation = getBidsQuerySchema.safeParse({ sortBy, order });
        
        if (!queryValidation.success) {
            return RideRequestController.sendValidationError(res, queryValidation);
        }

        const { sortBy: sortField, order: sortOrder } = queryValidation.data;

        try {
            const rideRequest = await RideRequest.findById(requestId).lean();

            if (!rideRequest) {
                return RideRequestController.sendError(res, 'Ride request not found', 404, 'REQUEST_NOT_FOUND');
            }

            let bids = rideRequest.bids || [];

            // Filter by status if provided
            if (status) {
                bids = bids.filter(bid => bid.status === status);
            }

            // Populate driver information for each bid
            const populatedBids = await Promise.all(
                bids.map(async (bid) => {
                    const driver = await Driver.findOne({ driverId: bid.driverId })
                        .populate('vehicles', 'make model year vehicleType comfortLevel priceValue')
                        .select('driverId name phone rating totalRides currentLocation vehicles')
                        .lean();
                    
                    return {
                        ...bid,
                        driver: driver ? {
                            driverId: driver.driverId,
                            name: driver.name,
                            phone: driver.phone,
                            rating: driver.rating,
                            totalRides: driver.totalRides,
                            currentLocation: driver.currentLocation,
                            vehicles: driver.vehicles || []
                        } : null
                    };
                })
            );

            // Sort bids
            populatedBids.sort((a, b) => {
                const aValue = a[sortField];
                const bValue = b[sortField];
                
                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });

            return RideRequestController.sendSuccess(res, {
                requestId,
                status: rideRequest.status,
                bids: populatedBids,
                bidCount: populatedBids.length,
                sorting: { sortBy: sortField, order: sortOrder },
                filters: { status }
            }, 'Ride request bids retrieved successfully');

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get available ride requests for drivers
     */
    static getAvailableRideRequests = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, rideType, maxDistance = 10 } = req.query;
        const { driverId } = req.query; // Optional: filter requests suitable for specific driver

        RideRequestController.logAction('RideRequestController', 'getAvailableRideRequests', { page, limit, rideType });

        // Validate query parameters using Zod
        const queryValidation = getRideRequestsQuerySchema.safeParse({ page, limit, status: 'bidding' });
        
        if (!queryValidation.success) {
            return RideRequestController.sendValidationError(res, queryValidation);
        }

        const { page: pageNum, limit: limitNum } = queryValidation.data;

        try {
            // Build query for bidding requests
            const query = { status: 'bidding' };
            if (rideType) {
                query.rideType = rideType;
            }

            // Execute query with pagination
            const skip = (pageNum - 1) * limitNum;
            
            let [rideRequests, totalCount] = await Promise.all([
                RideRequest.find(query)
                    .populate('userId', 'userId name rating')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                RideRequest.countDocuments(query)
            ]);

            // If driverId is provided, filter by distance and suitability
            if (driverId) {
                const driver = await Driver.findOne({ driverId })
                    .populate('vehicles')
                    .lean();

                if (driver && driver.currentLocation?.coordinates) {
                    const { longitude: driverLng, latitude: driverLat } = driver.currentLocation.coordinates;
                    
                    rideRequests = rideRequests.filter(request => {
                        if (!request.pickupLocation?.coordinates) return true;
                        
                        const { longitude: pickupLng, latitude: pickupLat } = request.pickupLocation.coordinates;
                        const distance = RideRequestController.calculateDistance(
                            driverLat, driverLng, pickupLat, pickupLng
                        );
                        
                        return distance <= parseFloat(maxDistance);
                    });

                    // Add distance information and match scores
                    rideRequests = rideRequests.map(request => {
                        let distance = null;
                        let matchScore = 0;
                        
                        if (request.pickupLocation?.coordinates) {
                            const { longitude: pickupLng, latitude: pickupLat } = request.pickupLocation.coordinates;
                            distance = RideRequestController.calculateDistance(
                                driverLat, driverLng, pickupLat, pickupLng
                            );
                        }

                        // Calculate match score based on vehicle suitability
                        if (driver.vehicles && driver.vehicles.length > 0) {
                            const suitableVehicles = driver.vehicles.filter(vehicle => 
                                vehicle.vehicleType === request.rideType &&
                                vehicle.comfortLevel >= request.comfortPreference &&
                                vehicle.priceValue <= request.farePreference &&
                                vehicle.isActive
                            );
                            
                            if (suitableVehicles.length > 0) {
                                matchScore = 100 - (distance || 0) * 2; // Base score minus distance penalty
                                matchScore = Math.max(0, Math.min(100, matchScore));
                            }
                        }

                        return { ...request, distance, matchScore };
                    });

                    // Sort by match score and distance
                    rideRequests.sort((a, b) => {
                        if (b.matchScore !== a.matchScore) {
                            return b.matchScore - a.matchScore;
                        }
                        return (a.distance || 999) - (b.distance || 999);
                    });
                }
            }

            const sanitizedRequests = RideRequestController.sanitizeForResponse(rideRequests, ['__v']);

            const paginationMeta = RideRequestController.getPaginationMeta(pageNum, limitNum, totalCount);

            return RideRequestController.sendSuccess(res, {
                requests: sanitizedRequests.map(request => ({
                    requestId: request._id,
                    user: request.userId ? {
                        userId: request.userId.userId,
                        name: request.userId.name,
                        rating: request.userId.rating
                    } : null,
                    rideType: request.rideType,
                    comfortPreference: request.comfortPreference,
                    farePreference: request.farePreference,
                    pickupLocation: request.pickupLocation,
                    destination: request.destination,
                    estimatedDistance: request.estimatedDistance,
                    estimatedDuration: request.estimatedDuration,
                    bidsCount: request.bids?.length || 0,
                    createdAt: request.createdAt,
                    ...(request.distance !== undefined && { distance: request.distance }),
                    ...(request.matchScore !== undefined && { matchScore: request.matchScore })
                })),
                filters: { rideType, maxDistance, driverId }
            }, 'Available ride requests retrieved successfully', 200, paginationMeta);

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get ride request analytics
     */
    static getRideRequestAnalytics = asyncHandler(async (req, res) => {
        RideRequestController.logAction('RideRequestController', 'getRideRequestAnalytics', req.query);

        const analyticsSchema = z.object({
            period: z.enum(['day', 'week', 'month']).default('week'),
            status: z.enum([...Object.values(APP_CONSTANTS.RIDE_STATUS), 'all']).default('all')
        });

        const validationResult = analyticsSchema.safeParse(req.query);
        if (!validationResult.success) {
            return RideRequestController.sendValidationError(res, validationResult);
        }

        const { period, status } = validationResult.data;

        try {
            const cacheKey = `ride_analytics_${period}_${status}`;
            
            const analytics = await RideRequestController.getCachedData(cacheKey, async () => {
                const periodMap = {
                    day: 1,
                    week: 7,
                    month: 30
                };

                const days = periodMap[period];
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

                const matchQuery = {
                    createdAt: { $gte: startDate, $lte: endDate },
                    ...(status !== 'all' && { status })
                };

                const [
                    totalRequests,
                    statusBreakdown,
                    avgCompletionTime,
                    popularRoutes,
                    revenueData
                ] = await Promise.all([
                    RideRequest.countDocuments(matchQuery),
                    RideRequest.aggregate([
                        { $match: matchQuery },
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]),
                    RideRequest.aggregate([
                        { 
                            $match: { 
                                ...matchQuery, 
                                status: APP_CONSTANTS.RIDE_STATUS.COMPLETED,
                                acceptedAt: { $exists: true },
                                completedAt: { $exists: true }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgTime: {
                                    $avg: {
                                        $subtract: ['$completedAt', '$acceptedAt']
                                    }
                                }
                            }
                        }
                    ]),
                    RideRequest.aggregate([
                        { $match: matchQuery },
                        {
                            $group: {
                                _id: {
                                    pickup: '$pickupLocation.address',
                                    destination: '$destination.address'
                                },
                                count: { $sum: 1 },
                                avgFare: { $avg: '$acceptedBid.fareAmount' }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]),
                    RideRequest.aggregate([
                        { 
                            $match: { 
                                ...matchQuery, 
                                status: APP_CONSTANTS.RIDE_STATUS.COMPLETED 
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: '$acceptedBid.fareAmount' },
                                avgFare: { $avg: '$acceptedBid.fareAmount' },
                                count: { $sum: 1 }
                            }
                        }
                    ])
                ]);

                return {
                    period,
                    totalRequests,
                    statusBreakdown: statusBreakdown.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    avgCompletionTimeMinutes: avgCompletionTime[0]?.avgTime 
                        ? Math.round(avgCompletionTime[0].avgTime / (1000 * 60)) 
                        : 0,
                    popularRoutes: popularRoutes.map(route => ({
                        from: route._id.pickup,
                        to: route._id.destination,
                        requestCount: route.count,
                        avgFare: route.avgFare ? parseFloat(route.avgFare.toFixed(2)) : 0
                    })),
                    revenue: revenueData[0] || { totalRevenue: 0, avgFare: 0, count: 0 }
                };
            }, 300000); // Cache for 5 minutes

            return RideRequestController.sendSuccess(res, analytics, 'Ride request analytics retrieved successfully');

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk cancel ride requests
     */
    static bulkCancelRequests = asyncHandler(async (req, res) => {
        const { requestIds } = req.body;

        try {
            // Validate input
            if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
                return RideRequestController.sendError(res, 'Invalid request IDs', 400, 'INVALID_REQUEST_IDS');
            }

            // Update all matching requests
            const result = await RideRequest.updateMany(
                { requestId: { $in: requestIds }, status: { $in: ['pending', 'bidding'] } },
                { $set: { status: 'cancelled', cancellationTime: new Date() } }
            );

            // Check if any requests were updated
            if (result.modifiedCount === 0) {
                return RideRequestController.sendError(res, 'No cancellable requests found', 404, 'NO_CANCELLABLE_REQUESTS');
            }

            // Notify users via WebSocket
            requestIds.forEach(requestId => {
                socketService.emitToRoom(`request_${requestId}`, 'request:cancelled', {
                    requestId,
                    message: 'Ride request cancelled in bulk operation'
                });
            });

            // Return success response
            RideRequestController.sendResponse(res, {
                message: `Cancelled ${result.modifiedCount} ride requests`,
                cancelledCount: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk cancel error:', error);
            RideRequestController.sendError(res, 'Failed to bulk cancel requests', 500, 'BULK_CANCEL_FAILED');
        }
    });

    /**
     * Optimize ride matching algorithm
     */
    static optimizeMatching = asyncHandler(async (req, res) => {
        RideRequestController.logAction('RideRequestController', 'optimizeMatching');

        try {
            const result = await RideRequestController.withRetry(async () => {
                // Get all pending ride requests
                const pendingRequests = await DataPersistenceService.recoverActiveRideRequests();
                
                let optimizedCount = 0;
                
                for (const request of pendingRequests) {
                    if (request.status === APP_CONSTANTS.RIDE_STATUS.PENDING) {
                        // Re-run matching algorithm
                        const matchingVehicles = await RideRequestController.findMatchingVehicles(
                            request.pickupLocation,
                            request.rideType,
                            request.userId
                        );

                        if (matchingVehicles.length > 0) {
                            // Update to bidding status if matches found
                            await RideRequest.findByIdAndUpdate(request._id, {
                                status: APP_CONSTANTS.RIDE_STATUS.BIDDING,
                                updatedAt: new Date()
                            });

                            // Notify matching drivers
                            try {
                                matchingVehicles.slice(0, 5).forEach(vehicle => {
                                    socketService.emitToDriver(vehicle.driver.driverId, 'rideRequest:new', {
                                        requestId: request._id,
                                        ...request.toObject(),
                                        matchScore: vehicle.matchScore
                                    });
                                });
                            } catch (socketError) {
                                console.warn('Socket broadcast failed:', socketError.message);
                            }

                            optimizedCount++;
                        }
                    }
                }

                return { optimizedCount, totalPending: pendingRequests.length };
            });

            return RideRequestController.sendSuccess(res, result, 'Ride matching optimization completed');

        } catch (error) {
            const mongoError = RideRequestController.handleMongoError(error);
            return RideRequestController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });
}

/**
 * Find matching vehicles for ride requests (standalone wrapper)
 */
const findMatchingVehicles = async (criteria) => {
    return await RideRequestController.findMatchingVehicles(criteria);
};

/**
 * Get ride request by ID (standalone wrapper)
 */
const getRideRequest = asyncHandler(async (req, res) => {
    return await RideRequestController.getRideRequest(req, res);
});

/**
 * Get user ride requests (standalone wrapper)
 */
const getUserRideRequests = asyncHandler(async (req, res) => {
    return await RideRequestController.getUserRideRequests(req, res);
});

/**
 * Get ride request bids (standalone wrapper)
 */
const getRideRequestBids = asyncHandler(async (req, res) => {
    return await RideRequestController.getRideRequestBids(req, res);
});

/**
 * Get available ride requests (standalone wrapper)
 */
const getAvailableRideRequests = asyncHandler(async (req, res) => {
    return await RideRequestController.getAvailableRideRequests(req, res);
});

/**
 * Get ride request analytics (standalone wrapper)
 */
const getRideRequestAnalytics = asyncHandler(async (req, res) => {
    return await RideRequestController.getRideRequestAnalytics(req, res);
});

/**
 * Optimize ride matching (standalone wrapper)
 */
const optimizeMatching = asyncHandler(async (req, res) => {
    return await RideRequestController.optimizeMatching(req, res);
});

/**
 * Bulk cancel ride requests
 * @route POST /api/ride-requests/bulk-cancel
 */
const bulkCancelRequests = asyncHandler(async (req, res) => {
    RideRequestController.logAction('RideRequestController', 'bulkCancelRequests');

    try {
        const { requestIds, reason = 'Cancelled by user' } = req.body;

        // Validate input
        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return RideRequestController.sendError(res, 'requestIds must be a non-empty array', 400, 'INVALID_REQUEST_IDS');
        }

        // Validate each request ID
        const invalidIds = requestIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return RideRequestController.sendError(res, `Invalid request IDs: ${invalidIds.join(', ')}`, 400, 'INVALID_OBJECT_IDS');
        }

        // Update multiple ride requests to cancelled status
        const result = await RideRequest.updateMany(
            { 
                _id: { $in: requestIds },
                status: { $in: ['pending', 'bidding'] }
            },
            { 
                $set: { 
                    status: 'cancelled',
                    cancellationTime: new Date(),
                    cancellationReason: reason
                } 
            }
        );

        // Check if any requests were updated
        if (result.modifiedCount === 0) {
            return RideRequestController.sendError(res, 'No cancellable requests found', 404, 'NO_CANCELLABLE_REQUESTS');
        }

        // Notify users via WebSocket
        requestIds.forEach(requestId => {
            socketService.emitToRoom(`request_${requestId}`, 'request:cancelled', {
                requestId,
                message: reason,
                cancelledAt: new Date()
            });
        });

        // Return success response
        RideRequestController.sendResponse(res, {
            message: `Successfully cancelled ${result.modifiedCount} ride requests`,
            cancelledCount: result.modifiedCount,
            totalRequested: requestIds.length
        });

    } catch (error) {
        console.error('Bulk cancel error:', error);
        RideRequestController.sendError(res, 'Failed to bulk cancel ride requests', 500, 'BULK_CANCEL_FAILED');
    }
});

// Export individual functions
export {
    findMatchingVehicles,
    getRideRequest,
    getUserRideRequests,
    getRideRequestBids,
    getAvailableRideRequests,
    getRideRequestAnalytics,
    bulkCancelRequests,
    optimizeMatching
};

export default RideRequestController;
