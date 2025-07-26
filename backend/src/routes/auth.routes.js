import express from 'express';
import { 
    loginUser, 
    loginDriver, 
    registerUser, 
    registerDriver,
    getUserProfile,
    getAuthStats,
    bulkUpdateStatus,
    performMaintenance
} from '../controllers/auth.controller.js';
import { 
    validateRequest, 
    validateQuery,
    validateParams, 
    userIdParamSchema 
} from '../validations/common.validation.js';
import { 
    userRegistrationSchema, 
    userUpdateSchema 
} from '../validations/user.validation.js';
import {
    driverRegistrationSchema
} from '../validations/driver.validation.js';
import {
    userLoginSchema,
    driverLoginSchema,
    authStatsQuerySchema,
    bulkStatusUpdateSchema,
    maintenanceOperationSchema
} from '../validations/auth.validation.js';

const router = express.Router();

// // Security enhancement function
// const addSecurityHeaders = (req, res, next) => {
//     res.setHeader('X-Content-Type-Options', 'nosniff');
//     res.setHeader('X-Frame-Options', 'DENY');
//     res.setHeader('X-XSS-Protection', '1; mode=block');
//     res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
//     res.removeHeader('X-Powered-By');
//     next();
// };

// // Apply security headers to all routes
// router.use(addSecurityHeaders);

// Basic request logging for security monitoring
const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${clientIp.slice(0, 10)}... - UA: ${userAgent.slice(0, 50)}...`);
    next();
};

router.use(logRequest);

// POST /api/auth/login/user - User login
router.post('/login/user', validateRequest(userLoginSchema), loginUser);

// POST /api/auth/login/driver - Driver login
router.post('/login/driver', validateRequest(driverLoginSchema), loginDriver);

// POST /api/auth/register/user - User registration
router.post('/register/user', validateRequest(userRegistrationSchema), registerUser);

// POST /api/auth/register/driver - Driver registration
router.post('/register/driver', validateRequest(driverRegistrationSchema), registerDriver);

// GET /api/auth/user/:userId - Get user profile
router.get('/user/:userId', validateParams(userIdParamSchema), getUserProfile);

// Admin and Analytics Routes - These should be restricted in production
// GET /api/auth/stats - Get authentication statistics
router.get('/stats', validateQuery(authStatsQuerySchema), getAuthStats);

// PATCH /api/auth/bulk-status - Bulk update user/driver status
router.patch('/bulk-status', validateRequest(bulkStatusUpdateSchema), bulkUpdateStatus);

// POST /api/auth/maintenance - Perform authentication maintenance
router.post('/maintenance', validateRequest(maintenanceOperationSchema), performMaintenance);

export default router;
