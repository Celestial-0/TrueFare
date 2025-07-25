import RideRequest from '../models/rideRequest.model.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import { APP_CONSTANTS } from '../constants.js';

/**
 * Service for handling data persistence and recovery operations
 */
class DataPersistenceService {
    
    /**
     * Recover active ride requests after server restart
     * @returns {Promise<Array>} Array of active ride requests
     */
    static async recoverActiveRideRequests() {
        try {
            const activeRequests = await RideRequest.find({
                status: { 
                    $in: [
                        APP_CONSTANTS.RIDE_STATUS.PENDING, 
                        APP_CONSTANTS.RIDE_STATUS.BIDDING, 
                        APP_CONSTANTS.RIDE_STATUS.ACCEPTED
                    ] 
                }
            }).sort({ createdAt: -1 });

            console.log(`Recovered ${activeRequests.length} active ride requests`);
            return activeRequests;
        } catch (error) {
            console.error('Error recovering active ride requests:', error);
            throw error;
        }
    }

    /**
     * Get all pending bids for active ride requests
     * @returns {Promise<Array>} Array of ride requests with their bids
     */
    static async getPendingBids() {
        try {
            const requestsWithBids = await RideRequest.find({
                status: APP_CONSTANTS.RIDE_STATUS.BIDDING,
                'bids.0': { $exists: true }
            }).select('_id userId bids status createdAt');

            return requestsWithBids;
        } catch (error) {
            console.error('Error getting pending bids:', error);
            throw error;
        }
    }

    /**
     * Clean up old ride requests (older than 24 hours)
     * @returns {Promise<Object>} Cleanup result
     */
    static async cleanupOldRequests() {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const result = await RideRequest.deleteMany({
                createdAt: { $lt: twentyFourHoursAgo },
                status: { 
                    $in: [
                        APP_CONSTANTS.RIDE_STATUS.CANCELLED, 
                        APP_CONSTANTS.RIDE_STATUS.COMPLETED
                    ] 
                }
            });

            return result;
        } catch (error) {
            console.error('Error cleaning up old requests:', error);
            throw error;
        }
    }

    /**
     * Get ride request statistics
     * @returns {Promise<Object>} Statistics object
     */
    static async getRideRequestStats() {
        try {
            const stats = await RideRequest.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgBids: { 
                            $avg: { 
                                $cond: [
                                    { $isArray: '$bids' },
                                    { $size: '$bids' },
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            const totalRequests = await RideRequest.countDocuments();
            const activeRequests = await RideRequest.countDocuments({
                status: { 
                    $in: [
                        APP_CONSTANTS.RIDE_STATUS.PENDING, 
                        APP_CONSTANTS.RIDE_STATUS.BIDDING, 
                        APP_CONSTANTS.RIDE_STATUS.ACCEPTED
                    ] 
                }
            });

            return {
                totalRequests,
                activeRequests,
                statusBreakdown: stats
            };
        } catch (error) {
            console.error('Error getting ride request stats:', error);
            throw error;
        }
    }

    /**
     * Ensure data consistency after server restart
     * @returns {Promise<void>}
     */
    static async ensureDataConsistency() {
        try {
            // Reset bidding status for requests older than 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            
            const expiredBiddingRequests = await RideRequest.updateMany(
                {
                    status: APP_CONSTANTS.RIDE_STATUS.BIDDING,
                    createdAt: { $lt: tenMinutesAgo }
                },
                { status: APP_CONSTANTS.RIDE_STATUS.CANCELLED }
            );

            if (expiredBiddingRequests.modifiedCount > 0) {
                console.log(`Cancelled ${expiredBiddingRequests.modifiedCount} expired bidding requests`);
            }

            // Reset driver and user online status
            await Driver.updateMany({}, { isOnline: false });
            await User.updateMany({}, { isOnline: false });

            console.log('Data consistency check completed');
        } catch (error) {
            console.error('Error ensuring data consistency:', error);
            throw error;
        }
    }

    /**
     * Get driver bid history
     * @param {string} driverId - Driver ID
     * @returns {Promise<Array>} Array of bid history
     */
    static async getDriverBidHistory(driverId) {
        try {
            if (!driverId) {
                throw new Error('Driver ID is required');
            }

            const bidHistory = await RideRequest.find(
                { 'bids.driverId': driverId },
                {
                    _id: 1,
                    userId: 1,
                    status: 1,
                    createdAt: 1,
                    pickupLocation: 1,
                    destination: 1,
                    bids: 1,
                    acceptedBid: 1
                }
            ).sort({ createdAt: -1 });

            // Filter to only include the driver's bids and relevant information
            const filteredHistory = bidHistory.map(request => {
                const driverBids = request.bids.filter(bid => bid.driverId === driverId);
                return {
                    ...request.toObject(),
                    driverBids: driverBids
                };
            });

            return filteredHistory;
        } catch (error) {
            console.error('Error getting driver bid history:', error);
            throw error;
        }
    }

    /**
     * Get user ride history
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of ride history
     */
    static async getUserRideHistory(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const rideHistory = await RideRequest.find({ userId })
                .sort({ createdAt: -1 })
                .select('_id pickupLocation destination status bids acceptedBid createdAt updatedAt');

            return rideHistory;
        } catch (error) {
            console.error('Error getting user ride history:', error);
            throw error;
        }
    }

    /**
     * Backup ride request data
     * @param {Date} fromDate - Start date for backup
     * @param {Date} toDate - End date for backup
     * @returns {Promise<Array>} Backup data
     */
    static async backupRideRequestData(fromDate, toDate) {
        try {
            if (!fromDate || !toDate) {
                throw new Error('Both fromDate and toDate are required');
            }

            if (fromDate > toDate) {
                throw new Error('fromDate cannot be greater than toDate');
            }

            const backupData = await RideRequest.find({
                createdAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            }).lean();

            return backupData;
        } catch (error) {
            console.error('Error backing up ride request data:', error);
            throw error;
        }
    }
}

export default DataPersistenceService;
