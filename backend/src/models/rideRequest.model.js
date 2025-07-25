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

export default mongoose.model('RideRequest', rideRequestSchema);