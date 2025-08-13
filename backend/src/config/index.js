import dotenv from 'dotenv';
import { DB_NAME, APP_CONSTANTS } from '../constants.js';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
dotenv.config({
    path: envFile,
});

// Helper function to get allowed origins for CORS
const getAllowedOrigins = () => {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // In production, use environment variable
    if (process.env.NODE_ENV === 'production') {
        return origins.length > 0 ? origins : ['*']; // Allow all if not specified (configure properly in production)
    }
    
    // In development, allow localhost
    return [
        'http://localhost:8000',
        'http://localhost:3000',
        'http://localhost:19000',
        'http://localhost:8081',
        'exp://192.168.1.100:8081', // Expo development
        ...origins
    ];
};

export const config = {
    database: {
        mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
        dbName: DB_NAME
    },
    server: {
        port: process.env.PORT || 8000,
        nodeEnv: process.env.NODE_ENV || 'development',
        mainUrl: process.env.EXPO_PUBLIC_MAIN_URL || 'http://localhost:8000',
        clientUrl: process.env.CLIENT_URL || getAllowedOrigins(),
        allowedOrigins: getAllowedOrigins()
    },
    app: {
        maxWaitTime: APP_CONSTANTS.MAX_WAIT_TIME,
        defaultPriceRange: APP_CONSTANTS.DEFAULT_PRICE_RANGE,
        bidRefreshInterval: APP_CONSTANTS.BID_REFRESH_INTERVAL,
        userDefaults: APP_CONSTANTS.USER_DEFAULTS,
        driverStatus: APP_CONSTANTS.DRIVER_STATUS,
        rideStatus: APP_CONSTANTS.RIDE_STATUS
    }
};
