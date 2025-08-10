#!/usr/bin/env node

/**
 * Socket Health Check Script
 * Validates socket connections and identifies potential issues
 */

import socketService from '../services/socketService.js';
import socketConnectionManager from '../utils/socketConnectionManager.js';

class SocketHealthChecker {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.recommendations = [];
    }

    /**
     * Run comprehensive health check
     */
    async runHealthCheck() {
        console.log('🔍 Starting Socket Health Check...\n');

        this.checkConnectionConsistency();
        this.checkHeartbeats();
        this.checkMemoryUsage();
        this.checkDuplicateConnections();
        this.checkStaleConnections();

        this.generateReport();
    }

    /**
     * Check consistency between maps
     */
    checkConnectionConsistency() {
        console.log('📋 Checking connection consistency...');

        const serviceUsers = socketService.connectedUsers;
        const serviceDrivers = socketService.connectedDrivers;
        const managerStats = socketConnectionManager.getStats();

        // Check user consistency
        if (serviceUsers.size !== managerStats.userConnections) {
            this.issues.push(`User connection count mismatch: Service=${serviceUsers.size}, Manager=${managerStats.userConnections}`);
        }

        // Check driver consistency
        if (serviceDrivers.size !== managerStats.driverConnections) {
            this.issues.push(`Driver connection count mismatch: Service=${serviceDrivers.size}, Manager=${managerStats.driverConnections}`);
        }

        // Check for orphaned connections
        for (const [socketId, userInfo] of serviceUsers) {
            const connection = socketConnectionManager.getConnection(socketId);
            if (!connection) {
                this.issues.push(`Orphaned user connection in service: ${socketId} (${userInfo.userId})`);
            }
        }

        for (const [socketId, driverInfo] of serviceDrivers) {
            const connection = socketConnectionManager.getConnection(socketId);
            if (!connection) {
                this.issues.push(`Orphaned driver connection in service: ${socketId} (${driverInfo.driverId})`);
            }
        }
    }

    /**
     * Check heartbeat status
     */
    checkHeartbeats() {
        console.log('💓 Checking heartbeat status...');

        const heartbeats = socketService.heartbeatTimeouts;
        const allConnections = socketService.connectedUsers.size + socketService.connectedDrivers.size;

        if (heartbeats.size !== allConnections) {
            this.warnings.push(`Heartbeat count mismatch: Expected=${allConnections}, Actual=${heartbeats.size}`);
        }

        // Check for heartbeats without connections
        for (const socketId of heartbeats.keys()) {
            const hasUser = socketService.connectedUsers.has(socketId);
            const hasDriver = socketService.connectedDrivers.has(socketId);
            
            if (!hasUser && !hasDriver) {
                this.issues.push(`Heartbeat exists for disconnected socket: ${socketId}`);
            }
        }
    }

    /**
     * Check memory usage
     */
    checkMemoryUsage() {
        console.log('🧠 Checking memory usage...');

        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

        if (heapUsedMB > 512) { // 512MB threshold
            this.warnings.push(`High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`);
            this.recommendations.push('Consider implementing periodic garbage collection');
        }

        const connectionMemory = this.estimateConnectionMemoryUsage();
        if (connectionMemory > 50) { // 50MB threshold
            this.warnings.push(`High connection memory usage: ~${connectionMemory}MB`);
        }
    }

    /**
     * Check for duplicate connections
     */
    checkDuplicateConnections() {
        console.log('🔄 Checking for duplicate connections...');

        const userIds = new Set();
        const driverIds = new Set();
        const duplicateUsers = [];
        const duplicateDrivers = [];

        // Check users
        for (const userInfo of socketService.connectedUsers.values()) {
            if (userIds.has(userInfo.userId)) {
                duplicateUsers.push(userInfo.userId);
            } else {
                userIds.add(userInfo.userId);
            }
        }

        // Check drivers
        for (const driverInfo of socketService.connectedDrivers.values()) {
            if (driverIds.has(driverInfo.driverId)) {
                duplicateDrivers.push(driverInfo.driverId);
            } else {
                driverIds.add(driverInfo.driverId);
            }
        }

        if (duplicateUsers.length > 0) {
            this.issues.push(`Duplicate user connections: ${duplicateUsers.join(', ')}`);
        }

        if (duplicateDrivers.length > 0) {
            this.issues.push(`Duplicate driver connections: ${duplicateDrivers.join(', ')}`);
        }
    }

    /**
     * Check for stale connections
     */
    checkStaleConnections() {
        console.log('⏰ Checking for stale connections...');

        const now = new Date();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes
        const staleUsers = [];
        const staleDrivers = [];

        // Check users
        for (const [socketId, userInfo] of socketService.connectedUsers) {
            if (now - userInfo.lastSeen > staleThreshold) {
                staleUsers.push(`${userInfo.userId} (${socketId})`);
            }
        }

        // Check drivers
        for (const [socketId, driverInfo] of socketService.connectedDrivers) {
            if (now - driverInfo.lastSeen > staleThreshold) {
                staleDrivers.push(`${driverInfo.driverId} (${socketId})`);
            }
        }

        if (staleUsers.length > 0) {
            this.warnings.push(`Stale user connections: ${staleUsers.join(', ')}`);
        }

        if (staleDrivers.length > 0) {
            this.warnings.push(`Stale driver connections: ${staleDrivers.join(', ')}`);
        }
    }

    /**
     * Estimate memory usage
     */
    estimateConnectionMemoryUsage() {
        const userCount = socketService.connectedUsers.size;
        const driverCount = socketService.connectedDrivers.size;
        
        // Rough estimation: 1KB per user, 1.5KB per driver
        const estimatedBytes = (userCount * 1024) + (driverCount * 1536);
        return Math.round(estimatedBytes / 1024 / 1024); // MB
    }

    /**
     * Generate health report
     */
    generateReport() {
        console.log('\n📊 SOCKET HEALTH REPORT');
        console.log('═'.repeat(50));

        // Connection Stats
        const stats = socketService.getStats();
        console.log('\n📈 Connection Statistics:');
        console.log(`  Total Connections: ${stats.totalConnections}`);
        console.log(`  Users: ${stats.connectedUsers}`);
        console.log(`  Drivers: ${stats.connectedDrivers}`);
        console.log(`  Active Heartbeats: ${stats.activeHeartbeats}`);
        console.log(`  Rooms: ${stats.rooms}`);

        // Memory Stats
        const memUsage = process.memoryUsage();
        console.log('\n🧠 Memory Usage:');
        console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
        console.log(`  Connection Memory: ~${this.estimateConnectionMemoryUsage()}MB`);

        // Issues
        if (this.issues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }

        // Warnings
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach((warning, index) => {
                console.log(`  ${index + 1}. ${warning}`);
            });
        }

        // Recommendations
        if (this.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            this.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }

        // Overall Health
        console.log('\n🏥 OVERALL HEALTH:');
        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('  ✅ EXCELLENT - No issues detected');
        } else if (this.issues.length === 0) {
            console.log('  🟡 GOOD - Minor warnings detected');
        } else {
            console.log('  🔴 CRITICAL - Issues require immediate attention');
        }

        console.log('\n' + '═'.repeat(50));
        console.log('🔍 Health check completed\n');
    }

    /**
     * Auto-fix common issues
     */
    async autoFix() {
        console.log('🔧 Attempting to auto-fix issues...\n');

        let fixCount = 0;

        // Clean up stale connections
        const staleCount = socketConnectionManager.cleanupStaleConnections();
        if (staleCount > 0) {
            console.log(`✅ Cleaned up ${staleCount} stale connections`);
            fixCount += staleCount;
        }

        // Sync heartbeats
        const syncedHeartbeats = this.syncHeartbeats();
        if (syncedHeartbeats > 0) {
            console.log(`✅ Synchronized ${syncedHeartbeats} heartbeats`);
            fixCount += syncedHeartbeats;
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            console.log('✅ Forced garbage collection');
            fixCount++;
        }

        console.log(`\n🔧 Auto-fix completed: ${fixCount} issues resolved\n`);
        return fixCount;
    }

    /**
     * Sync heartbeats with connections
     */
    syncHeartbeats() {
        let syncCount = 0;

        // Remove orphaned heartbeats
        for (const socketId of socketService.heartbeatTimeouts.keys()) {
            const hasUser = socketService.connectedUsers.has(socketId);
            const hasDriver = socketService.connectedDrivers.has(socketId);
            
            if (!hasUser && !hasDriver) {
                socketService.stopHeartbeat(socketId);
                syncCount++;
            }
        }

        // Add missing heartbeats
        for (const socketId of socketService.connectedUsers.keys()) {
            if (!socketService.heartbeatTimeouts.has(socketId)) {
                socketService.startHeartbeat(socketId, 'user');
                syncCount++;
            }
        }

        for (const socketId of socketService.connectedDrivers.keys()) {
            if (!socketService.heartbeatTimeouts.has(socketId)) {
                socketService.startHeartbeat(socketId, 'driver');
                syncCount++;
            }
        }

        return syncCount;
    }
}

// Export for use in other modules
export default SocketHealthChecker;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new SocketHealthChecker();
    
    if (process.argv.includes('--fix')) {
        await checker.autoFix();
    }
    
    await checker.runHealthCheck();
}
