# TrueFare Backend

A **real-time ride-hailing service** built with **Node.js, Express.js, Socket.IO, and MongoDB**. This backend provides a complete fare bidding system where users can request rides, drivers can bid on requests, and real-time communication facilitates dynamic interactions.

## 🚀 Core Features

### Real-Time Fare Bidding System
- **User Journey**: Users create ride requests with pickup and destination locations
- **Driver Broadcasting**: Requests are instantly broadcasted to all available drivers via Socket.IO
- **Competitive Bidding**: Drivers submit fare bids in real-time
- **Bid Selection**: Users can view, sort, and select from received bids
- **Live Updates**: Real-time bid updates and notifications

### Data Persistence & Recovery
- **MongoDB Integration**: All data persistently stored with automatic recovery
- **Server Restart Resilience**: Active ride requests recovered on server restart
- **Background Tasks**: Automated data consistency checks and cleanup
- **Historical Tracking**: Complete audit trail of all rides and bids

## 🏗️ Architecture Overview

### Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time**: Socket.IO for bidirectional communication
- **Validation**: Zod for request/response validation
- **Environment**: ES6 modules, dotenv configuration

### Core Components

#### 1. **Models** (`/src/models/`)
- **User Model**: User profiles, locations, preferences, online status
- **Driver Model**: Driver profiles, vehicle info, location tracking, availability
- **RideRequest Model**: Ride details, bids, status management, bid sorting

#### 2. **Controllers** (`/src/controllers/`)
- **Registration Controller**: User and driver registration/profile management
- **RideRequest Controller**: CRUD operations for ride requests and bid management
- **Socket Controller**: Real-time event handling for users and drivers

#### 3. **Services** (`/src/services/`)
- **DataPersistenceService**: Data recovery, consistency, statistics, and cleanup
- **Background Tasks**: Scheduled maintenance and monitoring

#### 4. **Real-Time Communication** (`/src/controllers/socket.controller.js`)
- **User Events**: Registration, ride requests, bid updates, bid acceptance
- **Driver Events**: Registration, location updates, bid submissions
- **Broadcasting**: Request distribution and bid notifications

## 🔧 API Endpoints

### User Management
```
POST /api/users/register          - Register new user
GET  /api/users/profile/:userId   - Get user profile
```

### Driver Management
```
POST /api/drivers/register              - Register new driver
GET  /api/drivers/profile/:driverId     - Get driver profile
PUT  /api/drivers/profile/:driverId     - Update driver profile
GET  /api/drivers/connected             - Get connected drivers
```

### Ride Requests
```
POST /api/ride-requests                     - Create ride request
GET  /api/ride-requests/:requestId          - Get specific ride request
GET  /api/ride-requests/user/:userId        - Get user's ride history
GET  /api/ride-requests/:requestId/bids     - Get bids for request
GET  /api/ride-requests/:requestId/bids/live - Get live bid updates
POST /api/ride-requests/:requestId/bids/:bidId/accept - Accept bid
```

### Admin Operations
```
GET  /api/admin/stats                    - System statistics
GET  /api/admin/driver/:driverId/bids    - Driver bid history
GET  /api/admin/user/:userId/rides       - User ride history
GET  /api/admin/pending-bids             - Pending bids
GET  /api/admin/backup                   - Backup ride data
DELETE /api/admin/cleanup                - Cleanup old requests
GET  /api/admin/health                   - System health check
```

## 🔄 Real-Time Events

### User Events
- `user:register` - User registration
- `user:request_ride` - Create ride request
- `user:get_bid_update` - Get latest bids
- `bids:updated` - Receive bid updates

### Driver Events
- `driver:register` - Driver registration
- `driver:location_update` - Location updates
- `driver:place_bid` - Submit fare bid
- `new_ride_request` - Receive ride requests
- `bid:confirmed` - Bid confirmation

## 🗄️ Database Schema

### Collections
- **users**: User profiles and preferences
- **drivers**: Driver profiles and vehicle information
- **riderequests**: Ride requests with embedded bids

### Key Features
- **Indexing**: Optimized queries for location, status, and time-based searches
- **Validation**: Comprehensive data validation at model level
- **Methods**: Custom methods for bid management and sorting
- **References**: Efficient data relationships and lookups

## 🛠️ Development Features

### Validation System
- **Zod Integration**: Type-safe validation for all endpoints
- **Custom Validators**: ID format validation, coordinate validation
- **Error Handling**: Consistent error responses with codes

### Background Processing
- **Data Consistency**: Automatic data integrity checks
- **Cleanup Tasks**: Removal of old/stale requests
- **Statistics**: Performance monitoring and reporting

### Testing & Debugging
- **Admin Panel**: Comprehensive system monitoring
- **Logging**: Detailed logging for debugging and monitoring

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB instance
- Environment variables configured

### Installation
```bash
npm install
npm run dev    # Development mode
npm start      # Production mode
```

### Environment Setup
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017
CLIENT_URL=http://localhost:3000
DB_NAME=TrueFare
```

**Note**: For production, use secure database connections and configure appropriate CORS settings.

### Configuration
Application constants are defined in `src/constants.js`:
- Default user preferences (wait time, price range)
- Driver status options
- Ride request status
- Refresh intervals and timeouts

## 📊 System Capabilities

### Scalability Features
- **Connection Management**: Efficient Socket.IO connection handling
- **Memory Management**: Optimized in-memory driver/user tracking
- **Database Indexing**: Performance-optimized queries
- **Background Tasks**: Automated system maintenance

### Monitoring & Analytics
- **Real-Time Stats**: Live system statistics
- **Historical Data**: Complete ride and bid history
- **Performance Metrics**: Response times and system health
- **Admin Dashboard**: Comprehensive system overview

This backend provides a robust foundation for a ride-hailing service, combining real-time communication for dynamic interactions with reliable data storage for historical tracking and scalability.