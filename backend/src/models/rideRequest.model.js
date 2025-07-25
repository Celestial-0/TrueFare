import mongoose from 'mongoose';
import { APP_CONSTANTS } from '../constants.js';

const rideRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    pickupLocation: {
        type: {
            address: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        required: true
    },
    destination: {
        type: {
            address: String,
            coordinates: {
                latitude: Number,
                longitude: Number
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
        type: Number // in kilometers
    },
    estimatedDuration: {
        type: Number // in minutes
    },
    bids: [{
        driverId: String,
        fareAmount: Number,
        bidTime: {
            type: Date,
            default: Date.now
        }
    }],
    acceptedBid: {
        driverId: String,
        fareAmount: Number,
        bidTime: Date
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

export default mongoose.model('RideRequest', rideRequestSchema);