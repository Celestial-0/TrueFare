import mongoose from 'mongoose';
import { generateDriverId } from '../utils/idGenerator.js';
import { APP_CONSTANTS } from '../constants.js';

const driverSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: true,
        unique: true,
        default: generateDriverId
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
    vehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: false
    }],
    currentLocation: {
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
    status: {
        type: String,
        enum: [APP_CONSTANTS.DRIVER_STATUS.AVAILABLE, APP_CONSTANTS.DRIVER_STATUS.BUSY, APP_CONSTANTS.DRIVER_STATUS.OFFLINE],
        default: APP_CONSTANTS.DRIVER_STATUS.OFFLINE
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
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
driverSchema.index({ status: 1, isOnline: 1 });
driverSchema.index({ 'currentLocation.coordinates': '2dsphere' });

// Methods for driver management
driverSchema.methods.updateLocation = function(latitude, longitude, address) {
    this.currentLocation = {
        coordinates: { latitude, longitude },
        address
    };
    this.lastSeen = new Date();
    return this.save();
};

driverSchema.methods.updateStatus = function(status) {
    this.status = status;
    this.lastSeen = new Date();
    return this.save();
};

driverSchema.methods.setOnline = function(isOnline) {
    this.isOnline = isOnline;
    this.lastSeen = new Date();
    return this.save();
};

export default mongoose.model('Driver', driverSchema);
