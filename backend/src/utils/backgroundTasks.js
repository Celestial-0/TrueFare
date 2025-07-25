import DataPersistenceService from '../services/dataPersistenceService.js';

/**
 * Background task scheduler for data maintenance
 */
class BackgroundTaskScheduler {
    static intervals = new Map();

    /**
     * Start all background tasks
     */
    static startAllTasks() {
        console.log('Starting background tasks...');
        
        // Data consistency check every 5 minutes
        this.startTask('dataConsistency', () => {
            DataPersistenceService.ensureDataConsistency();
        }, 5 * 60 * 1000);

        // Cleanup old requests every hour
        this.startTask('cleanup', () => {
            DataPersistenceService.cleanupOldRequests();
        }, 60 * 60 * 1000);
    }

    /**
     * Start a specific background task
     * @param {string} taskName - Name of the task
     * @param {Function} taskFunction - Function to execute
     * @param {number} intervalMs - Interval in milliseconds
     */
    static startTask(taskName, taskFunction, intervalMs) {
        if (this.intervals.has(taskName)) {
            clearInterval(this.intervals.get(taskName));
        }

        const interval = setInterval(async () => {
            try {
                await taskFunction();
            } catch (error) {
                console.error(`Background task ${taskName} failed:`, error);
            }
        }, intervalMs);

        this.intervals.set(taskName, interval);
        console.log(`Started background task: ${taskName} (interval: ${intervalMs}ms)`);
    }

    /**
     * Stop a specific background task
     * @param {string} taskName - Name of the task to stop
     */
    static stopTask(taskName) {
        if (this.intervals.has(taskName)) {
            clearInterval(this.intervals.get(taskName));
            this.intervals.delete(taskName);
            console.log(`Stopped background task: ${taskName}`);
        }
    }

    /**
     * Stop all background tasks
     */
    static stopAllTasks() {
        console.log('Stopping all background tasks...');
        this.intervals.forEach((interval, taskName) => {
            clearInterval(interval);
            console.log(`Stopped background task: ${taskName}`);
        });
        this.intervals.clear();
    }

    /**
     * Get status of all running tasks
     */
    static getTaskStatus() {
        const tasks = Array.from(this.intervals.keys());
        return {
            totalTasks: tasks.length,
            runningTasks: tasks
        };
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping background tasks...');
    BackgroundTaskScheduler.stopAllTasks();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping background tasks...');
    BackgroundTaskScheduler.stopAllTasks();
    process.exit(0);
});

export default BackgroundTaskScheduler;
