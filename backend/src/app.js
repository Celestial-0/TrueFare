import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import http from 'http';
import { config } from './config/index.js';
import { initializeSocketHandlers } from './controllers/socket.controller.js';

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: config.server.allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    },
});

// Initialize all socket handlers through the controller
initializeSocketHandlers(io);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        const allowedOrigins = config.server.allowedOrigins;
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json({
    limit: '50kb',
}));
app.use(express.urlencoded({
    limit: '50kb',
    extended: true,
}));

app.use(express.static('public'));
app.use(cookieParser());

// Import routes
import rideRequestRoutes from './routes/rideRequest.routes.js';
import driverRoutes from './routes/driver.routes.js';
import userRoutes from './routes/user.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import socketRoutes from './routes/socket.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';

// Routes
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/socket', socketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

export { app, io, server };