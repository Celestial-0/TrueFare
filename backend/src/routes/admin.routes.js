import { Router } from 'express';
import DataPersistenceService from '../services/dataPersistenceService.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
    getAuthStats,
    bulkUpdateStatus,
    performMaintenance
} from '../controllers/auth.controller.js';
import {
    getNearbyDrivers,
    bulkUpdateDriverStatus,
    getDriverAnalytics
} from '../controllers/driver.controller.js';
import {
    getRideRequestAnalytics,
    optimizeMatching
} from '../controllers/rideRequest.controller.js';
import {
    getUserAnalytics,
    bulkUpdatePreferences,
    getUserBehaviorInsights
} from '../controllers/user.controller.js';
import {
    getVehicleAnalytics,
    optimizeVehicleAllocation,
    getMaintenanceRecommendations
} from '../controllers/vehicle.controller.js';
import {
    getConnectionAnalytics,
    broadcastAnnouncement,
    optimizeSocketPerformance
} from '../controllers/socket.controller.js';
import {
    validateRequest,
    validateQuery,
    validateParams,
    userIdParamSchema,
    driverIdParamSchema
} from '../validations/common.validation.js';
import {
    adminStatsQuerySchema,
    adminHistoryQuerySchema,
    adminPendingBidsQuerySchema,
    adminPaginationSchema
} from '../validations/admin.validation.js';

const router = Router();

// Get ride request statistics
router.get('/stats', validateQuery(adminStatsQuerySchema), asyncHandler(async (req, res) => {
    const stats = await DataPersistenceService.getRideRequestStats();
    
    res.status(200).json({
        success: true,
        data: stats
    });
}));

// Get driver bid history
router.get('/driver/:driverId/bids', validateParams(driverIdParamSchema), validateQuery(adminPaginationSchema), asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const bidHistory = await DataPersistenceService.getDriverBidHistory(driverId);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = bidHistory.slice(startIndex, endIndex);
    
    res.status(200).json({
        success: true,
        data: paginatedHistory,
        pagination: {
            currentPage: parseInt(page),
            totalItems: bidHistory.length,
            totalPages: Math.ceil(bidHistory.length / limit)
        }
    });
}));

// Get user ride history
router.get('/user/:userId/rides', validateParams(userIdParamSchema), validateQuery(adminPaginationSchema), asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const rideHistory = await DataPersistenceService.getUserRideHistory(userId);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = rideHistory.slice(startIndex, endIndex);
    
    res.status(200).json({
        success: true,
        data: paginatedHistory,
        pagination: {
            currentPage: parseInt(page),
            totalItems: rideHistory.length,
            totalPages: Math.ceil(rideHistory.length / limit)
        }
    });
}));

// Get pending bids
router.get('/pending-bids', validateQuery(adminPendingBidsQuerySchema), asyncHandler(async (req, res) => {
    const pendingBids = await DataPersistenceService.getPendingBids();
    
    res.status(200).json({
        success: true,
        data: pendingBids
    });
}));

// Cleanup old requests (admin only)
router.delete('/cleanup', asyncHandler(async (req, res) => {
    const result = await DataPersistenceService.cleanupOldRequests();
    
    res.status(200).json({
        success: true,
        message: `Cleaned up ${result.deletedCount} old ride requests`,
        data: result
    });
}));

// Backup ride request data
router.get('/backup', asyncHandler(async (req, res) => {
    const { fromDate, toDate } = req.query;
    
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const to = toDate ? new Date(toDate) : new Date();
    
    const backupData = await DataPersistenceService.backupRideRequestData(from, to);
    
    res.status(200).json({
        success: true,
        data: backupData,
        meta: {
            fromDate: from,
            toDate: to,
            totalRecords: backupData.length
        }
    });
}));

// Health check for persistence system
router.get('/health', asyncHandler(async (req, res) => {
    const stats = await DataPersistenceService.getRideRequestStats();
    const activeRequests = await DataPersistenceService.recoverActiveRideRequests();
    
    res.status(200).json({
        success: true,
        message: 'Persistence system is healthy',
        data: {
            databaseConnected: true,
            totalRequests: stats.totalRequests,
            activeRequests: activeRequests.length,
            timestamp: new Date()
        }
    });
}));

// Analytics Dashboard Routes
// GET /api/admin/analytics/auth - Authentication analytics
router.get('/analytics/auth', getAuthStats);

// GET /api/admin/analytics/drivers - Driver analytics
router.get('/analytics/drivers', getDriverAnalytics);

// GET /api/admin/analytics/rides - Ride request analytics
router.get('/analytics/rides', getRideRequestAnalytics);

// GET /api/admin/analytics/users - User analytics
router.get('/analytics/users', getUserAnalytics);

// GET /api/admin/analytics/vehicles - Vehicle analytics
router.get('/analytics/vehicles', getVehicleAnalytics);

// GET /api/admin/analytics/connections - Socket connection analytics
router.get('/analytics/connections', getConnectionAnalytics);

// Bulk Operations Routes
// PATCH /api/admin/bulk/auth-status - Bulk update authentication status
router.patch('/bulk/auth-status', bulkUpdateStatus);

// PATCH /api/admin/bulk/driver-status - Bulk update driver status
router.patch('/bulk/driver-status', bulkUpdateDriverStatus);

// PATCH /api/admin/bulk/user-preferences - Bulk update user preferences
router.patch('/bulk/user-preferences', bulkUpdatePreferences);


// System Optimization Routes
// POST /api/admin/optimize/matching - Optimize ride matching
router.post('/optimize/matching', optimizeMatching);

// POST /api/admin/optimize/vehicles - Optimize vehicle allocation
router.post('/optimize/vehicles', optimizeVehicleAllocation);

// POST /api/admin/optimize/sockets - Optimize socket performance
router.post('/optimize/sockets', optimizeSocketPerformance);

// Maintenance and Management Routes
// POST /api/admin/maintenance/auth - Perform auth maintenance
router.post('/maintenance/auth', performMaintenance);

// GET /api/admin/maintenance/vehicles - Get vehicle maintenance recommendations
router.get('/maintenance/vehicles', getMaintenanceRecommendations);

// Communication Routes
// POST /api/admin/broadcast - Broadcast announcement to all users
router.post('/broadcast', broadcastAnnouncement);

// Insights and Behavior Analysis Routes
// GET /api/admin/insights/user-behavior - Get user behavior insights
router.get('/insights/user-behavior', getUserBehaviorInsights);

export default router;
