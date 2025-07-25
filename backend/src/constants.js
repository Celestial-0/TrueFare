export const DB_NAME = 'TrueFare';

// Application Configuration Constants
export const APP_CONSTANTS = {
    MAX_WAIT_TIME: 10, // minutes
    DEFAULT_PRICE_RANGE: {
        MIN: 5,
        MAX: 50
    },
    BID_REFRESH_INTERVAL: 5000, // milliseconds
    
    // User preferences defaults
    USER_DEFAULTS: {
        MAX_WAIT_TIME: 10,
        PRICE_RANGE_MIN: 5,
        PRICE_RANGE_MAX: 50
    },
    
    // Driver status options
    DRIVER_STATUS: {
        AVAILABLE: 'available',
        BUSY: 'busy',
        OFFLINE: 'offline'
    },
    
    // Ride request status
    RIDE_STATUS: {
        PENDING: 'pending',
        BIDDING: 'bidding',
        ACCEPTED: 'accepted',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    }
};