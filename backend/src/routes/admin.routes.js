import { Router } from 'express';
import DataPersistenceService from '../services/dataPersistenceService.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Get ride request statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await DataPersistenceService.getRideRequestStats();
    
    res.status(200).json({
        success: true,
        data: stats
    });
}));

// Get driver bid history
router.get('/driver/:driverId/bids', asyncHandler(async (req, res) => {
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
router.get('/user/:userId/rides', asyncHandler(async (req, res) => {
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
router.get('/pending-bids', asyncHandler(async (req, res) => {
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

export default router;
