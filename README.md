# TrueFare

**Version: 0.2**

## Overview

TrueFare is a full-stack ride-hailing platform featuring real-time fare bidding, live ride tracking, and seamless user/driver experiences. Built with a robust backend using Node.js, Express, Socket.IO, and MongoDB, and a mobile client with React Native (Expo), it enables users to request rides and receive competitive bids from drivers in real time.

Version 0.2 introduces a formalized hybrid architecture, a comprehensive and well-documented API, a standardized WebSocket protocol, and advanced features for vehicle management and system analytics.

## Key Changes from V0.1 to V0.2

This version marks a significant leap forward in terms of architecture, features, and documentation.

-   **Formalized Hybrid Architecture**: The backend now officially follows a hybrid model, combining a traditional MVC pattern for HTTP requests with a powerful event-driven architecture for real-time WebSocket communication. This provides both stability for standard operations and high performance for real-time features.

-   **Comprehensive API Endpoints**: The REST API has been greatly expanded and organized. We now have dedicated, granular endpoints for:
    -   `Authentication`: User and driver login/registration.
    -   `Users`: Profile management, ride history, and stats.
    -   `Drivers`: Profile management, earnings, bids, and vehicle assignments.
    -   `Vehicles`: Full CRUD operations, status updates, and search.
    -   `Ride Requests`: Availability, bidding, and analytics.

-   **Standardized WebSocket Protocol**: The real-time layer has been completely documented and standardized. Key improvements include:
    -   **Defined Events**: A clear list of client-to-server and server-to-client events (e.g., `ride:newRequest`, `ride:bidPlaced`, `driver:updateStatus`).
    -   **Structured Payloads**: All event payloads are now validated with Zod schemas for type safety and reliability.
    -   **Room Management**: Efficient communication channels for users, drivers, and specific ride requests (`user:<id>`, `driver:<id>`, `request:<id>`).
    -   **Heartbeat Mechanism**: Ensures stable and resilient connections.

-   **Full Vehicle Management**: Introduced a dedicated set of services and endpoints for managing vehicles, including creation, status updates, and assignment to drivers.

-   **Advanced Admin & Analytics Features**: Added new endpoints for bulk operations, system maintenance, and performance analytics across users, drivers, and vehicles.

-   **In-Depth Documentation**: Created a new `backend/docs` directory containing detailed documentation for the entire system.

## Architecture & Models

The backend is built on a hybrid architecture that leverages the strengths of both RESTful services and real-time event handling. For a detailed breakdown, please see the full architecture document.

-   **[View Full Architecture Document](./backend/docs/MVC_ARCHITECTURE.md)**


## API & WebSocket Documentation

Detailed documentation for all HTTP endpoints and WebSocket events is available in the `backend/docs` directory.

-   **[HTTP API Documentation](./backend/docs/API_DOCUMENTATION.md)**
-   **[WebSocket Event Reference](./backend/docs/WEBSOCKET_EVENTS.md)**

## Technology Stack

-   **Backend:** Node.js, Express.js, Socket.IO, MongoDB, Zod
-   **Frontend:** React Native (Expo), TypeScript

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm or yarn
-   MongoDB instance
-   Expo CLI (for mobile app)

### Backend Setup

1.  Navigate to the `backend` directory:
    ```sh
    cd backend
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Configure environment variables in `.env` (see `backend/src/config/index.js` for required keys).
4.  Start the backend server:
    ```sh
    npm run dev
    ```

### Frontend Setup

1.  Navigate to the frontend app directory:
    ```sh
    cd app
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Start the Expo development server:
    ```sh
    npm start
    ```
4.  Use the Expo Go app to scan the QR code and run the app on your device.

## Roadmap

-   **Scalability**: Introduce Redis for pub/sub to enable horizontal scaling of WebSockets across multiple server instances.
-   **GraphQL API**: Implement a GraphQL endpoint for more flexible and efficient data querying from the client.
-   **Enhanced Analytics**: Develop a real-time analytics dashboard for monitoring system health and business metrics.
-   **Microservices**: Explore splitting core functionalities (e.g., authentication, ride management) into separate microservices.
-   **Payment Gateway Integration**: Integrate a payment provider like Stripe or Razorpay.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, contact [Yash Kumar Singh](mailto:yashkumarsingh.ieee.org) or visit [yashkumarsingh.tech](https://yashkumarsingh.tech).
