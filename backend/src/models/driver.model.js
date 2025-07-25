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
        required: true
    },
    email: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    vehicleInfo: {
        make: String,
        model: String,
        year: Number,
        licensePlate: String,
        color: String
    },
    currentLocation: {
        type: {
            coordinates: {
                latitude: Number,
                longitude: Number
            },
            address: String
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
