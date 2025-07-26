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
- **`drivers`**: A general room containing all connected drivers, used for broadcasting new ride requests.

### Heartbeat

A heartbeat mechanism is used to monitor the health of each connection. The server periodically sends a `heartbeat` event to clients, and if a client becomes unresponsive, it is disconnected to free up resources.

### Broadcasting

The service includes several methods for broadcasting events:

- **`broadcastToUsers`**: Sends a message to all connected users.
- **`broadcastToDrivers`**: Sends a message to all drivers in the `drivers` room.
- **`sendToUser`**: Sends a targeted message to a specific user.
- **`sendToDriver`**: Sends a targeted message to a specific driver.

## 4. Event Reference

### Client-to-Server Events

| Event | Payload | Description |
| --- | --- | --- |
| `driver:online` | `{ driverId: string }` | Notifies the server that a driver is online and available to receive ride requests. |

### Server-to-Client Events

| Event | Payload | Description |
| --- | --- | --- |
| `heartbeat` | `{ timestamp: Date, type: 'user' \| 'driver' }` | Sent periodically to clients to verify the connection is still active. |
| `ride:newRequest` | `{ rideRequestData: object, broadcastAt: Date }` | Broadcasts a new ride request to all available drivers. |
| `ride:bidUpdate` | `{ requestId: string, bid: object, timestamp: Date }` | Sends a real-time bid update to the user who created the ride request. |
| `ride:accepted` | `{ requestId: string, driverId: string, bid: object }` | Notifies a user that their ride request has been accepted. |
| `ride:bidAccepted` | `{ requestId: string, userId: string, bid: object }` | Notifies a driver that their bid has been accepted. |
| `ride:biddingClosed` | `{ requestId: string, acceptedDriverId: string }` | Informs all other drivers that bidding for a ride request has closed. |

## 5. Core Methods

- **`initialize(io)`**: Initializes the service with a Socket.IO instance.
- **`registerUser(socketId, userData)`**: Registers a new user connection.
- **`registerDriver(socketId, driverData)`**: Registers a new driver connection.
- **`unregisterUser(socketId)`**: Removes a user connection.
- **`unregisterDriver(socketId)`**: Removes a driver connection.
- **`broadcastRideRequest(rideRequestData)`**: Broadcasts a new ride request to available drivers.
- **`updateDriverStatus(driverId, status)`**: Updates a driver's availability status.
