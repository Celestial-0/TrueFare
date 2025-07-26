/**
 * Socket Configuration
 * Centralized configuration for socket behavior and performance tuning
 */

export const SOCKET_CONFIG = {
    // Connection Settings
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 20000, // 20 seconds
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000, // 1 second
    RECONNECTION_DELAY_MAX: 5000, // 5 seconds

    // Duplicate Prevention
    REGISTRATION_TIMEOUT: 5000, // 5 seconds
    DUPLICATE_CHECK_ENABLED: true,
    AUTO_DISCONNECT_DUPLICATES: true,

    // Memory Management
    MAX_PENDING_EMISSIONS: 100,
    CONNECTION_CLEANUP_INTERVAL: 300000, // 5 minutes
    STALE_CONNECTION_THRESHOLD: 600000, // 10 minutes
    FORCE_GC_INTERVAL: 1800000, // 30 minutes

    // Performance Monitoring
    ENABLE_HEALTH_CHECKS: true,
    HEALTH_CHECK_INTERVAL: 60000, // 1 minute
    LOG_PERFORMANCE_METRICS: true,
    MAX_CONNECTIONS_PER_USER: 1,
    MAX_CONNECTIONS_PER_DRIVER: 1,

    // Error Handling
    MAX_ERROR_RETRIES: 3,
    ERROR_BACKOFF_MULTIPLIER: 2,
    CIRCUIT_BREAKER_THRESHOLD: 10,

    // Rate Limiting
    MAX_EVENTS_PER_MINUTE: 60,
    BURST_ALLOWANCE: 10,
    RATE_LIMIT_WINDOW: 60000, // 1 minute

    // Room Management
    MAX_ROOM_SIZE: 1000,
    AUTO_CLEANUP_EMPTY_ROOMS: true,
    ROOM_INACTIVITY_TIMEOUT: 300000, // 5 minutes

    // Security
    VALIDATE_ALL_EVENTS: true,
    LOG_SECURITY_EVENTS: true,
    BLOCK_SUSPICIOUS_PATTERNS: true,

    // Development/Debug
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    VERBOSE_LOGGING: process.env.SOCKET_VERBOSE === 'true',
    ENABLE_METRICS_EXPORT: true
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
    SOCKET_CONFIG.HEARTBEAT_INTERVAL = 45000; // Longer intervals in production
    SOCKET_CONFIG.DEBUG_MODE = false;
    SOCKET_CONFIG.VERBOSE_LOGGING = false;
    SOCKET_CONFIG.RECONNECTION_ATTEMPTS = 10; // More attempts in production
}

if (process.env.NODE_ENV === 'test') {
    SOCKET_CONFIG.HEARTBEAT_INTERVAL = 5000; // Faster for tests
    SOCKET_CONFIG.CONNECTION_TIMEOUT = 5000;
    SOCKET_CONFIG.REGISTRATION_TIMEOUT = 1000;
}

// Validation function
export function validateSocketConfig() {
    const errors = [];

    if (SOCKET_CONFIG.HEARTBEAT_INTERVAL < 1000) {
        errors.push('HEARTBEAT_INTERVAL should be at least 1000ms');
    }

    if (SOCKET_CONFIG.MAX_CONNECTIONS_PER_USER < 1) {
        errors.push('MAX_CONNECTIONS_PER_USER should be at least 1');
    }

    if (SOCKET_CONFIG.STALE_CONNECTION_THRESHOLD < SOCKET_CONFIG.HEARTBEAT_INTERVAL * 2) {
        errors.push('STALE_CONNECTION_THRESHOLD should be at least 2x HEARTBEAT_INTERVAL');
    }

    if (errors.length > 0) {
        throw new Error(`Socket configuration errors: ${errors.join(', ')}`);
    }

    return true;
}

// Helper functions
export function getSocketTimeout(type = 'default') {
    const timeouts = {
        registration: SOCKET_CONFIG.REGISTRATION_TIMEOUT,
        connection: SOCKET_CONFIG.CONNECTION_TIMEOUT,
        heartbeat: SOCKET_CONFIG.HEARTBEAT_INTERVAL,
        cleanup: SOCKET_CONFIG.CONNECTION_CLEANUP_INTERVAL
    };

    return timeouts[type] || timeouts.default;
}

export function shouldEnableFeature(feature) {
    const features = {
        healthChecks: SOCKET_CONFIG.ENABLE_HEALTH_CHECKS,
        duplicateCheck: SOCKET_CONFIG.DUPLICATE_CHECK_ENABLED,
        autoCleanup: SOCKET_CONFIG.AUTO_CLEANUP_EMPTY_ROOMS,
        rateLimit: SOCKET_CONFIG.MAX_EVENTS_PER_MINUTE > 0,
        debug: SOCKET_CONFIG.DEBUG_MODE,
        verbose: SOCKET_CONFIG.VERBOSE_LOGGING
    };

    return features[feature] || false;
}

// Performance tuning based on connection count
export function getOptimalConfig(connectionCount) {
    const config = { ...SOCKET_CONFIG };

    if (connectionCount > 1000) {
        // High load optimizations
        config.HEARTBEAT_INTERVAL = 60000; // 1 minute
        config.CONNECTION_CLEANUP_INTERVAL = 600000; // 10 minutes
        config.HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
    } else if (connectionCount > 100) {
        // Medium load optimizations
        config.HEARTBEAT_INTERVAL = 45000; // 45 seconds
        config.CONNECTION_CLEANUP_INTERVAL = 300000; // 5 minutes
    }
    // Low load uses default settings

    return config;
}

export default SOCKET_CONFIG;
