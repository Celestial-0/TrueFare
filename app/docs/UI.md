# TrueFare Application UI Documentation

This document provides a comprehensive overview of the TrueFare application's user interface (UI), detailing the flows for both passengers (Users) and Drivers.

---

## 👤 User Flow

The user flow is designed for simplicity and efficiency, allowing users to quickly book rides and manage their journey.

![User UI](/app/public/USER.png)

### 1. Authentication
- **Sign Up/Login**: Users are greeted with a clean authentication screen where they can either sign up for a new account or log in to their existing one.
- **Input Fields**: Standard email and password fields with clear labels and validation.
- **Mode Toggle**: A simple toggle allows switching between the user and driver authentication forms.

### 2. Ride Booking
- **Map Interface**: Post-login, the user sees a map centered on their current location.
- **Destination Input**: A prominent search bar allows users to enter their desired destination.
- **Route Preview**: The app displays the selected route on the map for confirmation.

### 3. Vehicle & Fare Details
- **Vehicle Selection**: Users can choose from different vehicle types (e.g., Sedan, SUV) presented in a horizontal selector.
- **Fare Estimate**: The app provides an estimated fare for the selected route and vehicle.
- **Request Ride**: A confirmation button initiates the ride request, sending it to nearby drivers.

### 4. Bidding Process
- **Bid Display**: Once a request is sent, the UI transitions to a bidding screen where incoming bids from drivers are displayed in real-time.
- **Bid Details**: Each bid shows the driver's name, rating, estimated arrival time (ETA), and the proposed fare.
- **Accepting a Bid**: The user can review the bids and accept the one that best suits their needs.

### 5. Ride Confirmation & Tracking
- **Accepted Ride Status**: After accepting a bid, the UI updates to show a confirmation screen with the driver's details, including their name, vehicle information, and the final fare.
- **Driver En Route**: The user can track the driver's location on the map in real-time as they head to the pickup point.
- **Communication**: Buttons to call or message the driver are available.

---

## 🚗 Driver Flow

The driver flow provides all the necessary tools for drivers to manage ride requests, place bids, and handle active rides efficiently.

![Driver UI](/app/public/DRIVER.png)

### 1. Authentication
- **Driver Login**: Drivers use the same authentication screen as users but toggle to the "Driver" mode to log in.

### 2. Driver Dashboard & Going Online
- **Dashboard**: The main screen for drivers, showing their current status (Online/Offline) and earnings summary.
- **Vehicle Selection**: Before going online, drivers must select the vehicle they will be using from their registered vehicle list.
- **Go Online**: A prominent button allows drivers to set their status to "Online" and start receiving ride requests.

### 3. Available Ride Requests
- **Request List**: Once online, drivers see a list of available ride requests in their vicinity.
- **Request Details**: Each request card displays the user's pickup location, destination, and distance.

### 4. Placing a Bid
- **Bidding Interface**: Tapping on a ride request opens a detailed view where the driver can input their bid amount.
- **Submit Bid**: After entering the fare, the driver submits the bid to the user.

### 5. Active Ride Management
- **Bid Accepted Notification**: Drivers receive a real-time notification when their bid is accepted.
- **Ride Details**: The UI shows the user's information, pickup location, and destination.
- **Navigation**: Integration with mapping services provides turn-by-turn navigation to the pickup and drop-off locations.
- **Ride Status Updates**: Drivers can update the ride status (e.g., Arrived, Start Trip, End Trip) to keep the user informed.