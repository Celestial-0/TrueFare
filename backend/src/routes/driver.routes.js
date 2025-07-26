import express from 'express';
import { getConnectedDrivers } from '../controllers/socket.controller.js';
import { 
    registerDriver, 
    getDriverProfile, 
    updateDriverProfile,
   
} from '../controllers/auth.controller.js';
import {
    getDriverEarnings,
    getDriverBids,
    getDriverRideHistory,
    updateDriverLocation,
    getDriverStats,
    getDriverVehicles,
    assignVehiclesToDriver,
    removeVehiclesFromDriver,
    getAvailableDrivers,
    getNearbyDrivers,
    bulkUpdateDriverStatus,
    getDriverAnalytics
} from '../controllers/driver.controller.js';
import { 
    driverRegistrationSchema, 
    driverUpdateSchema,
    driverLocationUpdateSchema,
    driverStatusUpdateSchema,
    driverQuerySchema,
    driverEarningsQuerySchema,
    driverBidHistoryQuerySchema,
    driverRideHistoryQuerySchema,
    nearbyDriversQuerySchema,
    bulkUpdateDriverStatusSchema,
    driverAnalyticsQuerySchema,
    driverVehicleAssignmentSchema
} from '../validations/driver.validation.js';
import { 
    validateRequest, 
    validateQuery,
    validateParams, 
    driverIdParamSchema,
    analyticsQuerySchema
} from '../validations/common.validation.js';

const router = express.Router();

// POST /api/drivers/register - Register a new driver
router.post('/register', validateRequest(driverRegistrationSchema), registerDriver);

// GET /api/drivers/profile/:driverId - Get driver profile
router.get('/profile/:driverId', validateParams(driverIdParamSchema), getDriverProfile);

// PUT /api/drivers/profile/:driverId - Update driver profile
router.put('/profile/:driverId', 
    validateParams(driverIdParamSchema), 
    validateRequest(driverUpdateSchema), 
    updateDriverProfile
);

// GET /api/drivers/:driverId/earnings - Get driver earnings
router.get('/:driverId/earnings', validateParams(driverIdParamSchema), validateQuery(driverEarningsQuerySchema), getDriverEarnings);

// GET /api/drivers/:driverId/bids - Get driver bid history
router.get('/:driverId/bids', validateParams(driverIdParamSchema), validateQuery(driverBidHistoryQuerySchema), getDriverBids);

// GET /api/drivers/:driverId/rides - Get driver ride history
router.get('/:driverId/rides', validateParams(driverIdParamSchema), validateQuery(driverRideHistoryQuerySchema), getDriverRideHistory);



// PUT /api/drivers/:driverId/location - Update driver location
router.put('/:driverId/location', validateParams(driverIdParamSchema), validateRequest(driverLocationUpdateSchema), updateDriverLocation);

// GET /api/drivers/:driverId/stats - Get driver statistics
router.get('/:driverId/stats', validateParams(driverIdParamSchema), validateQuery(analyticsQuerySchema), getDriverStats);

// GET /api/drivers/:driverId/vehicles - Get driver vehicles
router.get('/:driverId/vehicles', validateParams(driverIdParamSchema), getDriverVehicles);

// POST /api/drivers/:driverId/vehicles - Assign vehicles to driver
router.post('/:driverId/vehicles', 
    validateParams(driverIdParamSchema), 
    validateRequest(driverVehicleAssignmentSchema), 
    assignVehiclesToDriver
);

// DELETE /api/drivers/:driverId/vehicles - Remove vehicles from driver
router.delete('/:driverId/vehicles', 
    validateParams(driverIdParamSchema), 
    validateRequest(driverVehicleAssignmentSchema), 
    removeVehiclesFromDriver
);

// PATCH /api/drivers/:driverId/vehicle - Update driver vehicle info (deprecated - use vehicle endpoints)
router.patch('/:driverId/vehicle', 
    validateParams(driverIdParamSchema), 
    validateRequest(driverUpdateSchema), 
    updateDriverProfile // Reuse profile update for vehicle info
);

// GET /api/drivers/available - Get all available drivers
router.get('/available', validateQuery(driverQuerySchema), getAvailableDrivers);

// GET /api/drivers/nearby - Get nearby drivers with enhanced filtering
router.get('/nearby', validateQuery(nearbyDriversQuerySchema), getNearbyDrivers);

// Admin Routes
// PATCH /api/drivers/bulk-status - Bulk update driver statuses
router.patch('/bulk-status', validateRequest(bulkUpdateDriverStatusSchema), bulkUpdateDriverStatus);

// GET /api/drivers/:driverId/analytics - Get driver performance analytics
router.get('/:driverId/analytics', validateParams(driverIdParamSchema), validateQuery(driverAnalyticsQuerySchema), getDriverAnalytics);

// GET /api/drivers/connected - Get all connected drivers (for admin/debugging)
router.get('/connected', (req, res) => {
    const drivers = getConnectedDrivers();
    res.json({
        success: true,
        data: drivers,
        count: drivers.length
    });
});

export default router;
