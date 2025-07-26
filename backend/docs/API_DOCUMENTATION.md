# TrueFare Backend API Documentation

## Authentication Endpoints

### User Login
- **Endpoint**: `POST /api/auth/login/user`  
Authenticates a user and returns a session token

### Driver Login
- **Endpoint**: `POST /api/auth/login/driver`  
Authenticates a driver and returns a session token

### User Registration
- **Endpoint**: `POST /api/auth/register/user`  
Creates a new user account

### Driver Registration
- **Endpoint**: `POST /api/auth/register/driver`  
Creates a new driver account

### Get User Profile
- **Endpoint**: `GET /api/auth/user/:userId`  
Retrieves profile information for a specific user

### Get Authentication Statistics
- **Endpoint**: `GET /api/auth/stats`  
Returns authentication system metrics (admin only)

### Bulk Status Update
- **Endpoint**: `PATCH /api/auth/bulk-status`  
Updates status for multiple users/drivers (admin only)

### Perform Maintenance
- **Endpoint**: `POST /api/auth/maintenance`  
Performs system maintenance operations (admin only)
