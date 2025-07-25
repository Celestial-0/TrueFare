import RideRequest from '../models/rideRequest.model.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import DataPersistenceService from '../services/dataPersistenceService.js';
import {
    generateDriverId,
    generateUserId,
    validateIdFormat,
} from '../utils/idGenerator.js';
import { userSocketRegistrationSchema } from '../validations/user.validation.js';
import {
    driverSocketRegistrationSchema,
    driverLocationUpdateSchema,
} from '../validations/driver.validation.js';
import { addBidSchema } from '../validations/rideRequest.validation.js';
import { formatValidationError } from '../validations/common.validation.js';

// Store the io instance to be set from app.js
let ioInstance = null;

// Store connected drivers in memory (in production, use Redis)
const connectedDrivers = new Map();

// Store connected users
const connectedUsers = new Map();

// Function to set the io instance
export const setSocketInstance = (io) => {
    ioInstance = io;
};

// Function to get the io instance
const getSocketInstance = () => {
    if (!ioInstance) {
        throw new Error('Socket.IO instance not initialized');
    }
    return ioInstance;
};

export const handleUserConnection = (socket) => {
    console.log('User connected:', socket.id);

    // Send heartbeat every 30 seconds to maintain connection
    const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
            socket.emit('heartbeat', { timestamp: new Date() });
        } else {
            clearInterval(heartbeatInterval);
        }
    }, 30000);

    // Handle heartbeat response
    socket.on('heartbeat_response', () => {
        // User is alive, update last seen
        const user = connectedUsers.get(socket.id);
        if (user) {
            user.lastSeen = new Date();
            connectedUsers.set(socket.id, user);
        }
    });

    // Handle user registration
    socket.on('user:register', async (userData) => {
        // Check if user is already registered on this socket
        const existingUser = connectedUsers.get(socket.id);
        if (existingUser) {
            console.log(`🔄 User ${existingUser.userId} already registered on socket ${socket.id}, skipping duplicate registration`);
            socket.emit('user:registered', {
                success: true,
                message: 'User already registered',
                userId: existingUser.userId,
                user: {
                    userId: existingUser.userId,
                    name: existingUser.name || userData.name,
                    isOnline: true,
                },
            });
            return;
        }

        // Validate user data using Zod
        const validationResult =
            userSocketRegistrationSchema.safeParse(userData);

        if (!validationResult.success) {
            const formattedError = formatValidationError(
                validationResult.error
            );
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

        try {
            // Check if user already exists
            const existingUser = await User.findOne({ userId: finalUserId });
            
            let user;
            if (existingUser) {
                // User exists - only update safe fields to avoid unique constraint violations
                const updateData = {
                    isOnline: true,
                    lastSeen: new Date(),
                };

                // Only update name if provided and different (name doesn't have unique constraint)
                if (name && name !== existingUser.name) {
                    updateData.name = name;
                }

                // For existing users, don't update email or phone to avoid unique constraint errors
                // These should only be updated through proper profile update endpoints

                user = await User.findOneAndUpdate(
                    { userId: finalUserId },
                    updateData,
                    {
                        new: true,
                        runValidators: true,
                    }
                );
            } else {
                // User doesn't exist - create new user with all provided fields
                const createData = {
                    userId: finalUserId,
                    isOnline: true,
                    lastSeen: new Date(),
                };

                // Add required and optional fields for new user
                if (name) createData.name = name;
                if (email) createData.email = email;
                if (phone) createData.phone = phone;

                user = await User.create(createData);
            }

            // Store user info in memory
            connectedUsers.set(socket.id, {
                userId: finalUserId,
                socketId: socket.id,
                currentRequestId: requestId,
                lastSeen: new Date(),
            });

            // Join user-specific room
            socket.join(`user:${finalUserId}`);

            socket.emit('user:registered', {
                success: true,
                message: 'User registered successfully',
                userId: finalUserId,
                user: {
                    userId: user.userId,
                    name: user.name,
                    isOnline: user.isOnline,
                },
            });

            console.log(
                `User ${finalUserId} registered with socket ${socket.id}`
            );
        } catch (error) {
            console.error('Error registering user:', error);

            // Handle specific MongoDB errors
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyValue)[0];
                socket.emit('error', {
                    message: `User with this ${duplicateField} already exists`,
                    code: 'DUPLICATE_USER',
                    field: duplicateField,
                });
            } else if (error.name === 'ValidationError') {
                socket.emit('error', {
                    message: 'Validation error in user data',
                    code: 'VALIDATION_ERROR',
                    details: error.errors,
                });
            } else {
                socket.emit('error', {
                    message: 'Failed to register user',
                    code: 'REGISTRATION_FAILED',
                });
            }
        }
    });

    // Handle user requesting bid updates
    socket.on('user:requestBidUpdate', async (data) => {
        const { requestId } = data;
        const user = connectedUsers.get(socket.id);

        if (!user) {
            socket.emit('error', {
                message: 'User not registered',
                code: 'USER_NOT_REGISTERED',
            });
            return;
        }

        try {
            // Store current request ID for this user
            user.currentRequestId = requestId;
            connectedUsers.set(socket.id, user);

            // Fetch current bids
            const rideRequest = await RideRequest.findById(requestId);

            if (!rideRequest) {
                socket.emit('error', {
                    message: 'Ride request not found',
                    code: 'REQUEST_NOT_FOUND',
                });
                return;
            }

            // Fetch current bids using the model method
            const sortedBids = rideRequest.getSortedBids('fare', 'asc');

            console.log(`📡 Sending bid update to user ${user.userId} for request ${requestId}: ${sortedBids.length} bids`);

            // Send updated bids to user
            socket.emit('bids:updated', {
                requestId,
                bids: sortedBids,
                totalBids: sortedBids.length,
                lowestFare:
                    sortedBids.length > 0 ? sortedBids[0].fareAmount : null,
                status: rideRequest.status,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Error fetching bid update:', error);
            socket.emit('error', {
                message: 'Failed to fetch bid update',
                code: 'BID_UPDATE_FAILED',
            });
        }
    });

    // Handle user disconnection
    socket.on('disconnect', async () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            try {
                // Update user offline status in database
                await User.findOneAndUpdate(
                    { userId: user.userId },
                    {
                        isOnline: false,
                        lastSeen: new Date(),
                    }
                );

                console.log(`User ${user.userId} disconnected`);
                connectedUsers.delete(socket.id);
            } catch (error) {
                console.error('Error updating user offline status:', error);
            }
        }
    });
};

export const handleDriverConnection = (socket) => {
    console.log('Driver connected:', socket.id);

    // Handle driver registration
    socket.on('driver:register', async (driverData) => {
        // Check if driver is already registered on this socket
        const existingDriver = connectedDrivers.get(socket.id);
        if (existingDriver) {
            console.log(`🔄 Driver ${existingDriver.driverId} already registered on socket ${socket.id}, skipping duplicate registration`);
            socket.emit('driver:registered', {
                success: true,
                message: 'Driver already registered',
                driverId: existingDriver.driverId,
                driver: {
                    driverId: existingDriver.driverId,
                    name: driverData.name || existingDriver.name,
                    status: existingDriver.status,
                    isOnline: true,
                },
            });
            return;
        }

        // Validate driver data using Zod
        const validationResult =
            driverSocketRegistrationSchema.safeParse(driverData);

        if (!validationResult.success) {
            const formattedError = formatValidationError(
                validationResult.error
            );
            socket.emit('error', {
                message: formattedError.message,
                code: 'VALIDATION_ERROR',
                details: formattedError.errors,
            });
            return;
        }

        const { driverId, location, status, name, email, phone, vehicleInfo } =
            validationResult.data;

        // Generate driverId if not provided
        const finalDriverId = driverId || generateDriverId();

        try {
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

            // Prepare driver update data
            const updateData = {
                isOnline: true,
                status: status || 'available',
                currentLocation: {
                    coordinates: location,
                    address: location.address || '',
                },
                lastSeen: new Date(),
            };

            // Add optional fields only if provided
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (phone) updateData.phone = phone;
            if (cleanedVehicleInfo) updateData.vehicleInfo = cleanedVehicleInfo;

            // Update driver in database
            const driver = await Driver.findOneAndUpdate(
                { driverId: finalDriverId },
                updateData,
                {
                    upsert: true,
                    new: true,
                    runValidators: true,
                }
            );

            // Store driver info in memory
            connectedDrivers.set(socket.id, {
                driverId: finalDriverId,
                socketId: socket.id,
                location,
                status: status || 'available',
                lastSeen: new Date(),
            });

            // Join driver room for broadcasting
            socket.join('drivers');

            socket.emit('driver:registered', {
                success: true,
                message: 'Driver registered successfully',
                driverId: finalDriverId,
                driver: {
                    driverId: driver.driverId,
                    name: driver.name,
                    status: driver.status,
                    isOnline: driver.isOnline,
                },
            });

            // Send existing available ride requests to the newly registered driver
            try {
                const availableRequests = await RideRequest.find({ 
                    status: { $in: ['pending', 'bidding'] } 
                }).select('_id userId pickupLocation destination status estimatedDistance estimatedDuration bids createdAt updatedAt');
                
                if (availableRequests.length > 0) {
                    socket.emit('availableRequests', availableRequests);
                    console.log(`Sent ${availableRequests.length} available requests to driver ${finalDriverId}`);
                }
            } catch (error) {
                console.error('Error fetching available requests for new driver:', error);
            }

            console.log(
                `Driver ${finalDriverId} registered with socket ${socket.id}`
            );
        } catch (error) {
            console.error('Error registering driver:', error);

            // Handle specific MongoDB errors
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyValue)[0];
                socket.emit('error', {
                    message: `Driver with this ${duplicateField} already exists`,
                    code: 'DUPLICATE_DRIVER',
                    field: duplicateField,
                });
            } else if (error.name === 'ValidationError') {
                socket.emit('error', {
                    message: 'Validation error in driver data',
                    code: 'VALIDATION_ERROR',
                    details: error.errors,
                });
            } else {
                socket.emit('error', {
                    message: 'Failed to register driver',
                    code: 'REGISTRATION_FAILED',
                });
            }
        }
    });

    // Handle driver location updates
    socket.on('driver:updateLocation', async (locationData) => {
        const driver = connectedDrivers.get(socket.id);
        if (!driver) {
            socket.emit('error', {
                message: 'Driver not registered',
                code: 'DRIVER_NOT_REGISTERED',
            });
            return;
        }

        // Validate location data using Zod
        const validationResult =
            driverLocationUpdateSchema.safeParse(locationData);

        if (!validationResult.success) {
            const formattedError = formatValidationError(
                validationResult.error
            );
            socket.emit('error', {
                message: formattedError.message,
                code: 'VALIDATION_ERROR',
                details: formattedError.errors,
            });
            return;
        }

        const { latitude, longitude, address } = validationResult.data;

        try {
            // Update in database
            await Driver.findOneAndUpdate(
                { driverId: driver.driverId },
                {
                    currentLocation: {
                        coordinates: { latitude, longitude },
                        address: address || '',
                    },
                    lastSeen: new Date(),
                }
            );

            // Update in memory
            driver.location = { latitude, longitude, address };
            driver.lastSeen = new Date();
            connectedDrivers.set(socket.id, driver);
        } catch (error) {
            console.error('Error updating driver location:', error);
            socket.emit('error', {
                message: 'Failed to update location',
                code: 'UPDATE_FAILED',
            });
        }
    });

    // Handle driver status updates
    socket.on('driver:updateStatus', async (statusData) => {
        const driver = connectedDrivers.get(socket.id);
        if (driver) {
            try {
                // Update in database
                await Driver.findOneAndUpdate(
                    { driverId: driver.driverId },
                    {
                        status: statusData.status,
                        lastSeen: new Date(),
                    }
                );

                // Update in memory
                driver.status = statusData.status;
                driver.lastSeen = new Date();
                connectedDrivers.set(socket.id, driver);
            } catch (error) {
                console.error('Error updating driver status:', error);
            }
        }
    });

    // Handle driver bidding
    socket.on('driver:placeBid', async (bidData) => {
        const { requestId, fareAmount } = bidData;
        const driver = connectedDrivers.get(socket.id);

        if (!driver) {
            socket.emit('error', {
                message: 'Driver not registered',
                code: 'DRIVER_NOT_REGISTERED',
            });
            return;
        }

        try {
            // Import RideRequest model
            const { default: RideRequest } = await import(
                '../models/rideRequest.model.js'
            );

            // Find the ride request
            const rideRequest = await RideRequest.findById(requestId);

            if (!rideRequest) {
                socket.emit('error', {
                    message: 'Ride request not found',
                    code: 'REQUEST_NOT_FOUND',
                });
                return;
            }

            if (rideRequest.status !== 'bidding') {
                socket.emit('error', {
                    message: 'Ride request is not accepting bids',
                    code: 'BIDDING_CLOSED',
                });
                return;
            }

            // Check if driver already placed a bid
            const existingBid = rideRequest.bids.find(
                (bid) => bid.driverId === driver.driverId
            );
            if (existingBid) {
                socket.emit('error', {
                    message: 'Driver already placed a bid',
                    code: 'BID_ALREADY_EXISTS',
                });
                return;
            }

            // Add bid to ride request using the model method
            await rideRequest.addBid(driver.driverId, parseFloat(fareAmount));

            // Emit bid confirmation to driver
            socket.emit('bid:confirmed', {
                success: true,
                requestId,
                fareAmount,
                message: 'Bid placed successfully',
            });

            // Fetch updated ride request with bids
            const updatedRideRequest = await RideRequest.findById(requestId);
            const sortedBids = updatedRideRequest.getSortedBids('fare', 'asc');
            
            const io = getSocketInstance();
            
            // Notify the specific user who made the request about bid updates
            const userWithRequest = Array.from(connectedUsers.values()).find(
                (user) => user.currentRequestId === requestId
            );

            if (userWithRequest) {
                console.log(`📨 Sending bid update to user ${userWithRequest.userId} for new bid from driver ${driver.driverId}`);
                
                // Send to specific user
                io.to(userWithRequest.socketId).emit('bids:updated', {
                    requestId,
                    bids: sortedBids,
                    totalBids: sortedBids.length,
                    lowestFare:
                        sortedBids.length > 0 ? sortedBids[0].fareAmount : null,
                    status: updatedRideRequest.status,
                    newBid: {
                        driverId: driver.driverId,
                        fareAmount: parseFloat(fareAmount),
                        bidTime: new Date(),
                    },
                    timestamp: new Date(),
                });
            }

            // Broadcast new bid notification to ALL drivers in the network
            console.log(`📡 Broadcasting new bid from driver ${driver.driverId} to all drivers in network`);
            io.to('drivers').emit('newBid', {
                requestId,
                driverId: driver.driverId,
                driverName: driver.name,
                fareAmount: parseFloat(fareAmount),
                bidTime: new Date(),
                totalBids: sortedBids.length,
                lowestFare: sortedBids.length > 0 ? sortedBids[0].fareAmount : null,
                rideRequest: {
                    pickupLocation: updatedRideRequest.pickupLocation,
                    destination: updatedRideRequest.destination,
                    estimatedDistance: updatedRideRequest.estimatedDistance,
                    estimatedDuration: updatedRideRequest.estimatedDuration,
                },
            });

            console.log(
                `Driver ${driver.driverId} placed bid of ${fareAmount} for request ${requestId}`
            );
        } catch (error) {
            console.error('Error placing bid:', error);
            socket.emit('error', {
                message: 'Failed to place bid',
                code: 'BID_FAILED',
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        const driver = connectedDrivers.get(socket.id);
        if (driver) {
            try {
                // Update driver offline status in database
                await Driver.findOneAndUpdate(
                    { driverId: driver.driverId },
                    {
                        isOnline: false,
                        status: 'offline',
                        lastSeen: new Date(),
                    }
                );

                console.log(`Driver ${driver.driverId} disconnected`);
                connectedDrivers.delete(socket.id);
            } catch (error) {
                console.error('Error updating driver offline status:', error);
            }
        }
    });
};

// Broadcast new ride request to all available drivers
export const broadcastRideRequest = (rideRequestData) => {
    try {
        const io = getSocketInstance();
        
        const availableDrivers = Array.from(connectedDrivers.values()).filter(
            (driver) => driver.status === 'available'
        );

        console.log(
            `Broadcasting ride request ${rideRequestData.requestId} to ${availableDrivers.length} available drivers`
        );

        // In production, you would filter drivers by location proximity
        // For now, broadcast to all available drivers
        io.to('drivers').emit('newRideRequest', {
            ...rideRequestData,
            availableDrivers: availableDrivers.length,
        });
    } catch (error) {
        console.error('Error broadcasting ride request:', error.message);
        throw error;
    }
};

// Broadcast bid acceptance to all drivers
export const broadcastBidAccepted = (bidData) => {
    try {
        const io = getSocketInstance();
        const { requestId, acceptedBid, driverId } = bidData;

        // Notify the winning driver
        const winningDriver = Array.from(connectedDrivers.values()).find(
            (driver) => driver.driverId === driverId
        );

        if (winningDriver) {
            io.to(winningDriver.socketId).emit('bid:accepted', {
                requestId,
                fareAmount: acceptedBid.fareAmount,
                message: 'Congratulations! Your bid has been accepted.',
            });
        }

        // Notify all other drivers that bidding is closed
        io.to('drivers').emit('bidding:closed', {
            requestId,
            acceptedDriverId: driverId,
            message: 'Bidding has been closed for this ride request.',
        });

        console.log(`Bid accepted for request ${requestId} by driver ${driverId}`);
    } catch (error) {
        console.error('Error broadcasting bid accepted:', error.message);
        throw error;
    }
};

// Get connected drivers info (for debugging/monitoring)
export const getConnectedDrivers = () => {
    return Array.from(connectedDrivers.values());
};
