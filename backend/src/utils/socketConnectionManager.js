import logger from './logger.js';

/**
 * Socket Connection Manager
 * Helps manage socket connections and prevent race conditions
 */
class SocketConnectionManager {
    /**
     * Creates a new SocketConnectionManager instance
     */
    constructor() {
        this.activeConnections = new Map(); // socketId -> connection info
        this.userConnections = new Map(); // userId -> socketId
        this.driverConnections = new Map(); // driverId -> socketId
        this.connectionLocks = new Map(); // userId/driverId -> lock info
    }

    /**
     * Check if a user is already connected
     * @param {string} userId - User ID
     * @returns {boolean} True if user is connected, false otherwise
     */
    isUserConnected(userId) {
        return this.userConnections.has(userId);
    }

    /**
     * Check if a driver is already connected
     * @param {string} driverId - Driver ID
     * @returns {boolean} True if driver is connected, false otherwise
     */
    isDriverConnected(driverId) {
        return this.driverConnections.has(driverId);
    }

    /**
     * Get existing socket for user
     * @param {string} userId - User ID
     * @returns {string|undefined} Socket ID if found, undefined otherwise
     */
    getUserSocketId(userId) {
        return this.userConnections.get(userId);
    }

    /**
     * Get existing socket for driver
     * @param {string} driverId - Driver ID
     * @returns {string|undefined} Socket ID if found, undefined otherwise
     */
    getDriverSocketId(driverId) {
        return this.driverConnections.get(driverId);
    }

    /**
     * Register a new user connection
     * @param {string} socketId - Socket ID
     * @param {string} userId - User ID
     * @param {object} userInfo - Additional user info
     */
    registerUserConnection(socketId, userId, userInfo) {
        // Check if user is already connected on another socket
        const existingSocketId = this.userConnections.get(userId);
        if (existingSocketId && existingSocketId !== socketId) {
            logger.info(`User ${userId} switching from socket ${existingSocketId} to ${socketId}`);
            this.unregisterConnection(existingSocketId);
        }

        this.activeConnections.set(socketId, {
            type: 'user',
            userId,
            ...userInfo,
            connectedAt: new Date()
        });
        this.userConnections.set(userId, socketId);

        logger.info(`User ${userId} registered on socket ${socketId}`);
    }

    /**
     * Register a new driver connection
     * @param {string} socketId - Socket ID
     * @param {string} driverId - Driver ID
     * @param {object} driverInfo - Additional driver info
     */
    registerDriverConnection(socketId, driverId, driverInfo) {
        // Check if driver is already connected on another socket
        const existingSocketId = this.driverConnections.get(driverId);
        if (existingSocketId && existingSocketId !== socketId) {
            logger.info(`Driver ${driverId} switching from socket ${existingSocketId} to ${socketId}`);
            this.unregisterConnection(existingSocketId);
        }

        this.activeConnections.set(socketId, {
            type: 'driver',
            driverId,
            ...driverInfo,
            connectedAt: new Date()
        });
        this.driverConnections.set(driverId, socketId);

        logger.info(`Driver ${driverId} registered on socket ${socketId}`);
    }

    /**
     * Unregister a connection
     * @param {string} socketId - Socket ID
     */
    unregisterConnection(socketId) {
        const connection = this.activeConnections.get(socketId);
        if (connection) {
            if (connection.type === 'user') {
                this.userConnections.delete(connection.userId);
                logger.info(`User ${connection.userId} unregistered from socket ${socketId}`);
            } else if (connection.type === 'driver') {
                this.driverConnections.delete(connection.driverId);
                logger.info(`Driver ${connection.driverId} unregistered from socket ${socketId}`);
            }
            this.activeConnections.delete(socketId);
        }
    }

    /**
     * Get connection info
     * @param {string} socketId - Socket ID
     * @returns {object|undefined} Connection info if found, undefined otherwise
     */
    getConnection(socketId) {
        return this.activeConnections.get(socketId);
    }

    /**
     * Get all active connections
     * @returns {Array} Array of connection objects
     */
    getAllConnections() {
        return Array.from(this.activeConnections.values());
    }

    /**
     * Get statistics
     * @returns {object} Object containing connection statistics
     */
    getStats() {
        const userCount = this.userConnections.size;
        const driverCount = this.driverConnections.size;
        
        return {
            totalConnections: this.activeConnections.size,
            userConnections: userCount,
            driverConnections: driverCount,
            activeUsers: Array.from(this.userConnections.keys()),
            activeDrivers: Array.from(this.driverConnections.keys())
        };
    }

    /**
     * Cleanup stale connections
     * @param {number} maxAge - Maximum age of connection in milliseconds (default: 30 minutes)
     * @returns {number} Number of connections cleaned up
     */
    cleanupStaleConnections(maxAge = 30 * 60 * 1000) { // 30 minutes
        const now = Date.now();
        const staleConnections = [];

        for (const [socketId, connection] of this.activeConnections) {
            if (now - connection.connectedAt.getTime() > maxAge) {
                staleConnections.push(socketId);
            }
        }

        staleConnections.forEach(socketId => {
            logger.info(`Cleaning up stale connection: ${socketId}`);
            this.unregisterConnection(socketId);
        });

        return staleConnections.length;
    }

    /**
     * Clear all connections (for shutdown)
     */
    clear() {
        this.activeConnections.clear();
        this.userConnections.clear();
        this.driverConnections.clear();
        this.connectionLocks.clear();
        logger.info('Socket connection manager cleared');
    }
}

// Create singleton instance
const socketConnectionManager = new SocketConnectionManager();

export default socketConnectionManager;
