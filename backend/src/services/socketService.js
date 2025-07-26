/**
 * Enhanced Socket Service
 * Provides centralized socket management with better synchronization,
 * error handling, and real-time updates
 * 
 * @typedef {Object} UserInfo
 * @property {string} userId
 * @property {string} socketId
 * @property {Date} connectedAt
 * @property {Date} lastSeen
 * @property {boolean} isActive
 * 
 * @typedef {Object} DriverInfo
 * @property {string} driverId
 * @property {string} socketId
 * @property {string} status
 * @property {object} location
 * @property {object} vehicleInfo
 * @property {Date} connectedAt
 * @property {Date} lastSeen
 * @property {boolean} isActive
 */

import { EventEmitter } from 'events';
import { validateObjectId } from '../validations/common.validation.js';
import socketConnectionManager from '../utils/socketConnectionManager.js';
import { SOCKET_CONFIG, validateSocketConfig } from '../config/socketConfig.js';
import logger from '../utils/logger.js'; // Added proper logger

// Validate configuration on startup
validateSocketConfig();

class SocketService extends EventEmitter {
    constructor() {
        super();
        this.io = null;
        this.connectedUsers = new Map();
        this.connectedDrivers = new Map();
        this.rooms = new Map();
        this.heartbeatInterval = SOCKET_CONFIG.HEARTBEAT_INTERVAL;
        this.heartbeatTimeouts = new Map();
        this.connectionLocks = new Map(); // Prevent duplicate registrations
        this.pendingRegistrations = new Set(); // Track pending registrations
        this.lastCleanup = Date.now();
        this.performanceMetrics = {
            totalConnections: 0,
            totalDisconnections: 0,
            totalHeartbeats: 0,
            totalErrors: 0
        };
        this.driverStatusMap = new Map(); // Map to store driver status
    }

    /**
     * Initialize socket service with io instance
     * Deprecated: Use SocketController.initializeSocketHandlers(io) to own connection listeners.
     */
    initialize(io) {
        this.io = io;
        this.setupEventListeners();
        this.startPeriodicCleanup();
        this.startPerformanceMonitoring();

        // DEPRECATED: Do not attach connection listeners here to avoid conflicts with the controller
        // Connection-level handlers are managed by SocketController.initializeSocketHandlers(io)
        // Left intentionally blank.

        logger.warn('SocketService.initialize(io) is deprecated. Use SocketController.initializeSocketHandlers(io).');
    }

    /**
     * Setup internal event listeners
     */
    setupEventListeners() {
        this.on('user:connected', this.handleUserConnected.bind(this));
        this.on('driver:connected', this.handleDriverConnected.bind(this));
        this.on('user:disconnected', this.handleUserDisconnected.bind(this));
        this.on('driver:disconnected', this.handleDriverDisconnected.bind(this));
    }

    /**
     * Get socket.io instance
     */
    getIO() {
        if (!this.io) {
            throw new Error('Socket service not initialized');
        }
        return this.io;
    }

    /**
     * Set socket.io instance without attaching connection listeners
     * This allows the controller to own connection-level handlers
     */
    setSocketInstance(io) {
        this.io = io;
        logger.info('Socket service IO instance set by controller');
    }

    /**
     * Register a user connection with duplicate prevention
     */
    registerUser(socketId, userData) {
        // Check if registration is already in progress
        const lockKey = `user:${userData.userId || socketId}`;
        if (this.connectionLocks.has(lockKey) || this.pendingRegistrations.has(lockKey)) {
            logger.warn(`User registration already in progress for ${lockKey}`);
            return this.connectedUsers.get(socketId) || null;
        }

        // Set lock
        this.connectionLocks.set(lockKey, socketId);
        this.pendingRegistrations.add(lockKey);

        try {
            // Check if user is already connected on another socket
            const existingUser = Array.from(this.connectedUsers.values())
                .find(user => user.userId === userData.userId);

            if (existingUser && existingUser.socketId !== socketId) {
                // Disconnect the old socket
                logger.info(`User ${userData.userId} already connected on socket ${existingUser.socketId}, disconnecting old connection`);
                this.unregisterUser(existingUser.socketId);
            }

            const userInfo = {
                ...userData,
                socketId,
                connectedAt: new Date(),
                lastSeen: new Date(),
                isActive: true
            };

            this.connectedUsers.set(socketId, userInfo);
            this.joinRoom(socketId, `user:${userData.userId}`);
            this.startHeartbeat(socketId, 'user');
            
            this.emit('user:connected', userInfo);
            logger.info(`User ${userData.userId} connected on socket ${socketId}`);
            
            return userInfo;
        } finally {
            // Release lock
            this.connectionLocks.delete(lockKey);
            this.pendingRegistrations.delete(lockKey);
        }
    }

    /**
     * Register a driver connection with duplicate prevention
     */
    registerDriver(socketId, driverData) {
        // Check if registration is already in progress
        const lockKey = `driver:${driverData.driverId || socketId}`;
        if (this.connectionLocks.has(lockKey) || this.pendingRegistrations.has(lockKey)) {
            logger.warn(`Driver registration already in progress for ${lockKey}`);
            return this.connectedDrivers.get(socketId) || null;
        }

        // Set lock
        this.connectionLocks.set(lockKey, socketId);
        this.pendingRegistrations.add(lockKey);

        try {
            // Check if driver is already connected on another socket
            const existingDriver = Array.from(this.connectedDrivers.values())
                .find(driver => driver.driverId === driverData.driverId);

            if (existingDriver && existingDriver.socketId !== socketId) {
                // Disconnect the old socket
                logger.info(`Driver ${driverData.driverId} already connected on socket ${existingDriver.socketId}, disconnecting old connection`);
                this.unregisterDriver(existingDriver.socketId);
            }

            const driverInfo = {
                ...driverData,
                socketId,
                connectedAt: new Date(),
                lastSeen: new Date(),
                isActive: true,
                status: 'available' // Set initial status
            };

            this.connectedDrivers.set(socketId, driverInfo);
            logger.info(`Registering driver ${driverData.driverId} and setting status to available`);
            this.updateDriverStatus(driverData.driverId, 'available'); // Update status map
            this.joinRoom(socketId, `driver:${driverData.driverId}`);
            this.joinRoom(socketId, 'drivers'); // Join general drivers room
            this.startHeartbeat(socketId, 'driver');
            
            this.emit('driver:connected', driverInfo);
            logger.info(`Driver ${driverData.driverId} connected on socket ${socketId}`);
            
            return driverInfo;
        } finally {
            // Release lock
            this.connectionLocks.delete(lockKey);
            this.pendingRegistrations.delete(lockKey);
        }
    }

    /**
     * Unregister user connection with cleanup
     */
    unregisterUser(socketId) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
            // Clean up locks for this user
            const lockKey = `user:${user.userId}`;
            this.connectionLocks.delete(lockKey);
            this.pendingRegistrations.delete(lockKey);

            // Remove from connected users
            this.connectedUsers.delete(socketId);
            
            // Stop heartbeat
            this.stopHeartbeat(socketId);
            
            // Leave all rooms for this socket
            this.leaveAllRooms(socketId);
            
            this.emit('user:disconnected', user);
            logger.info(`User ${user.userId} disconnected from socket ${socketId}`);
        }
    }

    /**
     * Unregister driver connection with cleanup
     */
    unregisterDriver(socketId) {
        const driver = this.connectedDrivers.get(socketId);
        if (driver) {
            // Clean up locks for this driver
            const lockKey = `driver:${driver.driverId}`;
            this.connectionLocks.delete(lockKey);
            this.pendingRegistrations.delete(lockKey);

            // Remove from connected drivers
            this.connectedDrivers.delete(socketId);
            
            // Stop heartbeat
            this.stopHeartbeat(socketId);
            
            // Leave all rooms for this socket
            this.leaveAllRooms(socketId);
            
            this.emit('driver:disconnected', driver);
            logger.info(`Driver ${driver.driverId} disconnected from socket ${socketId}`);
        }
    }

    /**
     * Leave all rooms for a socket
     */
    leaveAllRooms(socketId) {
        const socket = this.getSocketById(socketId);
        if (socket) {
            // Get all rooms this socket is in
            const rooms = Array.from(socket.rooms);
            rooms.forEach(roomName => {
                if (roomName !== socketId) { // Don't leave own socket room
                    this.leaveRoom(socketId, roomName);
                }
            });
        }
    }

    /**
     * Join a socket to a room
     */
    joinRoom(socketId, roomName) {
        const socket = this.getSocketById(socketId);
        if (socket) {
            socket.join(roomName);
            
            // Track room membership
            if (!this.rooms.has(roomName)) {
                this.rooms.set(roomName, new Set());
            }
            this.rooms.get(roomName).add(socketId);
        }
    }

    /**
     * Leave a room
     */
    leaveRoom(socketId, roomName) {
        const socket = this.getSocketById(socketId);
        if (socket) {
            socket.leave(roomName);
            
            // Update room tracking
            if (this.rooms.has(roomName)) {
                this.rooms.get(roomName).delete(socketId);
                if (this.rooms.get(roomName).size === 0) {
                    this.rooms.delete(roomName);
                }
            }
        }
    }

    /**
     * Get socket by ID
     */
    getSocketById(socketId) {
        return this.io.sockets.sockets.get(socketId);
    }

    /**
     * Start heartbeat for a connection with error handling
     */
    startHeartbeat(socketId, type) {
        // Clear any existing heartbeat for this socket
        this.stopHeartbeat(socketId);

        const interval = setInterval(() => {
            try {
                const socket = this.getSocketById(socketId);
                if (socket && socket.connected) {
                    socket.emit('heartbeat', { 
                        timestamp: new Date(),
                        type 
                    });
                } else {
                    logger.info(`Heartbeat stopped for disconnected socket ${socketId}`);
                    this.stopHeartbeat(socketId);
                }
            } catch (error) {
                logger.error(`Heartbeat error for socket ${socketId}:`, error);
                this.stopHeartbeat(socketId);
            }
        }, this.heartbeatInterval);

        this.heartbeatTimeouts.set(socketId, interval);
    }

    /**
     * Stop heartbeat for a connection
     */
    stopHeartbeat(socketId) {
        const interval = this.heartbeatTimeouts.get(socketId);
        if (interval) {
            clearInterval(interval);
            this.heartbeatTimeouts.delete(socketId);
        }
    }

    /**
     * Update last seen for a connection
     */
    updateLastSeen(socketId) {
        const user = this.connectedUsers.get(socketId);
        const driver = this.connectedDrivers.get(socketId);
        
        if (user) {
            user.lastSeen = new Date();
            this.connectedUsers.set(socketId, user);
        }
        
        if (driver) {
            driver.lastSeen = new Date();
            this.connectedDrivers.set(socketId, driver);
        }
    }

    /**
     * Broadcast to all users
     */
    broadcastToUsers(event, data) {
        this.io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Broadcast to all drivers
     */
    broadcastToDrivers(event, data) {
        this.io.to('drivers').emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send to specific user
     */
    sendToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send to specific driver
     */
    sendToDriver(driverId, event, data) {
        this.io.to(`driver:${driverId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Broadcast ride request to available drivers
     */
    broadcastRideRequest(rideRequestData) {
        if (!rideRequestData || !rideRequestData.requestId) {
            logger.error('Invalid rideRequestData in broadcastRideRequest');
            return;
        }
        
        try {
            logger.debug('=== BROADCAST RIDE REQUEST DEBUG START ===');
            logger.debug('Current driverStatusMap:', this.driverStatusMap);
            logger.debug(`Number of drivers in driverStatusMap: ${this.driverStatusMap.size}`);
            logger.debug(`Driver IDs in driverStatusMap: ${Array.from(this.driverStatusMap.keys())}`);
            logger.debug(`Number of drivers in 'drivers' room: ${this.io.sockets.adapter.rooms.get('drivers')?.size || 0}`);

            // Get available drivers - this will trigger our detailed debugging
            logger.debug('Calling getAvailableDrivers...');
            const availableDrivers = this.getAvailableDrivers();
            logger.debug(`getAvailableDrivers returned: ${availableDrivers.length} drivers`);
            logger.debug(`Available drivers: ${availableDrivers.map(driver => driver.driverId)}`);

            if (availableDrivers.length === 0) {
                logger.warn('No available drivers for ride request broadcast');
                logger.debug('=== BROADCAST RIDE REQUEST DEBUG END (NO DRIVERS) ===');
                return;
            }
            
            this.io.to('drivers').emit('ride:newRequest', {
                ...rideRequestData,
                broadcastAt: new Date().toISOString()
            });
            logger.info(`Broadcasted ride request ${rideRequestData.requestId} to ${availableDrivers.length} drivers`);

            // Also emit to specific location-based rooms if needed
            if (rideRequestData.pickupLocation?.coordinates) {
                logger.debug('Broadcasting to location-based rooms is not yet implemented');
            }
            
            logger.debug('=== BROADCAST RIDE REQUEST DEBUG END (SUCCESS) ===');

        } catch (error) {
            logger.error('Error broadcasting ride request:', error);
            throw error;
        }
    }

    /**
     * Broadcast bid updates
     */
    broadcastBidUpdate(requestId, bidData) {
        try {
            // Send to the user who made the request
            this.io.to(`request:${requestId}`).emit('ride:bidUpdate', {
                requestId,
                bid: bidData,
                timestamp: new Date().toISOString()
            });

            logger.info(`Bid update broadcasted for request ${requestId}`);
        } catch (error) {
            logger.error('Error broadcasting bid update:', error);
            throw error;
        }
    }

    /**
     * Broadcast ride acceptance
     */
    broadcastRideAccepted(rideData) {
        try {
            const { requestId, userId, driverId, acceptedBid, driverInfo } = rideData;

            // Notify the user with complete ride and driver information
            this.sendToUser(userId, 'ride:accepted', {
                requestId,
                driverId,
                bid: acceptedBid,
                // Include driver information for frontend consumption
                driverName: driverInfo?.name,
                driverPhone: driverInfo?.phone,
                driverRating: driverInfo?.rating,
                vehicleInfo: driverInfo?.vehicleInfo
            });

            // Notify the winning driver
            this.sendToDriver(driverId, 'ride:bidAccepted', {
                requestId,
                userId,
                bid: acceptedBid
            });

            // Notify all other drivers that bidding is closed
            this.broadcastToDrivers('ride:biddingClosed', {
                requestId,
                acceptedDriverId: driverId
            });

            logger.info(`Ride acceptance broadcasted for request ${requestId}`);
        } catch (error) {
            logger.error('Error broadcasting ride acceptance:', error);
            throw error;
        }
    }

    /**
     * Broadcast ride cancellation to all drivers
     */
    broadcastRideCancellation(rideData) {
        try {
            const { requestId, userId, reason, cancelledAt } = rideData;

            // Notify all drivers that the ride has been cancelled
            this.broadcastToDrivers('ride:cancelled', {
                requestId,
                rideId: requestId, // Include both for compatibility
                status: 'cancelled',
                reason: reason || 'Ride cancelled by user',
                cancelledAt: cancelledAt || new Date(),
                timestamp: Date.now()
            });

            // Also notify the user if needed
            if (userId) {
                this.sendToUser(userId, 'ride:cancelled', {
                    requestId,
                    status: 'cancelled',
                    reason: reason || 'Ride cancelled',
                    cancelledAt: cancelledAt || new Date()
                });
            }

            logger.info(`Ride cancellation broadcasted for request ${requestId}`);
        } catch (error) {
            logger.error('Error broadcasting ride cancellation:', error);
            throw error;
        }
    }

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            connectedDrivers: this.connectedDrivers.size,
            totalConnections: this.connectedUsers.size + this.connectedDrivers.size,
            rooms: this.rooms.size,
            activeHeartbeats: this.heartbeatTimeouts.size
        };
    }

    /**
     * Get connected users
     */
    getConnectedUsers() {
        return Array.from(this.connectedUsers.values());
    }

    /**
     * Get connected drivers
     */
    getConnectedDrivers() {
        return Array.from(this.connectedDrivers.values());
    }

    /**
     * Get available drivers
     */
    getAvailableDrivers() {
        logger.debug('=== getAvailableDrivers DEBUG START ===');
        
        // Log the current state of connectedDrivers and driverStatusMap
        const connectedDriversArray = Array.from(this.connectedDrivers.values());
        const driverStatusMapArray = Array.from(this.driverStatusMap.entries());
        
        logger.debug(`Total connected drivers: ${connectedDriversArray.length}`);
        logger.debug('Connected Drivers details:', connectedDriversArray.map(d => ({
            driverId: d.driverId,
            status: d.status,
            socketId: d.socketId,
            isActive: d.isActive
        })));
        
        logger.debug(`Total entries in driverStatusMap: ${driverStatusMapArray.length}`);
        logger.debug('Driver Status Map details:', driverStatusMapArray);

        // Filter available drivers
        const availableDrivers = connectedDriversArray
            .filter(driver => {
                const isAvailable = driver.status === 'available';
                logger.debug(`Driver ${driver.driverId}: status=${driver.status}, isAvailable=${isAvailable}`);
                return isAvailable;
            });

        logger.debug(`Filtered available drivers: ${availableDrivers.length}`);
        logger.debug('Available Drivers details:', availableDrivers.map(d => ({
            driverId: d.driverId,
            status: d.status,
            socketId: d.socketId
        })));
        
        logger.debug('=== getAvailableDrivers DEBUG END ===');

        return availableDrivers;
    }

    /**
     * Handle user connected event
     */
    handleUserConnected(userInfo) {
        // Can add additional logic here
        this.emit('stats:updated', this.getStats());
    }

    /**
     * Handle driver connected event
     */
    handleDriverConnected(driverInfo) {
        logger.debug(`handleDriverConnected called with:`, driverInfo);
        
        // Don't override the driver status here - it's already set in registerDriver
        // This event handler is called after registration is complete
        
        // Emit updated stats
        this.emit('stats:updated', this.getStats());
        
        logger.info(`Driver ${driverInfo.driverId} connection handled - preserving existing status`);
    }

    /**
     * Handle user disconnected event
     */
    handleUserDisconnected(userInfo) {
        // Can add cleanup logic here
        this.emit('stats:updated', this.getStats());
    }

    /**
     * Handle driver disconnected event
     */
    handleDriverDisconnected(driverInfo) {
        // Can add cleanup logic here
        this.emit('stats:updated', this.getStats());
    }

    /**
     * Cleanup on service shutdown
     */
    cleanup() {
        // Clear all heartbeats
        for (const interval of this.heartbeatTimeouts.values()) {
            clearInterval(interval);
        }
        
        this.heartbeatTimeouts.clear();
        this.connectedUsers.clear();
        this.connectedDrivers.clear();
        this.rooms.clear();
        this.connectionLocks.clear();
        this.pendingRegistrations.clear();
        
        logger.info('Socket service cleaned up');
    }

    /**
     * Check if user/driver is already connected
     */
    isUserConnected(userId) {
        return Array.from(this.connectedUsers.values())
            .some(user => user.userId === userId && user.isActive);
    }

    isDriverConnected(driverId) {
        return Array.from(this.connectedDrivers.values())
            .some(driver => driver.driverId === driverId && driver.isActive);
    }

    /**
     * Get user by userId (not socketId)
     */
    getUserByUserId(userId) {
        return Array.from(this.connectedUsers.values())
            .find(user => user.userId === userId);
    }

    /**
     * Get driver by driverId (not socketId)
     */
    getDriverByDriverId(driverId) {
        return Array.from(this.connectedDrivers.values())
            .find(driver => driver.driverId === driverId);
    }

    /**
     * Update driver status in the status map
     */
    updateDriverStatus(driverId, status) {
        if (!driverId || !status) {
            logger.error('Invalid parameters for updateDriverStatus:', { driverId, status });
            return;
        }

        logger.info(`Driver ${driverId} marked ${status} and added to driverStatusMap`);
        this.driverStatusMap.set(driverId, status);
        logger.info(`Updated driver status: ${driverId} -> ${status}`);
        
        // Also update the connected driver's status if they're connected
        const connectedDriver = this.getDriverByDriverId(driverId);
        if (connectedDriver) {
            connectedDriver.status = status;
            this.connectedDrivers.set(connectedDriver.socketId, connectedDriver);
            logger.info(`Driver ${driverId} connection handled - preserving existing status`);
        }
    }

    /**
     * Get available drivers for ride request broadcasting
     */
    getAvailableDrivers() {
        logger.debug('=== GET AVAILABLE DRIVERS DEBUG START ===');
        logger.debug(`Total connected drivers: ${this.connectedDrivers.size}`);
        logger.debug(`Total drivers in status map: ${this.driverStatusMap.size}`);
        
        const availableDrivers = [];
        
        // Check connected drivers and their status
        for (const [socketId, driver] of this.connectedDrivers) {
            logger.debug(`Checking driver ${driver.driverId}: connected=${driver.isActive}, status=${driver.status}`);
            
            // Check if driver is available in both connected drivers and status map
            const statusMapStatus = this.driverStatusMap.get(driver.driverId);
            logger.debug(`Driver ${driver.driverId} status in map: ${statusMapStatus}`);
            
            if (driver.isActive && 
                (driver.status === 'available' || statusMapStatus === 'available')) {
                availableDrivers.push(driver);
                logger.debug(`Driver ${driver.driverId} is AVAILABLE`);
            } else {
                logger.debug(`Driver ${driver.driverId} is NOT AVAILABLE - isActive: ${driver.isActive}, status: ${driver.status}, mapStatus: ${statusMapStatus}`);
            }
        }
        
        logger.debug(`Found ${availableDrivers.length} available drivers`);
        logger.debug('=== GET AVAILABLE DRIVERS DEBUG END ===');
        
        return availableDrivers;
    }

    /**
     * Start periodic cleanup
     */
    startPeriodicCleanup() {
        if (SOCKET_CONFIG.AUTO_CLEANUP_EMPTY_ROOMS) {
            setInterval(() => {
                this.performPeriodicCleanup();
            }, SOCKET_CONFIG.CONNECTION_CLEANUP_INTERVAL);
        }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        if (SOCKET_CONFIG.ENABLE_HEALTH_CHECKS) {
            setInterval(() => {
                this.performHealthCheck();
            }, SOCKET_CONFIG.HEALTH_CHECK_INTERVAL);
        }
    }

    /**
     * Perform periodic cleanup
     */
    performPeriodicCleanup() {
        const now = Date.now();
        const staleThreshold = SOCKET_CONFIG.STALE_CONNECTION_THRESHOLD;
        let cleaned = 0;

        // Clean stale user connections
        for (const [socketId, user] of this.connectedUsers) {
            if (now - user.lastSeen.getTime() > staleThreshold) {
                logger.info(`Cleaning stale user connection: ${user.userId} (${socketId})`);
                this.unregisterUser(socketId);
                cleaned++;
            }
        }

        // Clean stale driver connections
        for (const [socketId, driver] of this.connectedDrivers) {
            if (driver.lastSeen && now - driver.lastSeen.getTime() > staleThreshold) {
                logger.info(`Cleaning stale driver connection: ${driver.driverId} (${socketId})`);
                this.unregisterDriver(socketId);
                cleaned++;
            }
        }

        // Clean empty rooms
        for (const [roomName, sockets] of this.rooms) {
            if (sockets.size === 0) {
                this.rooms.delete(roomName);
            }
        }

        if (cleaned > 0) {
            logger.info(`Periodic cleanup completed: ${cleaned} stale connections removed`);
        }

        this.lastCleanup = now;
    }

    /**
     * Perform health check
     */
    performHealthCheck() {
        try {
            const stats = this.getStats();
            
            if (SOCKET_CONFIG.LOG_PERFORMANCE_METRICS) {
                logger.info('Socket Health Check:', {
                    ...stats,
                    ...this.performanceMetrics,
                    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + 'MB'
                });
            }

            // Auto-adjust configuration based on load
            const optimalConfig = this.getOptimalConfigForCurrentLoad(stats.totalConnections);
            if (optimalConfig.HEARTBEAT_INTERVAL !== this.heartbeatInterval) {
                logger.info(`Adjusting heartbeat interval from ${this.heartbeatInterval}ms to ${optimalConfig.HEARTBEAT_INTERVAL}ms`);
                this.heartbeatInterval = optimalConfig.HEARTBEAT_INTERVAL;
            }

            // Force garbage collection if needed
            if (SOCKET_CONFIG.FORCE_GC_INTERVAL && 
                Date.now() - this.lastCleanup > SOCKET_CONFIG.FORCE_GC_INTERVAL && 
                global.gc) {
                global.gc();
                logger.info('Forced garbage collection completed');
            }

        } catch (error) {
            logger.error('Health check failed:', error);
            this.performanceMetrics.totalErrors++;
        }
    }

    /**
     * Get optimal configuration for current load
     */
    getOptimalConfigForCurrentLoad(connectionCount) {
        if (connectionCount > 1000) {
            return { HEARTBEAT_INTERVAL: 60000 }; // 1 minute
        } else if (connectionCount > 100) {
            return { HEARTBEAT_INTERVAL: 45000 }; // 45 seconds
        }
        return { HEARTBEAT_INTERVAL: SOCKET_CONFIG.HEARTBEAT_INTERVAL };
    }

    /**
     * Update driver status
     */
    updateDriverStatus(driverId, status) {
        logger.debug(`Updating driver status for ${driverId} to ${status}`);
        
        // Use Map's efficient lookup instead of loop
        const driverEntry = Array.from(this.connectedDrivers.entries())
            .find(([_, driver]) => driver.driverId === driverId);
        
        if (driverEntry) {
            const [socketId, driver] = driverEntry;
            driver.status = status;
            this.connectedDrivers.set(socketId, driver);
            
            // Update driverStatusMap for available drivers
            if (status === 'available' || status === 'online') {
                this.driverStatusMap.set(driverId, {
                    location: driver.location,
                    vehicleInfo: driver.vehicleInfo,
                    status: status
                });
                logger.info(`Driver ${driverId} marked ${status} and added to driverStatusMap`);
            } else if (status === 'offline' || status === 'busy') {
                this.driverStatusMap.delete(driverId);
                logger.info(`Driver ${driverId} marked ${status} and removed from driverStatusMap`);
            }
            
            logger.debug(`Driver ${driverId} status updated in connectedDrivers:`, driver);
            logger.debug(`Current driverStatusMap after update:`, Array.from(this.driverStatusMap.entries()));
        } else {
            logger.warn(`Driver ${driverId} not found in connectedDrivers`);
        }
        
        logger.info(`Updated driver status: ${driverId} -> ${status}`);
    }

    /**
     * Set up socket connection with explicit user and driver handling
     */
    setupSocketConnection(socket) {
        logger.info(`New client connected: ${socket.id}`);

        // Set timeout to disconnect if not registered
        const registrationTimeout = setTimeout(() => {
            if (!this.connectedUsers.has(socket.id) && !this.connectedDrivers.has(socket.id)) {
                logger.warn(`Connection ${socket.id} not registered within 10s, disconnecting`);
                socket.disconnect(true);
            }
        }, 10000);

        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.id} Reason: ${reason}`);
            clearTimeout(registrationTimeout);
            // Clean up user or driver registration
            this.unregisterUser(socket.id);
            this.unregisterDriver(socket.id);
        });

        // Handle user registration
        socket.on('user:register', (data) => {
            logger.info(`[REGISTRATION] Received user:register on socket ${socket.id} with data:`, data);
            try {
                if (data && data.userId) {
                    clearTimeout(registrationTimeout); // Clear timeout on successful registration
                    const registered = this.registerUser(socket.id, {
                        userId: data.userId,
                        additionalInfo: data.additionalInfo || {}
                    });
                    if (registered) {
                        logger.info(`[REGISTRATION] User ${data.userId} successfully registered on socket ${socket.id}`);
                        socket.emit('registration:success', { type: 'user', userId: data.userId });
                    }
                } else {
                    logger.warn(`[REGISTRATION] Invalid data received for user:register on socket ${socket.id}:`, data);
                    socket.emit('registration:error', { message: 'Invalid registration data' });
                }
            } catch (error) {
                logger.error('[REGISTRATION] Error in user registration:', error);
                socket.emit('registration:error', { message: 'Registration failed' });
            }
        });

        // Handle driver registration
        socket.on('driver:register', (data) => {
            logger.info(`[REGISTRATION] Received driver:register on socket ${socket.id} with data:`, data);
            try {
                if (data && data.driverId) {
                    clearTimeout(registrationTimeout); // Clear timeout on successful registration
                    const registered = this.registerDriver(socket.id, {
                        driverId: data.driverId,
                        location: data.location || {},
                        vehicleInfo: data.vehicleInfo || {}
                    });
                    if (registered) {
                        logger.info(`[REGISTRATION] Driver ${data.driverId} successfully registered on socket ${socket.id}`);
                        logger.debug(`Driver ${data.driverId} added to 'drivers' room:`, this.rooms.get('drivers'));
                        socket.emit('registration:success', { type: 'driver', driverId: data.driverId });
                    }
                } else {
                    logger.warn(`[REGISTRATION] Invalid data received for driver:register on socket ${socket.id}:`, data);
                    socket.emit('registration:error', { message: 'Invalid registration data' });
                }
            } catch (error) {
                logger.error('[REGISTRATION] Error in driver registration:', error);
                socket.emit('registration:error', { message: 'Registration failed' });
            }
        });

        // Add heartbeat handler
        socket.on('heartbeat', () => {
            this.updateLastSeen(socket.id);
            this.performanceMetrics.totalHeartbeats++;
        });
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
