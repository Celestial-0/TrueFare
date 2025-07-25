import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateDriverId, generateUserId, validateIdFormat } from '../utils/idGenerator.js';
import { driverRegistrationSchema, driverUpdateSchema } from '../validations/driver.validation.js';
import { userRegistrationSchema, userUpdateSchema } from '../validations/user.validation.js';
import { validateRequest, validateParams, driverIdParamSchema, userIdParamSchema, formatValidationError } from '../validations/common.validation.js';

// Driver registration endpoint
const registerDriver = asyncHandler(async (req, res) => {
    // Validate request body using Zod
    const validationResult = driverRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const {
        driverId,
        name,
        email,
        phone,
        vehicleInfo,
        currentLocation
    } = validationResult.data;

    try {
        // Generate driverId if not provided
        const finalDriverId = driverId || generateDriverId();

        // Check if driver already exists by ID
        const existingDriver = await Driver.findOne({ driverId: finalDriverId });
        if (existingDriver) {
            return res.status(409).json({
                success: false,
                message: 'Driver with this ID already exists',
                code: 'DRIVER_EXISTS'
            });
        }

        // Clean vehicle info - remove empty fields
        let cleanedVehicleInfo;
        if (vehicleInfo) {
            cleanedVehicleInfo = {};
            if (vehicleInfo.make && vehicleInfo.make.trim()) cleanedVehicleInfo.make = vehicleInfo.make.trim();
            if (vehicleInfo.model && vehicleInfo.model.trim()) cleanedVehicleInfo.model = vehicleInfo.model.trim();
            if (vehicleInfo.year) cleanedVehicleInfo.year = vehicleInfo.year;
            if (vehicleInfo.licensePlate && vehicleInfo.licensePlate.trim()) cleanedVehicleInfo.licensePlate = vehicleInfo.licensePlate.trim().toUpperCase();
            if (vehicleInfo.color && vehicleInfo.color.trim()) cleanedVehicleInfo.color = vehicleInfo.color.trim();
            
            // Only include vehicleInfo if at least one field is provided
            if (Object.keys(cleanedVehicleInfo).length === 0) {
                cleanedVehicleInfo = undefined;
            }
        }

        // Create new driver
        const driver = new Driver({
            driverId: finalDriverId,
            name: name.trim(),
            email: email ? email.trim() : undefined,
            phone: phone.trim(),
            vehicleInfo: cleanedVehicleInfo,
            currentLocation,
            status: 'offline',
            isOnline: false
        });

        const savedDriver = await driver.save();

        res.status(201).json({
            success: true,
            message: 'Driver registered successfully',
            data: {
                driverId: savedDriver.driverId,
                name: savedDriver.name,
                email: savedDriver.email,
                phone: savedDriver.phone,
                status: savedDriver.status,
                isOnline: savedDriver.isOnline,
                createdAt: savedDriver.createdAt
            }
        });

    } catch (error) {
        console.error('Error registering driver:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue)[0];
            if (duplicateField === 'driverId') {
                return res.status(409).json({
                    success: false,
                    message: 'Driver with this ID already exists',
                    code: 'DRIVER_EXISTS',
                    field: duplicateField
                });
            } else if (duplicateField === 'phone') {
                return res.status(409).json({
                    success: false,
                    message: 'Driver with this phone number already exists',
                    code: 'PHONE_EXISTS',
                    field: duplicateField
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: `Driver with this ${duplicateField} already exists`,
                    code: 'DUPLICATE_DRIVER',
                    field: duplicateField
                });
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error in driver data',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }

        throw error;
    }
});

// User registration endpoint
const registerUser = asyncHandler(async (req, res) => {
    // Validate request body using Zod
    const validationResult = userRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
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
        // Generate userId if not provided
        const finalUserId = userId || generateUserId();

        // Check if user already exists by ID
        const existingUser = await User.findOne({ userId: finalUserId });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this ID already exists',
                code: 'USER_EXISTS'
            });
        }

        // Create new user
        const user = new User({
            userId: finalUserId,
            name: name.trim(),
            email: email ? email.trim() : undefined,
            phone: phone.trim(),
            defaultLocation,
            preferences,
            isOnline: false
        });

        const savedUser = await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: savedUser.userId,
                name: savedUser.name,
                email: savedUser.email,
                phone: savedUser.phone,
                isOnline: savedUser.isOnline,
                createdAt: savedUser.createdAt
            }
        });

    } catch (error) {
        console.error('Error registering user:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue)[0];
            if (duplicateField === 'userId') {
                return res.status(409).json({
                    success: false,
                    message: 'User with this ID already exists',
                    code: 'USER_EXISTS',
                    field: duplicateField
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: `User with this ${duplicateField} already exists`,
                    code: 'DUPLICATE_USER',
                    field: duplicateField
                });
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error in user data',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }

        throw error;
    }
});

// Get driver profile
const getDriverProfile = asyncHandler(async (req, res) => {
    const { driverId } = req.params;

    // Driver ID is already validated by middleware
    try {
        const driver = await Driver.findOne({ driverId });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found',
                code: 'DRIVER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                driverId: driver.driverId,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicleInfo: driver.vehicleInfo,
                currentLocation: driver.currentLocation,
                status: driver.status,
                isOnline: driver.isOnline,
                rating: driver.rating,
                totalRides: driver.totalRides,
                lastSeen: driver.lastSeen,
                createdAt: driver.createdAt
            }
        });

    } catch (error) {
        console.error('Error fetching driver profile:', error);
        throw error;
    }
});

// Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // User ID is already validated by middleware
    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                defaultLocation: user.defaultLocation,
                preferences: user.preferences,
                isOnline: user.isOnline,
                rating: user.rating,
                totalRides: user.totalRides,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
});

// Update driver profile
const updateDriverProfile = asyncHandler(async (req, res) => {
    const { driverId } = req.params;

    // Validate driver ID parameter
    const driverIdValidation = driverIdParamSchema.safeParse({ driverId });
    
    if (!driverIdValidation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid driver ID format',
            code: 'INVALID_DRIVER_ID'
        });
    }

    // Validate update data using Zod
    const validationResult = driverUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const updates = validationResult.data;

    try {
        // Clean vehicle info if provided in updates
        if (updates.vehicleInfo) {
            const cleanedVehicleInfo = {};
            if (updates.vehicleInfo.make && updates.vehicleInfo.make.trim()) cleanedVehicleInfo.make = updates.vehicleInfo.make.trim();
            if (updates.vehicleInfo.model && updates.vehicleInfo.model.trim()) cleanedVehicleInfo.model = updates.vehicleInfo.model.trim();
            if (updates.vehicleInfo.year) cleanedVehicleInfo.year = updates.vehicleInfo.year;
            if (updates.vehicleInfo.licensePlate && updates.vehicleInfo.licensePlate.trim()) cleanedVehicleInfo.licensePlate = updates.vehicleInfo.licensePlate.trim().toUpperCase();
            if (updates.vehicleInfo.color && updates.vehicleInfo.color.trim()) cleanedVehicleInfo.color = updates.vehicleInfo.color.trim();
            
            // Only include vehicleInfo if at least one field is provided, otherwise remove it
            if (Object.keys(cleanedVehicleInfo).length === 0) {
                updates.vehicleInfo = undefined;
            } else {
                updates.vehicleInfo = cleanedVehicleInfo;
            }
        }

        const driver = await Driver.findOneAndUpdate(
            { driverId },
            updates,
            { new: true, runValidators: true }
        );

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found',
                code: 'DRIVER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Driver profile updated successfully',
            data: {
                driverId: driver.driverId,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicleInfo: driver.vehicleInfo,
                currentLocation: driver.currentLocation,
                status: driver.status,
                isOnline: driver.isOnline,
                updatedAt: driver.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating driver profile:', error);
        
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue)[0];
            if (duplicateField === 'driverId') {
                return res.status(409).json({
                    success: false,
                    message: 'Driver with this ID already exists',
                    code: 'DRIVER_EXISTS',
                    field: duplicateField
                });
            } else if (duplicateField === 'phone') {
                return res.status(409).json({
                    success: false,
                    message: 'Driver with this phone number already exists',
                    code: 'PHONE_EXISTS',
                    field: duplicateField
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: `Driver with this ${duplicateField} already exists`,
                    code: 'DUPLICATE_DRIVER',
                    field: duplicateField
                });
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error in driver data',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }

        throw error;
    }
});

// Get driver earnings
const getDriverEarnings = asyncHandler(async (req, res) => {
    const { driverId } = req.params;

    try {
        // Import here to avoid circular dependency
        const DataPersistenceService = (await import('../services/dataPersistenceService.js')).default;
        
        // Get driver bid history to calculate earnings
        const bidHistory = await DataPersistenceService.getDriverBidHistory(driverId);
        
        // Calculate earnings from accepted bids
        let totalEarnings = 0;
        let todayEarnings = 0;
        let weeklyEarnings = 0;
        let monthlyEarnings = 0;
        let totalRides = 0;
        let completedRides = 0;
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        bidHistory.forEach(request => {
            if (request.status === 'completed' && request.acceptedBid) {
                const driverBid = request.bids.find(bid => bid.driverId === driverId);
                if (driverBid && request.acceptedBid.driverId === driverId) {
                    const fare = driverBid.fareAmount;
                    const requestDate = new Date(request.createdAt);
                    
                    totalEarnings += fare;
                    completedRides++;
                    
                    if (requestDate >= todayStart) {
                        todayEarnings += fare;
                    }
                    if (requestDate >= weekStart) {
                        weeklyEarnings += fare;
                    }
                    if (requestDate >= monthStart) {
                        monthlyEarnings += fare;
                    }
                }
            }
            
            // Count total rides (including pending, accepted, etc.)
            if (request.bids.some(bid => bid.driverId === driverId)) {
                totalRides++;
            }
        });
        
        const ridesThisWeek = bidHistory.filter(request => {
            const requestDate = new Date(request.createdAt);
            return requestDate >= weekStart && request.bids.some(bid => bid.driverId === driverId);
        }).length;
        
        const ridesThisMonth = bidHistory.filter(request => {
            const requestDate = new Date(request.createdAt);
            return requestDate >= monthStart && request.bids.some(bid => bid.driverId === driverId);
        }).length;

        res.status(200).json({
            success: true,
            data: {
                totalEarnings,
                todayEarnings,
                weeklyEarnings,
                monthlyEarnings,
                totalRides,
                completedRides,
                averageRating: 4.5, // Mock rating for now
                ridesThisWeek,
                ridesThisMonth
            }
        });

    } catch (error) {
        console.error('Error fetching driver earnings:', error);
        throw error;
    }
});

// Get driver bid history
const getDriverBids = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        // Import here to avoid circular dependency
        const DataPersistenceService = (await import('../services/dataPersistenceService.js')).default;
        
        const bidHistory = await DataPersistenceService.getDriverBidHistory(driverId);
        
        // Apply pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedHistory = bidHistory.slice(startIndex, endIndex);

        res.status(200).json({
            success: true,
            data: paginatedHistory,
            pagination: {
                currentPage: parseInt(page),
                totalItems: bidHistory.length,
                totalPages: Math.ceil(bidHistory.length / parseInt(limit)),
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(bidHistory.length / parseInt(limit)),
                hasPreviousPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching driver bids:', error);
        throw error;
    }
});

// Get driver ride history
const getDriverRideHistory = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        // Import here to avoid circular dependency
        const DataPersistenceService = (await import('../services/dataPersistenceService.js')).default;
        
        const bidHistory = await DataPersistenceService.getDriverBidHistory(driverId);
        
        // Filter only completed rides and format for ride history
        const rideHistory = bidHistory
            .filter(request => request.status === 'completed' && request.acceptedBid && request.acceptedBid.driverId === driverId)
            .map(request => {
                const driverBid = request.bids.find(bid => bid.driverId === driverId);
                return {
                    id: request._id,
                    date: request.createdAt,
                    pickupLocation: request.pickupLocation?.address || 'Unknown location',
                    destination: request.destination?.address || 'Unknown destination',
                    fare: driverBid?.fareAmount || 0,
                    status: request.status,
                    distance: request.estimatedDistance || 0,
                    duration: request.estimatedDuration || 0,
                    rating: 4.5 // Mock rating for now
                };
            });
        
        // Apply pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedHistory = rideHistory.slice(startIndex, endIndex);

        res.status(200).json({
            success: true,
            data: paginatedHistory,
            pagination: {
                currentPage: parseInt(page),
                totalItems: rideHistory.length,
                totalPages: Math.ceil(rideHistory.length / parseInt(limit)),
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(rideHistory.length / parseInt(limit)),
                hasPreviousPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching driver ride history:', error);
        throw error;
    }
});

// Update driver status
const updateDriverStatus = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['available', 'busy', 'offline'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be one of: available, busy, offline',
            code: 'INVALID_STATUS'
        });
    }

    try {
        // Update driver status in database
        const updatedDriver = await Driver.findOneAndUpdate(
            { driverId },
            { 
                status,
                isOnline: status !== 'offline',
                lastSeen: new Date()
            },
            { new: true }
        );

        if (!updatedDriver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found',
                code: 'DRIVER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Driver status updated successfully',
            data: {
                driverId: updatedDriver.driverId,
                status: updatedDriver.status,
                isOnline: updatedDriver.isOnline,
                lastSeen: updatedDriver.lastSeen
            }
        });

    } catch (error) {
        console.error('Error updating driver status:', error);
        throw error;
    }
});

export {
    registerDriver,
    registerUser,
    getDriverProfile,
    getUserProfile,
    updateDriverProfile,
    getDriverEarnings,
    getDriverBids,
    getDriverRideHistory,
    updateDriverStatus
};
