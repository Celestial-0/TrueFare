import express from 'express';
import {
    getRideRequest,
    getUserRideRequests,
    getRideRequestBids,
    getAvailableRideRequests,
    getRideRequestAnalytics,
    bulkCancelRequests,
    optimizeMatching
} from '../controllers/rideRequest.controller.js';
import { 
    getRideRequestsQuerySchema, 
    getBidsQuerySchema, 
    availableRideRequestsQuerySchema,
    rideRequestAnalyticsQuerySchema,
    bulkCancelRequestsSchema,
    optimizeMatchingSchema
} from '../validations/rideRequest.validation.js';
import { 
    validateRequest, 
    validateQuery, 
    validateParams, 
    requestIdParamSchema, 
    userIdParamSchema 
} from '../validations/common.validation.js';

const router = express.Router();

// GET /api/ride-requests/available - Get all available ride requests for drivers
router.get('/available', 
    validateQuery(availableRideRequestsQuerySchema),
    getAvailableRideRequests
);

// GET /api/ride-requests/:requestId - Get a specific ride request
router.get('/:requestId', validateParams(requestIdParamSchema), getRideRequest);

// GET /api/ride-requests/user/:userId - Get all ride requests for a user
router.get('/user/:userId', 
    validateParams(userIdParamSchema), 
    validateQuery(getRideRequestsQuerySchema), 
    getUserRideRequests
);

// GET /api/ride-requests/:requestId/bids - Get all bids for a specific ride request
router.get('/:requestId/bids', 
    validateParams(requestIdParamSchema), 
    validateQuery(getBidsQuerySchema), 
    getRideRequestBids
);

// Analytics and Admin Routes
// GET /api/ride-requests/analytics - Get ride request analytics
router.get('/analytics', validateQuery(rideRequestAnalyticsQuerySchema), getRideRequestAnalytics);

// POST /api/ride-requests/bulk-cancel - Bulk cancel ride requests
router.post('/bulk-cancel', validateRequest(bulkCancelRequestsSchema), bulkCancelRequests);

// POST /api/ride-requests/optimize-matching - Optimize ride matching algorithm
router.post('/optimize-matching', validateRequest(optimizeMatchingSchema), optimizeMatching);

export default router;