import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import Vehicle from '../models/vehicle.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from 'zod';
import { 
    formatValidationError, 
    validateRequest, 
    validateParams, 
    driverIdParamSchema, 
    userIdParamSchema,
    validatePagination,
    validateSortQuery
} from '../validations/common.validation.js';
import { generateDriverId, generateUserId, validateIdFormat } from '../utils/idGenerator.js';
import { driverRegistrationSchema, driverUpdateSchema } from '../validations/driver.validation.js';
import { userRegistrationSchema, userUpdateSchema } from '../validations/user.validation.js';
import { userLoginSchema, driverLoginSchema } from '../validations/auth.validation.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import BackgroundTaskScheduler from '../utils/backgroundTasks.js';
import DataPersistenceService from '../services/dataPersistenceService.js';

// Auth Controller Class
class AuthController extends BaseController {
    
    /**
     * User login with enhanced validation and error handling
     */
    static loginUser = asyncHandler(async (req, res) => {
        // Sanitize phone number for logging (don't log full phone number)
        const logPhone = req.body.phone ? req.body.phone.slice(0, 3) + '***' : 'undefined';
        AuthController.logAction('AuthController', 'loginUser', { phone: logPhone });

        // Validate request body
        const validationResult = userLoginSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const { phone } = validationResult.data;

        try {
            // Use transaction for data consistency
            const result = await AuthController.withTransaction(async (session) => {
                // Normalize phone number for consistent searching
                const normalizedPhone = phone.replace(/\s+/g, '').trim();
                
                // Find user by phone number
                const user = await User.findOne({ phone: normalizedPhone }).session(session);

                if (!user) {
                    throw new Error('USER_NOT_FOUND');
                }

                // Check if user account is active (add this field to user model if needed)
                if (user.isActive === false) {
                    throw new Error('USER_ACCOUNT_INACTIVE');
                }

                // Update user's online status and last seen
                const updatedUser = await User.findByIdAndUpdate(
                    user._id,
                    { 
                        isOnline: true, 
                        lastSeen: new Date() 
                    },
                    { new: true, session }
                );

                return AuthController.sanitizeForResponse(updatedUser, ['__v']);
            });

            // Broadcast user online status
            try {
                socketService.broadcastToDrivers('user:online', {
                    userId: result.userId,
                    isOnline: true
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
                // Don't fail the login for socket issues
            }

            return AuthController.sendSuccess(res, {
                userId: result.userId,
                name: result.name,
                email: result.email,
                phone: result.phone,
                defaultLocation: result.defaultLocation,
                preferences: result.preferences,
                isOnline: result.isOnline,
                rating: result.rating,
                totalRides: result.totalRides,
                lastSeen: result.lastSeen,
                createdAt: result.createdAt
            }, 'User login successful');

        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                return AuthController.sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
            }
            if (error.message === 'USER_ACCOUNT_INACTIVE') {
                return AuthController.sendError(res, 'Account is inactive. Please contact support.', 403, 'ACCOUNT_INACTIVE');
            }

            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Login failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Driver login with enhanced validation and error handling
     */
    static loginDriver = asyncHandler(async (req, res) => {
        // Sanitize phone number for logging
        const logPhone = req.body.phone ? req.body.phone.slice(0, 3) + '***' : 'undefined';
        AuthController.logAction('AuthController', 'loginDriver', { phone: logPhone });

        // Validate request body
        const validationResult = driverLoginSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const { phone } = validationResult.data;

        try {
            // Use transaction for data consistency
            const result = await AuthController.withTransaction(async (session) => {
                // Normalize phone number for consistent searching
                const normalizedPhone = phone.replace(/\s+/g, '').trim();
                
                // Find driver by phone number with populated vehicles
                const driver = await Driver.findOne({ phone: normalizedPhone })
                    .populate('vehicles')
                    .session(session);

                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                // Check if driver account is active
                if (driver.isActive === false) {
                    throw new Error('DRIVER_ACCOUNT_INACTIVE');
                }

                // Update driver's online status and last seen
                const updatedDriver = await Driver.findByIdAndUpdate(
                    driver._id,
                    { 
                        isOnline: true, 
                        lastSeen: new Date(),
                        status: 'available' // Set to available on login
                    },
                    { new: true, session }
                ).populate('vehicles');

                return AuthController.sanitizeForResponse(updatedDriver, ['__v']);
            });

            // Broadcast driver online status
            try {
                socketService.broadcastToUsers('driver:online', {
                    driverId: result.driverId,
                    isOnline: true,
                    status: result.status,
                    location: result.currentLocation
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
                // Don't fail the login for socket issues
            }

            return AuthController.sendSuccess(res, {
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
                rating: result.rating,
                totalRides: result.totalRides,
                lastSeen: result.lastSeen,
                createdAt: result.createdAt
            }, 'Driver login successful');

        } catch (error) {
            if (error.message === 'DRIVER_NOT_FOUND') {
                return AuthController.sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
            }
            if (error.message === 'DRIVER_ACCOUNT_INACTIVE') {
                return AuthController.sendError(res, 'Account is inactive. Please contact support.', 403, 'ACCOUNT_INACTIVE');
            }

            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Login failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * User registration with enhanced validation
     */
    static registerUser = asyncHandler(async (req, res) => {
        AuthController.logAction('AuthController', 'registerUser', { 
            userId: req.body.userId, 
            phone: req.body.phone 
        });

        // Validate request body using Zod
        const validationResult = userRegistrationSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const {
            userId,
            name,
            email,
            phone,
            defaultLocation,
            preferences
        } = validationResult.data;

        try {
            const result = await AuthController.withTransaction(async (session) => {
                // Generate userId if not provided
                const finalUserId = userId || generateUserId();

                // Normalize phone and email for consistent storage
                const normalizedPhone = phone.replace(/\s+/g, '').trim();
                const normalizedEmail = email ? email.trim().toLowerCase() : undefined;

                // Check if user already exists by ID or phone
                const existingUser = await User.findOne({
                    $or: [
                        { userId: finalUserId },
                        { phone: normalizedPhone },
                        ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
                    ]
                }).session(session);

                if (existingUser) {
                    if (existingUser.userId === finalUserId) {
                        throw new Error('USER_ID_EXISTS');
                    }
                    if (existingUser.phone === normalizedPhone) {
                        throw new Error('PHONE_EXISTS');
                    }
                    if (normalizedEmail && existingUser.email === normalizedEmail) {
                        throw new Error('EMAIL_EXISTS');
                    }
                }

                // Validate and sanitize location coordinates if provided
                let sanitizedLocation = defaultLocation;
                if (defaultLocation && defaultLocation.coordinates) {
                    const { latitude, longitude } = defaultLocation.coordinates;
                    if (isNaN(latitude) || isNaN(longitude) || 
                        latitude < -90 || latitude > 90 || 
                        longitude < -180 || longitude > 180) {
                        throw new Error('INVALID_COORDINATES');
                    }
                    sanitizedLocation = {
                        ...defaultLocation,
                        coordinates: {
                            latitude: Number(latitude),
                            longitude: Number(longitude)
                        }
                    };
                }

                // Create new user
                const user = new User({
                    userId: finalUserId,
                    name: name.trim(),
                    email: normalizedEmail,
                    phone: normalizedPhone,
                    defaultLocation: sanitizedLocation,
                    preferences,
                    isOnline: false,
                    isActive: true
                });

                const savedUser = await user.save({ session });
                return AuthController.sanitizeForResponse(savedUser, ['__v']);
            });

            // Broadcast new user registration
            try {
                socketService.broadcastToDrivers('user:registered', {
                    userId: result.userId,
                    name: result.name
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return AuthController.sendSuccess(res, {
                userId: result.userId,
                name: result.name,
                email: result.email,
                phone: result.phone,
                defaultLocation: result.defaultLocation,
                preferences: result.preferences,
                isOnline: result.isOnline,
                rating: result.rating,
                totalRides: result.totalRides,
                createdAt: result.createdAt
            }, 'User registered successfully', 201);

        } catch (error) {
            if (error.message === 'USER_ID_EXISTS') {
                return AuthController.sendError(res, 'User ID already exists', 409, 'USER_ID_EXISTS');
            }
            if (error.message === 'PHONE_EXISTS') {
                return AuthController.sendError(res, 'Phone number already registered', 409, 'PHONE_EXISTS');
            }
            if (error.message === 'EMAIL_EXISTS') {
                return AuthController.sendError(res, 'Email already registered', 409, 'EMAIL_EXISTS');
            }
            if (error.message === 'INVALID_COORDINATES') {
                return AuthController.sendError(res, 'Invalid location coordinates', 400, 'INVALID_COORDINATES');
            }

            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Registration failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Driver registration with enhanced validation
     */
    static registerDriver = asyncHandler(async (req, res) => {
        AuthController.logAction('AuthController', 'registerDriver', { 
            driverId: req.body.driverId, 
            phone: req.body.phone 
        });

        // Validate request body using Zod
        const validationResult = driverRegistrationSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const {
            driverId,
            name,
            email,
            phone,
            currentLocation
        } = validationResult.data;

        try {
            const result = await AuthController.withTransaction(async (session) => {
                // Generate driverId if not provided
                const finalDriverId = driverId || generateDriverId();

                // Normalize phone and email for consistent storage
                const normalizedPhone = phone.replace(/\s+/g, '').trim();
                const normalizedEmail = email ? email.trim().toLowerCase() : undefined;

                // Check if driver already exists by ID or phone
                const existingDriver = await Driver.findOne({
                    $or: [
                        { driverId: finalDriverId },
                        { phone: normalizedPhone },
                        ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
                    ]
                }).session(session);

                if (existingDriver) {
                    if (existingDriver.driverId === finalDriverId) {
                        throw new Error('DRIVER_ID_EXISTS');
                    }
                    if (existingDriver.phone === normalizedPhone) {
                        throw new Error('PHONE_EXISTS');
                    }
                    if (normalizedEmail && existingDriver.email === normalizedEmail) {
                        throw new Error('EMAIL_EXISTS');
                    }
                }

                // Validate and sanitize location coordinates if provided
                let sanitizedLocation = currentLocation;
                if (currentLocation && currentLocation.coordinates) {
                    const { latitude, longitude } = currentLocation.coordinates;
                    if (isNaN(latitude) || isNaN(longitude) || 
                        latitude < -90 || latitude > 90 || 
                        longitude < -180 || longitude > 180) {
                        throw new Error('INVALID_COORDINATES');
                    }
                    sanitizedLocation = {
                        ...currentLocation,
                        coordinates: {
                            latitude: Number(latitude),
                            longitude: Number(longitude)
                        }
                    };
                }

                // Create new driver
                const driver = new Driver({
                    driverId: finalDriverId,
                    name: name.trim(),
                    email: normalizedEmail,
                    phone: normalizedPhone,
                    currentLocation: sanitizedLocation,
                    status: 'offline',
                    isOnline: false,
                    isActive: true
                });

                const savedDriver = await driver.save({ session });
                return AuthController.sanitizeForResponse(savedDriver, ['__v']);
            });

            // Broadcast new driver registration
            try {
                socketService.broadcastToUsers('driver:registered', {
                    driverId: result.driverId,
                    name: result.name
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return AuthController.sendSuccess(res, {
                driverId: result.driverId,
                name: result.name,
                email: result.email,
                phone: result.phone,
                currentLocation: result.currentLocation,
                status: result.status,
                isOnline: result.isOnline,
                rating: result.rating,
                totalRides: result.totalRides,
                createdAt: result.createdAt
            }, 'Driver registered successfully', 201);

        } catch (error) {
            if (error.message === 'DRIVER_ID_EXISTS') {
                return AuthController.sendError(res, 'Driver ID already exists', 409, 'DRIVER_ID_EXISTS');
            }
            if (error.message === 'PHONE_EXISTS') {
                return AuthController.sendError(res, 'Phone number already registered', 409, 'PHONE_EXISTS');
            }
            if (error.message === 'EMAIL_EXISTS') {
                return AuthController.sendError(res, 'Email already registered', 409, 'EMAIL_EXISTS');
            }
            if (error.message === 'INVALID_COORDINATES') {
                return AuthController.sendError(res, 'Invalid location coordinates', 400, 'INVALID_COORDINATES');
            }

            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Registration failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Get driver profile with enhanced data
     */
    static getDriverProfile = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        AuthController.logAction('AuthController', 'getDriverProfile', { driverId });

        try {
            const driver = await Driver.findOne({ driverId })
                .populate('vehicles')
                .lean();

            if (!driver) {
                return AuthController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }

            const sanitizedDriver = AuthController.sanitizeForResponse(driver, ['__v']);

            return AuthController.sendSuccess(res, {
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
                lastSeen: sanitizedDriver.lastSeen,
                createdAt: sanitizedDriver.createdAt
            }, 'Driver profile retrieved successfully');

        } catch (error) {
            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Get user profile with enhanced data
     */
    static getUserProfile = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        
        AuthController.logAction('AuthController', 'getUserProfile', { userId });

        try {
            const user = await User.findOne({ userId }).lean();

            if (!user) {
                return AuthController.sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
            }

            const sanitizedUser = AuthController.sanitizeForResponse(user, ['__v']);

            return AuthController.sendSuccess(res, {
                userId: sanitizedUser.userId,
                name: sanitizedUser.name,
                email: sanitizedUser.email,
                phone: sanitizedUser.phone,
                defaultLocation: sanitizedUser.defaultLocation,
                preferences: sanitizedUser.preferences,
                isOnline: sanitizedUser.isOnline,
                rating: sanitizedUser.rating,
                totalRides: sanitizedUser.totalRides,
                lastSeen: sanitizedUser.lastSeen,
                createdAt: sanitizedUser.createdAt
            }, 'User profile retrieved successfully');

        } catch (error) {
            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Update driver profile with enhanced validation
     */
    static updateDriverProfile = asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        
        AuthController.logAction('AuthController', 'updateDriverProfile', { driverId });

        // Validate driver ID parameter
        const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
        
        if (!driverIdValidation.success) {
            return AuthController.sendError(res, 'Invalid driver ID format', 400, 'INVALID_DRIVER_ID');
        }

        // Validate update data using Zod
        const validationResult = driverUpdateSchema.safeParse(req.body);
        
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const updates = validationResult.data;

        try {
            const result = await AuthController.withTransaction(async (session) => {
                // Validate and sanitize updates
                const sanitizedUpdates = { ...updates };
                
                // Normalize phone if provided
                if (sanitizedUpdates.phone) {
                    sanitizedUpdates.phone = sanitizedUpdates.phone.replace(/\s+/g, '').trim();
                    
                    // Check for phone number conflicts
                    const existingDriver = await Driver.findOne({ 
                        phone: sanitizedUpdates.phone,
                        driverId: { $ne: driverId }
                    }).session(session);
                    
                    if (existingDriver) {
                        throw new Error('PHONE_EXISTS');
                    }
                }

                // Normalize email if provided
                if (sanitizedUpdates.email) {
                    sanitizedUpdates.email = sanitizedUpdates.email.trim().toLowerCase();
                    
                    // Check for email conflicts
                    const existingDriver = await Driver.findOne({ 
                        email: sanitizedUpdates.email,
                        driverId: { $ne: driverId }
                    }).session(session);
                    
                    if (existingDriver) {
                        throw new Error('EMAIL_EXISTS');
                    }
                }

                // Validate coordinates if location is being updated
                if (sanitizedUpdates.currentLocation && sanitizedUpdates.currentLocation.coordinates) {
                    const { latitude, longitude } = sanitizedUpdates.currentLocation.coordinates;
                    if (isNaN(latitude) || isNaN(longitude) || 
                        latitude < -90 || latitude > 90 || 
                        longitude < -180 || longitude > 180) {
                        throw new Error('INVALID_COORDINATES');
                    }
                    sanitizedUpdates.currentLocation.coordinates = {
                        latitude: Number(latitude),
                        longitude: Number(longitude)
                    };
                }

                // Clean vehicle info if provided in updates
                if (sanitizedUpdates.vehicleInfo) {
                    sanitizedUpdates.vehicleInfo = Object.fromEntries(
                        Object.entries(sanitizedUpdates.vehicleInfo).filter(([_, v]) => v != null && v !== '')
                    );
                }

                const driver = await Driver.findOneAndUpdate(
                    { driverId },
                    { ...sanitizedUpdates, updatedAt: new Date() },
                    { new: true, runValidators: true, session }
                ).populate('vehicles');

                if (!driver) {
                    throw new Error('DRIVER_NOT_FOUND');
                }

                return AuthController.sanitizeForResponse(driver, ['__v']);
            });

            // Broadcast driver update
            try {
                socketService.broadcastToUsers('driver:updated', {
                    driverId: result.driverId,
                    updates: updates
                });
            } catch (socketError) {
                console.warn('Socket broadcast failed:', socketError.message);
            }

            return AuthController.sendSuccess(res, {
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
                return AuthController.sendError(res, 'Driver not found', 404, 'DRIVER_NOT_FOUND');
            }
            if (error.message === 'PHONE_EXISTS') {
                return AuthController.sendError(res, 'Phone number already in use', 409, 'PHONE_EXISTS');
            }
            if (error.message === 'EMAIL_EXISTS') {
                return AuthController.sendError(res, 'Email already in use', 409, 'EMAIL_EXISTS');
            }
            if (error.message === 'INVALID_COORDINATES') {
                return AuthController.sendError(res, 'Invalid location coordinates', 400, 'INVALID_COORDINATES');
            }

            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Profile update failed', mongoError.statusCode, mongoError.code);
        }
    });


    /**
     * Get authentication statistics for admin dashboard
     */
    static getAuthStats = asyncHandler(async (req, res) => {
        AuthController.logAction('AuthController', 'getAuthStats');

        try {
            const cacheKey = 'auth_stats';
            const stats = await AuthController.getCachedData(cacheKey, async () => {
                const [
                    totalUsers,
                    totalDrivers,
                    onlineUsers,
                    onlineDrivers,
                    recentRegistrations
                ] = await Promise.all([
                    User.countDocuments(),
                    Driver.countDocuments(),
                    User.countDocuments({ isOnline: true }),
                    Driver.countDocuments({ isOnline: true }),
                    User.countDocuments({ 
                        createdAt: { 
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                        }
                    })
                ]);

                return {
                    users: {
                        total: totalUsers,
                        online: onlineUsers,
                        offline: totalUsers - onlineUsers
                    },
                    drivers: {
                        total: totalDrivers,
                        online: onlineDrivers,
                        offline: totalDrivers - onlineDrivers
                    },
                    recentRegistrations,
                    onlineRatio: {
                        users: totalUsers > 0 ? (onlineUsers / totalUsers * 100).toFixed(2) : 0,
                        drivers: totalDrivers > 0 ? (onlineDrivers / totalDrivers * 100).toFixed(2) : 0
                    }
                };
            }, 60000); // Cache for 1 minute

            return AuthController.sendSuccess(res, stats, 'Authentication statistics retrieved successfully');

        } catch (error) {
            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk user/driver operations for data management
     */
    static bulkUpdateStatus = asyncHandler(async (req, res) => {
        AuthController.logAction('AuthController', 'bulkUpdateStatus', { 
            requestSize: Object.keys(req.body).length 
        });

        // Use the validation schema from auth.validation.js instead of inline schema
        const validationResult = bulkStatusUpdateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return AuthController.sendValidationError(res, validationResult);
        }

        const { userIds, driverIds, status, reason, notifyUsers, effectiveDate } = validationResult.data;

        try {
            const result = await AuthController.withTransaction(async (session) => {
                let userUpdateResult = { modifiedCount: 0, matchedCount: 0 };
                let driverUpdateResult = { modifiedCount: 0, matchedCount: 0 };

                // Update users if userIds provided
                if (userIds && userIds.length > 0) {
                    userUpdateResult = await User.updateMany(
                        { userId: { $in: userIds } },
                        { 
                            $set: {
                                isActive: status === 'active',
                                accountStatus: status,
                                lastSeen: new Date(),
                                ...(reason && { statusReason: reason }),
                                ...(effectiveDate && { statusEffectiveDate: new Date(effectiveDate) })
                            }
                        },
                        { session }
                    );
                }

                // Update drivers if driverIds provided
                if (driverIds && driverIds.length > 0) {
                    driverUpdateResult = await Driver.updateMany(
                        { driverId: { $in: driverIds } },
                        { 
                            $set: {
                                isActive: status === 'active',
                                accountStatus: status,
                                lastSeen: new Date(),
                                ...(reason && { statusReason: reason }),
                                ...(effectiveDate && { statusEffectiveDate: new Date(effectiveDate) }),
                                ...(status === 'inactive' && { isOnline: false, status: 'offline' })
                            }
                        },
                        { session }
                    );
                }

                return {
                    usersModified: userUpdateResult.modifiedCount,
                    usersMatched: userUpdateResult.matchedCount,
                    driversModified: driverUpdateResult.modifiedCount,
                    driversMatched: driverUpdateResult.matchedCount,
                    totalModified: userUpdateResult.modifiedCount + driverUpdateResult.modifiedCount
                };
            });

            return AuthController.sendSuccess(res, result, 
                `${result.totalModified} account(s) updated successfully`);

        } catch (error) {
            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, 'Bulk update failed', mongoError.statusCode, mongoError.code);
        }
    });

    /**
     * Cleanup inactive sessions and optimize database
     */
    static performMaintenance = asyncHandler(async (req, res) => {
        AuthController.logAction('AuthController', 'performMaintenance');

        try {
            const maintenanceResults = await AuthController.withRetry(async () => {
                const cutoffTime = new Date(Date.now() - APP_CONSTANTS.MAX_WAIT_TIME * 60 * 1000);
                
                const [userCleanup, driverCleanup] = await Promise.all([
                    User.updateMany(
                        { 
                            isOnline: true, 
                            lastSeen: { $lt: cutoffTime }
                        },
                        { 
                            $set: { 
                                isOnline: false,
                                updatedAt: new Date()
                            }
                        }
                    ),
                    Driver.updateMany(
                        { 
                            isOnline: true, 
                            lastSeen: { $lt: cutoffTime }
                        },
                        { 
                            $set: { 
                                isOnline: false,
                                status: APP_CONSTANTS.DRIVER_STATUS.OFFLINE,
                                updatedAt: new Date()
                            }
                        }
                    )
                ]);

                // Clear auth cache
                AuthController.clearCache(/^auth_/);

                return {
                    usersOfflined: userCleanup.modifiedCount,
                    driversOfflined: driverCleanup.modifiedCount
                };
            });

            // Schedule background task for data persistence
            BackgroundTaskScheduler.startTask('auth_maintenance', () => {
                DataPersistenceService.ensureDataConsistency();
            }, 30 * 60 * 1000); // Run every 30 minutes

            return AuthController.sendSuccess(res, maintenanceResults, 'Maintenance completed successfully');

        } catch (error) {
            const mongoError = AuthController.handleMongoError(error);
            return AuthController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });
}

// Export individual functions for backward compatibility
export const {
    loginUser,
    loginDriver,
    registerUser,
    registerDriver,
    getDriverProfile,
    getUserProfile,
    updateDriverProfile,
    getAuthStats,
    bulkUpdateStatus,
    performMaintenance
} = AuthController;

export default AuthController;
