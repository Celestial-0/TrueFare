# WebSocket API Documentation

This document provides a comprehensive overview of the WebSocket service, which manages real-time communication between clients (users and drivers) and the server.

## 1. Overview

The WebSocket service provides real-time, bidirectional communication for essential app features, including ride requests, bidding, and status updates. It is designed to be scalable, resilient, and efficient, with built-in mechanisms for connection management, health monitoring, and broadcasting.

## 2. Connection URL

To establish a WebSocket connection, clients should connect to the following endpoint:

```
/socket.io/
```

## 3. Core Concepts

### Rooms

The service uses rooms to segment communication and deliver targeted messages:

 - **`user:<userId>`**: A private room for each connected user.
 - **`driver:<driverId>`**: A private room for each connected driver.
 - **`request:<requestId>`**: A per-request room joined by a user when `requestId` is specified during registration. Used for targeted bid updates.
 - **`drivers`**: A general room containing all connected drivers, used for broadcasting new ride requests and bidding state changes.

### Heartbeat

The server sends periodic `heartbeat` events: `{ timestamp: Date, type: 'user' | 'driver' }`.

- Emission
  - Users: controller emits every 30s immediately on connection.
  - Users and drivers: service emits after registration at `SOCKET_CONFIG.HEARTBEAT_INTERVAL`.
- Intervals
  - Default: 30,000 ms
  - Production: 45,000 ms
  - Test: 5,000 ms
- Response: clients should emit `heartbeat_response` to update last-seen on the server.
- Stop: heartbeats are cleared on disconnect/unregister.
- Note: a user may temporarily receive duplicate `heartbeat` events after registration (from controller and service). Handle idempotently.

### Broadcasting

The service includes several methods for broadcasting events:

- **`broadcastToUsers`**: Sends a message to all connected users.
- **`broadcastToDrivers`**: Sends a message to all drivers in the `drivers` room.
- **`sendToUser`**: Sends a targeted message to a specific user.
- **`sendToDriver`**: Sends a targeted message to a specific driver.

## 4. Event Reference

### Client-to-Server Events

Below are all events listened to in `backend/src/controllers/socket.controller.js`.

- __`user:register`__
  - Payload (Zod: `userSocketRegistrationSchema`):
    ```json
    {
      "userId": "USER_XXXXXXXX",              // optional; if absent, server generates one
      "requestId": "<24-hex>",                // optional; if present user joins request:<requestId>
      "name": "string",                       // required if userId missing
      "email": "string?",                     // optional, validated
      "phone": "+123..."                      // required if userId missing
    }
    ```
    - Validation: either `userId` OR both `name` and `phone` must be provided.
  - On success:
    - Joins rooms: `user:<userId>` and optionally `request:<requestId>`
    - Emits to caller: `user:registered`

- __`user:requestBidUpdate`__
  - Payload:
    ```json
    { "requestId": "<24-hex>" }
    ```
  - On success:
    - Emits snapshot to caller: `ride:bidUpdate` with `{ requestId, status, bids, bidsCount, timestamp }`

- __`ride:newRequest`__ (from user)
  - Payload (Zod: `rideRequestSchema`):
    ```json
    {
      "rideType": "Taxi | AC_Taxi | Bike | EBike | ERiksha | Auto",
      "pickupLocation": {
        "address": "string",
        "coordinates": { "latitude": 0, "longitude": 0 }
      },
      "destination": {
        "address": "string",
        "coordinates": { "latitude": 0, "longitude": 0 }
      },
      "comfortPreference": 1,   // optional, int 1..5
      "farePreference": 3       // optional, int 1..5
    }
    ```
    - `userId` is taken from the authenticated socket context, not the payload.
  - On success:
    - Emits to caller: `ride:requestCreated` with `{ requestId, userId, status: 'bidding', rideType, pickupLocation, destination, createdAt }`
    - Broadcasts to `drivers` room: `ride:newRequest` with same fields plus `broadcastAt` and `timestamp`

- __`ride:bidAccepted`__ (from user)
  - Payload:
    ```json
    {
      "requestId": "<24-hex>",
      "bidId": "<24-hex>",
      "userId": "USER_XXXXXXXX",
      "timestamp": 1700000000000  // optional
    }
    ```
  - On success (via service):
    - To user: `ride:accepted` `{ requestId, driverId, bid, driverName?, driverPhone?, driverRating?, vehicleInfo?, timestamp }`
    - To winning driver: `ride:bidAccepted` `{ requestId, userId, bid, timestamp }`
    - To all drivers: `ride:biddingClosed` `{ requestId, acceptedDriverId, timestamp }`

- __`ride:cancel`__ (from user)
  - Payload (Zod inline):
    ```json
    {
      "rideId": "string",           // supports internal _id or public requestId
      "reason": "string",
      "timestamp": 1700000000000     // optional
    }
    ```
  - On success:
    - Emits to caller: `ride:cancelled` `{ success: true, message, requestId, status: 'cancelled', cancelledAt }`
    - Broadcasts (service): `ride:cancelled` to `drivers` with `{ requestId, rideId?, status: 'cancelled', reason, cancelledAt, timestamp }`
    - Optionally to user: `ride:cancelled` `{ requestId, status: 'cancelled', reason, cancelledAt }`

- __`driver:register`__
  - Payload (Zod: `driverSocketRegistrationSchema`):
    ```json
    {
      "driverId": "DRIVER_XXXXXXXX", // optional; if absent, server generates one
      "name": "string",
      "email": "string?",
      "phone": "+123...",
      "vehicleInfo": {
        "make": "string?",
        "model": "string?",
        "vehicleType": "Taxi | AC_Taxi | Bike | EBike | ERiksha | Auto?",
        "comfortLevel": 1,
        "priceValue": 3
      },
      "location": { "latitude": 0, "longitude": 0, "address": "string?" },
      "status": "available | busy | offline" // defaults to 'offline' but set to 'available' on register
    }
    ```
  - On success:
    - Joins rooms: `driver:<driverId>` and `drivers`
    - Emits to caller: `driver:registered` `{ success, message, driverId, driver }`
    - Broadcasts to all: `driver:statusUpdated` `{ driverId, status: 'available', timestamp }`

- __`driver:updateStatus`__
  - Payload:
    ```json
    { "driverId": "DRIVER_XXXXXXXX", "status": "available | busy | offline", "timestamp": 1700000000000 }
    ```
  - On success:
    - Broadcasts to all: `driver:statusUpdated` `{ driverId, status, timestamp }`
    - Emits ack to caller: `driver:statusUpdated` `{ success: true, message }`

- __`driver:updateLocation`__
  - Payload (Zod: `driverLocationUpdateSchema`):
    ```json
    {
      "latitude": 0,
      "longitude": 0,
      "address": "string?",
      "accuracy": 10,
      "heading": 45,
      "speed": 12
    }
    ```
  - On success:
    - Emits to caller: `driver:locationUpdated` `{ success: true, location, timestamp }`
    - Broadcasts to users: `driver:locationUpdate` `{ driverId, location, timestamp }`

- __`ride:bidPlaced`__ (from driver)
  - Payload (Zod: `bidPlacementSchema`):
    ```json
    {
      "requestId": "<24-hex>",
      "fareAmount": 120.5,
      "estimatedArrival": 7,
      "message": "string?",
      "vehicleId": "<24-hex>?"
    }
    ```
  - On success:
    - Emits to caller: `driver:bidPlaced` `{ success, requestId, bid: { bidId, fareAmount, estimatedArrival, message, status, bidTime }, isUpdate, timestamp }`
    - Sends to user (targeted): `ride:bidUpdate` `{ requestId, bidId, driverId, fareAmount, estimatedArrival, message, status, bidTime, driverName?, driverRating?, timestamp }`

- __`heartbeat_response`__
  - Payload: none. Acknowledges receipt of `heartbeat` and updates connection last-seen.

---

### Server-to-Client Events

- __`heartbeat`__
  - `{ timestamp: Date, type: 'user' | 'driver' }`

- __`user:registered`__
  - `{ success: true, message, userId, user: { userId, name, email?, phone, isOnline, lastSeen } }`
  - Note: also broadcast by HTTP `auth.controller` to all drivers as `user:registered` with a minimal payload `{ userId, name }`.

- __`driver:registered`__
  - `{ success: true, message, driverId, driver }`
  - Note: also broadcast by HTTP `auth.controller` to all users as `driver:registered` with a minimal payload `{ driverId, name }`.

- __`ride:requestCreated`__
  - `{ requestId, userId, status: 'bidding', rideType, pickupLocation, destination, createdAt }`

- __`ride:newRequest`__ (to `drivers`)
  - `{ requestId, userId, status: 'bidding', rideType, pickupLocation, destination, createdAt, broadcastAt, timestamp }`

- __`ride:bidUpdate`__ (multiple shapes depending on context)
  - Snapshot (on `user:requestBidUpdate`):
    ```json
    { "requestId": "<24-hex>", "status": "bidding | accepted | cancelled | completed", "bids": [ ... ], "bidsCount": 3, "timestamp": "ISO" }
    ```
  - Incremental (after `ride:bidPlaced`):
    ```json
    { "requestId": "<24-hex>", "bidId": "<24-hex>", "driverId": "DRIVER_XXXXXXXX", "fareAmount": 120.5, "estimatedArrival": 7, "message": "", "status": "pending", "bidTime": "ISO", "driverName": "", "driverRating": 4.9, "timestamp": "ISO" }
    ```
  - Generic (service `broadcastBidUpdate`) to `request:<requestId>` room:
    ```json
    { "requestId": "<24-hex>", "bid": { /* bid object */ }, "timestamp": "ISO" }
    ```

- __`ride:accepted`__ (to user)
  - `{ requestId, driverId, bid, driverName?, driverPhone?, driverRating?, vehicleInfo?, timestamp }`

- __`ride:bidAccepted`__ (to winning driver)
  - `{ requestId, userId, bid, timestamp }`

- __`ride:biddingClosed`__ (to all drivers)
  - `{ requestId, acceptedDriverId }`

- __`ride:cancelled`__
  - To drivers (broadcast): `{ requestId, rideId?, status: 'cancelled', reason, cancelledAt, timestamp }`
  - To user (targeted): `{ requestId, status: 'cancelled', reason, cancelledAt }`
  - To canceller (ack): `{ success: true, message, requestId, status: 'cancelled', cancelledAt }`

- __`driver:statusUpdated`__
  - Broadcast: `{ driverId, status: 'available'|'busy'|'offline', timestamp }`
  - Ack to caller: `{ success: true, message }`

- __`driver:locationUpdated`__ (ack to driver)
  - `{ success: true, location: { latitude, longitude, address?, accuracy?, heading?, speed? }, timestamp }`

- __`driver:locationUpdate`__ (to users)
  - `{ driverId, location: { latitude, longitude, address?, accuracy?, heading?, speed? }, timestamp }`

- __`error`__ (generic)
  - `{ message, code, details? }`

## 5. Core Methods

- **`initialize(io)`**: Initializes the service with a Socket.IO instance.
- **`registerUser(socketId, userData)`**: Registers a new user connection.
- **`registerDriver(socketId, driverData)`**: Registers a new driver connection.
- **`unregisterUser(socketId)`**: Removes a user connection.
- **`unregisterDriver(socketId)`**: Removes a driver connection.
- **`broadcastRideRequest(rideRequestData)`**: Broadcasts a new ride request to available drivers.
- **`updateDriverStatus(driverId, status)`**: Updates a driver's availability status.

## 6. Common Error Codes

- `USER_NOT_REGISTERED`
- `UNAUTHORIZED_ACCESS`
- `INVALID_REQUEST_ID`
- `INVALID_BID_ID`
- `REQUEST_NOT_FOUND`
- `REQUEST_NOT_BIDDABLE`
- `BID_UPDATE_FAILED`
 - `BID_PLACEMENT_FAILED`
- `RIDE_CREATION_FAILED`
- `BID_ACCEPTANCE_FAILED`
- `RIDE_CANCELLATION_FAILED`
- `DRIVER_NOT_REGISTERED`
- `DRIVER_NOT_FOUND`
- `INVALID_STATUS_UPDATE`
 - `STATUS_UPDATE_FAILED`
- `LOCATION_UPDATE_FAILED`
 - `DRIVER_NOT_AVAILABLE`
- `VALIDATION_ERROR`
- `RIDE_ALREADY_COMPLETED`
