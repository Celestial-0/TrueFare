import express from 'express';
import {
    getConnectionAnalytics,
    broadcastAnnouncement,
    manageSocketRooms,
    optimizeSocketPerformance,
    getConnectedDrivers,
    getConnectedUsers,
    getConnectionStats
} from '../controllers/socket.controller.js';
import { 
    validateRequest, 
    validateQuery 
} from '../validations/common.validation.js';
import {
    socketAnalyticsQuerySchema,
    broadcastMessageSchema,
    socketRoomSchema,
    socketOptimizationSchema
} from '../validations/socket.validation.js';

const router = express.Router();

// Socket Analytics and Monitoring Routes
// GET /api/socket/analytics - Get socket connection analytics
router.get('/analytics', validateQuery(socketAnalyticsQuerySchema), getConnectionAnalytics);

// GET /api/socket/connected/drivers - Get connected drivers
router.get('/connected/drivers', (req, res) => {
    const drivers = getConnectedDrivers();
    res.json({
        success: true,
        data: drivers,
        count: Object.keys(drivers).length
    });
});

// GET /api/socket/connected/users - Get connected users
router.get('/connected/users', (req, res) => {
    const users = getConnectedUsers();
    res.json({
        success: true,
        data: users,
        count: Object.keys(users).length
    });
});

// GET /api/socket/stats - Get connection statistics
router.get('/stats', (req, res) => {
    const stats = getConnectionStats();
    res.json({
        success: true,
        data: stats
    });
});

// Admin Communication Routes
// POST /api/socket/broadcast - Broadcast announcement to all users
router.post('/broadcast', validateRequest(broadcastMessageSchema), broadcastAnnouncement);

// Socket Management Routes
// POST /api/socket/rooms - Manage socket rooms
router.post('/rooms', validateRequest(socketRoomSchema), manageSocketRooms);

// POST /api/socket/optimize - Optimize socket performance
router.post('/optimize', validateRequest(socketOptimizationSchema), optimizeSocketPerformance);

export default router;
