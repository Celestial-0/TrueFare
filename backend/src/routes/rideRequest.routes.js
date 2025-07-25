import express from 'express';
import {
    createRideRequest,
    getRideRequest,
    getUserRideRequests,
    getRideRequestBids,
    getRideRequestBidsLive,
    acceptBid,
    getAvailableRideRequests,
    placeBid
} from '../controllers/rideRequest.controller.js';
import { 
    createRideRequestSchema, 
    getRideRequestsQuerySchema, 
    getBidsQuerySchema, 
    acceptBidSchema,
    placeBidSchema 
} from '../validations/rideRequest.validation.js';
import { 
    validateRequest, 
    validateQuery, 
    validateParams, 
    requestIdParamSchema, 
    userIdParamSchema 
} from '../validations/common.validation.js';

const router = express.Router();

// POST /api/ride-requests - Create a new ride request
router.post('/', validateRequest(createRideRequestSchema), createRideRequest);

// GET /api/ride-requests/available - Get all available ride requests for drivers
router.get('/available', 
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

// GET /api/ride-requests/:requestId/bids/live - Get live bid updates
router.get('/:requestId/bids/live', 
    validateParams(requestIdParamSchema), 
    getRideRequestBidsLive
);

// POST /api/ride-requests/:requestId/bids - Place a bid on a ride request
router.post('/:requestId/bids', 
    validateParams(requestIdParamSchema),
    validateRequest(placeBidSchema),
    placeBid
);

// POST /api/ride-requests/:requestId/bids/:bidId/accept - Accept a specific bid
router.post('/:requestId/bids/:bidId/accept', acceptBid);

export default router;