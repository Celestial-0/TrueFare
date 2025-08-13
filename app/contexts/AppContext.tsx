import React, { createContext, useReducer, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';
import { authService } from '../services/auth.service';
import { storageService } from '../services/storage.service';
import apiService from '../services/api.service';
import { webSocketService, NewRideRequestPayload, PlaceBidPayload, AcceptBidPayload, CompleteRidePayload, CancelRidePayload, RideCompletedPayload, RideCancelledPayload, RideCancelledByUserPayload, DriverStatusUpdatedPayload } from '../services/websocket.service';
import { AppState, User, Driver, Notification, AppError, DriverStatus, RideStatus, RideRequest, Bid, BidStatus, VehicleType } from '../types/types';
import { SOCKET_EVENTS } from '../utils/constants';
export type { RideRequest, Bid } from '../types/types';

// 1. Initial State
const initialState: AppState = {
  isAuthenticated: false,
  userType: null,
  currentUser: null,
  currentDriver: null,
  rideRequests: [],
  availableRequests: [], // Available ride requests for drivers
  currentRide: null, // Current active ride for drivers
  bids: [],
  notifications: [],
  error: null,
  loading: false,
  socketConnected: false,
  rideHistory: [],
  isUserRegistered: false,
  isDriverRegistered: false
};

// 2. Context Type
export interface AppContextType extends AppState {
  fetchDriverEarnings: () => Promise<void>;
  dispatch: React.Dispatch<any>;
  // Methods will be added in subsequent parts
  connectSocket: () => void;
  disconnectSocket: () => void;
  reconnectSocket: () => void;
  loginDriver: (data: any) => Promise<Driver | null>;
  loginUser: (data: any) => Promise<User | null>;
  logout: () => void;
  goOnlineDriver: () => void;
  goOfflineDriver: () => void;
  restoreSession: () => Promise<void>;
  updateDriverStatus: (data: { status: DriverStatus; vehicleId?: string; todayEarnings?: number }) => Promise<void>;
  updateDriverLocation: (location: { latitude: number; longitude: number }) => void;
  updateUserLocation: (location: { latitude: number; longitude: number }) => void;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  createRideRequest: (data: Omit<NewRideRequestPayload, 'userId' | 'timestamp' | 'requestId'>) => void;
  placeBid: (requestId: string, fareAmount: number, estimatedArrival?: number) => void;
  acceptBid: (rideRequestId: string, bidId: string) => void;
  completeRide: (rideId: string) => void;
  cancelRide: (rideId: string, reason: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  // Available requests management
  clearAvailableRequests: () => void;
  refreshAvailableRequests: () => void;
  fetchRideHistory: () => void;
  registerUser: (data: any) => Promise<User | null>;
  registerDriver: (data: any) => Promise<Driver | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// 3. Reducer
const appReducer = (state: AppState, action: any): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        userType: action.payload.userType,
        currentUser: action.payload.userType === 'user' ? { ...action.payload.data, userId: action.payload.data.userId } : null,
        currentDriver: action.payload.userType === 'driver' ? { ...action.payload.data, driverId: action.payload.data.driverId } : null,
        loading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        socketConnected: state.socketConnected // Preserve socket connection status on logout for potential reuse
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'SOCKET_STATUS':
      return { ...state, socketConnected: action.payload };
    case 'UPDATE_DRIVER_STATUS':
      if (state.currentDriver) {
        return { ...state, currentDriver: { ...state.currentDriver, status: action.payload } };
      }
      return state;
    case 'UPDATE_DRIVER_LOCATION':
      if (state.currentDriver) {
        return { ...state, currentDriver: { ...state.currentDriver, currentLocation: action.payload } };
      }
      return state;
    case 'FETCH_EARNINGS_SUCCESS':
      if (state.currentDriver) {
        return { ...state, currentDriver: { ...state.currentDriver, todayEarnings: action.payload } };
      }
      return state;
    case 'UPDATE_USER_LOCATION':
      if (state.currentUser) {
        return { ...state, currentUser: { ...state.currentUser, currentLocation: action.payload } };
      }
      return state;
    case 'UPDATE_USER_PROFILE_SUCCESS':
      return {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload },
        loading: false,
        error: null,
      };
    case 'RIDE_COMPLETED':
      console.log('[REDUCER] Processing RIDE_COMPLETED action:', action.payload);
      return {
        ...state,
        rideRequests: state.rideRequests.map(ride => {
          if (ride.requestId === action.payload.rideId || ride._id === action.payload.rideId) {
            console.log('[REDUCER] Updating ride status to completed for:', ride.requestId);
            return {
              ...ride,
              status: RideStatus.COMPLETED,
              completedAt: new Date()
            };
          }
          return ride;
        })
      };
    case 'RIDE_CANCELLED':
      console.log('[REDUCER] Processing RIDE_CANCELLED action:', action.payload);
      return {
        ...state,
        rideRequests: state.rideRequests.map(ride => {
          if (ride.requestId === action.payload.rideId || ride._id === action.payload.rideId) {
            console.log('[REDUCER] Updating ride status to cancelled for:', ride.requestId);
            return {
              ...ride,
              status: RideStatus.CANCELLED,
              cancelledAt: action.payload.cancelledAt || new Date(),
              cancellationReason: action.payload.reason || 'Ride cancelled'
            };
          }
          return ride;
        })
      };
    case 'ADD_RIDE_REQUEST':
      console.log('[REDUCER] ADD_RIDE_REQUEST - Adding ride request:', action.payload.requestId);
      console.log('[REDUCER] Current rideRequests count:', state.rideRequests.length);
      const newState = {
        ...state,
        rideRequests: [...state.rideRequests, action.payload]
      };
      console.log('[REDUCER] New rideRequests count:', newState.rideRequests.length);
      return newState;
    // New cases for available requests management
    case 'SET_AVAILABLE_REQUESTS':
      return { ...state, availableRequests: action.payload };
    case 'ADD_AVAILABLE_REQUEST':
      return {
        ...state,
        availableRequests: [...state.availableRequests, action.payload]
      };
    case 'REMOVE_AVAILABLE_REQUEST':
      console.log('[REDUCER] Removing available request:', action.payload);
      return {
        ...state,
        availableRequests: state.availableRequests.filter(
          request => request.requestId !== action.payload && request._id !== action.payload
        )
      };
    case 'UPDATE_REQUEST_WITH_BID':
      console.log('[REDUCER] UPDATE_REQUEST_WITH_BID - Request ID:', action.payload.requestId);
      console.log('[REDUCER] Bid ID:', action.payload.bid.bidId);
      console.log('[REDUCER] Current rideRequests count:', state.rideRequests.length);
      console.log('[REDUCER] Looking for request in rideRequests:', state.rideRequests.map(r => r.requestId));

      const updatedState = {
        ...state,
        availableRequests: state.availableRequests.map(req =>
          req.requestId === action.payload.requestId
            ? {
              ...req,
              bids: req.bids ?
                req.bids.some(bid => bid.bidId === action.payload.bid.bidId) ?
                  req.bids.map(bid => bid.bidId === action.payload.bid.bidId ? action.payload.bid : bid) :
                  [...req.bids, action.payload.bid] :
                [action.payload.bid]
            }
            : req
        ),
        rideRequests: state.rideRequests.map(req => {
          if (req.requestId === action.payload.requestId) {
            console.log('[REDUCER] Found matching request, updating with bid');
            const updatedReq = {
              ...req,
              bids: req.bids ?
                req.bids.some(bid => bid.bidId === action.payload.bid.bidId) ?
                  req.bids.map(bid => bid.bidId === action.payload.bid.bidId ? action.payload.bid : bid) :
                  [...req.bids, action.payload.bid] :
                [action.payload.bid]
            };
            console.log('[REDUCER] Updated request bids count:', updatedReq.bids.length);
            return updatedReq;
          }
          return req;
        })
      };

      console.log('[REDUCER] Updated rideRequests with bids:', updatedState.rideRequests.map(r => ({
        requestId: r.requestId,
        bidsCount: r.bids?.length || 0
      })));

      return updatedState;
    case 'UPDATE_RIDE_STATUS':
      return {
        ...state,
        rideRequests: state.rideRequests.map(ride => {
          if (ride.requestId !== action.payload.requestId) {
            return ride;
          }

          // When a ride is accepted, update the status of all its bids
          if (action.payload.status === RideStatus.ACCEPTED && action.payload.acceptedBid) {
            const acceptedBidId = action.payload.acceptedBid.bidId || action.payload.acceptedBid._id;

            const updatedBids = ride.bids?.map(bid => {
              const currentBidId = bid.bidId || bid._id;
              if (currentBidId === acceptedBidId) {
                return { ...bid, status: BidStatus.ACCEPTED };
              }
              // Only update pending bids to rejected
              if (bid.status === BidStatus.PENDING) {
                return { ...bid, status: BidStatus.REJECTED };
              }
              return bid;
            }) || [];

            return {
              ...ride,
              status: RideStatus.ACCEPTED,
              acceptedBid: action.payload.acceptedBid,
              driverInfo: action.payload.driverInfo,
              bids: updatedBids,
            };
          }

          // For other status updates, just update the ride itself
          return {
            ...ride,
            status: action.payload.status,
          };
        }),
      };
    case 'SET_CURRENT_RIDE':
      return {
        ...state,
        currentRide: action.payload
      };
    case 'CLEAR_CURRENT_RIDE':
      return {
        ...state,
        currentRide: null
      };
    case 'SET_RIDE_HISTORY':
      return { ...state, rideHistory: action.payload };
    case 'REMOVE_RIDE_REQUEST':
      console.log('[REDUCER] Removing ride request:', action.payload);
      return {
        ...state,
        rideRequests: state.rideRequests.filter(
          request => request.requestId !== action.payload && request._id !== action.payload
        )
      };
    default:
      return state;
  }
};

// 4. Provider Component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Create a ref to track current state for WebSocket event handlers
  const appState = useRef(state);

  // Update the ref whenever state changes
  useEffect(() => {
    appState.current = state;
  }, [state]);

  const fetchDriverEarnings = useCallback(async () => {
    if (!state.currentDriver?._id) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiService.driver.getDriverEarnings(state.currentDriver._id);
      if (response.success && response.data) {
        dispatch({ type: 'FETCH_EARNINGS_SUCCESS', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message || 'Failed to fetch earnings' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentDriver?._id]);

  const connectSocket = useCallback(() => {
    if (state.socketConnected) return;

    console.log('[WEBSOCKET] Attempting to connect to WebSocket server...');
    webSocketService.connect();

    webSocketService.on('connect', () => {
      console.log('[WEBSOCKET] Successfully connected to WebSocket server');
      dispatch({ type: 'SOCKET_STATUS', payload: true });

      // Always use the latest state snapshot to avoid stale closures on reconnect/restore
      const currentState = appState.current || state;

      // Register driver if logged in as driver
      if (currentState.currentDriver) {
        const driverId = (currentState.currentDriver as any).driverId || currentState.currentDriver._id;
        console.log('[WEBSOCKET] Emitting driver:register event for driver:', driverId);
        webSocketService.emit(SOCKET_EVENTS.DRIVER_REGISTER, {
          driverId: driverId,
          name: currentState.currentDriver.name,
          phone: currentState.currentDriver.phone,
          email: currentState.currentDriver.email,
          location: currentState.currentDriver.currentLocation,
          vehicleInfo: currentState.currentDriver.vehicleInfo,
          timestamp: Date.now(),
        });
      }

      // Register user if logged in as user
      if (currentState.currentUser) {
        const userId = (currentState.currentUser as any).userId || currentState.currentUser._id;
        console.log('[WEBSOCKET] Emitting user:register event for user:', userId);
        webSocketService.emit(SOCKET_EVENTS.USER_REGISTER, {
          userId: userId,
          location: currentState.currentUser.currentLocation,
          timestamp: Date.now(),
        });
      }
    });

    webSocketService.on('disconnect', (reason: string) => {
      console.log('[WEBSOCKET] Disconnected from WebSocket server. Reason:', reason);
      dispatch({ type: 'SOCKET_STATUS', payload: false });
    });

    // Add listeners for debugging (will handle TypeScript later if needed)
    try {
      (webSocketService as any).on('registration:success', (data: any) => {
        console.log('[WEBSOCKET] Registration successful:', data);
      });

      (webSocketService as any).on('registration:error', (error: any) => {
        console.error('[WEBSOCKET] Registration error:', error);
      });
    } catch {
      // Ignore if events don't exist
    }

    // Handle incoming ride request broadcasts (for drivers)
    webSocketService.on(SOCKET_EVENTS.RIDE_NEW_REQUEST_BROADCAST, (payload) => {
      console.log('New ride request broadcast received:', payload);

      // Get the current state to check userType at the time of the event
      const currentState = appState.current || state;
      console.log('[RIDE_REQUEST_BROADCAST] Current userType:', currentState.userType);
      console.log('[RIDE_REQUEST_BROADCAST] Current driver:', currentState.currentDriver);

      if (currentState.userType === 'driver' && currentState.currentDriver) {
        console.log('[RIDE_REQUEST_BROADCAST] Processing ride request for driver...');
        const rideRequest: RideRequest = {
          _id: payload.requestId,
          requestId: payload.requestId,
          userId: payload.userId,
          pickupLocation: payload.pickupLocation,
          destination: payload.destination,
          status: RideStatus.PENDING,
          rideType: payload.rideType as VehicleType,
          vehicleType: payload.rideType as VehicleType, // Map rideType to vehicleType for compatibility
          createdAt: new Date(),
          bids: [],
          estimatedDistance: payload.estimatedDistance,
        };
        console.log('[RIDE_REQUEST_BROADCAST] Adding ride request to available requests:', rideRequest);
        dispatch({ type: 'ADD_AVAILABLE_REQUEST', payload: rideRequest });
      } else {
        console.log('[RIDE_REQUEST_BROADCAST] Not processing ride request - not a driver or no driver logged in');
      }
    });

    // Handle bid updates
    webSocketService.on(SOCKET_EVENTS.RIDE_BID_UPDATE, (payload) => {
      console.log('Bid update received:', payload);

      // Get the current state to check userType and existing requests
      const currentState = appState.current || state;
      console.log('[BID_UPDATE] Current userType:', currentState.userType);
      console.log('[BID_UPDATE] Current ride requests count:', currentState.rideRequests.length);
      console.log('[BID_UPDATE] Looking for request:', payload.requestId);

      const bid: Bid = {
        _id: payload.bidId,
        bidId: payload.bidId,
        rideRequestId: payload.requestId,
        driverId: payload.driverId,
        amount: payload.fareAmount,
        fareAmount: payload.fareAmount,
        status: payload.status as BidStatus,
        createdAt: new Date(),
        estimatedArrival: payload.estimatedArrival,
        driverName: payload.driverName,
        driverRating: payload.driverRating,
      };

      console.log('[BID_UPDATE] Created bid object:', {
        bidId: bid.bidId,
        requestId: payload.requestId,
        driverId: bid.driverId,
        fareAmount: bid.fareAmount
      });

      dispatch({
        type: 'UPDATE_REQUEST_WITH_BID',
        payload: { requestId: payload.requestId, bid }
      });

      console.log('[BID_UPDATE] Dispatched UPDATE_REQUEST_WITH_BID action');
    });

    // Handle ride acceptance (removes from available requests)
    webSocketService.on(SOCKET_EVENTS.RIDE_ACCEPTED, (payload) => {
      console.log('[DEBUG] ride:accepted payload:', payload);
      console.log('[RIDE_ACCEPTED] Processing ride acceptance event');

      // For users: Update the ride request status to accepted
      const currentState = appState.current || state;
      if (currentState.userType === 'user') {
        console.log('[RIDE_ACCEPTED] Updating ride status for user');
        console.log('[RIDE_ACCEPTED] Payload structure:', JSON.stringify(payload, null, 2));

        // Extract bid information from the payload
        const acceptedBid = payload.bid || payload.acceptedBid;
        if (!acceptedBid) {
          console.error('[RIDE_ACCEPTED] No bid information found in payload');
          return;
        }

        dispatch({
          type: 'UPDATE_RIDE_STATUS',
          payload: {
            requestId: payload.requestId,
            status: RideStatus.ACCEPTED,
            acceptedBid: {
              bidId: acceptedBid._id || acceptedBid.bidId,
              driverId: acceptedBid.driverId || payload.driverId,
              fareAmount: acceptedBid.fareAmount,
              estimatedArrival: acceptedBid.estimatedArrival,
              status: acceptedBid.status || 'accepted',
              acceptedAt: acceptedBid.acceptedAt ? new Date(acceptedBid.acceptedAt) : new Date()
            },
            driverInfo: {
              driverId: payload.driverId,
              name: payload.driverName || 'Driver', // Fallback if name not provided
              phone: payload.driverPhone,
              rating: payload.driverRating,
              vehicleInfo: payload.vehicleInfo
            }
          }
        });

        console.log('[RIDE_ACCEPTED] Dispatched UPDATE_RIDE_STATUS action');

        // Show success notification
        addNotification({
          type: 'success',
          message: `🎉 Your ride has been accepted! Fare: ₹${acceptedBid.fareAmount}. Your driver is on the way.`,
          createdAt: new Date()
        });

        console.log('[RIDE_ACCEPTED] Added success notification');
      }

      // For drivers: Remove from available requests
      dispatch({ type: 'REMOVE_AVAILABLE_REQUEST', payload: payload.requestId });
    });

    // Handle bid acceptance notification for drivers
    webSocketService.on(SOCKET_EVENTS.RIDE_BID_ACCEPTED, (payload) => {
      console.log('Bid accepted for driver:', payload);

      const currentState = appState.current || state;
      if (currentState.userType === 'driver' && currentState.currentDriver) {
        // Remove from available requests since bid was accepted
        dispatch({ type: 'REMOVE_AVAILABLE_REQUEST', payload: payload.requestId });

        // Find the ride request from available requests to set as current ride
        const rideRequest = currentState.availableRequests.find(req => req.requestId === payload.requestId);
        if (rideRequest) {
          // Set the current ride for the driver
          dispatch({
            type: 'SET_CURRENT_RIDE',
            payload: {
              ...rideRequest,
              status: RideStatus.ACCEPTED,
              acceptedBid: payload.bid || {
                fareAmount: payload.fareAmount,
                driverId: currentState.currentDriver?.driverId
              },
              userInfo: payload.userInfo || { name: 'Passenger' }
            }
          });
        }

        // Show enhanced success notification to driver
        addNotification({
          type: 'success',
          message: `🎉 Your bid has been accepted! Fare: ₹${payload.fareAmount || 0}. Proceed to pickup location.`,
          createdAt: new Date()
        });

        // Update driver status to busy using the current driver from appState
        const currentDriver = currentState.currentDriver;
        if (currentDriver) {
          console.log('[RIDE_BID_ACCEPTED] Updating driver status to BUSY for driver:', currentDriver.driverId || currentDriver._id);
          updateDriverStatus({ status: DriverStatus.BUSY });
        } else {
          console.error('[RIDE_BID_ACCEPTED] No current driver found in state');
        }
      }
    });

    // Handle ride request creation confirmation
    webSocketService.on('ride:requestCreated', (payload) => {
      console.log('Ride request created:', payload);

      // Get the current state to check userType at the time of the event
      const currentState = appState.current || state;
      console.log('[RIDE_REQUEST_CREATED] Current userType:', currentState.userType);
      console.log('[RIDE_REQUEST_CREATED] Current user:', currentState.currentUser?.userId);

      if (currentState.userType === 'user') {
        console.log('[RIDE_REQUEST_CREATED] Adding ride request to state');
        const rideRequest: RideRequest = {
          _id: payload.requestId,
          requestId: payload.requestId,
          userId: payload.userId,
          pickupLocation: payload.pickupLocation,
          destination: payload.destination,
          status: payload.status as RideStatus,
          rideType: payload.rideType as VehicleType,
          vehicleType: payload.rideType as VehicleType, // Map rideType to vehicleType for compatibility
          createdAt: new Date(payload.createdAt),
          bids: [],
        };
        dispatch({ type: 'ADD_RIDE_REQUEST', payload: rideRequest });
        console.log('[RIDE_REQUEST_CREATED] Ride request added to state:', rideRequest.requestId);
      } else {
        console.log('[RIDE_REQUEST_CREATED] Not adding ride request - userType is:', currentState.userType);
      }
    });

    // Handle WebSocket errors
    webSocketService.on('error', (payload) => {
      console.error('WebSocket error:', payload);
      dispatch({ type: 'SET_ERROR', payload: { message: payload.message || 'Socket error occurred' } });
    });

    webSocketService.on('ride:completed', (payload: RideCompletedPayload) => {
      dispatch({ type: 'RIDE_COMPLETED', payload });
      dispatch({ type: 'REMOVE_AVAILABLE_REQUEST', payload: payload.rideId });
    });

    webSocketService.on('ride:cancelled', (payload: RideCancelledPayload) => {
      console.log('[RIDE_CANCELLED] Ride cancelled event received:', payload);
      
      // Get the current state to check userType
      const currentState = appState.current || state;
      
      // Update ride status in rideRequests
      dispatch({ type: 'RIDE_CANCELLED', payload });
      
      // For drivers: Remove cancelled ride from available requests
      if (currentState.userType === 'driver') {
        console.log('[RIDE_CANCELLED] Removing cancelled ride from available requests for driver');
        dispatch({ 
          type: 'REMOVE_AVAILABLE_REQUEST', 
          payload: payload.rideId 
        });
        
        // Show notification to driver
        addNotification({
          type: 'info',
          message: `📢 A ride request has been cancelled and removed from available requests.`,
          createdAt: new Date()
        });
      }
    });

    // Handle driver-specific ride cancellation by user
    webSocketService.on('ride:cancelledByUser', (payload: RideCancelledByUserPayload) => {
      console.log('Ride cancelled by user:', payload);
      
      const currentState = appState.current || state;
      if (currentState.userType === 'driver' && currentState.currentDriver) {
        // Clear current ride if it matches the cancelled ride
        if (currentState.currentRide && currentState.currentRide.rideId === payload.requestId) {
          dispatch({ type: 'SET_CURRENT_RIDE', payload: null });
        }
        
        // Update driver status back to available
        updateDriverStatus({ status: DriverStatus.AVAILABLE });
        
        // Show detailed notification to driver
        addNotification({
          type: 'warning',
          message: `🚫 Ride Cancelled - The user cancelled your accepted ride (₹${payload.fareAmount}). You're now available for new rides.`,
          createdAt: new Date()
        });
      }
    });

    // Handle ride cancellation event
    webSocketService.on(SOCKET_EVENTS.RIDE_CANCELLED, (payload) => {
      console.log('[RIDE_CANCELLED] Ride cancellation confirmed:', payload);
      
      // Update the cancelled ride status in state
      dispatch({ 
        type: 'RIDE_CANCELLED', 
        payload: {
          rideId: payload.requestId || payload.rideId, 
          reason: payload.reason || 'Ride cancelled',
          cancelledAt: payload.cancelledAt || new Date()
        }
      });
      
      // Show success notification
      addNotification({
        type: 'success',
        message: 'Ride cancelled successfully',
        createdAt: new Date()
      });
    });

    // Handle ride cancellation by user event
    webSocketService.on(SOCKET_EVENTS.RIDE_CANCELLED_BY_USER, (payload) => {
      console.log('[RIDE_CANCELLED_BY_USER] Driver received cancellation:', payload);
      
      // For drivers: remove from available requests and clear current ride
      dispatch({ 
        type: 'REMOVE_AVAILABLE_REQUEST', 
        payload: payload.requestId 
      });
      
      const currentState = appState.current || state;
      if (currentState.currentRide?.rideId === payload.requestId) {
        dispatch({ type: 'CLEAR_CURRENT_RIDE' });
        dispatch({ type: 'UPDATE_DRIVER_STATUS', payload: DriverStatus.AVAILABLE });
      }
      
      // Show notification to driver
      addNotification({
        type: 'info',
        message: `Ride cancelled by user. Fare: ₹${payload.fareAmount}`,
        createdAt: new Date()
      });
    });

    // Handle driver status updates broadcasted by backend
    webSocketService.on(SOCKET_EVENTS.DRIVER_STATUS_UPDATED, (payload: DriverStatusUpdatedPayload) => {
      console.log('[DRIVER_STATUS_UPDATED] Event received:', payload);

      const currentState = appState.current || state;
      const myDriverId = currentState.currentDriver?.driverId || currentState.currentDriver?._id;
      if (!currentState.currentDriver || !myDriverId) return;

      // Only update status for the currently logged-in driver
      if (payload.driverId === myDriverId) {
        const mappedStatus =
          payload.status === 'available' ? DriverStatus.AVAILABLE :
          payload.status === 'busy' ? DriverStatus.BUSY :
          DriverStatus.OFFLINE;

        dispatch({ type: 'UPDATE_DRIVER_STATUS', payload: mappedStatus });
        console.log('[DRIVER_STATUS_UPDATED] Updated local status to:', mappedStatus);
      }
    });
  }, [state.socketConnected, state.currentDriver, state.currentUser, state.userType]);

  const disconnectSocket = useCallback(() => {
    webSocketService.disconnect();
    dispatch({ type: 'SOCKET_STATUS', payload: false });
  }, []);

  const reconnectSocket = useCallback(() => {
    disconnectSocket();
    setTimeout(() => connectSocket(), 500);
  }, [connectSocket, disconnectSocket]);

  const loginDriver = useCallback(async (data: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('[DRIVER_LOGIN] Starting driver login process');
      const response = await authService.auth.loginDriver(data);
      if (response && response.data) {
        const driver = response.data;
        console.log('[DRIVER_LOGIN] Login successful, driver data:', {
          driverId: driver.driverId,
          name: driver.name,
          status: driver.status
        });

        dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'driver', data: driver } });
        await storageService.setDriverData(driver);
        await storageService.setUserType('driver');

        // Connect socket and ensure registration
        connectSocket();

        // If socket is already connected, emit registration now; otherwise
        // connectSocket's central handler will register on connect
        if (webSocketService.isConnected()) {
          const driverId = driver.driverId || driver._id;
          console.log('[DRIVER_LOGIN] Socket already connected, emitting driver:register immediately');
          webSocketService.emit(SOCKET_EVENTS.DRIVER_REGISTER, {
            driverId: driverId,
            name: driver.name,
            phone: driver.phone,
            email: driver.email,
            location: driver.currentLocation,
            vehicleInfo: driver.vehicleInfo,
            timestamp: Date.now(),
          });
        } else {
          console.log('[DRIVER_LOGIN] Socket not connected yet; central connect handler will register upon connect');
        }

        return driver;
      }
      console.error('[DRIVER_LOGIN] Login failed:', response.message);
      dispatch({ type: 'SET_ERROR', payload: { message: response.message || 'Login failed' } });
      return null;
    } catch (error: any) {
      console.error('[DRIVER_LOGIN] Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [connectSocket]);

  const loginUser = useCallback(async (data: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.auth.loginUser(data);
      if (response && response.data) {
        const user = response.data;
        dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'user', data: user } });
        await storageService.setUserData(user);
        await storageService.setUserType('user');

        // Connect socket and ensure registration
        connectSocket();

        // If socket is already connected, emit registration now; otherwise
        // connectSocket's central handler will register on connect
        if (webSocketService.isConnected()) {
          const userId = user.userId || user._id;
          console.log('[LOGIN] Socket already connected, emitting user:register immediately');
          webSocketService.emit(SOCKET_EVENTS.USER_REGISTER, {
            userId: userId,
            location: user.currentLocation,
            timestamp: Date.now(),
          });
        } else {
          console.log('[LOGIN] Socket not connected yet; central connect handler will register upon connect');
        }

        return user;
      }
      dispatch({ type: 'SET_ERROR', payload: { message: response.message || 'Login failed' } });
      return null;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [connectSocket]);

  const registerUser = useCallback(async (data: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.auth.registerUser(data);
      if (response && response.data) {
        const user = response.data;
        dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'user', data: user } });
        await storageService.setUserData(user);
        await storageService.setUserType('user');

        // Connect socket and ensure registration
        connectSocket();

        // If socket is already connected, emit registration now
        if (webSocketService.isConnected()) {
          const userId = user.userId || user._id;
          console.log('[REGISTER] Socket already connected, emitting user:register immediately');
          webSocketService.emit(SOCKET_EVENTS.USER_REGISTER, {
            userId: userId,
            location: user.currentLocation,
            timestamp: Date.now(),
          });
        } else {
          console.log('[REGISTER] Socket not connected yet; central connect handler will register upon connect');
        }

        return user;
      }
      dispatch({ type: 'SET_ERROR', payload: { message: response.message || 'Registration failed' } });
      return null;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [connectSocket]);

  const registerDriver = useCallback(async (data: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.auth.registerDriver(data);
      if (response && response.data) {
        const driver = response.data;
        dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'driver', data: driver } });
        await storageService.setDriverData(driver);
        await storageService.setUserType('driver');

        // Connect socket and ensure registration
        connectSocket();

        // If socket is already connected, emit registration now
        if (webSocketService.isConnected()) {
          const driverId = driver.driverId || driver._id;
          console.log('[REGISTER] Socket already connected, emitting driver:register immediately');
          webSocketService.emit(SOCKET_EVENTS.DRIVER_REGISTER, {
            driverId: driverId,
            name: driver.name,
            phone: driver.phone,
            vehicleInfo: data.vehicleInfo,
            location: driver.currentLocation,
            timestamp: Date.now(),
          });
        } else {
          console.log('[REGISTER] Socket not connected yet; central connect handler will register upon connect');
        }

        return driver;
      }
      console.error('[DRIVER_REGISTER] Registration failed:', response.message);
      dispatch({ type: 'SET_ERROR', payload: { message: response.message || 'Registration failed' } });
      return null;
    } catch (error: any) {
      console.error('[DRIVER_REGISTER] Registration error:', error);
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [connectSocket]);

  const logout = useCallback(async () => {
    disconnectSocket();
    await storageService.clearAuthData();
    dispatch({ type: 'LOGOUT' });
  }, [disconnectSocket]);

  const restoreSession = useCallback(async () => {
    if (state.isAuthenticated) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const userType = await storageService.getUserType();
      if (userType === 'user') {
        const user = await storageService.getUserData();
        if (user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'user', data: user } });
          connectSocket();
        }
      } else if (userType === 'driver') {
        const driver = await storageService.getDriverData();
        if (driver) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: { userType: 'driver', data: driver } });
          connectSocket();
        }
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to restore session' } });
      await storageService.clearAuthData();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [connectSocket, state.isAuthenticated]);

  const updateDriverStatus = useCallback(async (data: { status: DriverStatus; vehicleId?: string; todayEarnings?: number }) => {
    const currentState = appState.current || state;
    if (!currentState.currentDriver) {
      console.error('[DRIVER_STATUS_UPDATE] No driver logged in');
      dispatch({ type: 'SET_ERROR', payload: { message: 'No driver logged in' } });
      return;
    }

    const driverId = currentState.currentDriver.driverId || currentState.currentDriver._id;
    console.log(`[DRIVER_STATUS_UPDATE] Starting status update for driver ${driverId} from ${currentState.currentDriver.status} → ${data.status}`);

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Update local state immediately
      dispatch({ type: 'UPDATE_DRIVER_STATUS', payload: data.status });

      // Emit socket event to backend for real-time updates
      if (webSocketService.isConnected()) {
        // Map DriverStatus enum to socket payload format
        const socketStatus = data.status === DriverStatus.AVAILABLE ? 'available' :
          data.status === DriverStatus.BUSY ? 'busy' :
            data.status === DriverStatus.IN_RIDE ? 'busy' :
              'offline';

        const socketPayload = {
          driverId: driverId,
          status: socketStatus as 'available' | 'busy' | 'offline',
          timestamp: Date.now(),
          ...(data.vehicleId && { vehicleId: data.vehicleId })
        };

        console.log('[DRIVER_STATUS_UPDATE] Emitting socket event:', socketPayload);
        webSocketService.emit('driver:updateStatus', socketPayload);
        console.log('[DRIVER_STATUS_UPDATE] Successfully emitted driver:updateStatus event');

        console.log(`[DRIVER_STATUS_UPDATE] Driver status updated successfully: ${data.status}`);

        // Add success notification
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: Date.now().toString(),
            type: 'success',
            message: `Status updated to ${data.status}`,
            createdAt: new Date()
          }
        });
      } else {
        console.error('[DRIVER_STATUS_UPDATE] Socket not connected, cannot update status');
        dispatch({ type: 'SET_ERROR', payload: { message: 'Socket not connected, cannot update status' } });
      }
    } catch (error: any) {
      console.error('[DRIVER_STATUS_UPDATE] Exception:', error);
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const goOnlineDriver = useCallback(() => {
    updateDriverStatus({ status: DriverStatus.AVAILABLE });
  }, [updateDriverStatus]);

  const goOfflineDriver = useCallback(() => {
    updateDriverStatus({ status: DriverStatus.OFFLINE });
  }, [updateDriverStatus]);

  const updateDriverLocation = useCallback((location: { latitude: number; longitude: number }) => {
    dispatch({ type: 'UPDATE_DRIVER_LOCATION', payload: location });
  }, []);

  const updateUserLocation = useCallback((location: { latitude: number; longitude: number }) => {
    dispatch({ type: 'UPDATE_USER_LOCATION', payload: location });
  }, []);

  const updateUserProfile = useCallback(async (data: Partial<User>) => {
    if (!state.currentUser?._id) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'User not authenticated' } });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiService.user.updateUserProfile(state.currentUser._id, data);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_USER_PROFILE_SUCCESS', payload: response.data });
        await storageService.setUserData(response.data);
        addNotification({ type: 'success', message: 'Profile updated successfully!', createdAt: new Date });
      } else {
        dispatch({ type: 'SET_ERROR', payload: { message: response.message || 'Failed to update profile' } });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentUser?.userId]);

  const createRideRequest = useCallback((data: Omit<NewRideRequestPayload, 'userId' | 'timestamp' | 'requestId'>) => {
    console.log('createRideRequest called with data:', data);
    console.log('Current user:', state.currentUser);
    console.log('Socket connected:', state.socketConnected);

    if (!state.currentUser || !state.socketConnected) {
      const errorMsg = `Cannot create ride request: ${!state.currentUser ? 'User not authenticated' : 'Socket not connected'}`;
      console.error(errorMsg);
      dispatch({ type: 'SET_ERROR', payload: { message: errorMsg } });
      return;
    }

    // Use userId property from the user object (the backend sends userId, not _id)
    const userId = state.currentUser?.userId || state.currentUser?._id;
    if (!userId) {
      const errorMsg = 'User ID not found';
      console.error(errorMsg);
      dispatch({ type: 'SET_ERROR', payload: { message: errorMsg } });
      return;
    }

    const payload: NewRideRequestPayload = {
      ...data,
      requestId: `req-${Date.now()}-${userId}`,
      userId: userId,
      timestamp: Date.now(),
    };

    console.log('Emitting ride request payload:', payload);
    webSocketService.emit(SOCKET_EVENTS.RIDE_NEW_REQUEST, payload);

  }, [state.currentUser, state.socketConnected]);

  const placeBid = useCallback((requestId: string, fareAmount: number, estimatedArrival: number = 5) => {
    if (!state.currentDriver) {
      const errorMsg = 'Driver not authenticated to place a bid.';
      console.error(errorMsg);
      dispatch({ type: 'SET_ERROR', payload: { error: new Error(errorMsg) } });
      return;
    }
    const driverId = (state.currentDriver as any).driverId || state.currentDriver._id;
    const payload: PlaceBidPayload = {
      requestId,
      fareAmount,
      estimatedArrival,
      driverId: driverId,
      timestamp: Date.now(),
    };
    webSocketService.emit(SOCKET_EVENTS.RIDE_BID_PLACED, payload);
  }, [state.currentDriver, state.socketConnected]);

  const setError = useCallback((error: AppError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);


  const acceptBid = useCallback((rideRequestId: string, bidId: string) => {
    if (!state.currentUser || !state.socketConnected) {
      const errorMsg = `Cannot accept bid: ${!state.currentUser ? 'User not authenticated' : 'Socket not connected'}`;
      setError({ message: errorMsg });
      return;
    }

    const userId = (state.currentUser as any).userId || state.currentUser._id;
    const payload: AcceptBidPayload = {
      requestId: rideRequestId,
      bidId,
      userId: userId,
      timestamp: Date.now(),
    };

    console.log('[ACCEPT_BID] Emitting bid acceptance:', payload);
    console.log('[ACCEPT_BID] Event name:', SOCKET_EVENTS.RIDE_BID_ACCEPTED);
    webSocketService.emit(SOCKET_EVENTS.RIDE_BID_ACCEPTED, payload);
    console.log('[ACCEPT_BID] Bid acceptance event emitted successfully');
  }, [state.currentUser, state.socketConnected, setError]);
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  }, []);
  const completeRide = useCallback((rideId: string) => {
    if (!state.currentUser && !state.currentDriver) {
      setError({ message: 'User or driver not authenticated' });
      return;
    }
    if (!state.socketConnected) {
      setError({ message: 'Socket not connected' });
      return;
    }

    const payload: CompleteRidePayload = {
      rideId,
      timestamp: Date.now(),
    };

    webSocketService.emit(SOCKET_EVENTS.RIDE_COMPLETE, payload);
  }, [state.currentUser, state.currentDriver, state.socketConnected, setError]);

  const cancelRide = useCallback((rideId: string, reason: string) => {
    if (!state.currentUser && !state.currentDriver) {
      setError({ message: 'User or driver not authenticated' });
      return;
    }
    if (!state.socketConnected) {
      setError({ message: 'Socket not connected' });
      return;
    }

    const payload: CancelRidePayload = {
      rideId,
      reason,
      timestamp: Date.now(),
    };

    console.log('[CANCEL_RIDE] Emitting ride cancellation:', payload);
    console.log('[CANCEL_RIDE] Event name:', SOCKET_EVENTS.RIDE_CANCEL);
    webSocketService.emit(SOCKET_EVENTS.RIDE_CANCEL, payload);
    console.log('[CANCEL_RIDE] Ride cancellation event emitted successfully');

    // Show notification
    addNotification({
      type: 'info',
      message: 'Ride cancellation request sent...',
      createdAt: new Date()
    });
  }, [state.currentUser, state.currentDriver, state.socketConnected, setError, addNotification]);


  const removeNotification = useCallback((id: string) => {
  }, []);

  const clearNotifications = useCallback(() => {
  }, []);

  const clearAvailableRequests = useCallback(() => {
    dispatch({ type: 'CLEAR_AVAILABLE_REQUESTS' });
  }, []);

  const refreshAvailableRequests = useCallback(() => {
    // This would typically fetch from an API, but since we're using WebSocket,
    // we'll clear and wait for new broadcasts
    clearAvailableRequests();
  }, [clearAvailableRequests]);

  const fetchRideHistory = useCallback(async () => {
    const userId = state.currentUser?._id;
    if (!userId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiService.user.getUserRideHistory(userId);
      if (response.data && response.data.rides) {
        // Map backend data to frontend Ride interface
        const mappedRides = response.data.rides.map((backendRide: any) => ({
          rideId: backendRide.requestId || backendRide._id,
          requestId: backendRide.requestId,
          status: backendRide.status,
          finalFare: backendRide.finalFare || backendRide.acceptedBid?.fareAmount || 0,
          destinationAddress: backendRide.destination?.address || 'Unknown destination',
          pickupAddress: backendRide.pickupLocation?.address || 'Unknown pickup',
          timestamp: new Date(backendRide.createdAt || backendRide.timestamp),
          driverName: backendRide.driverName || 'Unknown driver', // This may need driver lookup
          duration: backendRide.duration || 'N/A',
          rideType: backendRide.rideType,
          // Keep original backend fields for reference
          destination: backendRide.destination,
          pickupLocation: backendRide.pickupLocation,
          createdAt: new Date(backendRide.createdAt),
          updatedAt: new Date(backendRide.updatedAt),
          acceptedBid: backendRide.acceptedBid
        }));

        dispatch({ type: 'SET_RIDE_HISTORY', payload: mappedRides });
      }
    } catch (error: any) {
      console.error('Failed to fetch ride history:', error);
      dispatch({ type: 'SET_ERROR', payload: { message: error.response?.data?.message || 'Failed to fetch ride history' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentUser]);

  const contextValue = {
    ...state,
    dispatch,
    connectSocket,
    disconnectSocket,
    reconnectSocket,
    fetchDriverEarnings,
    loginDriver,
    loginUser,
    logout,
    restoreSession,
    goOnlineDriver,
    goOfflineDriver,
    updateDriverStatus,
    updateDriverLocation,
    updateUserLocation,
    updateUserProfile,
    createRideRequest,
    placeBid,
    acceptBid,
    completeRide,
    cancelRide,
    addNotification,
    removeNotification,
    clearNotifications,
    setError,
    clearError,
    clearAvailableRequests,
    refreshAvailableRequests,
    fetchRideHistory,
    registerUser,
    registerDriver,
  };

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// 5. Custom Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};