import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';

const rideRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    rideType: {
        type: String,
        enum: ['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'],
        required: false
    },
    comfortPreference: {
        type: Number,
        min: 1,
        max: 5,
        required: false
    },
    farePreference: {
        type: Number,
        min: 1,
        max: 5,
        required: false
    },
    pickupLocation: {
        type: {
            address: {
                type: String,
                required: true,
                maxlength: 500,
                trim: true
            },
            coordinates: {
                latitude: {
                    type: Number,
                    required: true,
                    min: -90,
                    max: 90
                },
                longitude: {
                    type: Number,
                    required: true,
                    min: -180,
                    max: 180
                }
            }
        },
        required: true
    },
    destination: {
        type: {
            address: {
                type: String,
                required: true,
                maxlength: 500,
                trim: true
            },
            coordinates: {
                latitude: {
                    type: Number,
                    required: true,
                    min: -90,
                    max: 90
                },
                longitude: {
                    type: Number,
                    required: true,
                    min: -180,
                    max: 180
                }
            }
        },
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'bidding', 'accepted', 'completed', 'cancelled'],
        default: 'pending'
    },
    estimatedDistance: {
        type: Number, // in kilometers
        min: 0,
        max: 1000
    },
    estimatedDuration: {
        type: Number, // in minutes
        min: 0,
        max: 1440 // max 24 hours
    },
    bids: [{
        driverId: {
            type: String,
            required: true
        },
        fareAmount: {
            type: Number,
            required: true,
            min: 0,
            max: 10000
        },
        bidTime: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        estimatedArrival: {
            type: Number, // in minutes
            min: 1,
            max: 120
        },
        acceptedAt: {
            type: Date
        },
        rejectedAt: {
            type: Date
        }
    }],
    acceptedBid: {
        driverId: {
            type: String
        },
        fareAmount: {
            type: Number,
            min: 0,
            max: 10000
        },
        bidTime: {
            type: Date
        }
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
rideRequestSchema.index({ userId: 1, createdAt: -1 });
rideRequestSchema.index({ status: 1, createdAt: -1 });
rideRequestSchema.index({ 'bids.driverId': 1 });
rideRequestSchema.index({ 'bids.fareAmount': 1 });

// Add methods for better data management
rideRequestSchema.methods.addBid = function(driverId, fareAmount) {
    // Check if driver already has a bid
    const existingBidIndex = this.bids.findIndex(bid => bid.driverId === driverId);
    
    if (existingBidIndex !== -1) {
        // Update existing bid
        this.bids[existingBidIndex].fareAmount = fareAmount;
        this.bids[existingBidIndex].bidTime = new Date();
    } else {
        // Add new bid
        this.bids.push({
            driverId,
            fareAmount,
            bidTime: new Date()
        });
    }
    
    return this.save();
};

rideRequestSchema.methods.getSortedBids = function(sortBy = 'fare', order = 'asc') {
    const bids = [...this.bids];
    
    if (sortBy === 'fare') {
        bids.sort((a, b) => {
            const comparison = a.fareAmount - b.fareAmount;
            return order === 'desc' ? -comparison : comparison;
        });
    } else if (sortBy === 'time') {
        bids.sort((a, b) => {
            const comparison = new Date(a.bidTime) - new Date(b.bidTime);
            return order === 'desc' ? -comparison : comparison;
        });
    }
    
    return bids;
};

// Method to accept a bid and update statuses
rideRequestSchema.methods.acceptBid = function(bidId) {
    // Find the bid to accept
    const bidToAccept = this.bids.id(bidId);
    if (!bidToAccept) {
        throw new Error('Bid not found');
    }
    
    // Check if bid is still pending
    if (bidToAccept.status !== 'pending') {
        throw new Error(`Cannot accept bid: Bid status is ${bidToAccept.status}`);
    }
    
    // Check if ride request is in bidding status
    if (this.status !== 'bidding') {
        throw new Error(`Cannot accept bid: Ride request status is ${this.status}`);
    }
    
    // Update ride request status
    this.status = 'accepted';
    
    // Set the accepted bid
    this.acceptedBid = {
        driverId: bidToAccept.driverId,
        fareAmount: bidToAccept.fareAmount,
        bidTime: bidToAccept.bidTime
    };
    
    // Update bid statuses
    this.bids.forEach(bid => {
        if (bid._id.toString() === bidId) {
            bid.status = 'accepted';
            bid.acceptedAt = new Date();
        } else if (bid.status === 'pending') {
            bid.status = 'rejected';
            bid.rejectedAt = new Date();
        }
    });
    
    return this.save();
};

// Method to get pending bids
rideRequestSchema.methods.getPendingBids = function() {
    return this.bids.filter(bid => bid.status === 'pending');
};

// Method to get accepted bid
rideRequestSchema.methods.getAcceptedBid = function() {
    return this.bids.find(bid => bid.status === 'accepted');
};

export default mongoose.model('RideRequest', rideRequestSchema);