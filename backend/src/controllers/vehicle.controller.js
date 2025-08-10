import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import RideRequest from '../models/rideRequest.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from 'zod';
import { 
    vehicleCreationSchema,
    vehicleUpdateSchema,
    vehicleQuerySchema,
    vehicleIdSchema,
    vehicleStatusUpdateSchema
} from '../validations/vehicle.validation.js';
import { 
    formatValidationError,
    validateObjectId,
    validatePagination,
    validateSortQuery,
    driverIdParamSchema
} from '../validations/common.validation.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import { generateDriverId, validateIdFormat } from '../utils/idGenerator.js';
import DataPersistenceService from '../services/dataPersistenceService.js';
import BackgroundTaskScheduler from '../utils/backgroundTasks.js';

/**
 * Enhanced Vehicle Controller with improved validation, synchronization, and error handling
 */
class VehicleController extends BaseController {

    /**
     * Create a new vehicle with enhanced validation
     */
    static createVehicle = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'createVehicle', { driverId: req.body.driverId });

        // Validate request body
        const validationResult = vehicleCreationSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const vehicleData = validationResult.data;

        try {
            const result = await VehicleController.withTransaction(async (session) => {
                // Check if driver exists
                const driver = await Driver.findById(vehicleData.driverId).session(session);
                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                // Check if license plate already exists (if provided)
                if (vehicleData.licensePlate) {
                    const existingVehicle = await Vehicle.findOne({ 
                        licensePlate: vehicleData.licensePlate.toUpperCase() 
                    }).session(session);
                    
                    if (existingVehicle) {
                        throw new Error('LICENSE_PLATE_EXISTS');
                    }
                }

                // Create the vehicle
                const vehicle = new Vehicle({
                    ...vehicleData,
                    licensePlate: vehicleData.licensePlate ? vehicleData.licensePlate.toUpperCase() : undefined
                });

                const savedVehicle = await vehicle.save({ session });

                // Add vehicle to driver's vehicles array
                await Driver.findByIdAndUpdate(
                    vehicleData.driverId,
                    { $push: { vehicles: savedVehicle._id } },
                    { session }
                );

                return VehicleController.sanitizeForResponse(savedVehicle, ['__v']);
            });

            // Broadcast new vehicle registration
            try {
                socketService.broadcastToUsers('vehicle:registered', {
                    vehicleId: result._id,
                    driverId: result.driverId,
                    vehicleType: result.vehicleType,
                    make: result.make,
                    model: result.model
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return VehicleController.sendSuccess(res, {
                vehicleId: result._id,
                driverId: result.driverId,
                make: result.make,
                model: result.model,
                year: result.year,
                licensePlate: result.licensePlate,
                vehicleType: result.vehicleType,
                comfortLevel: result.comfortLevel,
                priceValue: result.priceValue,
                isActive: result.isActive,
                createdAt: result.createdAt
            }, 'Vehicle created successfully', 201);

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return VehicleController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }
            if (error.message === 'LICENSE_PLATE_EXISTS') {
                return VehicleController.sendError(res, 'License plate already exists', 409, 'LICENSE_PLATE_EXISTS');
            }

            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicle by ID with enhanced data
     */
    static getVehicle = asyncHandler(async (req, res) => {
        const { vehicleId } = req.params;
        
        VehicleController.logAction('VehicleController', 'getVehicle', { vehicleId });

        // Validate vehicle ID
        const validationResult = vehicleIdSchema.safeParse({ vehicleId });
        
        if (!validationResult.success) {
            return VehicleController.sendError(res, 'Invalid vehicle ID format', 400, 'INVALID_VEHICLE_ID');
        }

        try {
            const vehicle = await Vehicle.findById(vehicleId)
                .populate('driverId', 'driverId name phone rating totalRides status isOnline currentLocation')
                .lean();

            if (!vehicle) {
                return VehicleController.sendError(res, 'Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
            }

            const sanitizedVehicle = VehicleController.sanitizeForResponse(vehicle, ['__v']);

            return VehicleController.sendSuccess(res, {
                vehicleId: sanitizedVehicle._id,
                driver: sanitizedVehicle.driverId ? {
                    driverId: sanitizedVehicle.driverId.driverId,
                    name: sanitizedVehicle.driverId.name,
                    phone: sanitizedVehicle.driverId.phone,
                    rating: sanitizedVehicle.driverId.rating,
                    totalRides: sanitizedVehicle.driverId.totalRides,
                    status: sanitizedVehicle.driverId.status,
                    isOnline: sanitizedVehicle.driverId.isOnline,
                    currentLocation: sanitizedVehicle.driverId.currentLocation
                } : null,
                make: sanitizedVehicle.make,
                model: sanitizedVehicle.model,
                year: sanitizedVehicle.year,
                licensePlate: sanitizedVehicle.licensePlate,
                vehicleType: sanitizedVehicle.vehicleType,
                comfortLevel: sanitizedVehicle.comfortLevel,
                priceValue: sanitizedVehicle.priceValue,
                isActive: sanitizedVehicle.isActive,
                createdAt: sanitizedVehicle.createdAt,
                updatedAt: sanitizedVehicle.updatedAt
            }, 'Vehicle retrieved successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update vehicle with enhanced validation
     */
    static updateVehicle = asyncHandler(async (req, res) => {
        const { vehicleId } = req.params;
        
        VehicleController.logAction('VehicleController', 'updateVehicle', { vehicleId });

        // Validate vehicle ID
        const vehicleIdValidation = vehicleIdSchema.safeParse({ vehicleId });
        
        if (!vehicleIdValidation.success) {
            return VehicleController.sendError(res, 'Invalid vehicle ID format', 400, 'INVALID_VEHICLE_ID');
        }

        // Validate update data
        const validationResult = vehicleUpdateSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const updates = validationResult.data;

        try {
            const result = await VehicleController.withTransaction(async (session) => {
                // Check if license plate conflicts with another vehicle
                if (updates.licensePlate) {
                    const existingVehicle = await Vehicle.findOne({ 
                        licensePlate: updates.licensePlate.toUpperCase(),
                        _id: { $ne: vehicleId }
                    }).session(session);
                    
                    if (existingVehicle) {
                        throw new Error('LICENSE_PLATE_EXISTS');
                    }
                    
                    updates.licensePlate = updates.licensePlate.toUpperCase();
                }

                const vehicle = await Vehicle.findByIdAndUpdate(
                    vehicleId,
                    { ...updates, updatedAt: new Date() },
                    { new: true, runValidators: true, session }
                );

                if (!vehicle) {
                    throw new Error('VEHICLE_NOT_FOUND');
                }

                return VehicleController.sanitizeForResponse(vehicle, ['__v']);
            });

            // Broadcast vehicle update
            try {
                socketService.broadcastToUsers('vehicle:updated', {
                    vehicleId: result._id,
                    updates: updates
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return VehicleController.sendSuccess(res, {
                vehicleId: result._id,
                make: result.make,
                model: result.model,
                year: result.year,
                licensePlate: result.licensePlate,
                vehicleType: result.vehicleType,
                comfortLevel: result.comfortLevel,
                priceValue: result.priceValue,
                isActive: result.isActive,
                updatedAt: result.updatedAt
            }, 'Vehicle updated successfully');

        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return VehicleController.sendError(res, 'Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
            }
            if (error.message === 'LICENSE_PLATE_EXISTS') {
                return VehicleController.sendError(res, 'License plate already exists', 409, 'LICENSE_PLATE_EXISTS');
            }

            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Delete vehicle with enhanced validation
     */
    static deleteVehicle = asyncHandler(async (req, res) => {
        const { vehicleId } = req.params;
        
        VehicleController.logAction('VehicleController', 'deleteVehicle', { vehicleId });

        // Validate vehicle ID
        const validationResult = vehicleIdSchema.safeParse({ vehicleId });
        
        if (!validationResult.success) {
            return VehicleController.sendError(res, 'Invalid vehicle ID format', 400, 'INVALID_VEHICLE_ID');
        }

        try {
            const result = await VehicleController.withTransaction(async (session) => {
                const vehicle = await Vehicle.findById(vehicleId).session(session);
                
                if (!vehicle) {
                    throw new Error('VEHICLE_NOT_FOUND');
                }

                // Remove vehicle from driver's vehicles array
                await Driver.findByIdAndUpdate(
                    vehicle.driverId,
                    { $pull: { vehicles: vehicleId } },
                    { session }
                );

                // Delete the vehicle
                await Vehicle.findByIdAndDelete(vehicleId).session(session);

                return { vehicleId, driverId: vehicle.driverId };
            });

            // Broadcast vehicle deletion
            try {
                socketService.broadcastToUsers('vehicle:deleted', {
                    vehicleId: result.vehicleId,
                    driverId: result.driverId
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return VehicleController.sendSuccess(res, {
                vehicleId: result.vehicleId
            }, 'Vehicle deleted successfully');

        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return VehicleController.sendError(res, 'Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
            }

            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicles with enhanced filtering and pagination
     */
    static getVehicles = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'getVehicles', { query: req.query });

        // Validate query parameters
        const validationResult = vehicleQuerySchema.safeParse(req.query);
        
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const {
            driverId,
            vehicleType,
            comfortLevel,
            priceValue,
            isActive,
            minYear,
            maxYear,
            page,
            limit,
            sortBy,
            order
        } = validationResult.data;

        try {
            // Build query
            const query = VehicleController.buildQuery({
                driverId,
                vehicleType,
                comfortLevel: comfortLevel ? { $gte: comfortLevel } : undefined,
                priceValue: priceValue ? { $lte: priceValue } : undefined,
                isActive,
                year: {
                    ...(minYear && { $gte: minYear }),
                    ...(maxYear && { $lte: maxYear })
                }
            });

            // Remove empty year object
            if (Object.keys(query.year || {}).length === 0) {
                delete query.year;
            }

            // Build sort object
            const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

            // Execute query with pagination
            const skip = (page - 1) * limit;
            
            const [vehicles, totalCount] = await Promise.all([
                Vehicle.find(query)
                    .populate('driverId', 'driverId name phone rating totalRides status isOnline currentLocation')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Vehicle.countDocuments(query)
            ]);

            const sanitizedVehicles = VehicleController.sanitizeForResponse(vehicles, ['__v']);

            const paginationMeta = VehicleController.getPaginationMeta(page, limit, totalCount);

            return VehicleController.sendSuccess(res, {
                vehicles: sanitizedVehicles.map(vehicle => ({
                    vehicleId: vehicle._id,
                    driver: vehicle.driverId ? {
                        driverId: vehicle.driverId.driverId,
                        name: vehicle.driverId.name,
                        phone: vehicle.driverId.phone,
                        rating: vehicle.driverId.rating,
                        totalRides: vehicle.driverId.totalRides,
                        status: vehicle.driverId.status,
                        isOnline: vehicle.driverId.isOnline,
                        currentLocation: vehicle.driverId.currentLocation
                    } : null,
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
                filters: { driverId, vehicleType, comfortLevel, priceValue, isActive, minYear, maxYear, sortBy, order }
            }, 'Vehicles retrieved successfully', 200, paginationMeta);

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Search vehicles for ride matching with enhanced logic
     */
    static searchVehiclesForRide = asyncHandler(async (req, res) => {
        const { 
            vehicleType, 
            comfortPreference, 
            farePreference,
            latitude,
            longitude,
            maxDistance = 10
        } = req.query;

        VehicleController.logAction('VehicleController', 'searchVehiclesForRide', { 
            vehicleType, 
            comfortPreference, 
            farePreference 
        });

        try {
            // Build base query for active vehicles with available drivers
            const baseQuery = {
                isActive: true,
                ...(vehicleType && { vehicleType })
            };

            // Add comfort and price preferences
            if (comfortPreference) {
                baseQuery.comfortLevel = { $gte: parseInt(comfortPreference) };
            }
            if (farePreference) {
                baseQuery.priceValue = { $lte: parseInt(farePreference) };
            }

            const vehicles = await Vehicle.find(baseQuery)
                .populate({
                    path: 'driverId',
                    select: 'driverId name phone rating totalRides status isOnline currentLocation',
                    match: { isOnline: true, status: 'available' }
                })
                .lean();

            // Filter out vehicles whose drivers are not available
            let availableVehicles = vehicles.filter(vehicle => vehicle.driverId !== null);

            // Filter by distance if coordinates provided
            if (latitude && longitude) {
                availableVehicles = availableVehicles.filter(vehicle => {
                    if (!vehicle.driverId.currentLocation?.coordinates) return false;
                    
                    const [driverLng, driverLat] = vehicle.driverId.currentLocation.coordinates;
                    const distance = VehicleController.calculateDistance(
                        parseFloat(latitude), 
                        parseFloat(longitude), 
                        driverLat, 
                        driverLng
                    );
                    
                    return distance <= parseFloat(maxDistance);
                });

                // Sort by distance
                availableVehicles.sort((a, b) => {
                    const [aLng, aLat] = a.driverId.currentLocation.coordinates;
                    const [bLng, bLat] = b.driverId.currentLocation.coordinates;
                    
                    const distanceA = VehicleController.calculateDistance(
                        parseFloat(latitude), 
                        parseFloat(longitude), 
                        aLat, 
                        aLng
                    );
                    const distanceB = VehicleController.calculateDistance(
                        parseFloat(latitude), 
                        parseFloat(longitude), 
                        bLat, 
                        bLng
                    );
                    
                    return distanceA - distanceB;
                });
            }

            const sanitizedVehicles = VehicleController.sanitizeForResponse(availableVehicles, ['__v']);

            return VehicleController.sendSuccess(res, {
                vehicles: sanitizedVehicles.map(vehicle => {
                    const vehicleData = {
                        vehicleId: vehicle._id,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        licensePlate: vehicle.licensePlate,
                        vehicleType: vehicle.vehicleType,
                        comfortLevel: vehicle.comfortLevel,
                        priceValue: vehicle.priceValue,
                        driver: {
                            driverId: vehicle.driverId.driverId,
                            name: vehicle.driverId.name,
                            phone: vehicle.driverId.phone,
                            rating: vehicle.driverId.rating,
                            totalRides: vehicle.driverId.totalRides,
                            status: vehicle.driverId.status,
                            currentLocation: vehicle.driverId.currentLocation
                        }
                    };

                    // Add distance if coordinates provided
                    if (latitude && longitude && vehicle.driverId.currentLocation?.coordinates) {
                        const [driverLng, driverLat] = vehicle.driverId.currentLocation.coordinates;
                        vehicleData.distance = VehicleController.calculateDistance(
                            parseFloat(latitude), 
                            parseFloat(longitude), 
                            driverLat, 
                            driverLng
                        );
                    }

                    return vehicleData;
                }),
                totalCount: sanitizedVehicles.length,
                searchCriteria: {
                    vehicleType,
                    comfortPreference: comfortPreference ? parseInt(comfortPreference) : null,
                    farePreference: farePreference ? parseInt(farePreference) : null,
                    maxDistance: parseFloat(maxDistance),
                    hasLocationFilter: !!(latitude && longitude)
                }
            }, 'Vehicles search completed successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update vehicle status with enhanced validation
     */
    static updateVehicleStatus = asyncHandler(async (req, res) => {
        const { vehicleId } = req.params;
        
        VehicleController.logAction('VehicleController', 'updateVehicleStatus', { vehicleId });

        // Validate vehicle ID
        const vehicleIdValidation = vehicleIdSchema.safeParse({ vehicleId });
        
        if (!vehicleIdValidation.success) {
            return VehicleController.sendError(res, 'Invalid vehicle ID format', 400, 'INVALID_VEHICLE_ID');
        }

        // Validate status update data
        const validationResult = vehicleStatusUpdateSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const { isActive } = validationResult.data;

        try {
            const result = await VehicleController.withTransaction(async (session) => {
                const vehicle = await Vehicle.findByIdAndUpdate(
                    vehicleId,
                    { isActive, updatedAt: new Date() },
                    { new: true, session }
                );

                if (!vehicle) {
                    throw new Error('VEHICLE_NOT_FOUND');
                }

                return VehicleController.sanitizeForResponse(vehicle, ['__v']);
            });

            // Broadcast status update
            try {
                socketService.broadcastToUsers('vehicle:statusUpdated', {
                    vehicleId: result._id,
                    isActive: result.isActive
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return VehicleController.sendSuccess(res, {
                vehicleId: result._id,
                isActive: result.isActive,
                updatedAt: result.updatedAt
            }, `Vehicle ${isActive ? 'activated' : 'deactivated'} successfully`);

        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return VehicleController.sendError(res, 'Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
            }

            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicles by type with enhanced filtering
     */
    static getVehiclesByType = asyncHandler(async (req, res) => {
        const { vehicleType, comfortLevel, priceValue, includeInactive = false } = req.query;
        
        VehicleController.logAction('VehicleController', 'getVehiclesByType', { 
            vehicleType, 
            comfortLevel, 
            priceValue 
        });

        try {
            // Build query
            const query = VehicleController.buildQuery({
                vehicleType,
                comfortLevel: comfortLevel ? { $gte: parseInt(comfortLevel) } : undefined,
                priceValue: priceValue ? { $lte: parseInt(priceValue) } : undefined,
                isActive: includeInactive === 'true' ? undefined : true
            });

            const vehicles = await Vehicle.find(query)
                .populate({
                    path: 'driverId',
                    select: 'driverId name phone rating totalRides status isOnline currentLocation',
                    match: { isOnline: true, status: 'available' }
                })
                .sort({ comfortLevel: -1, priceValue: 1 })
                .lean();

            // Filter out vehicles whose drivers are not available
            const availableVehicles = vehicles.filter(vehicle => vehicle.driverId !== null);

            const sanitizedVehicles = VehicleController.sanitizeForResponse(availableVehicles, ['__v']);

            return VehicleController.sendSuccess(res, {
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
                    driver: {
                        driverId: vehicle.driverId.driverId,
                        name: vehicle.driverId.name,
                        phone: vehicle.driverId.phone,
                        rating: vehicle.driverId.rating,
                        totalRides: vehicle.driverId.totalRides,
                        status: vehicle.driverId.status,
                        currentLocation: vehicle.driverId.currentLocation
                    },
                    createdAt: vehicle.createdAt,
                    updatedAt: vehicle.updatedAt
                })),
                totalCount: sanitizedVehicles.length,
                filters: {
                    vehicleType,
                    comfortLevel: comfortLevel ? parseInt(comfortLevel) : null,
                    priceValue: priceValue ? parseInt(priceValue) : null,
                    includeInactive: includeInactive === 'true'
                }
            }, 'Vehicles retrieved by type successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicle statistics with enhanced analytics
     */
    static getVehicleStatistics = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'getVehicleStatistics');

        try {
            const stats = await Vehicle.aggregate([
                {
                    $group: {
                        _id: null,
                        totalVehicles: { $sum: 1 },
                        activeVehicles: { 
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
                        },
                        vehiclesByType: {
                            $push: {
                                type: '$vehicleType',
                                isActive: '$isActive',
                                comfortLevel: '$comfortLevel',
                                priceValue: '$priceValue'
                            }
                        },
                        avgComfortLevel: { $avg: '$comfortLevel' },
                        avgPriceValue: { $avg: '$priceValue' },
                        avgYear: { $avg: '$year' }
                    }
                },
                {
                    $addFields: {
                        vehicleTypeStats: {
                            $reduce: {
                                input: '$vehiclesByType',
                                initialValue: {},
                                in: {
                                    $mergeObjects: [
                                        '$$value',
                                        {
                                            $cond: [
                                                { $eq: ['$$this.isActive', true] },
                                                {
                                                    $arrayToObject: [
                                                        [
                                                            {
                                                                k: '$$this.type',
                                                                v: {
                                                                    $add: [
                                                                        { $ifNull: [{ $getField: { field: '$$this.type', input: '$$value' } }, 0] },
                                                                        1
                                                                    ]
                                                                }
                                                            }
                                                        ]
                                                    ]
                                                },
                                                '$$value'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                totalVehicles: 0,
                activeVehicles: 0,
                vehicleTypeStats: {},
                avgComfortLevel: 0,
                avgPriceValue: 0,
                avgYear: 0
            };

            // Calculate additional metrics
            const inactiveVehicles = result.totalVehicles - result.activeVehicles;
            const activePercentage = result.totalVehicles > 0 ? 
                (result.activeVehicles / result.totalVehicles * 100).toFixed(2) : 0;

            return VehicleController.sendSuccess(res, {
                overview: {
                    totalVehicles: result.totalVehicles,
                    activeVehicles: result.activeVehicles,
                    inactiveVehicles,
                    activePercentage: parseFloat(activePercentage)
                },
                averages: {
                    comfortLevel: parseFloat((result.avgComfortLevel || 0).toFixed(2)),
                    priceValue: parseFloat((result.avgPriceValue || 0).toFixed(2)),
                    year: Math.round(result.avgYear || 0)
                },
                vehicleTypeDistribution: result.vehicleTypeStats || {},
                generatedAt: new Date()
            }, 'Vehicle statistics retrieved successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk update vehicle status with enhanced validation
     */
    static bulkUpdateVehicleStatus = asyncHandler(async (req, res) => {
        const { vehicleIds, isActive, driverId } = req.body;
        
        VehicleController.logAction('VehicleController', 'bulkUpdateVehicleStatus', { 
            vehicleCount: vehicleIds?.length, 
            isActive, 
            driverId 
        });

        // Validate input
        if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
            return VehicleController.sendError(res, 'Vehicle IDs array is required and cannot be empty', 400, 'INVALID_INPUT');
        }

        if (typeof isActive !== 'boolean') {
            return VehicleController.sendError(res, 'isActive must be a boolean value', 400, 'INVALID_INPUT');
        }

        // Validate all vehicle IDs
        const invalidIds = vehicleIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return VehicleController.sendError(res, 
                `Invalid vehicle IDs: ${invalidIds.join(', ')}`, 
                400, 
                'INVALID_VEHICLE_IDS'
            );
        }

        try {
            const result = await VehicleController.withTransaction(async (session) => {
                const query = { _id: { $in: vehicleIds } };
                
                // If driverId is provided, only update vehicles belonging to that driver
                if (driverId) {
                    query.driverId = driverId;
                }

                const updateResult = await Vehicle.updateMany(
                    query,
                    { 
                        isActive, 
                        updatedAt: new Date() 
                    },
                    { session }
                );

                // Get updated vehicles for response
                const updatedVehicles = await Vehicle.find(query)
                    .select('_id driverId isActive updatedAt')
                    .session(session)
                    .lean();

                return {
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount,
                    updatedVehicles
                };
            });

            // Broadcast bulk update
            try {
                socketService.broadcastToUsers('vehicles:bulkStatusUpdated', {
                    vehicleIds: result.updatedVehicles.map(v => v._id),
                    isActive,
                    modifiedCount: result.modifiedCount
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return VehicleController.sendSuccess(res, {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                updatedVehicles: result.updatedVehicles.map(vehicle => ({
                    vehicleId: vehicle._id,
                    driverId: vehicle.driverId,
                    isActive: vehicle.isActive,
                    updatedAt: vehicle.updatedAt
                }))
            }, `${result.modifiedCount} vehicles updated successfully`);

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicle analytics for fleet management
     */
    static getVehicleAnalytics = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'getVehicleAnalytics', req.query);

        const analyticsSchema = z.object({
            period: z.enum(['week', 'month', 'quarter']).default('month'),
            vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
            driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/).optional()
        });

        const validationResult = analyticsSchema.safeParse(req.query);
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const { period, vehicleType, driverId } = validationResult.data;

        try {
            const cacheKey = `vehicle_analytics_${period}_${vehicleType || 'all'}_${driverId || 'all'}`;
            
            const analytics = await VehicleController.getCachedData(cacheKey, async () => {
                const periodMap = {
                    week: 7,
                    month: 30,
                    quarter: 90
                };

                const days = periodMap[period];
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

                const matchQuery = {
                    ...(vehicleType && { vehicleType }),
                    ...(driverId && { driverId: new mongoose.Types.ObjectId(driverId) })
                };

                const [
                    fleetStats,
                    utilizationStats,
                    performanceStats,
                    typeDistribution
                ] = await Promise.all([
                    Vehicle.aggregate([
                        { $match: matchQuery },
                        {
                            $group: {
                                _id: null,
                                totalVehicles: { $sum: 1 },
                                activeVehicles: {
                                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                                },
                                avgComfortLevel: { $avg: '$comfortLevel' },
                                avgPriceValue: { $avg: '$priceValue' }
                            }
                        }
                    ]),
                    RideRequest.aggregate([
                        {
                            $match: {
                                status: APP_CONSTANTS.RIDE_STATUS.COMPLETED,
                                createdAt: { $gte: startDate, $lte: endDate },
                                'acceptedBid.vehicleId': { $exists: true }
                            }
                        },
                        {
                            $lookup: {
                                from: 'vehicles',
                                localField: 'acceptedBid.vehicleId',
                                foreignField: '_id',
                                as: 'vehicle'
                            }
                        },
                        { $unwind: '$vehicle' },
                        { $match: { vehicle: matchQuery } },
                        {
                            $group: {
                                _id: '$acceptedBid.vehicleId',
                                ridesCompleted: { $sum: 1 },
                                totalRevenue: { $sum: '$acceptedBid.fareAmount' },
                                avgDistance: { $avg: '$estimatedDistance' },
                                vehicleType: { $first: '$vehicle.vehicleType' }
                            }
                        }
                    ]),
                    RideRequest.aggregate([
                        {
                            $match: {
                                status: APP_CONSTANTS.RIDE_STATUS.COMPLETED,
                                createdAt: { $gte: startDate, $lte: endDate }
                            }
                        },
                        {
                            $lookup: {
                                from: 'vehicles',
                                localField: 'acceptedBid.vehicleId',
                                foreignField: '_id',
                                as: 'vehicle'
                            }
                        },
                        { $unwind: '$vehicle' },
                        { $match: { vehicle: matchQuery } },
                        {
                            $group: {
                                _id: '$vehicle.vehicleType',
                                avgFare: { $avg: '$acceptedBid.fareAmount' },
                                totalRides: { $sum: 1 },
                                totalRevenue: { $sum: '$acceptedBid.fareAmount' },
                                avgRating: { $avg: '$rating' }
                            }
                        },
                        { $sort: { totalRevenue: -1 } }
                    ]),
                    Vehicle.aggregate([
                        { $match: matchQuery },
                        {
                            $group: {
                                _id: '$vehicleType',
                                count: { $sum: 1 },
                                activeCount: {
                                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                                },
                                avgComfort: { $avg: '$comfortLevel' },
                                avgPrice: { $avg: '$priceValue' }
                            }
                        },
                        { $sort: { count: -1 } }
                    ])
                ]);

                return {
                    period,
                    fleetOverview: fleetStats[0] || {
                        totalVehicles: 0,
                        activeVehicles: 0,
                        avgComfortLevel: 0,
                        avgPriceValue: 0
                    },
                    utilization: {
                        utilizationRate: fleetStats[0] 
                            ? ((fleetStats[0].activeVehicles / fleetStats[0].totalVehicles) * 100).toFixed(2)
                            : 0,
                        topPerformers: utilizationStats
                            .sort((a, b) => b.totalRevenue - a.totalRevenue)
                            .slice(0, 10)
                    },
                    performanceByType: performanceStats,
                    typeDistribution: typeDistribution.map(type => ({
                        ...type,
                        utilizationRate: type.count > 0 
                            ? ((type.activeCount / type.count) * 100).toFixed(2)
                            : 0
                    }))
                };
            }, 300000); // Cache for 5 minutes

            return VehicleController.sendSuccess(res, analytics, 'Vehicle analytics retrieved successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Optimize vehicle allocation based on demand patterns
     */
    static optimizeVehicleAllocation = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'optimizeVehicleAllocation');

        try {
            const result = await VehicleController.withRetry(async () => {
                // Analyze recent ride patterns
                const recentRequests = await RideRequest.find({
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
                    status: { $in: [APP_CONSTANTS.RIDE_STATUS.COMPLETED, APP_CONSTANTS.RIDE_STATUS.ACCEPTED] }
                }).select('pickupLocation rideType acceptedBid.vehicleType');

                // Group by location and vehicle type demand
                const demandAnalysis = recentRequests.reduce((acc, request) => {
                    const area = request.pickupLocation?.address || 'Unknown';
                    const vehicleType = request.acceptedBid?.vehicleType || request.rideType;
                    
                    if (!acc[area]) {
                        acc[area] = {};
                    }
                    if (!acc[area][vehicleType]) {
                        acc[area][vehicleType] = 0;
                    }
                    acc[area][vehicleType]++;
                    
                    return acc;
                }, {});

                // Get current vehicle distribution
                const currentDistribution = await Vehicle.aggregate([
                    { $match: { isActive: true } },
                    {
                        $lookup: {
                            from: 'drivers',
                            localField: 'driverId',
                            foreignField: '_id',
                            as: 'driver'
                        }
                    },
                    { $unwind: '$driver' },
                    {
                        $group: {
                            _id: {
                                area: '$driver.currentLocation.address',
                                vehicleType: '$vehicleType'
                            },
                            count: { $sum: 1 },
                            vehicles: { $push: '$_id' }
                        }
                    }
                ]);

                // Generate optimization recommendations
                const recommendations = [];
                Object.entries(demandAnalysis).forEach(([area, demand]) => {
                    Object.entries(demand).forEach(([vehicleType, demandCount]) => {
                        const current = currentDistribution.find(
                            d => d._id.area === area && d._id.vehicleType === vehicleType
                        );
                        
                        const currentCount = current?.count || 0;
                        const ratio = demandCount / Math.max(currentCount, 1);
                        
                        if (ratio > 1.5) { // High demand, low supply
                            recommendations.push({
                                area,
                                vehicleType,
                                action: 'increase',
                                currentSupply: currentCount,
                                recentDemand: demandCount,
                                priority: ratio > 3 ? 'high' : 'medium'
                            });
                        } else if (ratio < 0.5 && currentCount > 2) { // Low demand, high supply
                            recommendations.push({
                                area,
                                vehicleType,
                                action: 'decrease',
                                currentSupply: currentCount,
                                recentDemand: demandCount,
                                priority: 'low'
                            });
                        }
                    });
                });

                // Schedule background optimization task
                BackgroundTaskScheduler.startTask('vehicle_optimization', () => {
                    DataPersistenceService.ensureDataConsistency();
                }, 60 * 60 * 1000); // Run every hour

                return {
                    analysisDate: new Date(),
                    totalRecommendations: recommendations.length,
                    highPriorityActions: recommendations.filter(r => r.priority === 'high').length,
                    recommendations: recommendations.slice(0, 20) // Limit to top 20
                };
            });

            return VehicleController.sendSuccess(res, result, 'Vehicle allocation optimization completed');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get vehicle maintenance recommendations
     */
    static getMaintenanceRecommendations = asyncHandler(async (req, res) => {
        VehicleController.logAction('VehicleController', 'getMaintenanceRecommendations', req.query);

        const maintenanceSchema = z.object({
            vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
            urgency: z.enum(['low', 'medium', 'high', 'all']).default('all')
        });

        const validationResult = maintenanceSchema.safeParse(req.query);
        if (!validationResult.success) {
            return VehicleController.sendValidationError(res, validationResult);
        }

        const { vehicleType, urgency } = validationResult.data;

        try {
            const cacheKey = `maintenance_recommendations_${vehicleType || 'all'}_${urgency}`;
            
            const recommendations = await VehicleController.getCachedData(cacheKey, async () => {
                const matchQuery = {
                    isActive: true,
                    ...(vehicleType && { vehicleType })
                };

                // Calculate usage statistics for each vehicle
                const vehicleUsage = await RideRequest.aggregate([
                    {
                        $match: {
                            status: APP_CONSTANTS.RIDE_STATUS.COMPLETED,
                            'acceptedBid.vehicleId': { $exists: true },
                            createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
                        }
                    },
                    {
                        $group: {
                            _id: '$acceptedBid.vehicleId',
                            totalRides: { $sum: 1 },
                            totalDistance: { $sum: '$estimatedDistance' },
                            avgRating: { $avg: '$rating' },
                            lastRide: { $max: '$createdAt' }
                        }
                    }
                ]);

                const vehicles = await Vehicle.find(matchQuery)
                    .populate('driverId', 'name phone')
                    .lean();

                const maintenanceRecommendations = vehicles.map(vehicle => {
                    const usage = vehicleUsage.find(u => u._id.toString() === vehicle._id.toString());
                    const daysSinceCreation = Math.floor((Date.now() - vehicle.createdAt) / (1000 * 60 * 60 * 24));
                    const totalRides = usage?.totalRides || 0;
                    const totalDistance = usage?.totalDistance || 0;
                    const avgRating = usage?.avgRating || 5;
                    const daysSinceLastRide = usage?.lastRide 
                        ? Math.floor((Date.now() - usage.lastRide) / (1000 * 60 * 60 * 24))
                        : daysSinceCreation;

                    let maintenanceUrgency = 'low';
                    const issues = [];

                    // High usage check
                    if (totalRides > 200) {
                        maintenanceUrgency = 'high';
                        issues.push('High ride count - general inspection recommended');
                    }

                    // High mileage check
                    if (totalDistance > 5000) {
                        maintenanceUrgency = 'high';
                        issues.push('High mileage - engine and brake inspection needed');
                    }

                    // Low rating check
                    if (avgRating < 3.5) {
                        maintenanceUrgency = 'medium';
                        issues.push('Low customer rating - comfort and cleanliness check');
                    }

                    // Age check
                    if (daysSinceCreation > 1095) { // 3 years
                        maintenanceUrgency = maintenanceUrgency === 'high' ? 'high' : 'medium';
                        issues.push('Vehicle age - comprehensive maintenance required');
                    }

                    // Inactivity check
                    if (daysSinceLastRide > 30) {
                        issues.push('Long inactivity period - battery and engine check');
                    }

                    return {
                        vehicleId: vehicle._id,
                        make: vehicle.make,
                        model: vehicle.model,
                        vehicleType: vehicle.vehicleType,
                        licensePlate: vehicle.licensePlate,
                        driver: vehicle.driverId,
                        statistics: {
                            totalRides,
                            totalDistance,
                            avgRating,
                            daysSinceCreation,
                            daysSinceLastRide
                        },
                        maintenanceUrgency,
                        issues,
                        nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                    };
                }).filter(rec => urgency === 'all' || rec.maintenanceUrgency === urgency);

                return maintenanceRecommendations.sort((a, b) => {
                    const urgencyOrder = { high: 3, medium: 2, low: 1 };
                    return urgencyOrder[b.maintenanceUrgency] - urgencyOrder[a.maintenanceUrgency];
                });
            }, 3600000); // Cache for 1 hour

            return VehicleController.sendSuccess(res, {
                totalVehicles: recommendations.length,
                recommendationsByUrgency: {
                    high: recommendations.filter(r => r.maintenanceUrgency === 'high').length,
                    medium: recommendations.filter(r => r.maintenanceUrgency === 'medium').length,
                    low: recommendations.filter(r => r.maintenanceUrgency === 'low').length
                },
                recommendations
            }, 'Maintenance recommendations retrieved successfully');

        } catch (error) {
            const mongoError = VehicleController.handleMongoError(error);
            return VehicleController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });
}

// Export individual functions for backward compatibility
export const {
    createVehicle,
    getVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicles,
    searchVehiclesForRide,
    updateVehicleStatus,
    getVehiclesByType,
    getVehicleStatistics,
    bulkUpdateVehicleStatus,
    getVehicleAnalytics,
    optimizeVehicleAllocation,
    getMaintenanceRecommendations
} = VehicleController;

export default VehicleController;
