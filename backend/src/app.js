import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import http from 'http';
import { config } from './config/index.js';
import { handleDriverConnection, handleUserConnection, setSocketInstance } from './controllers/socket.controller.js';

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: config.server.clientUrl,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Set the socket instance in the controller
setSocketInstance(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle driver-specific events
    handleDriverConnection(socket);
    
    // Handle user-specific events
    handleUserConnection(socket);
    
    // Handle general disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.use(cors({
    origin: config.server.clientUrl,
    credentials: true,
}));

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
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';

// Routes
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

export { app, io, server };