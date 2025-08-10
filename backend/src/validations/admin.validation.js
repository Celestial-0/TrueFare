import { z } from 'zod';

// Admin query pagination with enhanced limits
export const adminPaginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(500).default(50), // Higher limit for admin
    sortBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Admin statistics query validation
export const adminStatsQuerySchema = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    groupBy: z.enum(['hour', 'day', 'week', 'month', 'year']).default('day'),
    metrics: z.array(z.enum([
        'users', 'drivers', 'rides', 'earnings', 'vehicles', 
        'bids', 'cancellations', 'ratings', 'socket_connections'
    ])).default(['users', 'drivers', 'rides']),
    includeComparisons: z.boolean().default(true),
    includeProjections: z.boolean().default(false)
});

// Admin user/driver history query validation
export const adminHistoryQuerySchema = z.object({
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    status: z.array(z.string()).optional(),
    includeDetails: z.boolean().default(true),
    includeMetadata: z.boolean().default(false),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(1000).default(100)
}).refine(
    (data) => data.userId || data.driverId,
    {
        message: 'Either userId or driverId must be provided',
        path: ['userId', 'driverId']
    }
);

// Admin pending bids query validation
export const adminPendingBidsQuerySchema = z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid request ID format').optional(),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    minFare: z.number().min(0).optional(),
    maxFare: z.number().min(0).optional(),
    ageThreshold: z.number().min(1).max(1440).default(60), // minutes
    rideType: z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto']).optional(),
    sortBy: z.enum(['createdAt', 'fareAmount', 'distance', 'priority']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(500).default(50)
});

// Admin bulk operations validation
export const adminBulkOperationSchema = z.object({
    operation: z.enum([
        'approve', 'reject', 'suspend', 'activate', 'delete', 
        'reset', 'update_status', 'send_notification'
    ]),
    targetType: z.enum(['users', 'drivers', 'vehicles', 'ride_requests', 'bids']),
    targetIds: z.array(z.string()).min(1, 'At least one target ID is required').max(1000, 'Cannot process more than 1000 items'),
    parameters: z.object({
        reason: z.string().max(500).optional(),
        notifyTargets: z.boolean().default(true),
        effectiveDate: z.string().date().optional(),
        metadata: z.record(z.any()).optional()
    }).optional(),
    confirmationCode: z.string().min(6, 'Confirmation code required for bulk operations'),
    dryRun: z.boolean().default(true)
});

// Admin system maintenance validation
export const adminMaintenanceSchema = z.object({
    operation: z.enum([
        'database_cleanup', 'index_optimization', 'cache_clear', 
        'log_rotation', 'backup_creation', 'data_migration',
        'performance_analysis', 'security_scan'
    ]),
    scope: z.enum(['full', 'partial', 'test']).default('partial'),
    parameters: z.object({
        targetDate: z.string().date().optional(),
        batchSize: z.number().min(1).max(10000).default(1000),
        retentionDays: z.number().min(1).max(3650).default(90),
        includeBackup: z.boolean().default(true),
        skipValidation: z.boolean().default(false)
    }).optional(),
    scheduledFor: z.string().date().optional(),
    confirmationCode: z.string().min(8, 'Confirmation code required for maintenance operations'),
    notifyAdmins: z.boolean().default(true)
});

// Admin reporting query validation
export const adminReportQuerySchema = z.object({
    reportType: z.enum([
        'usage_analytics', 'financial_summary', 'performance_metrics',
        'user_behavior', 'driver_performance', 'system_health',
        'security_audit', 'data_quality'
    ]),
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
    format: z.enum(['json', 'csv', 'pdf', 'excel']).default('json'),
    includeCharts: z.boolean().default(false),
    includeRawData: z.boolean().default(false),
    filters: z.object({
        userTypes: z.array(z.enum(['user', 'driver'])).optional(),
        rideTypes: z.array(z.enum(['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'])).optional(),
        regions: z.array(z.string()).optional(),
        statusFilters: z.array(z.string()).optional()
    }).optional(),
    aggregationLevel: z.enum(['hour', 'day', 'week', 'month']).default('day')
});

// Admin user management validation
export const adminUserManagementSchema = z.object({
    action: z.enum(['view', 'edit', 'suspend', 'activate', 'delete', 'reset_password', 'send_notification']),
    userId: z.string().regex(/^USER_[0-9A-F]{8}$/, 'Invalid user ID format').optional(),
    driverId: z.string().regex(/^DRIVER_[0-9A-F]{8}$/, 'Invalid driver ID format').optional(),
    updates: z.object({
        status: z.enum(['active', 'inactive', 'suspended', 'banned']).optional(),
        reason: z.string().max(500).optional(),
        notes: z.string().max(1000).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
    }).optional(),
    notification: z.object({
        type: z.enum(['email', 'sms', 'push', 'in_app']),
        message: z.string().min(1).max(500),
        urgent: z.boolean().default(false)
    }).optional()
}).refine(
    (data) => data.userId || data.driverId,
    {
        message: 'Either userId or driverId must be provided',
        path: ['userId', 'driverId']
    }
);

// Admin configuration validation
export const adminConfigurationSchema = z.object({
    category: z.enum(['system', 'business', 'security', 'performance', 'notification']),
    settings: z.record(z.any()),
    environment: z.enum(['development', 'staging', 'production']).optional(),
    version: z.string().optional(),
    effective_date: z.string().date().optional(),
    backup_current: z.boolean().default(true),
    validate_before_apply: z.boolean().default(true)
});

// Admin analytics dashboard validation
export const adminDashboardQuerySchema = z.object({
    dashboard: z.enum(['overview', 'operations', 'financial', 'performance', 'security']),
    timeRange: z.enum(['1h', '24h', '7d', '30d', '90d', '1y']).default('24h'),
    refresh_rate: z.number().min(30).max(3600).default(300), // seconds
    widgets: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional()
});

// Common validation helpers
export const validateAdminAction = (action) => {
    return z.enum([
        'view', 'create', 'edit', 'delete', 'approve', 'reject',
        'suspend', 'activate', 'report', 'audit', 'backup', 'restore'
    ]).safeParse(action);
};

export const validateConfirmationCode = (code) => {
    return z.string().min(6).max(20).regex(/^[A-Z0-9]+$/, 'Confirmation code must be alphanumeric uppercase').safeParse(code);
};

export const validateDateRange = (dateFrom, dateTo) => {
    const schema = z.object({
        dateFrom: z.string().date(),
        dateTo: z.string().date()
    }).refine(
        (data) => new Date(data.dateFrom) < new Date(data.dateTo),
        {
            message: 'Start date must be before end date',
            path: ['dateTo']
        }
    );
    return schema.safeParse({ dateFrom, dateTo });
};

export const validateBulkOperationSize = (ids, maxSize = 1000) => {
    return z.array(z.string()).min(1).max(maxSize).safeParse(ids);
};
