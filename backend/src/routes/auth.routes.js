import express from 'express';
import { loginUser, loginDriver } from '../controllers/auth.controller.js';

const router = express.Router();

// POST /api/auth/login/user - User login
router.post('/login/user', loginUser);

// POST /api/auth/login/driver - Driver login
router.post('/login/driver', loginDriver);

export default router;
