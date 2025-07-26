import express from 'express';
import { 
    registerUser, 
    getUserProfile 
} from '../controllers/auth.controller.js';
import {
    updateUserProfile,
    getUserRideHistory,
    getUserStats,
    updateUserLocation,
    updateUserPreferences,
    getPersonalizedRecommendations,
    getUserFavorites,
    getUserAnalytics,
    bulkUpdatePreferences,
    getUserBehaviorInsights
} from '../controllers/user.controller.js';
import { 
    userRegistrationSchema,
    userUpdateSchema,
    userLocationUpdateSchema,
    userPreferencesUpdateSchema,
    userRideHistoryQuerySchema,
    userRecommendationsQuerySchema,
    userAnalyticsQuerySchema,
    bulkUpdatePreferencesSchema
} from '../validations/user.validation.js';
import { 
    validateRequest, 
    validateQuery,
    validateParams, 
    userIdParamSchema,
    analyticsQuerySchema
} from '../validations/common.validation.js';

const router = express.Router();

// Security enhancement function
const addSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
};

// Apply security headers to all routes
router.use(addSecurityHeaders);

// Basic request logging for security monitoring
const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${clientIp.slice(0, 10)}... - UA: ${userAgent.slice(0, 50)}...`);
    next();
};

router.use(logRequest);

// POST /api/users/register - Register a new user
router.post('/register', validateRequest(userRegistrationSchema), registerUser);

// GET /api/users/profile/:userId - Get user profile
router.get('/profile/:userId', validateParams(userIdParamSchema), getUserProfile);

// PUT /api/users/profile/:userId - Update user profile
router.put('/profile/:userId', validateParams(userIdParamSchema), validateRequest(userUpdateSchema), updateUserProfile);

// GET /api/users/:userId/ride-history - Get user ride history
router.get('/:userId/ride-history', validateParams(userIdParamSchema), validateQuery(userRideHistoryQuerySchema), getUserRideHistory);

// GET /api/users/:userId/stats - Get user statistics
router.get('/:userId/stats', validateParams(userIdParamSchema), validateQuery(analyticsQuerySchema), getUserStats);

// PUT /api/users/:userId/location - Update user location
router.put('/:userId/location', validateParams(userIdParamSchema), validateRequest(userLocationUpdateSchema), updateUserLocation);

// PUT /api/users/:userId/preferences - Update user preferences
router.put('/:userId/preferences', validateParams(userIdParamSchema), validateRequest(userPreferencesUpdateSchema), updateUserPreferences);

// GET /api/users/:userId/recommendations - Get personalized vehicle recommendations
router.get('/:userId/recommendations', validateParams(userIdParamSchema), validateQuery(userRecommendationsQuerySchema), getPersonalizedRecommendations);

// GET /api/users/:userId/favorites - Get user's favorite drivers and vehicles
router.get('/:userId/favorites', validateParams(userIdParamSchema), getUserFavorites);

// Analytics and Admin Routes - These should be restricted in production
// GET /api/users/analytics - Get user analytics
router.get('/analytics', validateQuery(userAnalyticsQuerySchema), getUserAnalytics);

// PATCH /api/users/bulk-preferences - Bulk update user preferences
router.patch('/bulk-preferences', validateRequest(bulkUpdatePreferencesSchema), bulkUpdatePreferences);

// GET /api/users/:userId/behavior-insights - Get user behavior insights
router.get('/:userId/behavior-insights', validateParams(userIdParamSchema), validateQuery(analyticsQuerySchema), getUserBehaviorInsights);

export default router;
