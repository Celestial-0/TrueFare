import asyncHandler from '../utils/asyncHandler.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import RideRequest from '../models/rideRequest.model.js';
import Vehicle from '../models/vehicle.model.js';
import { z } from 'zod';
import { 
    formatValidationError,
    validateObjectId,
    validatePagination,
    validateSortQuery,
    driverIdParamSchema,
    userIdParamSchema,
    requestIdParamSchema
} from '../validations/common.validation.js';
import { generateDriverId, generateUserId, validateIdFormat } from '../utils/idGenerator.js';
import BaseController from './base.controller.js';
import socketService from '../services/socketService.js';
import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';
import DataPersistenceService from '../services/dataPersistenceService.js';
import BackgroundTaskScheduler from '../utils/backgroundTasks.js';

// Enhanced validation schemas for socket events
// Allow existing users to register with just userId; if userId is absent, require name and phone
const userSocketRegistrationSchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format').optional(),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim().optional(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).optional(),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim().optional()
}).refine((data) => {
    return !!data.userId || (!!data.name && !!data.phone);
}, {
    message: 'Either userId or both name and phone are required',
    path: ['userId']
});

const driverSocketRegistrationSchema = z.object({
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
    email: z.string().optional().refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Invalid email format'
    }).default(''),
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim(),
    vehicleInfo: z.object({
        make: z.string().optional(),
        model: z.string().optional(),
        vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
        comfortLevel: z.number().min(1).max(5).int().optional(),
        priceValue: z.number().min(1).max(5).int().optional()
    }).optional(),
    location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().optional()
    }).optional(),
    status: z.enum(['available', 'busy', 'offline']).default('offline')
});

const driverLocationUpdateSchema = z.object({
    latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
    longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
    address: z.string().max(255, 'Address must be less than 255 characters').optional(),
    accuracy: z.number().min(0).optional(),
    heading: z.number().min(0).max(360).optional(),
    speed: z.number().min(0).optional()
});

const bidPlacementSchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format'),
    fareAmount: z.number().min(0.01, 'Fare amount must be greater than 0'),
    estimatedArrival: z.number().min(1, 'Estimated arrival must be at least 1 minute'),
    message: z.string().max(500, 'Message must be less than 500 characters').optional(),
    vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format').optional()
});

const newRideRequestSchema = z.object({
    locations: z.object({
        pickup: z.object({
            address: z.string(),
            coordinates: z.array(z.number()).length(2)
        }),
        destination: z.object({
            address: z.string(),
            coordinates: z.array(z.number()).length(2)
        })
    }),
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']),
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format'),
    fare: z.number().optional(),
    paymentMethod: z.string().optional()
});

const rideRequestSchema = z.object({
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']),
    pickupLocation: z.object({
        address: z.string(),
        coordinates: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }),
    }),
    destination: z.object({
        address: z.string(),
        coordinates: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }),
    }),
    comfortPreference: z.number().min(1).max(5).int().optional(),
    farePreference: z.number().min(1).max(5).int().optional(),
});

/**
 * Enhanced Socket Controller with improved validation, error handling, and synchronization
 */
class SocketController extends BaseController {

    /**
     * Set the socket instance for the controller
     */
    static setSocketInstance(io) {
        socketService.setSocketInstance(io);
        SocketController.logAction('SocketController', 'setSocketInstance', { connected: true });
    }

    /**
     * Initialize all socket event handlers
     */
    static initializeSocketHandlers(io) {
        SocketController.logAction('SocketController', 'initializeSocketHandlers', { message: 'Setting up socket event handlers' });
        
        // Set the socket instance
        SocketController.setSocketInstance(io);

        // Handle new socket connections
        io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);
            
            // Initialize connection state
            socket.data = {
                registered: false,
                userType: null,
                userId: null,
                driverId: null
            };
            
            // Attach registration handlers immediately so the first payload is processed
            SocketController.handleUserConnection(socket);
            SocketController.handleDriverConnection(socket);
            
            // Handle general disconnection
            socket.on('disconnect', (reason) => {
                console.log('Client disconnected:', socket.id, 'Reason:', reason);
            });
        });

        SocketController.logAction('SocketController', 'initializeSocketHandlers', { message: 'Socket event handlers initialized successfully' });
    }

    /**
     * Get the socket instance
     */
    static getSocketInstance() {
        return socketService.getIO();
    }

    /**
     * Handle user connection with enhanced validation and error handling
     */
    static handleUserConnection(socket) {
        SocketController.logAction('SocketController', 'handleUserConnection', { socketId: socket.id });

        // Prevent duplicate event listeners
        if (socket.data.userHandlersAttached) {
            console.log(`User handlers already attached for socket ${socket.id}`);
            return;
        }
        socket.data.userHandlersAttached = true;

        // Send initial heartbeat
        const heartbeatInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('heartbeat', { 
                    timestamp: new Date(),
                    type: 'user'
                });
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        // Store heartbeat interval for cleanup
        socket.data.heartbeatInterval = heartbeatInterval;

        // Handle heartbeat response
        socket.on('heartbeat_response', () => {
            try {
                socketService.updateLastSeen(socket.id);
            } catch (error) {
                console.warn('Heartbeat update failed:', error.message);
            }
        });

        // Handle user registration
        socket.on('user:register', async (userData) => {
            try {
                console.log('Received user:register event with data:', userData);
                // Prevent multiple registrations on the same socket
                if (socket.data.registered && socket.data.userType === 'user') {
                    const existingUser = socketService.connectedUsers.get(socket.id);
                    if (existingUser) {
                        socket.emit('user:registered', {
                            success: true,
                            message: 'User already registered',
                            userId: existingUser.userId,
                            user: existingUser
                        });
                        return;
                    }
                }

                // Validate user data using Zod
                const validationResult = userSocketRegistrationSchema.safeParse(userData);

                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    socket.emit('error', {
                        message: formattedError.message,
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors,
                    });
                    return;
                }

                const { userId, requestId, name, email, phone } = validationResult.data;

                // Generate userId if not provided
                const finalUserId = userId || generateUserId();

                const result = await SocketController.withTransaction(async (session) => {
                    // Check if user already exists
                    const existingUser = await User.findOne({ userId: finalUserId }).session(session);
                    
                    let user;
                    if (existingUser) {
                        // Update existing user's online status
                        user = await User.findByIdAndUpdate(
                            existingUser._id,
                            { 
                                isOnline: true, 
                                lastSeen: new Date() 
                            },
                            { new: true, session }
                        );
                    } else {
                        // Create new user if doesn't exist
                        user = new User({
                            userId: finalUserId,
                            name: name.trim(),
                            email: email ? email.trim() : undefined,
                            phone: phone.trim(),
                            isOnline: true
                        });
                        user = await user.save({ session });
                    }

                    return SocketController.sanitizeForResponse(user, ['__v']);
                });

                // Register user with socket service
                const userInfo = socketService.registerUser(socket.id, {
                    userId: finalUserId,
                    name: result.name,
                    email: result.email,
                    phone: result.phone,
                    currentRequestId: requestId
                });

                // Update socket data
                socket.data.registered = true;
                socket.data.userType = 'user';
                socket.data.userId = finalUserId;

                // Join request-specific room if requestId provided
                if (requestId) {
                    socket.join(`request:${requestId}`);
                }

                socket.emit('user:registered', {
                    success: true,
                    message: 'User registered successfully',
                    userId: finalUserId,
                    user: {
                        userId: result.userId,
                        name: result.name,
                        email: result.email,
                        phone: result.phone,
                        isOnline: result.isOnline,
                        lastSeen: result.lastSeen
                    },
                });

                SocketController.logAction('SocketController', 'user:register', { 
                    userId: finalUserId, 
                    status: 'success' 
                });

            } catch (error) {
                console.error('Error during user registration:', error);
                
                const mongoError = SocketController.handleMongoError(error);
                socket.emit('error', {
                    message: mongoError.message,
                    code: mongoError.code,
                    details: mongoError.details
                });
            }
        });

        // Handle user requesting bid updates
        socket.on('user:requestBidUpdate', async (data) => {
            try {
                const { requestId } = data;
                const connectedUsers = socketService.getConnectedUsers();
                const user = connectedUsers.find(user => user.socketId === socket.id);

                if (!user) {
                    socket.emit('error', {
                        message: 'User not registered',
                        code: 'USER_NOT_REGISTERED'
                    });
                    return;
                }

                // Validate request ID
                if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
                    socket.emit('error', {
                        message: 'Invalid request ID',
                        code: 'INVALID_REQUEST_ID'
                    });
                    return;
                }

                // Get current bid status
                const rideRequest = await RideRequest.findById(requestId)
                    .populate({
                        path: 'bids.driverId',
                        select: 'driverId name rating totalRides',
                        model: 'Driver'
                    })
                    .lean();

                if (!rideRequest) {
                    socket.emit('error', {
                        message: 'Ride request not found',
                        code: 'REQUEST_NOT_FOUND'
                    });
                    return;
                }

                // Verify user owns this request
                if (rideRequest.userId !== user.userId) {
                    socket.emit('error', {
                        message: 'Unauthorized access to request',
                        code: 'UNAUTHORIZED_ACCESS'
                    });
                    return;
                }

                socket.emit('ride:bidUpdate', {
                    requestId: rideRequest._id,
                    status: rideRequest.status,
                    bids: rideRequest.bids || [],
                    bidsCount: (rideRequest.bids || []).length,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Error getting bid update:', error);
                socket.emit('error', {
                    message: 'Failed to get bid update',
                    code: 'BID_UPDATE_FAILED'
                });
            }
        });

        // Handle new ride request from user
        socket.on('ride:newRequest', async (rideData) => {
            try {
                const user = socketService.connectedUsers.get(socket.id);
                if (!user) {
                    return socket.emit('error', {
                        message: 'User not registered. Cannot create ride request.',
                        code: 'USER_NOT_REGISTERED'
                    });
                }

                const validationResult = rideRequestSchema.safeParse(rideData);
                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    return socket.emit('error', {
                        message: 'Invalid ride request data',
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors
                    });
                }

                const newRideRequest = new RideRequest({
                    ...validationResult.data,
                    userId: user.userId,
                    status: 'bidding',
                });

                const savedRequest = await newRideRequest.save();

                const responsePayload = {
                    requestId: savedRequest._id,
                    userId: savedRequest.userId,
                    status: savedRequest.status,
                    rideType: savedRequest.rideType,
                    pickupLocation: savedRequest.pickupLocation,
                    destination: savedRequest.destination,
                    createdAt: savedRequest.createdAt
                };

                // Confirm creation to the user
                socket.emit('ride:requestCreated', responsePayload);

                // Broadcast to available drivers
                socketService.broadcastRideRequest(responsePayload);

                SocketController.logAction('SocketController', 'ride:newRequest', { 
                    userId: user.userId,
                    requestId: savedRequest._id,
                    status: 'success' 
                });

            } catch (error) {
                console.error('Error creating ride request:', error);
                const mongoError = SocketController.handleMongoError(error);
                socket.emit('error', {
                    message: 'Failed to create ride request',
                    code: mongoError.code || 'RIDE_CREATION_FAILED',
                    details: mongoError.details
                });
            }
        });

        // Handle bid acceptance from user
        socket.on('ride:bidAccepted', async (bidData) => {
            try {
                console.log('Received ride:bidAccepted event:', bidData);
                
                const { requestId, bidId, userId, timestamp } = bidData;
                
                // Validate user is registered and authorized
                const user = socketService.connectedUsers.get(socket.id);
                if (!user) {
                    return socket.emit('error', {
                        message: 'User not registered. Cannot accept bid.',
                        code: 'USER_NOT_REGISTERED'
                    });
                }
                
                if (user.userId !== userId) {
                    return socket.emit('error', {
                        message: 'Unauthorized bid acceptance',
                        code: 'UNAUTHORIZED_ACCESS'
                    });
                }
                
                // Validate request and bid IDs
                if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
                    return socket.emit('error', {
                        message: 'Invalid request ID',
                        code: 'INVALID_REQUEST_ID'
                    });
                }
                
                if (!bidId || !mongoose.Types.ObjectId.isValid(bidId)) {
                    return socket.emit('error', {
                        message: 'Invalid bid ID',
                        code: 'INVALID_BID_ID'
                    });
                }
                
                // Update ride request and bid status in transaction
                const result = await SocketController.withTransaction(async (session) => {
                    // Find the ride request first (without populate since driverId is a string)
                    const rideRequest = await RideRequest.findById(requestId).session(session);
                    
                    if (!rideRequest) {
                        throw new Error('Ride request not found');
                    }
                    
                    // Verify user owns this request
                    if (rideRequest.userId !== userId) {
                        throw new Error('Unauthorized: User does not own this ride request');
                    }
                    
                    // Use the model method to accept the bid
                    const updatedRideRequest = await rideRequest.acceptBid(bidId);
                    
                    // Get the accepted bid details
                    const acceptedBid = updatedRideRequest.getAcceptedBid();
                    
                    // Fetch driver info separately since driverId is a string, not ObjectId
                    let driverInfo = null;
                    try {
                        const Driver = mongoose.model('Driver');
                        driverInfo = await Driver.findOne({ driverId: acceptedBid.driverId })
                            .select('driverId name phone rating totalRides vehicleInfo')
                            .session(session);
                    } catch (driverError) {
                        console.warn('Could not fetch driver info:', driverError.message);
                        // Continue without driver info rather than failing the whole operation
                        driverInfo = {
                            driverId: acceptedBid.driverId,
                            name: 'Driver',
                            phone: null,
                            rating: null,
                            vehicleInfo: null
                        };
                    }
                    
                    return {
                        rideRequest: updatedRideRequest,
                        acceptedBid: acceptedBid,
                        driverInfo: driverInfo
                    };
                });
                
                console.log('Bid acceptance processed successfully:', {
                    requestId,
                    bidId,
                    driverId: result.driverInfo?.driverId || result.acceptedBid.driverId
                });
                
                // Delegate broadcasting to the socket service
                socketService.broadcastRideAccepted({
                    requestId: result.rideRequest._id,
                    userId: user.userId,
                    driverId: result.driverInfo?.driverId || result.acceptedBid.driverId,
                    acceptedBid: result.acceptedBid,
                    driverInfo: result.driverInfo,
                    userInfo: user
                });
                
                // Remove the ride request from active broadcasts since it's now accepted
                socketService.removeActiveRideRequest(result.rideRequest._id.toString());

                console.log('Bid acceptance broadcasted successfully');

                SocketController.logAction('SocketController', 'ride:bidAccepted', {
                    userId: user.userId,
                    requestId,
                    bidId,
                    driverId: result.driverInfo?.driverId || result.acceptedBid.driverId,
                    status: 'success'
                });
                
            } catch (error) {
                console.error('Error accepting bid:', error);
                
                const mongoError = SocketController.handleMongoError(error);
                socket.emit('error', {
                    message: mongoError.message || 'Failed to accept bid',
                    code: mongoError.code || 'BID_ACCEPTANCE_FAILED',
                    details: mongoError.details
                });
                
                SocketController.logAction('SocketController', 'ride:bidAccepted', {
                    userId: bidData.userId,
                    requestId: bidData.requestId,
                    bidId: bidData.bidId,
                    status: 'error',
                    error: error.message
                });
            }
        });

        // Handle ride cancellation
        socket.on('ride:cancel', async (cancelData) => {
            try {
                console.log(`Received ride:cancel event on socket ${socket.id} with data:`, cancelData);
                
                // Validate cancellation data
                const cancelSchema = z.object({
                    rideId: z.string().min(1, 'Ride ID is required'),
                    reason: z.string().min(1, 'Cancellation reason is required'),
                    timestamp: z.number().optional()
                });

                const validationResult = cancelSchema.safeParse(cancelData);
                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    socket.emit('error', {
                        message: formattedError.message,
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors
                    });
                    return;
                }

                const { rideId, reason } = validationResult.data;

                const result = await SocketController.withTransaction(async (session) => {
                    // Find the ride request by ID (could be _id or requestId)
                    const rideRequest = await RideRequest.findOne({
                        $or: [
                            { _id: mongoose.Types.ObjectId.isValid(rideId) ? rideId : null },
                            { requestId: rideId }
                        ]
                    }).session(session);
                    
                    if (!rideRequest) {
                        throw new Error('Ride request not found');
                    }

                    // Check if ride can be cancelled (not already completed)
                    if (rideRequest.status === 'completed') {
                        throw new Error('Cannot cancel a completed ride');
                    }

                    // Update ride status to cancelled
                    const updatedRide = await RideRequest.findByIdAndUpdate(
                        rideRequest._id,
                        { 
                            status: 'cancelled',
                            cancelledAt: new Date(),
                            cancellationReason: reason
                        },
                        { new: true, session }
                    );

                    return {
                        rideRequest: updatedRide,
                        requestId: updatedRide._id.toString(),
                        userId: updatedRide.userId
                    };
                });

                // Broadcast cancellation to all drivers using the socket service
                try {
                    socketService.broadcastRideCancellation({
                        requestId: result.requestId,
                        userId: result.userId,
                        reason: reason,
                        cancelledAt: new Date()
                    });

                    console.log(`Ride cancellation broadcasted for request ${result.requestId}`);
                } catch (broadcastError) {
                    console.warn('Ride cancellation broadcast failed:', broadcastError.message);
                }

                // Send confirmation to the cancelling user/driver
                socket.emit('ride:cancelled', {
                    success: true,
                    message: 'Ride cancelled successfully',
                    requestId: result.requestId,
                    status: 'cancelled',
                    cancelledAt: new Date()
                });

                SocketController.logAction('SocketController', 'ride:cancel', { 
                    requestId: result.requestId,
                    reason: reason,
                    status: 'success' 
                });

            } catch (error) {
                console.error('Error cancelling ride:', error);
                
                if (error.message === 'Ride request not found') {
                    socket.emit('error', {
                        message: 'Ride request not found',
                        code: 'REQUEST_NOT_FOUND'
                    });
                } else if (error.message === 'Cannot cancel a completed ride') {
                    socket.emit('error', {
                        message: 'Cannot cancel a completed ride',
                        code: 'RIDE_ALREADY_COMPLETED'
                    });
                } else {
                    socket.emit('error', {
                        message: 'Failed to cancel ride',
                        code: 'RIDE_CANCELLATION_FAILED'
                    });
                }
            }
        });

        // Handle user disconnection
        socket.on('disconnect', async (reason) => {
            try {
                // Clean up heartbeat interval
                if (socket.data.heartbeatInterval) {
                    clearInterval(socket.data.heartbeatInterval);
                }

                if (socket.data.registered && socket.data.userType === 'user') {
                    const user = socketService.connectedUsers.get(socket.id);
                    
                    if (user) {
                        // Update user offline status in database
                        await User.findOneAndUpdate(
                            { userId: user.userId },
                            { 
                                isOnline: false, 
                                lastSeen: new Date() 
                            }
                        );

                        // Unregister from socket service
                        socketService.unregisterUser(socket.id);

                        SocketController.logAction('SocketController', 'user:disconnect', { 
                            userId: user.userId, 
                            reason 
                        });
                    }
                }
            } catch (error) {
                console.error('Error during user disconnection:', error);
            }
        });
    }

    /**
     * Handle driver connection with enhanced validation and error handling
     */
    static handleDriverConnection(socket) {
        SocketController.logAction('SocketController', 'handleDriverConnection', { socketId: socket.id });

        // Prevent duplicate event listeners
        if (socket.data.driverHandlersAttached) {
            console.log(`Driver handlers already attached for socket ${socket.id}`);
            return;
        }
        socket.data.driverHandlersAttached = true;

        // Log all events for debugging
        socket.onAny((eventName, ...args) => {
            console.log(`Received event ${eventName} on socket ${socket.id} with args:`, JSON.stringify(args));
        });

        // Handle driver registration
        socket.on('driver:register', async (driverData) => {
            try {
                console.log(`Received driver:register event for socket ${socket.id}`);
                // Prevent multiple registrations on the same socket
                if (socket.data.registered && socket.data.userType === 'driver') {
                    const existingDriver = socketService.connectedDrivers.get(socket.id);
                    if (existingDriver) {
                        socket.emit('driver:registered', {
                            success: true,
                            message: 'Driver already registered',
                            driverId: existingDriver.driverId,
                            driver: existingDriver
                        });
                        return;
                    }
                }

                // Validate driver data using Zod
                const validationResult = driverSocketRegistrationSchema.safeParse(driverData);

                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    socket.emit('error', {
                        message: formattedError.message,
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors,
                    });
                    return;
                }

                const { driverId, location, name, email, phone, vehicleInfo } = validationResult.data;

                // Generate driverId if not provided
                const finalDriverId = driverId || generateDriverId();

                const result = await SocketController.withTransaction(async (session) => {
                    // Check if driver already exists
                    const existingDriver = await Driver.findOne({ driverId: finalDriverId }).session(session);
                    
                    let driver;
                    if (existingDriver) {
                        // Update existing driver's status and location
                        const updateData = {
                            isOnline: true,
                            lastSeen: new Date(),
                            status: 'available' // Always set to available when registering
                        };

                        if (location) {
                            updateData.currentLocation = {
                                type: 'Point',
                                coordinates: [location.longitude, location.latitude],
                                address: location.address
                            };
                        }

                        driver = await Driver.findByIdAndUpdate(
                            existingDriver._id,
                            updateData,
                            { new: true, session }
                        ).populate('vehicles');
                    } else {
                        // Create new driver if doesn't exist
                        const driverDoc = new Driver({
                            driverId: finalDriverId,
                            name: name.trim(),
                            email: email ? email.trim() : undefined,
                            phone: phone.trim(),
                            vehicleInfo,
                            currentLocation: location ? {
                                type: 'Point',
                                coordinates: [location.longitude, location.latitude],
                                address: location.address
                            } : undefined,
                            status: 'available', // New drivers are available by default
                            isOnline: true
                        });
                        
                        driver = await driverDoc.save({ session });
                    }

                    // Emit driver status updated event to all clients
                    socketService.getIO().emit('driver:statusUpdated', {
                        driverId: finalDriverId,
                        status: 'available',
                        timestamp: new Date()
                    });

                    return SocketController.sanitizeForResponse(driver, ['__v']);
                });

                // Register driver with socket service
                const driverInfo = socketService.registerDriver(socket.id, {
                    driverId: finalDriverId,
                    name,
                    phone,
                    vehicleInfo,
                    status: 'available',
                    currentLocation: location
                });

                socket.data.registered = true;
                socket.data.userType = 'driver';
                socket.data.driverId = finalDriverId;

                socket.emit('driver:registered', {
                    success: true,
                    message: 'Driver registered successfully',
                    driverId: finalDriverId,
                    driver: result
                });

                SocketController.logAction('SocketController', 'driver:register', { 
                    driverId: finalDriverId, 
                    status: 'success' 
                });

            } catch (error) {
                console.error('Error during driver registration:', error);
                
                const mongoError = SocketController.handleMongoError(error);
                socket.emit('error', {
                    message: mongoError.message,
                    code: mongoError.code,
                    details: mongoError.details
                });
            }
        });

        // Handle driver status updates
        socket.on('driver:updateStatus', async (data) => {
            try {
                const { driverId, status, timestamp } = data;
                
                // Validate input
                if (!driverId || !status || !['available', 'busy', 'offline'].includes(status)) {
                    socket.emit('error', {
                        message: 'Invalid status update data',
                        code: 'INVALID_STATUS_UPDATE'
                    });
                    return;
                }
                
                // Determine isOnline based on status
                const isOnline = status !== 'offline';
                
                // Update driver status in the database
                const driver = await Driver.findOneAndUpdate(
                    { driverId },
                    { 
                        status, 
                        isOnline,
                        lastSeen: new Date() 
                    },
                    { new: true }
                );
                
                if (!driver) {
                    socket.emit('error', {
                        message: 'Driver not found',
                        code: 'DRIVER_NOT_FOUND'
                    });
                    return;
                }
                
                // Update driver status in the socket service
                socketService.updateDriverStatus(driverId, status);
                
                // Broadcast the status update to all clients
                socketService.getIO().emit('driver:statusUpdated', {
                    driverId,
                    status,
                    isOnline,
                    timestamp: new Date()
                });
                
                socket.emit('driver:statusUpdated', {
                    success: true,
                    message: 'Driver status updated successfully',
                    isOnline
                });
                
            } catch (error) {
                console.error('Error updating driver status:', error);
                socket.emit('error', {
                    message: 'Failed to update driver status',
                    code: 'STATUS_UPDATE_FAILED'
                });
            }
        });

        // Handle driver location updates
        socket.on('driver:updateLocation', async (locationData) => {
            try {
                const connectedDrivers = socketService.getConnectedDrivers();
                const driver = connectedDrivers.find(driver => driver.socketId === socket.id);
                
                if (!driver) {
                    socket.emit('error', {
                        message: 'Driver not registered',
                        code: 'DRIVER_NOT_REGISTERED'
                    });
                    return;
                }

                // Validate location data using Zod
                const validationResult = driverLocationUpdateSchema.safeParse(locationData);

                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    socket.emit('error', {
                        message: formattedError.message,
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors
                    });
                    return;
                }

                const { latitude, longitude, address, accuracy, heading, speed } = validationResult.data;

                // Update driver location in database
                const updatedDriver = await Driver.findOneAndUpdate(
                    { driverId: driver.driverId },
                    {
                        currentLocation: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                            address,
                            accuracy,
                            heading,
                            speed
                        },
                        lastSeen: new Date()
                    },
                    { new: true }
                );

                if (!updatedDriver) {
                    socket.emit('error', {
                        message: 'Driver not found in database',
                        code: 'DRIVER_NOT_FOUND'
                    });
                    return;
                }

                // Update driver info in socket service
                const updatedDriverInfo = {
                    ...driver,
                    location: {
                        latitude,
                        longitude,
                        address,
                        accuracy,
                        heading,
                        speed
                    },
                    lastSeen: new Date()
                };

                socketService.connectedDrivers.set(socket.id, updatedDriverInfo);

                socket.emit('driver:locationUpdated', {
                    success: true,
                    location: updatedDriverInfo.location,
                    timestamp: new Date()
                });

                // Broadcast location update to relevant users (those with pending requests)
                try {
                    socketService.broadcastToUsers('driver:locationUpdate', {
                        driverId: driver.driverId,
                        location: updatedDriverInfo.location
                    });
                } catch (broadcastError) {
                    console.warn('Location broadcast failed:', broadcastError.message);
                }

            } catch (error) {
                console.error('Error updating driver location:', error);
                socket.emit('error', {
                    message: 'Failed to update location',
                    code: 'LOCATION_UPDATE_FAILED'
                });
            }
        });

        // Handle driver bidding
        socket.on('ride:bidPlaced', async (bidData) => {
            try {
                const connectedDrivers = socketService.getConnectedDrivers();
                const driver = connectedDrivers.find(driver => driver.socketId === socket.id);

                if (!driver) {
                    socket.emit('error', {
                        message: 'Driver not registered',
                        code: 'DRIVER_NOT_REGISTERED'
                    });
                    return;
                }

                // Validate bid data
                const validationResult = bidPlacementSchema.safeParse(bidData);

                if (!validationResult.success) {
                    const formattedError = formatValidationError(validationResult.error);
                    socket.emit('error', {
                        message: formattedError.message,
                        code: 'VALIDATION_ERROR',
                        details: formattedError.errors
                    });
                    return;
                }

                const { requestId, fareAmount, estimatedArrival, message, vehicleId } = validationResult.data;

                const result = await SocketController.withTransaction(async (session) => {
                    // Find the ride request
                    const rideRequest = await RideRequest.findById(requestId).session(session);
                    
                    if (!rideRequest) {
                        throw new Error('Ride request not found');
                    }

                    // Check if request is in bidding state
                    if (rideRequest.status !== 'bidding') {
                        throw new Error('This request is no longer accepting bids');
                    }

                    // Verify driver is available
                    const driverDoc = await Driver.findOne({ driverId: driver.driverId }).session(session);
                    if (!driverDoc) {
                        throw new Error('Driver not found');
                    }
                    
                    // Check if driver is online
                    if (!driverDoc.isOnline) {
                        throw new Error('Driver must be online to place bids');
                    }
                    
                    // Check driver status - only 'available' drivers can bid
                    if (driverDoc.status === 'busy') {
                        throw new Error('Cannot place bid while on an active ride');
                    }
                    
                    if (driverDoc.status === 'offline') {
                        throw new Error('Driver is offline and cannot place bids');
                    }
                    
                    if (driverDoc.status !== 'available') {
                        throw new Error('Driver must be available to place bids');
                    }

                    // Check if driver already has a bid on this request
                    const existingBidIndex = rideRequest.bids.findIndex(bid => bid.driverId === driver.driverId);
                    
                    if (existingBidIndex !== -1) {
                        // Update existing bid
                        rideRequest.bids[existingBidIndex] = {
                            ...rideRequest.bids[existingBidIndex],
                            fareAmount,
                            estimatedArrival,
                            message: message || rideRequest.bids[existingBidIndex].message,
                            vehicleId: vehicleId || rideRequest.bids[existingBidIndex].vehicleId,
                            updatedAt: new Date()
                        };
                    } else {
                        // Add new bid
                        const newBid = {
                            driverId: driver.driverId,
                            fareAmount,
                            estimatedArrival,
                            message: message || '',
                            vehicleId,
                            status: 'pending',
                            bidTime: new Date()
                        };
                        
                        rideRequest.bids.push(newBid);
                    }

                    await rideRequest.save({ session });

                    return {
                        rideRequest: SocketController.sanitizeForResponse(rideRequest, ['__v']),
                        isUpdate: existingBidIndex !== -1,
                        bidIndex: existingBidIndex !== -1 ? existingBidIndex : rideRequest.bids.length - 1
                    };
                });

                const placedBid = result.rideRequest.bids[result.bidIndex];

                socket.emit('driver:bidPlaced', {
                    success: true,
                    requestId: result.rideRequest._id,
                    bid: {
                        bidId: placedBid._id,
                        fareAmount: placedBid.fareAmount,
                        estimatedArrival: placedBid.estimatedArrival,
                        message: placedBid.message,
                        status: placedBid.status,
                        bidTime: placedBid.bidTime || placedBid.updatedAt
                    },
                    isUpdate: result.isUpdate,
                    timestamp: new Date()
                });

                // Broadcast bid update to user and other stakeholders
                try {
                    // Fetch driver information to include in the bid update
                    const driverDoc = await Driver.findOne({ driverId: placedBid.driverId });
                    
                    socketService.sendToUser(result.rideRequest.userId, 'ride:bidUpdate', {
                        requestId: result.rideRequest._id,
                        bidId: placedBid._id,
                        driverId: placedBid.driverId,
                        fareAmount: placedBid.fareAmount,
                        estimatedArrival: placedBid.estimatedArrival,
                        message: placedBid.message,
                        status: placedBid.status || 'pending',
                        bidTime: placedBid.bidTime || placedBid.updatedAt,
                        driverName: driverDoc ? driverDoc.name : 'Unknown Driver',
                        driverRating: driverDoc ? driverDoc.rating : 0
                    });
                } catch (broadcastError) {
                    console.warn('Bid broadcast failed:', broadcastError.message);
                }

            } catch (error) {
                console.error('Error placing bid:', error);
                
                if (error.message === 'Ride request not found') {
                    socket.emit('error', {
                        message: 'Ride request not found',
                        code: 'REQUEST_NOT_FOUND'
                    });
                } else if (error.message === 'This request is no longer accepting bids') {
                    socket.emit('error', {
                        message: 'This request is no longer accepting bids',
                        code: 'REQUEST_NOT_BIDDABLE'
                    });
                } else if (error.message === 'Driver not found') {
                    socket.emit('error', {
                        message: 'Driver not found',
                        code: 'DRIVER_NOT_FOUND'
                    });
                } else if (error.message === 'Driver must be online to place bids') {
                    socket.emit('error', {
                        message: 'Driver must be online to place bids',
                        code: 'DRIVER_NOT_ONLINE'
                    });
                } else if (error.message === 'Cannot place bid while on an active ride') {
                    socket.emit('error', {
                        message: 'Cannot place bid while on an active ride',
                        code: 'DRIVER_BUSY'
                    });
                } else if (error.message === 'Driver is offline and cannot place bids') {
                    socket.emit('error', {
                        message: 'Driver is offline and cannot place bids',
                        code: 'DRIVER_OFFLINE'
                    });
                } else if (error.message === 'Driver must be available to place bids') {
                    socket.emit('error', {
                        message: 'Driver must be available to place bids',
                        code: 'DRIVER_NOT_AVAILABLE'
                    });
                } else {
                    socket.emit('error', {
                        message: 'Failed to place bid',
                        code: 'BID_PLACEMENT_FAILED'
                    });
                }
            }
        });

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
            try {
                // Clean up heartbeat interval
                if (socket.data.heartbeatInterval) {
                    clearInterval(socket.data.heartbeatInterval);
                }

                if (socket.data.registered && socket.data.userType === 'driver') {
                    const driver = socketService.connectedDrivers.get(socket.id);
                    
                    if (driver) {
                        // Update driver offline status in database
                        await Driver.findOneAndUpdate(
                            { driverId: driver.driverId },
                            { 
                                isOnline: false, 
                                status: 'offline',
                                lastSeen: new Date() 
                            }
                        );

                        // Unregister from socket service
                        socketService.unregisterDriver(socket.id);

                        SocketController.logAction('SocketController', 'driver:disconnect', { 
                            driverId: driver.driverId, 
                            reason 
                        });
                    }
                }
            } catch (error) {
                console.error('Error during driver disconnection:', error);
            }
        });
    }

    /**
     * Broadcast new ride request to all available drivers
     */
    static broadcastRideRequest(rideRequestData) {
        try {
            SocketController.logAction('SocketController', 'broadcastRideRequest', { 
                requestId: rideRequestData.requestId 
            });
            
            socketService.broadcastRideRequest(rideRequestData);
        } catch (error) {
            console.error('Error broadcasting ride request:', error);
            throw error;
        }
    }

    /**
     * Broadcast bid acceptance to all relevant parties
     */
    static broadcastBidAccepted(bidData) {
        try {
            SocketController.logAction('SocketController', 'broadcastBidAccepted', { 
                requestId: bidData.requestId,
                driverId: bidData.driverId 
            });
            
            socketService.broadcastRideAccepted(bidData);
        } catch (error) {
            console.error('Error broadcasting bid accepted:', error);
            throw error;
        }
    }

    /**
     * Get connected drivers info (for debugging/monitoring)
     */
    static getConnectedDrivers() {
        return socketService.getConnectedDrivers();
    }

    /**
     * Get connected users info (for debugging/monitoring)
     */
    static getConnectedUsers() {
        return socketService.getConnectedUsers();
    }

    /**
     * Get connection statistics
     */
    static getConnectionStats() {
        return socketService.getStats();
    }

    /**
     * Monitor and analyze socket connections for performance metrics
     */
    static getConnectionAnalytics = asyncHandler(async (req, res) => {
        SocketController.logAction('SocketController', 'getConnectionAnalytics');

        try {
            const cacheKey = 'socket_analytics';
            
            const analytics = await SocketController.getCachedData(cacheKey, async () => {
                const connectionStats = socketService.getStats();
                const connectedDrivers = socketService.getConnectedDrivers();
                const connectedUsers = socketService.getConnectedUsers();

                // Calculate performance metrics
                const metrics = {
                    totalConnections: connectionStats.totalConnections || 0,
                    activeDrivers: Object.keys(connectedDrivers).length,
                    activeUsers: Object.keys(connectedUsers).length,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    connectionsByType: {
                        drivers: Object.keys(connectedDrivers).length,
                        users: Object.keys(connectedUsers).length
                    },
                    performanceMetrics: {
                        avgResponseTime: connectionStats.avgResponseTime || 0,
                        messagesPerSecond: connectionStats.messagesPerSecond || 0,
                        errorRate: connectionStats.errorRate || 0
                    }
                };

                // Driver status distribution
                const driverStatuses = Object.values(connectedDrivers).reduce((acc, driver) => {
                    const status = driver.status || APP_CONSTANTS.DRIVER_STATUS.OFFLINE;
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});

                return {
                    ...metrics,
                    driverStatusDistribution: driverStatuses,
                    timestamp: new Date()
                };
            }, 30000); // Cache for 30 seconds

            return SocketController.sendSuccess(res, analytics, 'Socket connection analytics retrieved successfully');

        } catch (error) {
            const mongoError = SocketController.handleMongoError(error);
            return SocketController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Bulk message broadcasting for admin announcements
     */
    static broadcastAnnouncement = asyncHandler(async (req, res) => {
        SocketController.logAction('SocketController', 'broadcastAnnouncement', req.body);

        const announcementSchema = z.object({
            message: z.string().min(1).max(500),
            type: z.enum(['info', 'warning', 'urgent']).default('info'),
            targetAudience: z.enum(['drivers', 'users', 'all']).default('all'),
            priority: z.enum(['low', 'medium', 'high']).default('medium'),
            expiresAt: z.string().datetime().optional()
        });

        const validationResult = announcementSchema.safeParse(req.body);
        if (!validationResult.success) {
            return SocketController.sendValidationError(res, validationResult);
        }

        const { message, type, targetAudience, priority, expiresAt } = validationResult.data;

        try {
            const announcement = {
                id: new mongoose.Types.ObjectId(),
                message,
                type,
                priority,
                timestamp: new Date(),
                ...(expiresAt && { expiresAt: new Date(expiresAt) })
            };

            let deliveryCount = 0;

            // Broadcast to appropriate audience
            if (targetAudience === 'drivers' || targetAudience === 'all') {
                const drivers = socketService.getConnectedDrivers();
                Object.values(drivers).forEach(driver => {
                    socketService.emitToDriver(driver.driverId, 'announcement', announcement);
                    deliveryCount++;
                });
            }

            if (targetAudience === 'users' || targetAudience === 'all') {
                const users = socketService.getConnectedUsers();
                Object.values(users).forEach(user => {
                    socketService.emitToUser(user.userId, 'announcement', announcement);
                    deliveryCount++;
                });
            }

            return SocketController.sendSuccess(res, {
                announcementId: announcement.id,
                deliveryCount,
                targetAudience,
                sentAt: announcement.timestamp
            }, 'Announcement broadcast successfully');

        } catch (error) {
            const mongoError = SocketController.handleMongoError(error);
            return SocketController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Manage socket rooms for grouped communications
     */
    static manageSocketRooms = asyncHandler(async (req, res) => {
        SocketController.logAction('SocketController', 'manageSocketRooms', req.body);

        const roomManagementSchema = z.object({
            action: z.enum(['create', 'join', 'leave', 'broadcast', 'list']),
            roomName: z.string().min(1).max(50).optional(),
            socketId: z.string().optional(),
            message: z.object({
                type: z.string(),
                data: z.any()
            }).optional(),
            criteria: z.object({
                userType: z.enum(['driver', 'user']).optional(),
                location: z.object({
                    latitude: z.number(),
                    longitude: z.number(),
                    radius: z.number().min(0.1).max(50)
                }).optional(),
                vehicleType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional()
            }).optional()
        });

        const validationResult = roomManagementSchema.safeParse(req.body);
        if (!validationResult.success) {
            return SocketController.sendValidationError(res, validationResult);
        }

        const { action, roomName, socketId, message, criteria } = validationResult.data;

        try {
            let result = {};

            switch (action) {
                case 'create':
                    if (!roomName) {
                        throw new Error('Room name required for create action');
                    }
                    socketService.createRoom(roomName, criteria);
                    result = { roomName, created: true };
                    break;

                case 'join':
                    if (!roomName || !socketId) {
                        throw new Error('Room name and socket ID required for join action');
                    }
                    socketService.joinRoom(socketId, roomName);
                    result = { roomName, socketId, joined: true };
                    break;

                case 'leave':
                    if (!roomName || !socketId) {
                        throw new Error('Room name and socket ID required for leave action');
                    }
                    socketService.leaveRoom(socketId, roomName);
                    result = { roomName, socketId, left: true };
                    break;

                case 'broadcast':
                    if (!roomName || !message) {
                        throw new Error('Room name and message required for broadcast action');
                    }
                    const deliveryCount = socketService.broadcastToRoom(roomName, message.type, message.data);
                    result = { roomName, deliveryCount, broadcast: true };
                    break;

                case 'list':
                    result = { rooms: socketService.listRooms() };
                    break;

                default:
                    throw new Error('Invalid action specified');
            }

            return SocketController.sendSuccess(res, result, `Socket room ${action} completed successfully`);

        } catch (error) {
            const mongoError = SocketController.handleMongoError(error);
            return SocketController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });

    /**
     * Performance monitoring and optimization
     */
    static optimizeSocketPerformance = asyncHandler(async (req, res) => {
        SocketController.logAction('SocketController', 'optimizeSocketPerformance');

        try {
            const optimizationResults = await SocketController.withRetry(async () => {
                const stats = socketService.getStats();
                const connectedDrivers = socketService.getConnectedDrivers();
                const connectedUsers = socketService.getConnectedUsers();

                // Clean up inactive connections
                let cleanedConnections = 0;
                const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes

                Object.entries(connectedDrivers).forEach(([socketId, driver]) => {
                    if (driver.lastActivity && driver.lastActivity < cutoffTime) {
                        socketService.disconnectDriver(socketId);
                        cleanedConnections++;
                    }
                });

                Object.entries(connectedUsers).forEach(([socketId, user]) => {
                    if (user.lastActivity && user.lastActivity < cutoffTime) {
                        socketService.disconnectUser(socketId);
                        cleanedConnections++;
                    }
                });

                // Clear socket caches
                SocketController.clearCache(/^socket_/);

                // Trigger garbage collection if available
                if (global.gc) {
                    global.gc();
                }

                return {
                    cleanedConnections,
                    memoryBefore: stats.memoryUsage,
                    memoryAfter: process.memoryUsage(),
                    activeConnections: {
                        drivers: Object.keys(connectedDrivers).length - cleanedConnections,
                        users: Object.keys(connectedUsers).length - cleanedConnections
                    }
                };
            });

            // Schedule background optimization task
            BackgroundTaskScheduler.startTask('socket_optimization', () => {
                SocketController.optimizeSocketPerformance({ body: {} }, { json: () => {} });
            }, 30 * 60 * 1000); // Run every 30 minutes

            return SocketController.sendSuccess(res, optimizationResults, 'Socket performance optimization completed');

        } catch (error) {
            const mongoError = SocketController.handleMongoError(error);
            return SocketController.sendError(res, mongoError.message, mongoError.statusCode, mongoError.code, mongoError.details);
        }
    });
}

// Export individual functions for backward compatibility
export const {
    setSocketInstance,
    getSocketInstance,
    initializeSocketHandlers,
    handleUserConnection,
    handleDriverConnection,
    broadcastRideRequest,
    broadcastBidAccepted,
    getConnectedDrivers,
    getConnectedUsers,
    getConnectionStats,
    getConnectionAnalytics,
    broadcastAnnouncement,
    manageSocketRooms,
    optimizeSocketPerformance
} = SocketController;

export {
    userSocketRegistrationSchema,
    driverSocketRegistrationSchema,
    driverLocationUpdateSchema,
    newRideRequestSchema,
    rideRequestSchema
};

export default SocketController;
