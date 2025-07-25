import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from 'zod';
import { formatValidationError } from '../validations/common.validation.js';

// Login validation schemas
const userLoginSchema = z.object({
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim()
});

const driverLoginSchema = z.object({
    phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').min(10).max(20).trim()
});

// User login endpoint
const loginUser = asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = userLoginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { phone } = validationResult.data;

    try {
        // Find user by phone number
        const user = await User.findOne({ phone: phone.trim() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please register first.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Update user's online status and last seen
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User login successful',
            data: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                defaultLocation: user.defaultLocation,
                preferences: user.preferences,
                isOnline: user.isOnline,
                rating: user.rating,
                totalRides: user.totalRides,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Error during user login:', error);
        throw error;
    }
});

// Driver login endpoint
const loginDriver = asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = driverLoginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        const formattedError = formatValidationError(validationResult.error);
        return res.status(400).json({
            success: false,
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            details: formattedError.errors
        });
    }

    const { phone } = validationResult.data;

    try {
        // Find driver by phone number
        const driver = await Driver.findOne({ phone: phone.trim() });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found. Please register first.',
                code: 'DRIVER_NOT_FOUND'
            });
        }

        // Update driver's online status and last seen
        driver.isOnline = true;
        driver.lastSeen = new Date();
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Driver login successful',
            data: {
                driverId: driver.driverId,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicleInfo: driver.vehicleInfo,
                currentLocation: driver.currentLocation,
                status: driver.status,
                isOnline: driver.isOnline,
                rating: driver.rating,
                totalRides: driver.totalRides,
                lastSeen: driver.lastSeen,
                createdAt: driver.createdAt
            }
        });

    } catch (error) {
        console.error('Error during driver login:', error);
        throw error;
    }
});

export {
    loginUser,
    loginDriver
};
