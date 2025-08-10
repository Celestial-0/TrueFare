import express from 'express';
import {
    createVehicle,
    getVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicles,
    searchVehiclesForRide,
    updateVehicleStatus,
    getVehiclesByType,
    getVehicleStatistics,
    bulkUpdateVehicleStatus,
    getVehicleAnalytics,
    optimizeVehicleAllocation,
    getMaintenanceRecommendations
} from '../controllers/vehicle.controller.js';
import { 
    vehicleIdSchema,
    vehicleCreationSchema,
    vehicleUpdateSchema,
    vehicleQuerySchema,
    vehicleStatusUpdateSchema,
    vehicleSearchForRideSchema,
    vehicleByTypeQuerySchema,
    vehicleStatisticsQuerySchema,
    bulkVehicleStatusUpdateSchema,
    vehicleAnalyticsSchema,
    vehicleAllocationOptimizationSchema,
    maintenanceRecommendationsQuerySchema
} from '../validations/vehicle.validation.js';
import { validateParams, validateRequest, validateQuery } from '../validations/common.validation.js';

const router = express.Router();

// Vehicle CRUD operations
// GET /api/vehicles/search - Search vehicles for ride
router.get('/search', validateQuery(vehicleSearchForRideSchema), searchVehiclesForRide);

// GET /api/vehicles/by-type - Get vehicles by type
router.get('/by-type', validateQuery(vehicleByTypeQuerySchema), getVehiclesByType);

// GET /api/vehicles/statistics - Get vehicle statistics
router.get('/statistics', validateQuery(vehicleStatisticsQuerySchema), getVehicleStatistics);

// Analytics and Management Routes (must be before /:vehicleId routes)
// GET /api/vehicles/analytics - Get vehicle analytics
router.get('/analytics', validateQuery(vehicleAnalyticsSchema), getVehicleAnalytics);

// GET /api/vehicles/maintenance-recommendations - Get vehicle maintenance recommendations
router.get('/maintenance-recommendations', validateQuery(maintenanceRecommendationsQuerySchema), getMaintenanceRecommendations);

// PATCH /api/vehicles/bulk-status - Bulk update vehicle statuses
router.patch('/bulk-status', validateRequest(bulkVehicleStatusUpdateSchema), bulkUpdateVehicleStatus);

// POST /api/vehicles/optimize-allocation - Optimize vehicle allocation
router.post('/optimize-allocation', validateRequest(vehicleAllocationOptimizationSchema), optimizeVehicleAllocation);

// GET /api/vehicles - Get all vehicles
router.get('/', validateQuery(vehicleQuerySchema), getVehicles);

// POST /api/vehicles - Create a new vehicle
router.post('/', validateRequest(vehicleCreationSchema), createVehicle);

// GET /api/vehicles/:vehicleId - Get a specific vehicle
router.get('/:vehicleId', validateParams(vehicleIdSchema), getVehicle);

// PUT /api/vehicles/:vehicleId - Update a vehicle
router.put('/:vehicleId', validateParams(vehicleIdSchema), validateRequest(vehicleUpdateSchema), updateVehicle);

// PATCH /api/vehicles/:vehicleId/status - Update vehicle status
router.patch('/:vehicleId/status', validateParams(vehicleIdSchema), validateRequest(vehicleStatusUpdateSchema), updateVehicleStatus);

// DELETE /api/vehicles/:vehicleId - Delete a vehicle
router.delete('/:vehicleId', validateParams(vehicleIdSchema), deleteVehicle);

export default router;
