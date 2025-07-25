import express from 'express';
import { getConnectedDrivers } from '../controllers/socket.controller.js';
import { 
    registerDriver, 
    getDriverProfile, 
    updateDriverProfile,
    getDriverEarnings,
    getDriverBids,
    getDriverRideHistory,
    updateDriverStatus
} from '../controllers/registration.controller.js';
import { driverRegistrationSchema, driverUpdateSchema } from '../validations/driver.validation.js';
import { validateRequest, validateParams, driverIdParamSchema } from '../validations/common.validation.js';

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
router.get('/:driverId/earnings', validateParams(driverIdParamSchema), getDriverEarnings);

// GET /api/drivers/:driverId/bids - Get driver bid history
router.get('/:driverId/bids', validateParams(driverIdParamSchema), getDriverBids);

// GET /api/drivers/:driverId/rides - Get driver ride history
router.get('/:driverId/rides', validateParams(driverIdParamSchema), getDriverRideHistory);

// PATCH /api/drivers/:driverId/status - Update driver status
router.patch('/:driverId/status', validateParams(driverIdParamSchema), updateDriverStatus);

// PATCH /api/drivers/:driverId/vehicle - Update driver vehicle info
router.patch('/:driverId/vehicle', 
    validateParams(driverIdParamSchema), 
    validateRequest(driverUpdateSchema), 
    updateDriverProfile // Reuse profile update for vehicle info
);

// GET /api/drivers/connected - Get all connected drivers (for admin/debugging)
router.get('/connected', (req, res) => {
    const drivers = getConnectedDrivers();
    res.json({
        success: true,
        data: drivers,
        count: drivers.length
    });
});

// GET /api/drivers - Get all drivers (for admin/debugging)
router.get('/', (req, res) => {
    const drivers = getConnectedDrivers();
    res.json({
        success: true,
        data: drivers,
        count: drivers.length
    });
});

export default router;
