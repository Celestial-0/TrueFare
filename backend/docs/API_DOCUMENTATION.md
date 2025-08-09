# TrueFare Backend API Documentation

## Authentication Endpoints

Base Path: `/api/auth`

### POST /api/auth/login/user
- __Purpose__: User login
- __Controller__: `loginUser`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `userLoginSchema`

### POST /api/auth/login/driver
- __Purpose__: Driver login
- __Controller__: `loginDriver`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `driverLoginSchema`

### POST /api/auth/register/user
- __Purpose__: Create a new user account
- __Controller__: `registerUser`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `userRegistrationSchema`

### POST /api/auth/register/driver
- __Purpose__: Create a new driver account
- __Controller__: `registerDriver`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `driverRegistrationSchema`

### GET /api/auth/user/:userId
- __Purpose__: Get user profile by ID
- __Controller__: `getUserProfile`
- __Access Control__: Not enforced in this router; recommended to require authentication
- __Validation__:
  - Params: `userIdParamSchema`

### GET /api/auth/stats
- __Purpose__: Authentication statistics
- __Controller__: `getAuthStats`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `authStatsQuerySchema`

### PATCH /api/auth/bulk-status
- __Purpose__: Bulk update status of users/drivers
- __Controller__: `bulkUpdateStatus`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `bulkStatusUpdateSchema`

### POST /api/auth/maintenance
- __Purpose__: Perform auth maintenance operation
- __Controller__: `performMaintenance`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `maintenanceOperationSchema`

## Driver Endpoints

Base Path: `/api/drivers`

### POST /api/drivers/register
- __Purpose__: Register a new driver
- __Controller__: `registerDriver`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `driverRegistrationSchema`

### GET /api/drivers/profile/:driverId
- __Purpose__: Get driver profile
- __Controller__: `getDriverProfile`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`

### PUT /api/drivers/profile/:driverId
- __Purpose__: Update driver profile
- __Controller__: `updateDriverProfile`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Body: `driverUpdateSchema`

### GET /api/drivers/:driverId/earnings
- __Purpose__: Get driver earnings
- __Controller__: `getDriverEarnings`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `driverEarningsQuerySchema`

### GET /api/drivers/:driverId/bids
- __Purpose__: Get driver bid history
- __Controller__: `getDriverBids`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `driverBidHistoryQuerySchema`

### GET /api/drivers/:driverId/rides
- __Purpose__: Get driver ride history
- __Controller__: `getDriverRideHistory`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `driverRideHistoryQuerySchema`

### PUT /api/drivers/:driverId/location
- __Purpose__: Update driver location
- __Controller__: `updateDriverLocation`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Body: `driverLocationUpdateSchema`

### GET /api/drivers/:driverId/stats
- __Purpose__: Get driver statistics
- __Controller__: `getDriverStats`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `analyticsQuerySchema`

### GET /api/drivers/:driverId/vehicles
- __Purpose__: Get driver vehicles
- __Controller__: `getDriverVehicles`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`

### POST /api/drivers/:driverId/vehicles
- __Purpose__: Assign vehicles to driver
- __Controller__: `assignVehiclesToDriver`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Body: `driverVehicleAssignmentSchema`

### DELETE /api/drivers/:driverId/vehicles
- __Purpose__: Remove vehicles from driver
- __Controller__: `removeVehiclesFromDriver`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Body: `driverVehicleAssignmentSchema`

### PATCH /api/drivers/:driverId/vehicle (Deprecated)
- __Purpose__: Update driver vehicle info (use vehicle endpoints instead)
- __Controller__: `updateDriverProfile`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Body: `driverUpdateSchema`

### GET /api/drivers/available
- __Purpose__: List available drivers
- __Controller__: `getAvailableDrivers`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `driverQuerySchema`

### GET /api/drivers/nearby
- __Purpose__: Find nearby drivers
- __Controller__: `getNearbyDrivers`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `nearbyDriversQuerySchema`

### PATCH /api/drivers/bulk-status
- __Purpose__: Bulk update driver status
- __Controller__: `bulkUpdateDriverStatus`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `bulkUpdateDriverStatusSchema`

### GET /api/drivers/:driverId/analytics
- __Purpose__: Driver performance analytics
- __Controller__: `getDriverAnalytics`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `driverAnalyticsQuerySchema`

### GET /api/drivers/connected
- __Purpose__: List connected drivers (debug/admin)
- __Controller__: Inline handler (uses `getConnectedDrivers()`)
- __Access Control__: Not enforced in this router; intended admin/debug
- __Validation__: None

## Ride Request Endpoints

Base Path: `/api/ride-requests`

### GET /api/ride-requests/available
- __Purpose__: Get available ride requests for drivers
- __Controller__: `getAvailableRideRequests`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `availableRideRequestsQuerySchema`

### GET /api/ride-requests/:requestId
- __Purpose__: Get a specific ride request
- __Controller__: `getRideRequest`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `requestIdParamSchema`

### GET /api/ride-requests/user/:userId
- __Purpose__: Get all ride requests for a user
- __Controller__: `getUserRideRequests`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Query: `getRideRequestsQuerySchema`

### GET /api/ride-requests/:requestId/bids
- __Purpose__: Get bids for a ride request
- __Controller__: `getRideRequestBids`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `requestIdParamSchema`
  - Query: `getBidsQuerySchema`

### GET /api/ride-requests/analytics
- __Purpose__: Ride request analytics
- __Controller__: `getRideRequestAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `rideRequestAnalyticsQuerySchema`

### POST /api/ride-requests/bulk-cancel
- __Purpose__: Bulk cancel ride requests
- __Controller__: `bulkCancelRequests`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `bulkCancelRequestsSchema`

### POST /api/ride-requests/optimize-matching
- __Purpose__: Optimize ride matching
- __Controller__: `optimizeMatching`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `optimizeMatchingSchema`

## User Endpoints

Base Path: `/api/users`

### POST /api/users/register
- __Purpose__: Register a new user
- __Controller__: `registerUser`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `userRegistrationSchema`

### GET /api/users/profile/:userId
- __Purpose__: Get user profile
- __Controller__: `getUserProfile`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`

### PUT /api/users/profile/:userId
- __Purpose__: Update user profile
- __Controller__: `updateUserProfile`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Body: `userUpdateSchema`

### GET /api/users/:userId/ride-history
- __Purpose__: Get user ride history
- __Controller__: `getUserRideHistory`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Query: `userRideHistoryQuerySchema`

### GET /api/users/:userId/stats
- __Purpose__: Get user statistics
- __Controller__: `getUserStats`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Query: `analyticsQuerySchema`

## Vehicle Endpoints

Base Path: `/api/vehicles`

### GET /api/vehicles/search
- __Purpose__: Search vehicles for a ride
- __Controller__: `searchVehiclesForRide`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `vehicleSearchForRideSchema`

### GET /api/vehicles/by-type
- __Purpose__: Get vehicles filtered by type
- __Controller__: `getVehiclesByType`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `vehicleByTypeQuerySchema`

### GET /api/vehicles/statistics
- __Purpose__: Get vehicle statistics
- __Controller__: `getVehicleStatistics`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `vehicleStatisticsQuerySchema`

### GET /api/vehicles/analytics
- __Purpose__: Vehicle analytics
- __Controller__: `getVehicleAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `vehicleAnalyticsSchema`

### GET /api/vehicles/maintenance-recommendations
- __Purpose__: Get vehicle maintenance recommendations
- __Controller__: `getMaintenanceRecommendations`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `maintenanceRecommendationsQuerySchema`

### PATCH /api/vehicles/bulk-status
- __Purpose__: Bulk update vehicle statuses
- __Controller__: `bulkUpdateVehicleStatus`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `bulkVehicleStatusUpdateSchema`

### POST /api/vehicles/optimize-allocation
- __Purpose__: Optimize vehicle allocation
- __Controller__: `optimizeVehicleAllocation`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `vehicleAllocationOptimizationSchema`

### GET /api/vehicles
- __Purpose__: List all vehicles
- __Controller__: `getVehicles`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Query: `vehicleQuerySchema`

### POST /api/vehicles
- __Purpose__: Create a new vehicle
- __Controller__: `createVehicle`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Body: `vehicleCreationSchema`

### GET /api/vehicles/:vehicleId
- __Purpose__: Get a specific vehicle
- __Controller__: `getVehicle`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `vehicleIdSchema`

### PUT /api/vehicles/:vehicleId
- __Purpose__: Update a vehicle
- __Controller__: `updateVehicle`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `vehicleIdSchema`
  - Body: `vehicleUpdateSchema`

### PATCH /api/vehicles/:vehicleId/status
- __Purpose__: Update vehicle status
- __Controller__: `updateVehicleStatus`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `vehicleIdSchema`
  - Body: `vehicleStatusUpdateSchema`

### DELETE /api/vehicles/:vehicleId
- __Purpose__: Delete a vehicle
- __Controller__: `deleteVehicle`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Params: `vehicleIdSchema`

### PUT /api/users/:userId/location
- __Purpose__: Update user location
- __Controller__: `updateUserLocation`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Body: `userLocationUpdateSchema`

### PUT /api/users/:userId/preferences
- __Purpose__: Update user preferences
- __Controller__: `updateUserPreferences`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Body: `userPreferencesUpdateSchema`

### GET /api/users/:userId/recommendations
- __Purpose__: Get personalized vehicle recommendations
- __Controller__: `getPersonalizedRecommendations`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`
  - Query: `userRecommendationsQuerySchema`

### GET /api/users/:userId/favorites
- __Purpose__: Get user's favorite drivers and vehicles
- __Controller__: `getUserFavorites`
- __Access Control__: Not enforced in this router
- __Validation__:
  - Params: `userIdParamSchema`

### GET /api/users/analytics
- __Purpose__: User analytics
- __Controller__: `getUserAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `userAnalyticsQuerySchema`

### PATCH /api/users/bulk-preferences
- __Purpose__: Bulk update user preferences
- __Controller__: `bulkUpdatePreferences`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `bulkUpdatePreferencesSchema`

## Admin Endpoints

Base Path: `/api/admin`

### GET /api/admin/stats
- __Purpose__: Ride request statistics
- __Controller__: Inline (uses `DataPersistenceService.getRideRequestStats`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `adminStatsQuerySchema`

### GET /api/admin/driver/:driverId/bids
- __Purpose__: Driver bid history
- __Controller__: Inline (uses `DataPersistenceService.getDriverBidHistory`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Params: `driverIdParamSchema`
  - Query: `adminPaginationSchema`

### GET /api/admin/user/:userId/rides
- __Purpose__: User ride history
- __Controller__: Inline (uses `DataPersistenceService.getUserRideHistory`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Params: `userIdParamSchema`
  - Query: `adminPaginationSchema`

### GET /api/admin/pending-bids
- __Purpose__: Pending bids
- __Controller__: Inline (uses `DataPersistenceService.getPendingBids`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `adminPendingBidsQuerySchema`

### DELETE /api/admin/cleanup
- __Purpose__: Cleanup old ride requests
- __Controller__: Inline (uses `DataPersistenceService.cleanupOldRequests`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/backup
- __Purpose__: Backup ride request data
- __Controller__: Inline (uses `DataPersistenceService.backupRideRequestData`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/health
- __Purpose__: Persistence health check
- __Controller__: Inline (uses `DataPersistenceService.getRideRequestStats`, `DataPersistenceService.recoverActiveRideRequests`)
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/auth
- __Purpose__: Authentication analytics
- __Controller__: `getAuthStats`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/drivers
- __Purpose__: Driver analytics
- __Controller__: `getDriverAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/rides
- __Purpose__: Ride request analytics
- __Controller__: `getRideRequestAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/users
- __Purpose__: User analytics
- __Controller__: `getUserAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/vehicles
- __Purpose__: Vehicle analytics
- __Controller__: `getVehicleAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/analytics/connections
- __Purpose__: Socket connection analytics
- __Controller__: `getConnectionAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### PATCH /api/admin/bulk/auth-status
- __Purpose__: Bulk update authentication status
- __Controller__: `bulkUpdateStatus`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### PATCH /api/admin/bulk/driver-status
- __Purpose__: Bulk update driver status
- __Controller__: `bulkUpdateDriverStatus`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### PATCH /api/admin/bulk/user-preferences
- __Purpose__: Bulk update user preferences
- __Controller__: `bulkUpdatePreferences`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### POST /api/admin/optimize/matching
- __Purpose__: Optimize ride matching
- __Controller__: `optimizeMatching`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### POST /api/admin/optimize/vehicles
- __Purpose__: Optimize vehicle allocation
- __Controller__: `optimizeVehicleAllocation`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### POST /api/admin/optimize/sockets
- __Purpose__: Optimize socket performance
- __Controller__: `optimizeSocketPerformance`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### POST /api/admin/maintenance/auth
- __Purpose__: Auth maintenance
- __Controller__: `performMaintenance`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/maintenance/vehicles
- __Purpose__: Vehicle maintenance recommendations
- __Controller__: `getMaintenanceRecommendations`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### POST /api/admin/broadcast
- __Purpose__: Broadcast announcement
- __Controller__: `broadcastAnnouncement`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

### GET /api/admin/insights/user-behavior
- __Purpose__: User behavior insights
- __Controller__: `getUserBehaviorInsights`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__: None

## Socket Endpoints

Base Path: `/api/socket`

### GET /api/socket/analytics
- __Purpose__: Socket analytics
- __Controller__: `getConnectionAnalytics`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Query: `socketAnalyticsQuerySchema`

### GET /api/socket/connected/drivers
- __Purpose__: Connected drivers
- __Controller__: Inline (uses `getConnectedDrivers`)
- __Access Control__: Not enforced in this router; intended admin/debug
- __Validation__: None

### GET /api/socket/connected/users
- __Purpose__: Connected users
- __Controller__: Inline (uses `getConnectedUsers`)
- __Access Control__: Not enforced in this router; intended admin/debug
- __Validation__: None

### GET /api/socket/stats
- __Purpose__: Connection statistics
- __Controller__: Inline (uses `getConnectionStats`)
- __Access Control__: Not enforced in this router; intended admin/debug
- __Validation__: None

### POST /api/socket/broadcast
- __Purpose__: Broadcast to clients
- __Controller__: `broadcastAnnouncement`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `broadcastMessageSchema`

### POST /api/socket/rooms
- __Purpose__: Manage socket rooms
- __Controller__: `manageSocketRooms`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `socketRoomSchema`

### POST /api/socket/optimize
- __Purpose__: Optimize socket performance
- __Controller__: `optimizeSocketPerformance`
- __Access Control__: Not enforced in this router; intended admin-only (add middleware)
- __Validation__:
  - Body: `socketOptimizationSchema`
