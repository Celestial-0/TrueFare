/**
 * Logger utility for backend logging
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

class Logger {
    constructor() {
        this.logLevel = LOG_LEVELS[CURRENT_LOG_LEVEL] || LOG_LEVELS.INFO;
    }

    /**
     * Log error messages
     * @param {string} message - Error message
     * @param {any} context - Additional context
     */
    error(message, context = {}) {
        if (this.logLevel >= LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, context);
        }
    }

    /**
     * Log warning messages
     * @param {string} message - Warning message
     * @param {any} context - Additional context
     */
    warn(message, context = {}) {
        if (this.logLevel >= LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context);
        }
    }

    /**
     * Log info messages
     * @param {string} message - Info message
     * @param {any} context - Additional context
     */
    info(message, context = {}) {
        if (this.logLevel >= LOG_LEVELS.INFO) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context);
        }
    }

    /**
     * Log debug messages
     * @param {string} message - Debug message
     * @param {any} context - Additional context
     */
    debug(message, context = {}) {
        if (this.logLevel >= LOG_LEVELS.DEBUG) {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, context);
        }
    }

    /**
     * Log socket events
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @param {string} direction - 'emit' or 'receive'
     */
    socket(event, data, direction = 'emit') {
        if (this.logLevel >= LOG_LEVELS.DEBUG) {
            console.log(`[SOCKET] ${new Date().toISOString()} - ${direction.toUpperCase()}: ${event}`, data);
        }
    }

    /**
     * Log API requests
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {any} data - Request data
     */
    api(method, url, data = null) {
        if (this.logLevel >= LOG_LEVELS.DEBUG) {
            console.log(`[API] ${new Date().toISOString()} - ${method.toUpperCase()} ${url}`, data);
        }
    }

    /**
     * Log database operations
     * @param {string} operation - Database operation
     * @param {string} collection - Collection name
     * @param {any} query - Query/filter
     */
    db(operation, collection, query = {}) {
        if (this.logLevel >= LOG_LEVELS.DEBUG) {
            console.log(`[DB] ${new Date().toISOString()} - ${operation.toUpperCase()} ${collection}`, query);
        }
    }
}

// Create and export a singleton instance
const logger = new Logger();

export default logger;