import mongoose from 'mongoose';
import { generateUserId } from '../utils/idGenerator.js';
import { APP_CONSTANTS } from '../constants.js';

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        default: generateUserId
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false,
        sparse: true,
        unique: true,
        default: undefined
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    defaultLocation: {
        type: {
            coordinates: {
                latitude: Number,
                longitude: Number
            },
            address: String
        }
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRides: {
        type: Number,
        default: 0
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    preferences: {
        maxWaitTime: {
            type: Number,
            default: APP_CONSTANTS.USER_DEFAULTS.MAX_WAIT_TIME
        },
        priceRange: {
            min: {
                type: Number,
                default: APP_CONSTANTS.USER_DEFAULTS.PRICE_RANGE_MIN
            },
            max: {
                type: Number,
                default: APP_CONSTANTS.USER_DEFAULTS.PRICE_RANGE_MAX
            }
        }
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
userSchema.index({ isOnline: 1 });

// Methods for user management
userSchema.methods.updateLocation = function(latitude, longitude, address) {
    this.defaultLocation = {
        coordinates: { latitude, longitude },
        address
    };
    this.lastSeen = new Date();
    return this.save();
};

userSchema.methods.setOnline = function(isOnline) {
    this.isOnline = isOnline;
    this.lastSeen = new Date();
    return this.save();
};

export default mongoose.model('User', userSchema);
