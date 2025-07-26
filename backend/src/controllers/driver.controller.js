import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import RideRequest from '../models/rideRequest.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { 
    driverUpdateSchema,
    driverRegistrationSchema,
    driverBidHistoryQuerySchema,
    driverRideHistoryQuerySchema,
    driverLocationUpdateSchema,
    driverQuerySchema,
    nearbyDriversQuerySchema,
    bulkUpdateDriverStatusSchema,
    driverAnalyticsQuerySchema
} from '../validations/driver.validation.js';
import { 
    formatValidationError,
    driverIdParamSchema,
    validatePagination,
    validateSortQuery,
    validateObjectId
} from '../validations/common.validation.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import { generateDriverId, validateIdFormat } from '../utils/idGenerator.js';
import DataPersistenceService from '../services/dataPersistenceService.js';
import BackgroundTaskScheduler from '../utils/backgroundTasks.js';

/**
 * Enhanced Driver Controller with improved validation, synchronization, and error handling
 */
class DriverController extends BaseController {

    /**
     * Get driver profile with enhanced data and analytics
     */
    static getDriverProfile = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        DriverController.logAction('DriverController', 'getDriverProfile', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        try {
            const driver = await Driver.findOne({ driverId })
                .populate('vehicles')
                .lean();

            if (!driver) {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            // Get driver statistics
            const [totalBids, acceptedBids, completedRides, totalEarnings] = await Promise.all([
                RideRequest.countDocuments({ 'bids.driverId': driverId }),
                RideRequest.countDocuments({ 
                    'bids.driverId': driverId,
                    'bids.status': 'accepted'
                }),
                RideRequest.countDocuments({ 
                    'acceptedBid.driverId': driverId,
                    status: 'completed'
                }),
                RideRequest.aggregate([
                    { 
                        $match: { 
                            'acceptedBid.driverId': driverId,
                            status: 'completed'
                        }
                    },
                    { 
                        $group: { 
                            _id: null, 
                            total: { $sum: '$acceptedBid.fareAmount' } 
                        } 
                    }
                ])
            ]);

            const sanitizedDriver = DriverController.sanitizeForResponse(driver, ['__v']);

            return DriverController.sendSuccess(res, {
                driverId: sanitizedDriver.driverId,
                name: sanitizedDriver.name,
                email: sanitizedDriver.email,
                phone: sanitizedDriver.phone,
                vehicles: sanitizedDriver.vehicles?.map(vehicle => ({
                    vehicleId: vehicle._id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    licensePlate: vehicle.licensePlate,
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    isActive: vehicle.isActive
                })) || [],
                currentLocation: sanitizedDriver.currentLocation,
                status: sanitizedDriver.status,
                isOnline: sanitizedDriver.isOnline,
                rating: sanitizedDriver.rating,
                totalRides: sanitizedDriver.totalRides,
                statistics: {
                    totalBids,
                    acceptedBids,
                    completedRides,
                    totalEarnings: totalEarnings[0]?.total || 0,
                    bidAcceptanceRate: totalBids > 0 ? ((acceptedBids / totalBids) * 100).toFixed(2) : 0,
                    avgEarningsPerRide: completedRides > 0 ? ((totalEarnings[0]?.total || 0) / completedRides).toFixed(2) : 0
                },
                lastSeen: sanitizedDriver.lastSeen,
                createdAt: sanitizedDriver.createdAt,
                updatedAt: sanitizedDriver.updatedAt
            }, 'Driver profile retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update driver profile with enhanced validation
     */
    static updateDriverProfile = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        DriverController.logAction('DriverController', 'updateDriverProfile', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate update data using Zod
        const validationResult = driverUpdateSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const updates = validationResult.data;

        try {
            const result = await DriverController.withTransaction(async (session) => {
                // Update driver profile
                const driver = await Driver.findOneAndUpdate(
                    { driverId },
                    { ...updates, updatedAt: new Date() },
                    { new: true, runValidators: true, session }
                ).populate('vehicles');

                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                return DriverController.sanitizeForResponse(driver, ['__v']);
            });

            // Broadcast driver profile update
            try {
                socketService.broadcastToUsers('driver:profileUpdated', {
                    driverId: result.driverId,
                    updates: updates
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return DriverController.sendSuccess(res, {
                driverId: result.driverId,
                name: result.name,
                email: result.email,
                phone: result.phone,
                vehicles: result.vehicles?.map(vehicle => ({
                    vehicleId: vehicle._id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    licensePlate: vehicle.licensePlate,
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    isActive: vehicle.isActive
                })) || [],
                currentLocation: result.currentLocation,
                status: result.status,
                isOnline: result.isOnline,
                updatedAt: result.updatedAt
            }, 'Driver profile updated successfully');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver earnings with enhanced analytics and time periods
     */
    static getDriverEarnings = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { period = 'all', year, month } = req.query;

        DriverController.logAction('DriverController', 'getDriverEarnings', { driverId, period });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        try {
            // Verify driver exists
            const driver = await Driver.findOne({ driverId }).lean();
            if (!driver) {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            // Calculate date range based on period
            const dateRange = DriverController.getDateRange(period, year, month);
            
            // Get comprehensive earnings data
            const earnings = await DriverController.calculateDriverEarnings(driverId, dateRange);

            return DriverController.sendSuccess(res, {
                driverId,
                period,
                dateRange,
                earnings,
                calculatedAt: new Date()
            }, 'Driver earnings retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver bids with enhanced filtering and analytics
     */
    static getDriverBids = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { 
            page = 1, 
            limit = 10, 
            status, 
            dateFrom, 
            dateTo,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;
        
        DriverController.logAction('DriverController', 'getDriverBids', { driverId, page, limit });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate query parameters using imported schema
        const queryValidation = driverBidHistoryQuerySchema.safeParse({ 
            page, limit, status, dateFrom, dateTo, sortBy, order 
        });
        
        if (!queryValidation.success) {
            return DriverController.sendValidationError(res, queryValidation);
        }

        const { 
            page: pageNum, 
            limit: limitNum, 
            status: statusFilter, 
            dateFrom: fromDate, 
            dateTo: toDate,
            sortBy: sortField,
            order: sortOrder
        } = queryValidation.data;

        try {
            // Build query to find ride requests with this driver's bids
            const matchQuery = { 'bids.driverId': driverId };
            
            if (fromDate || toDate) {
                matchQuery.createdAt = {};
                if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate);
                if (toDate) matchQuery.createdAt.$lte = new Date(toDate);
            }

            // Execute aggregation pipeline
            const pipeline = [
                { $match: matchQuery },
                { $unwind: '$bids' },
                { $match: { 'bids.driverId': driverId } },
                ...(statusFilter ? [{ $match: { 'bids.status': statusFilter } }] : []),
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: 'userId',
                        as: 'userInfo'
                    }
                },
                {
                    $project: {
                        requestId: '$_id',
                        userId: 1,
                        user: { $arrayElemAt: ['$userInfo', 0] },
                        rideType: 1,
                        pickupLocation: 1,
                        destination: 1,
                        estimatedDistance: 1,
                        estimatedDuration: 1,
                        status: 1,
                        bid: '$bids',
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                { $sort: { [`bid.${sortField === 'createdAt' ? 'bidTime' : sortField}`]: sortOrder === 'asc' ? 1 : -1 } },
                {
                    $facet: {
                        data: [
                            { $skip: (pageNum - 1) * limitNum },
                            { $limit: limitNum }
                        ],
                        totalCount: [{ $count: 'count' }]
                    }
                }
            ];

            const results = await RideRequest.aggregate(pipeline);
            const bids = results[0].data;
            const totalCount = results[0].totalCount[0]?.count || 0;

            // Calculate bid analytics
            const analytics = await DriverController.calculateBidAnalytics(driverId, { fromDate, toDate, statusFilter });

            const paginationMeta = DriverController.getPaginationMeta(pageNum, limitNum, totalCount);

            return DriverController.sendSuccess(res, {
                bids: bids.map(bid => ({
                    requestId: bid.requestId,
                    user: bid.user ? {
                        userId: bid.user.userId,
                        name: bid.user.name,
                        rating: bid.user.rating
                    } : null,
                    rideType: bid.rideType,
                    pickupLocation: bid.pickupLocation,
                    destination: bid.destination,
                    estimatedDistance: bid.estimatedDistance,
                    estimatedDuration: bid.estimatedDuration,
                    requestStatus: bid.status,
                    bid: {
                        bidId: bid.bid._id,
                        fareAmount: bid.bid.fareAmount,
                        estimatedArrival: bid.bid.estimatedArrival,
                        message: bid.bid.message,
                        status: bid.bid.status,
                        bidTime: bid.bid.bidTime,
                        acceptedAt: bid.bid.acceptedAt,
                        rejectedAt: bid.bid.rejectedAt
                    },
                    createdAt: bid.createdAt,
                    updatedAt: bid.updatedAt
                })),
                analytics,
                filters: { 
                    status: statusFilter, 
                    dateFrom: fromDate, 
                    dateTo: toDate,
                    sortBy: sortField,
                    order: sortOrder
                }
            }, 'Driver bids retrieved successfully', 200, paginationMeta);

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver ride history with enhanced filtering and analytics
     */
    static getDriverRideHistory = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
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
        
        DriverController.logAction('DriverController', 'getDriverRideHistory', { driverId, page, limit });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate query parameters using imported schema
        const queryValidation = driverRideHistoryQuerySchema.safeParse({ 
            page, limit, status, dateFrom, dateTo, rideType, sortBy, order 
        });
        
        if (!queryValidation.success) {
            return DriverController.sendValidationError(res, queryValidation);
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
            // Build query for rides where this driver was accepted
            const query = DriverController.buildQuery({
                'acceptedBid.driverId': driverId,
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
            const sort = { [sortField === 'fareAmount' ? 'acceptedBid.fareAmount' : sortField]: sortOrder === 'asc' ? 1 : -1 };

            // Execute query with pagination
            const skip = (pageNum - 1) * limitNum;
            
            const [rideHistory, totalCount] = await Promise.all([
                RideRequest.find(query)
                    .populate('userId', 'userId name phone rating')
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                RideRequest.countDocuments(query)
            ]);

            // Calculate ride analytics
            const analytics = await DriverController.calculateRideAnalytics(driverId, query);

            const sanitizedHistory = DriverController.sanitizeForResponse(rideHistory, ['__v']);

            const paginationMeta = DriverController.getPaginationMeta(pageNum, limitNum, totalCount);

            return DriverController.sendSuccess(res, {
                rides: sanitizedHistory.map(ride => ({
                    requestId: ride._id,
                    user: ride.userId ? {
                        userId: ride.userId.userId,
                        name: ride.userId.name,
                        phone: ride.userId.phone,
                        rating: ride.userId.rating
                    } : null,
                    rideType: ride.rideType,
                    comfortPreference: ride.comfortPreference,
                    farePreference: ride.farePreference,
                    pickupLocation: ride.pickupLocation,
                    destination: ride.destination,
                    estimatedDistance: ride.estimatedDistance,
                    estimatedDuration: ride.estimatedDuration,
                    status: ride.status,
                    acceptedBid: ride.acceptedBid,
                    finalFare: ride.acceptedBid?.fareAmount,
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
            }, 'Driver ride history retrieved successfully', 200, paginationMeta);

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update driver status with enhanced validation and broadcasting
     */
    static updateDriverStatus = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { status } = req.body;
        
        DriverController.logAction('DriverController', 'updateDriverStatus', { driverId, status });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate status
        const validStatuses = ['available', 'busy', 'offline'];
        if (!status || !validStatuses.includes(status)) {
            return DriverController.sendError(res, 
                `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 
                400, 
                'INVALID_STATUS'
            );
        }

        try {
            const result = await DriverController.withTransaction(async (session) => {
                const driver = await Driver.findOneAndUpdate(
                    { driverId },
                    { 
                        status, 
                        lastSeen: new Date(),
                        ...(status === 'offline' && { isOnline: false })
                    },
                    { new: true, session }
                );

                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                return DriverController.sanitizeForResponse(driver, ['__v']);
            });

            // Emit driver status update event via WebSocket
            socketService.broadcastToUsers('driver:statusUpdated', {
                driverId: result.driverId,
                status: result.status,
                timestamp: new Date().toISOString()
            });

            return DriverController.sendSuccess(res, {
                driverId: result.driverId,
                status: result.status
            }, 200, 'Driver status updated successfully');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update driver location with enhanced validation and broadcasting
     */
    static updateDriverLocation = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { latitude, longitude, address } = req.body;

        DriverController.logAction('DriverController', 'updateDriverLocation', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validation is already handled by route middleware using driverLocationUpdateSchema
        // The request body is validated before reaching this controller

        try {
            const result = await DriverController.withTransaction(async (session) => {
                const driver = await Driver.findOneAndUpdate(
                    { driverId },
                    { 
                        currentLocation: {
                            coordinates: { latitude, longitude },
                            address: address || ''
                        },
                        lastSeen: new Date()
                    },
                    { new: true, session }
                );

                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                return DriverController.sanitizeForResponse(driver, ['__v']);
            });

            // Broadcast location update to relevant users
            try {
                // Find users with pending requests that might be interested in this driver
                const pendingRequests = await RideRequest.find({
                    status: 'bidding'
                }).limit(10); // Limit to avoid excessive broadcasting

                pendingRequests.forEach(request => {
                    // Calculate distance to determine if this location update is relevant
                    if (request.pickupLocation?.coordinates) {
                        const pickupLat = request.pickupLocation.coordinates.latitude;
                        const pickupLng = request.pickupLocation.coordinates.longitude;
                        
                        const distance = DriverController.calculateDistance(
                            pickupLat, pickupLng, latitude, longitude
                        );

                        // Only send updates for nearby drivers (within 15km)
                        if (distance <= 15) {
                            socketService.sendToUser(request.userId, 'driver:locationUpdate', {
                                driverId: result.driverId,
                                location: result.currentLocation,
                                distance
                            });
                        }
                    }
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return DriverController.sendSuccess(res, {
                driverId: result.driverId,
                currentLocation: result.currentLocation,
                lastSeen: result.lastSeen
            }, 'Driver location updated successfully');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver statistics with enhanced analytics
     */
    static getDriverStats = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { period = 'all' } = req.query;

        DriverController.logAction('DriverController', 'getDriverStats', { driverId, period });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        try {
            // Verify driver exists
            const driver = await Driver.findOne({ driverId }).lean();
            if (!driver) {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            // Calculate date range based on period
            const dateRange = DriverController.getDateRange(period);
            
            // Get comprehensive statistics
            const stats = await DriverController.getDriverStatistics(driverId, dateRange);

            return DriverController.sendSuccess(res, {
                driverId,
                period,
                dateRange,
                statistics: stats,
                generatedAt: new Date()
            }, 'Driver statistics retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver vehicles with enhanced filtering
     */
    static getDriverVehicles = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { includeInactive = false } = req.query;

        DriverController.logAction('DriverController', 'getDriverVehicles', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        try {
            // Get driver with vehicles
            const driver = await Driver.findOne({ driverId })
                .populate({
                    path: 'vehicles',
                    match: includeInactive === 'true' ? {} : { isActive: true }
                })
                .lean();

            if (!driver) {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const sanitizedVehicles = DriverController.sanitizeForResponse(driver.vehicles || [], ['__v']);

            return DriverController.sendSuccess(res, {
                driverId: driver.driverId,
                vehicles: sanitizedVehicles.map(vehicle => ({
                    vehicleId: vehicle._id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    licensePlate: vehicle.licensePlate,
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    isActive: vehicle.isActive,
                    createdAt: vehicle.createdAt,
                    updatedAt: vehicle.updatedAt
                })),
                totalVehicles: sanitizedVehicles.length,
                activeVehicles: sanitizedVehicles.filter(v => v.isActive).length,
                filters: { includeInactive: includeInactive === 'true' }
            }, 'Driver vehicles retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Assign vehicles to driver with enhanced validation
     */
    static assignVehiclesToDriver = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        DriverController.logAction('DriverController', 'assignVehiclesToDriver', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate request body
        const validationResult = driverVehicleAssignmentSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const { vehicleIds } = validationResult.data;

        try {
            const result = await DriverController.withTransaction(async (session) => {
                // Check if driver exists
                const driver = await Driver.findOne({ driverId }).session(session);
                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                // Verify all vehicles exist and are not assigned to other drivers
                const vehicles = await Vehicle.find({ 
                    _id: { $in: vehicleIds },
                    $or: [
                        { driverId: { $exists: false } },
                        { driverId: null },
                        { driverId: driver._id }
                    ]
                }).session(session);

                if (vehicles.length !== vehicleIds.length) {
                    throw new Error('INVALID_VEHICLES');
                }

                // Update vehicles with driver reference
                await Vehicle.updateMany(
                    { _id: { $in: vehicleIds } },
                    { $set: { driverId: driver._id } },
                    { session }
                );

                // Update driver with vehicle references
                const updatedDriver = await Driver.findByIdAndUpdate(
                    driver._id,
                    { $addToSet: { vehicles: { $each: vehicleIds } } },
                    { new: true, session }
                ).populate('vehicles');

                return DriverController.sanitizeForResponse(updatedDriver, ['__v']);
            });

            // Broadcast vehicle assignment
            try {
                socketService.broadcastToUsers('driver:vehiclesAssigned', {
                    driverId: result.driverId,
                    vehicleIds,
                    totalVehicles: result.vehicles.length
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return DriverController.sendSuccess(res, {
                driverId: result.driverId,
                vehicles: result.vehicles.map(vehicle => ({
                    vehicleId: vehicle._id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    licensePlate: vehicle.licensePlate,
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    isActive: vehicle.isActive
                })),
                assignedCount: vehicleIds.length,
                totalVehicles: result.vehicles.length
            }, 'Vehicles assigned to driver successfully');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }
            if (error.message === 'INVALID_VEHICLES') {
                return DriverController.sendError(res, 'One or more vehicles are invalid or already assigned', 400, 'INVALID_VEHICLES');
            }

            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Remove vehicles from driver with enhanced validation
     */
    static removeVehiclesFromDriver = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        DriverController.logAction('DriverController', 'removeVehiclesFromDriver', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate request body
        const validationResult = driverVehicleAssignmentSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const { vehicleIds } = validationResult.data;

        try {
            const result = await DriverController.withTransaction(async (session) => {
                // Check if driver exists
                const driver = await Driver.findOne({ driverId }).session(session);
                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                // Remove driver reference from vehicles
                await Vehicle.updateMany(
                    { 
                        _id: { $in: vehicleIds },
                        driverId: driver._id
                    },
                    { $unset: { driverId: 1 } },
                    { session }
                );

                // Remove vehicle references from driver
                const updatedDriver = await Driver.findByIdAndUpdate(
                    driver._id,
                    { $pull: { vehicles: { $in: vehicleIds } } },
                    { new: true, session }
                ).populate('vehicles');

                return DriverController.sanitizeForResponse(updatedDriver, ['__v']);
            });

            // Broadcast vehicle removal
            try {
                socketService.broadcastToUsers('driver:vehiclesRemoved', {
                    driverId: result.driverId,
                    removedVehicleIds: vehicleIds,
                    remainingVehicles: result.vehicles.length
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return DriverController.sendSuccess(res, {
                driverId: result.driverId,
                vehicles: result.vehicles.map(vehicle => ({
                    vehicleId: vehicle._id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    licensePlate: vehicle.licensePlate,
                    vehicleType: vehicle.vehicleType,
                    comfortLevel: vehicle.comfortLevel,
                    priceValue: vehicle.priceValue,
                    isActive: vehicle.isActive
                })),
                removedCount: vehicleIds.length,
                remainingVehicles: result.vehicles.length
            }, 'Vehicles removed from driver successfully');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return DriverController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get available drivers based on criteria
     */
    static getAvailableDrivers = asyncHandler(async (req, res) => {
        const { 
            status = 'available',
            isOnline,
            minRating,
            maxRating,
            hasVehicles,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        DriverController.logAction('DriverController', 'getAvailableDrivers', { 
            status, 
            isOnline, 
            minRating,
            maxRating
        });

        // Validation is already handled by route middleware using driverQuerySchema
        // The request query is validated before reaching this controller

        try {
            // Build query for available drivers
            const query = {
                ...(status && { status }),
                ...(isOnline !== undefined && { isOnline }),
                ...(minRating && { rating: { $gte: parseFloat(minRating) } }),
                ...(maxRating && { rating: { ...query.rating, $lte: parseFloat(maxRating) } }),
                ...(hasVehicles !== undefined && hasVehicles && { vehicles: { $exists: true, $not: { $size: 0 } } })
            };

            // Build sort options
            const sortOptions = {};
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;

            const drivers = await Driver.find(query)
                .populate('vehicles')
                .sort(sortOptions)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean();

            const totalCount = await Driver.countDocuments(query);

            const sanitizedDrivers = DriverController.sanitizeForResponse(drivers, ['__v']);

            return DriverController.sendSuccess(res, {
                drivers: sanitizedDrivers.map(driver => ({
                    driverId: driver.driverId,
                    name: driver.name,
                    phone: driver.phone,
                    rating: driver.rating,
                    totalRides: driver.totalRides,
                    currentLocation: driver.currentLocation,
                    status: driver.status,
                    isOnline: driver.isOnline,
                    vehicles: driver.vehicles?.map(vehicle => ({
                        vehicleId: vehicle._id,
                        make: vehicle.make,
                        model: vehicle.model,
                        vehicleType: vehicle.vehicleType,
                        comfortLevel: vehicle.comfortLevel,
                        priceValue: vehicle.priceValue,
                        isActive: vehicle.isActive
                    })) || [],
                    lastSeen: driver.lastSeen
                }))
            }, 'Available drivers retrieved successfully', 200, 
            DriverController.getPaginationMeta(parseInt(page), parseInt(limit), totalCount));

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Helper function to get date range based on period
     */
    static getDateRange(period, year, month) {
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
                if (year && month) {
                    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    endDate = new Date(parseInt(year), parseInt(month), 0);
                } else {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                }
                break;
            case 'year':
                if (year) {
                    startDate = new Date(parseInt(year), 0, 1);
                    endDate = new Date(parseInt(year), 11, 31);
                } else {
                    startDate = new Date(now.getFullYear(), 0, 1);
                }
                break;
            default:
                return null;
        }

        return { startDate, endDate };
    }

    /**
     * Helper function to calculate driver earnings
     */
    static async calculateDriverEarnings(driverId, dateRange) {
        try {
            const query = { 
                'acceptedBid.driverId': driverId,
                status: 'completed'
            };
            
            if (dateRange) {
                query.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                };
            }

            const earnings = await RideRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalEarnings: { $sum: '$acceptedBid.fareAmount' },
                        totalRides: { $sum: 1 },
                        avgFarePerRide: { $avg: '$acceptedBid.fareAmount' },
                        minFare: { $min: '$acceptedBid.fareAmount' },
                        maxFare: { $max: '$acceptedBid.fareAmount' }
                    }
                }
            ]);

            const result = earnings[0] || {
                totalEarnings: 0,
                totalRides: 0,
                avgFarePerRide: 0,
                minFare: 0,
                maxFare: 0
            };

            // Get daily breakdown for the period
            const dailyBreakdown = await RideRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        earnings: { $sum: '$acceptedBid.fareAmount' },
                        rides: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            return {
                summary: {
                    totalEarnings: parseFloat((result.totalEarnings || 0).toFixed(2)),
                    totalRides: result.totalRides || 0,
                    avgFarePerRide: parseFloat((result.avgFarePerRide || 0).toFixed(2)),
                    minFare: parseFloat((result.minFare || 0).toFixed(2)),
                    maxFare: parseFloat((result.maxFare || 0).toFixed(2))
                },
                dailyBreakdown: dailyBreakdown.map(day => ({
                    date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
                    earnings: parseFloat(day.earnings.toFixed(2)),
                    rides: day.rides
                }))
            };
        } catch (error) {
            console.error('Error calculating driver earnings:', error);
            return {
                summary: {
                    totalEarnings: 0,
                    totalRides: 0,
                    avgFarePerRide: 0,
                    minFare: 0,
                    maxFare: 0
                },
                dailyBreakdown: []
            };
        }
    }

    /**
     * Helper function to calculate bid analytics
     */
    static async calculateBidAnalytics(driverId, filters) {
        try {
            const matchQuery = { 'bids.driverId': driverId };
            
            if (filters.fromDate || filters.toDate) {
                matchQuery.createdAt = {};
                if (filters.fromDate) matchQuery.createdAt.$gte = new Date(filters.fromDate);
                if (filters.toDate) matchQuery.createdAt.$lte = new Date(filters.toDate);
            }

            const analytics = await RideRequest.aggregate([
                { $match: matchQuery },
                { $unwind: '$bids' },
                { $match: { 'bids.driverId': driverId } },
                ...(filters.statusFilter ? [{ $match: { 'bids.status': filters.statusFilter } }] : []),
                {
                    $group: {
                        _id: null,
                        totalBids: { $sum: 1 },
                        acceptedBids: {
                            $sum: { $cond: [{ $eq: ['$bids.status', 'accepted'] }, 1, 0] }
                        },
                        rejectedBids: {
                            $sum: { $cond: [{ $eq: ['$bids.status', 'rejected'] }, 1, 0] }
                        },
                        pendingBids: {
                            $sum: { $cond: [{ $eq: ['$bids.status', 'pending'] }, 1, 0] }
                        },
                        avgBidAmount: { $avg: '$bids.fareAmount' },
                        minBidAmount: { $min: '$bids.fareAmount' },
                        maxBidAmount: { $max: '$bids.fareAmount' }
                    }
                }
            ]);

            const result = analytics[0] || {
                totalBids: 0,
                acceptedBids: 0,
                rejectedBids: 0,
                pendingBids: 0,
                avgBidAmount: 0,
                minBidAmount: 0,
                maxBidAmount: 0
            };

            const acceptanceRate = result.totalBids > 0 ? 
                (result.acceptedBids / result.totalBids * 100).toFixed(2) : 0;

            return {
                totalBids: result.totalBids,
                acceptedBids: result.acceptedBids,
                rejectedBids: result.rejectedBids,
                pendingBids: result.pendingBids,
                acceptanceRate: parseFloat(acceptanceRate),
                avgBidAmount: parseFloat((result.avgBidAmount || 0).toFixed(2)),
                minBidAmount: parseFloat((result.minBidAmount || 0).toFixed(2)),
                maxBidAmount: parseFloat((result.maxBidAmount || 0).toFixed(2))
            };
        } catch (error) {
            console.error('Error calculating bid analytics:', error);
            return {};
        }
    }

    /**
     * Helper function to calculate ride analytics
     */
    static async calculateRideAnalytics(driverId, query) {
        try {
            const analytics = await RideRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalRides: { $sum: 1 },
                        completedRides: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        cancelledRides: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        },
                        totalEarnings: { $sum: '$acceptedBid.fareAmount' },
                        avgDistance: { $avg: '$estimatedDistance' },
                        avgDuration: { $avg: '$estimatedDuration' },
                        avgFare: { $avg: '$acceptedBid.fareAmount' }
                    }
                }
            ]);

            const result = analytics[0] || {
                totalRides: 0,
                completedRides: 0,
                cancelledRides: 0,
                totalEarnings: 0,
                avgDistance: 0,
                avgDuration: 0,
                avgFare: 0
            };

            const completionRate = result.totalRides > 0 ? 
                (result.completedRides / result.totalRides * 100).toFixed(2) : 0;

            return {
                totalRides: result.totalRides,
                completedRides: result.completedRides,
                cancelledRides: result.cancelledRides,
                completionRate: parseFloat(completionRate),
                totalEarnings: parseFloat((result.totalEarnings || 0).toFixed(2)),
                avgDistance: parseFloat((result.avgDistance || 0).toFixed(2)),
                avgDuration: parseFloat((result.avgDuration || 0).toFixed(2)),
                avgFare: parseFloat((result.avgFare || 0).toFixed(2))
            };
        } catch (error) {
            console.error('Error calculating ride analytics:', error);
            return {};
        }
    }

    /**
     * Helper function to get comprehensive driver statistics
     */
    static async getDriverStatistics(driverId, dateRange) {
        const query = { 'acceptedBid.driverId': driverId };
        if (dateRange) {
            query.createdAt = {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            };
        }

        const [earnings, bidAnalytics, rideAnalytics] = await Promise.all([
            DriverController.calculateDriverEarnings(driverId, dateRange),
            DriverController.calculateBidAnalytics(driverId, dateRange ? {
                fromDate: dateRange.startDate.toISOString(),
                toDate: dateRange.endDate.toISOString()
            } : {}),
            DriverController.calculateRideAnalytics(driverId, query)
        ]);

        return {
            earnings,
            bidAnalytics,
            rideAnalytics
        };
    }

    /**
     * Get nearby drivers with enhanced filtering
     */
    static getNearbyDrivers = asyncHandler(async (req, res) => {
        DriverController.logAction('DriverController', 'getNearbyDrivers', req.query);

        // Validation is already handled by route middleware using nearbyDriversQuerySchema
        const validationResult = nearbyDriversQuerySchema.safeParse(req.query);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const { latitude, longitude, radius, rideType, comfortLevel, priceValue, status, limit } = validationResult.data;

        try {
            const cacheKey = `nearby_drivers_${latitude}_${longitude}_${radius}_${rideType || 'any'}`;
            
            const result = await DriverController.getCachedData(cacheKey, async () => {
                // Build base query for available drivers
                const query = {
                    status: status || APP_CONSTANTS.DRIVER_STATUS.AVAILABLE,
                    isOnline: true,
                    'currentLocation.coordinates.latitude': { $exists: true },
                    'currentLocation.coordinates.longitude': { $exists: true }
                };

                // Find drivers within radius
                const drivers = await Driver.find(query)
                    .populate({
                        path: 'vehicles',
                        match: {
                            isActive: true,
                            ...(rideType && { vehicleType: rideType }),
                            ...(comfortLevel && { comfortLevel: { $gte: comfortLevel } }),
                            ...(priceValue && { priceValue: { $lte: priceValue } })
                        }
                    })
                    .lean();

                // Filter by distance and add distance field
                const nearbyDrivers = drivers
                    .map(driver => {
                        if (!driver.currentLocation?.coordinates) return null;
                        
                        const driverLat = driver.currentLocation.coordinates.latitude;
                        const driverLng = driver.currentLocation.coordinates.longitude;
                        
                        const distance = DriverController.calculateDistance(
                            latitude, longitude, driverLat, driverLng
                        );
                        
                        if (distance <= radius) {
                            return { ...driver, distance };
                        }
                        return null;
                    })
                    .filter(Boolean)
                    .filter(driver => driver.vehicles && driver.vehicles.length > 0)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, limit);

                return {
                    drivers: nearbyDrivers.map(driver => ({
                        driverId: driver.driverId,
                        name: driver.name,
                        phone: driver.phone,
                        rating: driver.rating,
                        totalRides: driver.totalRides,
                        currentLocation: driver.currentLocation,
                        status: driver.status,
                        vehicles: driver.vehicles.map(vehicle => ({
                            vehicleId: vehicle._id,
                            make: vehicle.make,
                            model: vehicle.model,
                            vehicleType: vehicle.vehicleType,
                            comfortLevel: vehicle.comfortLevel,
                            priceValue: vehicle.priceValue
                        })),
                        distance: driver.distance
                    })),
                    totalCount: nearbyDrivers.length,
                    searchRadius: radius,
                    centerPoint: { latitude, longitude }
                };
            }, 30000); // Cache for 30 seconds

            return DriverController.sendSuccess(res, result, 'Nearby drivers retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk update driver statuses for fleet management
     */
    static bulkUpdateDriverStatus = asyncHandler(async (req, res) => {
        DriverController.logAction('DriverController', 'bulkUpdateDriverStatus', req.body);

        // Validation is already handled by route middleware using bulkUpdateDriverStatusSchema
        const validationResult = bulkUpdateDriverStatusSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const { driverIds, status, reason } = validationResult.data;

        try {
            const result = await DriverController.withTransaction(async (session) => {
                const updateData = {
                    status,
                    isOnline: status !== APP_CONSTANTS.DRIVER_STATUS.OFFLINE,
                    lastSeen: new Date(),
                    ...(location && { currentLocation: location })
                };

                const updateResult = await Driver.updateMany(
                    { driverId: { $in: driverIds } },
                    { $set: updateData },
                    { session }
                );

                // Broadcast status updates
                try {
                    socketService.broadcastToUsers('drivers:bulkStatusUpdate', {
                        driverIds,
                        status,
                        location
                    });
                } catch (socketError) {
                    console.warn('Socket broadcast failed:', socketError.message);
                }

                return updateResult;
            });

            // Clear relevant caches
            DriverController.clearCache(/^nearby_drivers_|^driver_stats_/);

            return DriverController.sendSuccess(res, {
                updatedCount: result.modifiedCount,
                matchedCount: result.matchedCount
            }, `${result.modifiedCount} drivers updated successfully`);

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get driver performance analytics with trends
     */
    static getDriverAnalytics = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        DriverController.logAction('DriverController', 'getDriverAnalytics', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return DriverController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validation is already handled by route middleware using driverAnalyticsQuerySchema
        const validationResult = driverAnalyticsQuerySchema.safeParse(req.query);
        
        if (!validationResult.success) {
            return DriverController.sendValidationError(res, validationResult);
        }

        const { dateFrom, dateTo, groupBy, includeEarnings, includeRatings, includePerformance } = validationResult.data;

        try {
            const cacheKey = `driver_analytics_${driverId}_${groupBy}_${dateFrom || 'all'}_${dateTo || 'now'}`;
            
            const analytics = await DriverController.getCachedData(cacheKey, async () => {
                // Build date range
                let startDate, endDate;
                if (dateFrom && dateTo) {
                    startDate = new Date(dateFrom);
                    endDate = new Date(dateTo);
                } else {
                    endDate = new Date();
                    startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
                }

                const currentPeriodStats = await DriverController.getDriverStatistics(driverId, { startDate, endDate });

                const analytics = {
                    period: { startDate, endDate },
                    driverId,
                    summary: currentPeriodStats
                };

                if (includeEarnings) {
                    analytics.earnings = await DriverController.calculateDriverEarnings(driverId, { startDate, endDate });
                }

                if (includeRatings) {
                    analytics.ratings = await DriverController.calculateRatingAnalytics(driverId, { startDate, endDate });
                }

                if (includePerformance) {
                    analytics.performance = await DriverController.calculatePerformanceMetrics(driverId, { startDate, endDate });
                }

                return analytics;
            }, 300000); // Cache for 5 minutes

            return DriverController.sendSuccess(res, analytics, 'Driver analytics retrieved successfully');

        } catch (error) {
            const mongoError = DriverController.handleMongoError(error);
            return DriverController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Helper function to calculate rating analytics
     */
    static async calculateRatingAnalytics(driverId, dateRange) {
        try {
            const query = { 
                'acceptedBid.driverId': driverId,
                status: 'completed',
                rating: { $exists: true, $ne: null }
            };
            
            if (dateRange) {
                query.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                };
            }

            const ratingStats = await RideRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: '$rating' },
                        totalRatings: { $sum: 1 },
                        minRating: { $min: '$rating' },
                        maxRating: { $max: '$rating' },
                        ratingDistribution: {
                            $push: '$rating'
                        }
                    }
                }
            ]);

            const result = ratingStats[0] || {
                avgRating: 0,
                totalRatings: 0,
                minRating: 0,
                maxRating: 0,
                ratingDistribution: []
            };

            // Calculate rating distribution
            const distribution = [1, 2, 3, 4, 5].map(rating => ({
                rating,
                count: result.ratingDistribution.filter(r => Math.floor(r) === rating).length
            }));

            return {
                avgRating: parseFloat((result.avgRating || 0).toFixed(2)),
                totalRatings: result.totalRatings || 0,
                minRating: result.minRating || 0,
                maxRating: result.maxRating || 0,
                distribution
            };
        } catch (error) {
            console.error('Error calculating rating analytics:', error);
            return {
                avgRating: 0,
                totalRatings: 0,
                minRating: 0,
                maxRating: 0,
                distribution: []
            };
        }
    }

    /**
     * Helper function to calculate performance metrics
     */
    static async calculatePerformanceMetrics(driverId, dateRange) {
        try {
            const query = { 
                'bids.driverId': driverId
            };
            
            if (dateRange) {
                query.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                };
            }

            const [bidStats, responseTimeStats] = await Promise.all([
                RideRequest.aggregate([
                    { $match: query },
                    { $unwind: '$bids' },
                    { $match: { 'bids.driverId': driverId } },
                    {
                        $group: {
                            _id: '$bids.status',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                RideRequest.aggregate([
                    { $match: query },
                    { $unwind: '$bids' },
                    { $match: { 'bids.driverId': driverId } },
                    {
                        $project: {
                            responseTime: {
                                $subtract: ['$bids.createdAt', '$createdAt']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgResponseTime: { $avg: '$responseTime' },
                            minResponseTime: { $min: '$responseTime' },
                            maxResponseTime: { $max: '$responseTime' }
                        }
                    }
                ])
            ]);

            const bidSummary = bidStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, { pending: 0, accepted: 0, rejected: 0, expired: 0 });

            const responseTime = responseTimeStats[0] || {
                avgResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0
            };

            return {
                bidStats: bidSummary,
                responseTime: {
                    avg: Math.round((responseTime.avgResponseTime || 0) / 1000), // Convert to seconds
                    min: Math.round((responseTime.minResponseTime || 0) / 1000),
                    max: Math.round((responseTime.maxResponseTime || 0) / 1000)
                },
                acceptanceRate: bidSummary.accepted > 0 ? 
                    ((bidSummary.accepted / (bidSummary.accepted + bidSummary.rejected)) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error calculating performance metrics:', error);
            return {
                bidStats: { pending: 0, accepted: 0, rejected: 0, expired: 0 },
                responseTime: { avg: 0, min: 0, max: 0 },
                acceptanceRate: 0
            };
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    }

    /**
     * Simple in-memory cache for performance optimization
     */
    static cache = new Map();

    static async getCachedData(key, fetchFunction, ttlMs = 60000) {
        const cached = DriverController.cache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < ttlMs) {
            return cached.data;
        }

        const data = await fetchFunction();
        DriverController.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    static clearCache(pattern) {
        if (pattern instanceof RegExp) {
            for (const key of DriverController.cache.keys()) {
                if (pattern.test(key)) {
                    DriverController.cache.delete(key);
                }
            }
        } else {
            DriverController.cache.delete(pattern);
        }
    }
}

// Export individual functions for backward compatibility
export const {
    getDriverProfile,
    updateDriverProfile,
    getDriverEarnings,
    getDriverBids,
    getDriverRideHistory,
    updateDriverStatus,
    updateDriverLocation,
    getDriverStats,
    getDriverVehicles,
    assignVehiclesToDriver,
    removeVehiclesFromDriver,
    getAvailableDrivers,
    getNearbyDrivers,
    bulkUpdateDriverStatus,
    getDriverAnalytics
} = DriverController;

export default DriverController;
