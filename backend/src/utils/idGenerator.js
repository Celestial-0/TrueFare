import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID with a prefix using UUID
 * @param {string} prefix - The prefix for the ID (e.g., 'USER', 'DRIVER')
 * @param {boolean} shortFormat - Whether to use short format (default: false)
 * @returns {string} - The generated unique ID
 */
export const generateUniqueId = (prefix, shortFormat = false) => {
    const uuid = uuidv4();
    
    if (shortFormat) {
        // Use only the first 8 characters of UUID for shorter IDs
        const shortUuid = uuid.replace(/-/g, '').substring(0, 8);
        return `${prefix}_${shortUuid}`.toUpperCase();
    } else {
        // Use full UUID without hyphens
        const fullUuid = uuid.replace(/-/g, '');
        return `${prefix}_${fullUuid}`.toUpperCase();
    }
};

/**
 * Generate a unique User ID
 * @returns {string} - The generated user ID
 */
export const generateUserId = () => {
    return generateUniqueId('USER', true); // Use short format for users
};

/**
 * Generate a unique Driver ID
 * @returns {string} - The generated driver ID
 */
export const generateDriverId = () => {
    return generateUniqueId('DRIVER', true); // Use short format for drivers
};

/**
 * Generate a unique Vehicle ID
 * @returns {string} - The generated vehicle ID
 */
export const generateVehicleId = () => {
    return generateUniqueId('VEHICLE', true); // Use short format for vehicles
};

/**
 * Generate a unique Request ID
 * @returns {string} - The generated request ID
 */
export const generateRequestId = () => {
    return generateUniqueId('REQUEST', true); // Use short format for requests
};

/**
 * Validate ID format
 * @param {string} id - The ID to validate
 * @param {string} prefix - The expected prefix
 * @returns {boolean} - Whether the ID is valid
 */
export const validateIdFormat = (id, prefix) => {
    if (!id || typeof id !== 'string') return false;
    // Updated pattern to match UUID-based IDs
    const pattern = new RegExp(`^${prefix}_[0-9A-F]+$`);
    return pattern.test(id);
};

/**
 * Extract UUID from generated ID
 * @param {string} id - The ID to parse
 * @returns {string|null} - The UUID part or null if invalid
 */
export const extractUuidFromId = (id) => {
    try {
        const parts = id.split('_');
        if (parts.length >= 2) {
            return parts[1];
        }
    } catch (error) {
        console.error('Error extracting UUID from ID:', error);
    }
    return null;
};

/**
 * Check if ID is in short format
 * @param {string} id - The ID to check
 * @returns {boolean} - Whether the ID is in short format
 */
export const isShortFormat = (id) => {
    const uuid = extractUuidFromId(id);
    return uuid && uuid.length === 8;
};

/**
 * Generate a batch of unique IDs
 * @param {string} prefix - The prefix for the IDs
 * @param {number} count - Number of IDs to generate
 * @param {boolean} shortFormat - Whether to use short format
 * @returns {string[]} - Array of generated IDs
 */
export const generateBatchIds = (prefix, count, shortFormat = false) => {
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(generateUniqueId(prefix, shortFormat));
    }
    return ids;
};
