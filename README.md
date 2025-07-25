# TrueFare

Version: 0.1

## Overview
TrueFare is a full-stack ride-hailing platform featuring real-time fare bidding, live ride tracking, and seamless user/driver experiences. Built with Node.js, Express, Socket.IO, MongoDB, and React Native (Expo), it enables users to request rides and receive competitive bids from drivers in real time.

## Features
- User authentication (login, registration, role selection)
- Ride request and booking interface
- Real-time fare bidding system for drivers
- Bid selection and notifications
- Driver dashboard with available requests and earnings
- Live ride tracking and history
- Payment integration (planned)
- Profile management for users and drivers
- App settings, help/support, and advanced analytics

## Technology Stack
- **Backend:** Node.js, Express.js, Socket.IO, MongoDB
- **Frontend:** React Native (Expo), TypeScript

## Getting Started
### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB instance
- Expo CLI (for mobile app)

### Backend Setup
1. Navigate to the `backend` directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure environment variables in `.env` (see `backend/config/index.js` for required keys).
4. Start the backend server:
   ```sh
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend app directory:
   ```sh
   cd frontend/TrueFare
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the Expo development server:
   ```sh
   npm start
   ```
4. Use Expo Go or an emulator to run the app on your device.

## Usage
- Register as a user or driver
- Users can book rides and receive bids from drivers
- Drivers can view available requests and place competitive bids
- Users select and accept bids, track rides, and view history

## Roadmap
- Payment gateway integration
- Enhanced analytics and reporting
- Push notifications
- Advanced ride tracking

## License
MIT

## Contact
For questions or support, contact [Yash Kumar Singh](mailto:yashkumarsingh.ieee.org) or visit [yashkumarsingh.tech](https://yashkumarsingh.tech).
