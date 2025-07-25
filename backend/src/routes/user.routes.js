import express from 'express';
import { 
    registerUser, 
    getUserProfile 
} from '../controllers/registration.controller.js';
import { userRegistrationSchema } from '../validations/user.validation.js';
import { validateRequest, validateParams, userIdParamSchema } from '../validations/common.validation.js';

const router = express.Router();

// POST /api/users/register - Register a new user
router.post('/register', validateRequest(userRegistrationSchema), registerUser);

// GET /api/users/profile/:userId - Get user profile
router.get('/profile/:userId', validateParams(userIdParamSchema), getUserProfile);

export default router;
