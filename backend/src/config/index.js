import dotenv from 'dotenv';
import { DB_NAME, APP_CONSTANTS } from '../constants.js';

dotenv.config({
    path: './.env.local',
});

export const config = {
    database: {
        mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
        dbName: DB_NAME
    },
    server: {
        port: process.env.PORT || 8000,
        nodeEnv: process.env.NODE_ENV || 'development',
        mainUrl: process.env.EXPO_PUBLIC_MAIN_URL || process.env.MAIN_URL || 'http://localhost:8000',
        clientUrl: process.env.CLIENT_URL || 'http://localhost:8000'
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
