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
        required: true,
        maxlength: 100,
        trim: true
    },
    email: {
        type: String,
        required: false,
        sparse: true,
        unique: true,
        default: undefined,
        validate: {
            validator: function(v) {
                return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[+]?[\d\s\-\(\)]+$/.test(v) && v.length >= 10 && v.length <= 20;
            },
            message: 'Invalid phone number format'
        }
    },
    defaultLocation: {
        type: {
            coordinates: {
                latitude: {
                    type: Number,
                    min: -90,
                    max: 90
                },
                longitude: {
                    type: Number,
                    min: -180,
                    max: 180
                }
            },
            address: {
                type: String,
                maxlength: 500
            }
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
        },
        defaultRideType: {
            type: String,
            enum: ['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'],
            default: 'Taxi'
        },
        comfortPreference: {
            type: Number,
            min: 1,
            max: 5,
            default: 3
        },
        farePreference: {
            type: Number,
            min: 1,
            max: 5,
            default: 3
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
