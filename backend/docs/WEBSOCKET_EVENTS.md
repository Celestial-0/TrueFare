# TrueFare WebSocket Events Documentation

## Version: 1.2.0
*Last Updated: 2025-07-31*

## Quick Reference
| Event Name | Direction | Emitted By | Description |
|------------|-----------|------------|-------------|
| `user:register` | Frontend → Backend | User App | Register user socket connection |
| `driver:register` | Frontend → Backend | Driver App | Register driver socket connection |
| `ride:newRequest` | Backend → Frontend | Backend | Broadcast new ride request to available drivers |
| `ride:bidPlaced` | Frontend → Backend | Driver App | Place bid on a ride request |
| `ride:bidUpdate` | Backend → Frontend | Backend | Update bid status to user |
| `ride:accepted` | Backend → Frontend | Backend | Notify user that ride request was accepted |
| `ride:bidAccepted` | Backend → Frontend | Backend | Notify driver that their bid was accepted |

## Detailed Events

### Frontend to Backend Events

#### `user:register`
- **Purpose**: Register a user's socket connection with the backend.
- **Payload**:
  ```json
  {
    "userId": "user123",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
  ```

#### `driver:register`
- **Purpose**: Register a driver's socket connection with the backend and set their availability.
- **Payload**:
  ```json
  {
    "driverId": "driver456",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "vehicleInfo": {
      "type": "AC_Taxi",
      "licensePlate": "ABC123"
    }
  }
  ```

#### `user:online`
- **Purpose**: Update user's online status and location.
- **Payload**:
  ```typescript
  {
    userId: string,
    location?: {        // Optional, if available
      latitude: number,
      longitude: number
    },
    timestamp: number   // Unix timestamp in milliseconds
  }
  ```

#### `driver:online`
- **Purpose**: Update driver's online status, location, and vehicle info.
- **Payload**:
  ```typescript
  {
    driverId: string,
    location?: {        // Optional, if available
      latitude: number,
      longitude: number
    },
    vehicleInfo?: {     // Optional, if available
      type: string,     // e.g., "TAXI", "BIKE", etc.
      comfort: number,  // Comfort level (1-5)
      price: number     // Price level (1-5)
    },
    timestamp: number   // Unix timestamp in milliseconds
  }
  ```

#### `ride:newRequest`
- **Purpose**: Create a new ride request.
- **Payload**:
  ```typescript
  {
    requestId: string,   // Unique ID for the ride request
    userId: string,      // ID of the user creating the request
    rideType: string,    // Vehicle type desired (e.g., "TAXI", "BIKE")
    pickupLocation: {
      address: string,
      coordinates: {
        latitude: number,
        longitude: number
      }
    },
    destination: {
      address: string,
      coordinates: {
        latitude: number,
        longitude: number
      }
    },
    timestamp: number    // Unix timestamp in milliseconds
  }
  ```

#### `ride:bidPlaced`
- **Purpose**: Place a bid on a ride request.
- **Payload**:
  ```typescript
  {
    requestId: string,   // ID of the ride request
    driverId: string,    // ID of the driver placing the bid
    fareAmount: number,  // Fare amount offered
    estimatedArrival: number, // Estimated arrival time in minutes
    timestamp: number    // Unix timestamp in milliseconds
  }
  ```

#### `driver:statusUpdate`
- **Purpose**: Update driver's status (e.g., from available to busy).
- **Payload**:
  ```typescript
  {
    driverId: string,
    status: string,      // e.g., "available", "busy"
    timestamp: number    // Unix timestamp in milliseconds
  }
  ```

### Backend to Frontend Events

#### `ride:newRequest`
- **Purpose**: Broadcast a new ride request to all available drivers.
- **Payload**:
  ```json
  {
    "requestId": "req789",
    "userId": "user123",
    "pickupLocation": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destination": {
      "latitude": 37.3352,
      "longitude": -122.0095
    },
    "rideType": "AC_Taxi",
    "timestamp": "2025-07-31T10:30:00Z"
  }
  ```

#### `ride:bidUpdate`
- **Purpose**: Update the user about new bids or changes to existing bids on their ride request.
- **Payload**:
  ```json
  {
    "requestId": "req789",
    "bidId": "bid101",
    "driverId": "driver456",
    "fareAmount": 15.75,
    "status": "pending"
  }
  ```

#### `ride:accepted`
- **Purpose**: Notify the user that their ride request has been accepted by a driver.
- **Payload**:
  ```json
  {
    "requestId": "req789",
    "acceptedBid": {
      "bidId": "bid101",
      "driverId": "driver456",
      "fareAmount": 15.75
    },
    "driverInfo": {
      "name": "John Doe",
      "rating": 4.8
    }
  }
  ```

#### `ride:bidAccepted`
- **Purpose**: Notify the driver that their bid has been accepted.
- **Payload**:
  ```json
  {
    "requestId": "req789",
    "bidId": "bid101",
    "userId": "user123",
    "pickupLocation": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destination": {
      "latitude": 37.3352,
      "longitude": -122.0095
    }
  }
  ```
