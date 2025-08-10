// Central validation exports for better import management

// Common validations
export * from './common.validation.js';

// Authentication validations
export * from './auth.validation.js';

// User validations
export * from './user.validation.js';

// Driver validations
export * from './driver.validation.js';

// Vehicle validations
export * from './vehicle.validation.js';

// Ride request validations
export * from './rideRequest.validation.js';

// Socket validations
export * from './socket.validation.js';

// Admin validations
export * from './admin.validation.js';

// Re-export commonly used validation helpers
export {
    validateRequest,
    validateQuery,
    validateParams,
    formatValidationError
} from './common.validation.js';

// Re-export ID validation helpers
export {
    validateUserId,
    validateDriverId,
    validateObjectId
} from './common.validation.js';

// Re-export login schemas
export {
    userLoginSchema,
    driverLoginSchema
} from './auth.validation.js';

// Re-export registration schemas
export {
    userRegistrationSchema,
    userUpdateSchema
} from './user.validation.js';

export {
    driverRegistrationSchema,
    driverUpdateSchema
} from './driver.validation.js';

// Re-export ride request schemas
export {
    createRideRequestSchema,
    placeBidSchema,
    getRideRequestsQuerySchema
} from './rideRequest.validation.js';

// Re-export vehicle schemas
export {
    vehicleCreationSchema,
    vehicleUpdateSchema,
    vehicleQuerySchema
} from './vehicle.validation.js';

// Re-export socket schemas
export {
    socketRegistrationSchema,
    broadcastMessageSchema
} from './socket.validation.js';

// Re-export admin schemas
export {
    adminStatsQuerySchema,
    adminBulkOperationSchema
} from './admin.validation.js';
