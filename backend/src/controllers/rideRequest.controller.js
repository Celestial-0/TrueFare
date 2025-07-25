import RideRequest from '../models/rideRequest.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { broadcastRideRequest } from './socket.controller.js';
import { z } from 'zod';
import { 
    createRideRequestSchema, 
    acceptBidSchema, 
    getRideRequestsQuerySchema, 
    getBidsQuerySchema, 
    validateRequestId
} from '../validations/rideRequest.validation.js';
import { formatValidationError } from '../validations/common.validation.js';

const createRideRequest = asyncHandler(async (req, res) => {
    // Validate request body using Zod
    const validationResult = createRideRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const {
        userId,
        pickupLocation,
        destination,
        estimatedDistance,
        estimatedDuration
    } = validationResult.data;

    try {
        // Create the ride request
        const rideRequest = new RideRequest({
            userId: userId.trim(),
            pickupLocation: {
                address: pickupLocation.address.trim(),
                coordinates: pickupLocation.coordinates
            },
            destination: {
                address: destination.address.trim(),
                coordinates: destination.coordinates
            },
            estimatedDistance,
            estimatedDuration,
            status: 'pending'
        });

        const savedRideRequest = await rideRequest.save();

        // Log the ride request creation
        console.log(`New ride request created: ${savedRideRequest._id} by user: ${userId}`);

        // Update status to bidding
        savedRideRequest.status = 'bidding';
        await savedRideRequest.save();

        // Broadcast to drivers using the new function
        broadcastRideRequest({
            _id: savedRideRequest._id,
            requestId: savedRideRequest._id, // Keep for backward compatibility
            userId: savedRideRequest.userId,
            pickupLocation: savedRideRequest.pickupLocation,
            destination: savedRideRequest.destination,
            estimatedDistance: savedRideRequest.estimatedDistance,
            estimatedDuration: savedRideRequest.estimatedDuration,
            timestamp: savedRideRequest.createdAt,
            createdAt: savedRideRequest.createdAt,
            status: savedRideRequest.status,
            bids: savedRideRequest.bids || []
        });

        res.status(201).json({
            success: true,
            message: 'Ride request created successfully',
            data: {
                requestId: savedRideRequest._id,
                userId: savedRideRequest.userId,
                pickupLocation: savedRideRequest.pickupLocation,
                destination: savedRideRequest.destination,
                estimatedDistance: savedRideRequest.estimatedDistance,
                estimatedDuration: savedRideRequest.estimatedDuration,
                status: savedRideRequest.status,
                createdAt: savedRideRequest.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating ride request:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error in ride request data',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate ride request detected',
                code: 'DUPLICATE_REQUEST'
            });
        }

        throw error; // Let asyncHandler handle other errors
    }
});

const getRideRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    // Validate requestId using Zod
    const validationResult = validateRequestId(requestId);
    
    if (!validationResult.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request ID format',
            code: 'INVALID_REQUEST_ID'
        });
    }

    try {
        const rideRequest = await RideRequest.findById(requestId);

        if (!rideRequest) {
            return res.status(404).json({
                success: false,
                message: 'Ride request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                requestId: rideRequest._id,
                userId: rideRequest.userId,
                pickupLocation: rideRequest.pickupLocation,
                destination: rideRequest.destination,
                status: rideRequest.status,
                estimatedDistance: rideRequest.estimatedDistance,
                estimatedDuration: rideRequest.estimatedDuration,
                bids: rideRequest.bids,
                createdAt: rideRequest.createdAt,
                updatedAt: rideRequest.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching ride request:', error);
        throw error;
    }
});

const getUserRideRequests = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate userId using Zod
    const userIdValidation = z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').safeParse(userId);
    
    if (!userIdValidation.success) {
        return res.status(400).json({
            success: false,
            message: 'Valid User ID is required',
            code: 'INVALID_USER_ID'
        });
    }

    // Validate query parameters using Zod
    const queryValidation = getRideRequestsQuerySchema.safeParse({ page, limit, status });
    
    if (!queryValidation.success) {
        const formattedError = formatValidationError(queryValidation.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { page: pageNum, limit: limitNum, status: statusFilter } = queryValidation.data;

    try {
        // Build query
        const query = { userId: userId.trim() };
        
        // Add status filter if provided
        if (statusFilter) {
            query.status = statusFilter;
        }

        // Execute query with pagination
        const skip = (pageNum - 1) * limitNum;
        const [rideRequests, total] = await Promise.all([
            RideRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select('_id userId pickupLocation destination status estimatedDistance estimatedDuration bids createdAt updatedAt'),
            RideRequest.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            data: rideRequests,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: total,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error fetching user ride requests:', error);
        throw error;
    }
});

const getRideRequestBids = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { sortBy = 'fare', order = 'asc' } = req.query;

    // Validate requestId using Zod
    const requestIdValidation = validateRequestId(requestId);
    
    if (!requestIdValidation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request ID format',
            code: 'INVALID_REQUEST_ID'
        });
    }

    // Validate query parameters using Zod
    const queryValidation = getBidsQuerySchema.safeParse({ sortBy, order });
    
    if (!queryValidation.success) {
        const formattedError = formatValidationError(queryValidation.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { sortBy: sortField, order: sortOrder } = queryValidation.data;

    try {
        const rideRequest = await RideRequest.findById(requestId);

        if (!rideRequest) {
            return res.status(404).json({
                success: false,
                message: 'Ride request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        // Enhanced sorting logic using model method
        const sortedBids = rideRequest.getSortedBids(sortField, sortOrder);

        // Add ranking and metadata to bids
        const rankedBids = sortedBids.map((bid, index) => ({
            ...bid.toObject(),
            rank: index + 1,
            isLowest: index === 0 && sortField === 'fare' && sortOrder === 'asc',
            isHighest: index === sortedBids.length - 1 && sortField === 'fare' && sortOrder === 'asc'
        }));

        // Calculate bid statistics
        const fares = sortedBids.map(bid => bid.fareAmount);
        const lowestFare = fares.length > 0 ? Math.min(...fares) : null;
        const highestFare = fares.length > 0 ? Math.max(...fares) : null;
        const averageFare = fares.length > 0 ? fares.reduce((sum, fare) => sum + fare, 0) / fares.length : null;

        res.status(200).json({
            success: true,
            data: {
                requestId: rideRequest._id,
                status: rideRequest.status,
                bids: rankedBids,
                totalBids: rankedBids.length,
                sortBy,
                order,
                statistics: {
                    lowestFare,
                    highestFare,
                    averageFare: averageFare ? parseFloat(averageFare.toFixed(2)) : null,
                    priceRange: (lowestFare && highestFare) ? highestFare - lowestFare : null
                }
            }
        });

    } catch (error) {
        console.error('Error fetching ride request bids:', error);
        throw error;
    }
});

const acceptBid = asyncHandler(async (req, res) => {
    const { requestId, bidId } = req.params;
    const { userId } = req.body;

    // Validate request data using Zod
    const validationResult = acceptBidSchema.safeParse({ requestId, bidId, userId });
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { requestId: validRequestId, bidId: validBidId, userId: validUserId } = validationResult.data;

    try {
        const rideRequest = await RideRequest.findById(validRequestId);

        if (!rideRequest) {
            return res.status(404).json({
                success: false,
                message: 'Ride request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        // Check if user owns this ride request
        if (rideRequest.userId !== validUserId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to accept bids for this ride request',
                code: 'UNAUTHORIZED'
            });
        }

        // Check if ride request is in bidding status
        if (rideRequest.status !== 'bidding') {
            return res.status(400).json({
                success: false,
                message: 'Ride request is not accepting bids',
                code: 'BIDDING_CLOSED'
            });
        }

        // Find the specific bid
        const acceptedBid = rideRequest.bids.find(bid => bid._id.toString() === validBidId);

        if (!acceptedBid) {
            return res.status(404).json({
                success: false,
                message: 'Bid not found',
                code: 'BID_NOT_FOUND'
            });
        }

        // Update ride request status
        rideRequest.status = 'accepted';
        rideRequest.acceptedBid = acceptedBid;
        await rideRequest.save();

        // Broadcast bid acceptance to all drivers
        const { broadcastBidAccepted } = await import('./socket.controller.js');
        broadcastBidAccepted({
            requestId: rideRequest._id,
            acceptedBid: acceptedBid,
            driverId: acceptedBid.driverId
        });

        res.status(200).json({
            success: true,
            message: 'Bid accepted successfully',
            data: {
                requestId: rideRequest._id,
                acceptedBid: acceptedBid,
                status: rideRequest.status
            }
        });

    } catch (error) {
        console.error('Error accepting bid:', error);
        throw error;
    }
});

const getRideRequestBidsLive = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { lastFetch } = req.query;

    // Validate requestId format
    if (!requestId || !requestId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request ID format',
            code: 'INVALID_REQUEST_ID'
        });
    }

    try {
        const rideRequest = await RideRequest.findById(requestId);

        if (!rideRequest) {
            return res.status(404).json({
                success: false,
                message: 'Ride request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        // Filter bids based on lastFetch timestamp if provided
        let bids = rideRequest.bids;
        if (lastFetch) {
            const lastFetchTime = new Date(lastFetch);
            bids = bids.filter(bid => new Date(bid.bidTime) > lastFetchTime);
        }

        // Sort bids by fare amount (lowest first) using model method
        const sortedBids = rideRequest.getSortedBids('fare', 'asc');

        res.status(200).json({
            success: true,
            data: {
                requestId: rideRequest._id,
                status: rideRequest.status,
                bids: sortedBids,
                totalBids: rideRequest.bids.length,
                newBids: sortedBids.length,
                lowestFare: rideRequest.bids.length > 0 ? 
                    Math.min(...rideRequest.bids.map(b => b.fareAmount)) : null,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Error fetching live ride request bids:', error);
        throw error;
    }
});

const getAvailableRideRequests = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status = 'pending' } = req.query;

    // Validate query parameters using Zod
    const queryValidation = getRideRequestsQuerySchema.safeParse({ page, limit, status });
    
    if (!queryValidation.success) {
        const formattedError = formatValidationError(queryValidation.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { page: pageNum, limit: limitNum, status: statusFilter } = queryValidation.data;

    try {
        // Build query to get available ride requests (pending and bidding status)
        const query = { 
            status: { $in: ['pending', 'bidding'] } // Available for bidding
        };

        // Execute query with pagination
        const skip = (pageNum - 1) * limitNum;
        const [rideRequests, total] = await Promise.all([
            RideRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select('_id userId pickupLocation destination status estimatedDistance estimatedDuration bids createdAt updatedAt'),
            RideRequest.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            data: rideRequests,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: total,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error fetching available ride requests:', error);
        throw error;
    }
});

// Place a bid on a ride request
const placeBid = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { driverId, fareAmount, estimatedArrival, message } = req.body;

    try {
        // Validate requestId format
        const requestIdValidation = validateRequestId(requestId);
        if (!requestIdValidation.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID format',
                code: 'INVALID_REQUEST_ID'
            });
        }

        // Find the ride request
        const rideRequest = await RideRequest.findById(requestId);
        if (!rideRequest) {
            return res.status(404).json({
                success: false,
                message: 'Ride request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        // Check if bidding is open
        if (rideRequest.status !== 'bidding') {
            return res.status(400).json({
                success: false,
                message: 'Bidding is not open for this request',
                code: 'BIDDING_CLOSED'
            });
        }

        // Check if driver already placed a bid
        const existingBid = rideRequest.bids.find(bid => bid.driverId === driverId);
        if (existingBid) {
            return res.status(409).json({
                success: false,
                message: 'Driver already placed a bid for this request',
                code: 'BID_ALREADY_EXISTS'
            });
        }

        // Validate bid amount
        if (!fareAmount || fareAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bid amount',
                code: 'INVALID_BID_AMOUNT'
            });
        }

        // Add the bid using the model's addBid method
        await rideRequest.addBid(driverId, fareAmount);

        // Get the newly added bid
        const addedBid = rideRequest.bids[rideRequest.bids.length - 1];

        res.status(201).json({
            success: true,
            message: 'Bid placed successfully',
            data: {
                bidId: addedBid._id,
                requestId,
                driverId: addedBid.driverId,
                fareAmount: addedBid.fareAmount,
                bidTime: addedBid.bidTime
            }
        });

    } catch (error) {
        console.error('Error placing bid:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place bid',
            code: 'BID_PLACEMENT_FAILED'
        });
    }
});

export {
    createRideRequest,
    getRideRequest,
    getUserRideRequests,
    getRideRequestBids,
    getRideRequestBidsLive,
    acceptBid,
    getAvailableRideRequests,
    placeBid
};