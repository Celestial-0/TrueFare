import connectDB from './db/index.js';
import { config } from './config/index.js';
import { app, server } from './app.js';
import DataPersistenceService from './services/dataPersistenceService.js';
import BackgroundTaskScheduler from './utils/backgroundTasks.js';

connectDB()
    .then(async () => {
        // Initialize data consistency after database connection
        await DataPersistenceService.ensureDataConsistency();
        
        // Recover active ride requests for server restart scenarios
        const activeRequests = await DataPersistenceService.recoverActiveRideRequests();
        console.log(`Server initialized with ${activeRequests.length} active ride requests`);
        
        // Start background tasks for data maintenance
        BackgroundTaskScheduler.startAllTasks();
        
        // Start server on all interfaces to allow external connections
        server.listen(config.server.port, () => {
            console.log(`Server is running on port ${config.server.port}`);
            console.log(`Environment: ${config.server.nodeEnv}`);
            console.log('✅ Persistent data system is active');
            console.log(`🌐 Server accessible at http://${config.server.mainUrl}:${config.server.port}`);
        });
    })
    .then(() => {
        app.get('/', (_, res) => {
            res.send('Welcome to the Ride Sharing API');
        });
    })
    .catch((err) => {
        console.error('Database connection failed:', err);
        process.exit(1);
    });