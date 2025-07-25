import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import socketService from '../services/socketService';
import storageService, { StoredDriverData, StoredUserData } from '../services/storageService';
import { SOCKET_EVENTS, parseVehicleYear } from '../utils/constants';

// Types - Redesigned to match backend exactly
export interface Location {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
}

export interface Bid {
  _id: string;
  driverId: string;
  fareAmount: number;
  bidTime: string; // ISO date string
  rank?: number;
  isLowest?: boolean;
  isHighest?: boolean;
}

export interface AcceptedBid {
  driverId: string;
  fareAmount: number;
  bidTime: string;
}

export interface RideRequest {
  _id: string;
  userId: string;
  pickupLocation: Location;
  destination: Location;
  status: 'pending' | 'bidding' | 'accepted' | 'completed' | 'cancelled';
  estimatedDistance?: number; // in kilometers
  estimatedDuration?: number; // in minutes
  bids: Bid[];
  acceptedBid?: AcceptedBid;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  name: string;
  email?: string;
  phone: string;
  defaultLocation?: Location;
  rating: number;
  totalRides: number;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  driverId: string;
  name: string;
  email?: string;
  phone: string;
  vehicleInfo?: VehicleInfo;
  currentLocation?: Location;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  totalEarnings: number;
  totalRides: number;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedDriver {
  driverId: string;
  name: string;
  vehicleInfo?: VehicleInfo;
  status: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// State interface
interface AppState {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isSocketRegistered: boolean;
  currentDriver: StoredDriverData | null;
  currentUser: StoredUserData | null;
  userType: 'driver' | 'user' | null;
  rideRequests: RideRequest[];
  availableRequests: RideRequest[];
  connectedDrivers: ConnectedDriver[];
  currentBids: Bid[];
  notifications: string[];
}

// Action types
type AppAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: AppState['connectionStatus'] }
  | { type: 'SET_SOCKET_REGISTERED'; payload: boolean }
  | { type: 'SET_CURRENT_DRIVER'; payload: StoredDriverData | null }
  | { type: 'UPDATE_CURRENT_DRIVER_STATUS'; payload: string }
  | { type: 'SET_CURRENT_USER'; payload: StoredUserData | null }
  | { type: 'SET_USER_TYPE'; payload: 'driver' | 'user' | null }
  | { type: 'SET_RIDE_REQUESTS'; payload: RideRequest[] }
  | { type: 'ADD_RIDE_REQUEST'; payload: RideRequest }
  | { type: 'UPDATE_RIDE_REQUEST'; payload: { _id: string; updates: Partial<RideRequest> } }
  | { type: 'SET_AVAILABLE_REQUESTS'; payload: RideRequest[] }
  | { type: 'SET_CONNECTED_DRIVERS'; payload: ConnectedDriver[] }
  | { type: 'UPDATE_DRIVER_STATUS'; payload: { driverId: string; status: string } }
  | { type: 'SET_CURRENT_BIDS'; payload: Bid[] }
  | { type: 'ADD_BID'; payload: Bid }
  | { type: 'UPDATE_BID'; payload: { _id: string; updates: Partial<Bid> } }
  | { type: 'ADD_NOTIFICATION'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: number }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  isSocketRegistered: false,
  currentDriver: null,
  currentUser: null,
  userType: null,
  rideRequests: [],
  availableRequests: [],
  connectedDrivers: [],
  currentBids: [],
  notifications: [],
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
        isConnected: action.payload === 'connected',
        // Reset socket registration when connection status changes
        isSocketRegistered: action.payload === 'connected' ? state.isSocketRegistered : false,
      };

    case 'SET_SOCKET_REGISTERED':
      return {
        ...state,
        isSocketRegistered: action.payload,
      };

    case 'SET_CURRENT_DRIVER':
      return {
        ...state,
        currentDriver: action.payload,
        userType: action.payload ? 'driver' : null,
        // Reset socket registration when user changes
        isSocketRegistered: false,
      };

    case 'UPDATE_CURRENT_DRIVER_STATUS':
      return {
        ...state,
        currentDriver: state.currentDriver ? {
          ...state.currentDriver,
          status: action.payload
        } : null,
      };

    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
        userType: action.payload ? 'user' : null,
        // Reset socket registration when user changes
        isSocketRegistered: false,
      };

    case 'SET_USER_TYPE':
      return {
        ...state,
        userType: action.payload,
      };

    case 'SET_RIDE_REQUESTS':
      return {
        ...state,
        rideRequests: action.payload,
      };

    case 'ADD_RIDE_REQUEST':
      return {
        ...state,
        rideRequests: [action.payload, ...state.rideRequests],
      };

    case 'UPDATE_RIDE_REQUEST':
      return {
        ...state,
        rideRequests: state.rideRequests.map(request =>
          request._id === action.payload._id
            ? { ...request, ...action.payload.updates }
            : request
        ),
      };

    case 'SET_AVAILABLE_REQUESTS':
      return {
        ...state,
        availableRequests: action.payload,
      };

    case 'SET_CONNECTED_DRIVERS':
      return {
        ...state,
        connectedDrivers: action.payload,
      };

    case 'UPDATE_DRIVER_STATUS':
      return {
        ...state,
        connectedDrivers: state.connectedDrivers.map(driver =>
          driver.driverId === action.payload.driverId
            ? { ...driver, status: action.payload.status }
            : driver
        ),
      };

    case 'SET_CURRENT_BIDS':
      return {
        ...state,
        currentBids: action.payload,
      };

    case 'ADD_BID':
      return {
        ...state,
        currentBids: [action.payload, ...state.currentBids],
      };

    case 'UPDATE_BID':
      return {
        ...state,
        currentBids: state.currentBids.map(bid =>
          bid._id === action.payload._id
            ? { ...bid, ...action.payload.updates }
            : bid
        ),
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((_, index) => index !== action.payload),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  connectSocket: (userData?: StoredUserData, driverData?: StoredDriverData) => void;
  disconnectSocket: () => void;
  reconnectSocket: () => void;
  loginDriver: (driverData: StoredDriverData) => Promise<void>;
  loginUser: (userData: StoredUserData, isNewRegistration?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateDriverStatus: (status: string) => void;
  addNotification: (message: string) => void;
  clearNotifications: () => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isInitializedRef = useRef(false);

  const addNotification = useCallback((message: string) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: message });
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: 0 });
    }, 5000);
  }, []);

  const connectSocket = useCallback((userData?: StoredUserData, driverData?: StoredDriverData, isNewRegistration?: boolean) => {
    // Get current connection status from socket service directly
    const currentStatus = socketService.getConnectionStatus();
    const isSocketConnected = socketService.socket?.connected;
    
    console.log('🔍 ConnectSocket - Current status:', currentStatus, 'Socket connected:', isSocketConnected, 'AppContext connected:', state.connectionStatus);
    
    // If socket is already connected but AppContext doesn't know, sync the status
    if (isSocketConnected && state.connectionStatus !== 'connected') {
      console.log('🔄 Socket is connected but AppContext is out of sync, updating status');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      return;
    }
    
    // Only connect if not already connected or connecting
    if (currentStatus === 'connected' || currentStatus === 'connecting') {
      console.log('Socket already connected or connecting, skipping connection attempt');
      return;
    }

    console.log('Establishing socket connection...');
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    
    // Clear existing listeners to prevent duplicates
    socketService.off('connect');
    socketService.off('disconnect');
    
    socketService.onConnect(() => {
      console.log('✅ Socket connected successfully');
      console.log('🔍 Current connection status before update:', state.connectionStatus);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      addNotification('Connected to server');

      // Register user/driver after connection - use passed data or state data
      const currentDriver = driverData || state.currentDriver;
      const currentUser = userData || state.currentUser;

      if (currentDriver) {
        console.log('Registering driver after socket connection');
        socketService.registerDriver({
          ...currentDriver,
          driverId: currentDriver.id,
          vehicleInfo: currentDriver.vehicleInfo ? {
            ...currentDriver.vehicleInfo,
            year: parseVehicleYear(currentDriver.vehicleInfo.year)
          } : undefined,
          location: {
            latitude: 0,
            longitude: 0,
            address: 'Current Location'
          },
          status: 'available'
        });
      } else if (currentUser) {
        console.log(`${isNewRegistration ? 'Registering new user' : 'Connecting existing user'} after socket connection`);
        socketService.registerUser({
          ...currentUser,
          userId: currentUser.id // Ensure userId is provided
        });
      }
    });

    socketService.onDisconnect(() => {
      console.log('❌ Socket disconnected');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      addNotification('Disconnected from server');
    });

    // Handle socket errors
    socketService.on('error', (error: any) => {
      console.error('🔥 Socket error received:', error);
      if (error.code === 'USER_NOT_REGISTERED') {
        dispatch({ type: 'SET_SOCKET_REGISTERED', payload: false });
        addNotification('Registration required. Please try again.');
      } else if (error.code === 'REQUEST_NOT_FOUND') {
        addNotification('Ride request not found. Please create a new request.');
      } else {
        addNotification(error.message || 'Socket error occurred');
      }
    });

    // Start the connection
    socketService.connect();
  }, [state.currentDriver, state.currentUser, state.connectionStatus, addNotification]);

  const disconnectSocket = useCallback(() => {
    console.log('Disconnecting socket...');
    
    // Clear any pending callbacks
    socketService.off('connect');
    socketService.off('disconnect');
    
    // Disconnect the socket
    socketService.disconnect();
    
    // Update state immediately
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
  }, []);

  const reconnectSocket = useCallback(() => {
    console.log('Manually reconnecting socket...');
    
    // Disconnect first to ensure clean state
    disconnectSocket();
    
    // Small delay to ensure clean disconnection, then reconnect
    setTimeout(() => {
      // Use current state data for reconnection
      connectSocket(state.currentUser || undefined, state.currentDriver || undefined, false);
    }, 500);
  }, [disconnectSocket, connectSocket, state.currentUser, state.currentDriver]);

  const loginDriver = useCallback(async (driverData: StoredDriverData) => {
    try {
      // Clear any existing user data when logging in as driver
      await storageService.removeUserData();
      await storageService.storeDriverData(driverData);
      
      // Update state first
      dispatch({ type: 'SET_CURRENT_USER', payload: null });
      dispatch({ type: 'SET_CURRENT_DRIVER', payload: driverData });
      
      // Establish socket connection for this session with driver data
      console.log('Driver logged in, establishing socket connection...');
      connectSocket(undefined, driverData, false);
    } catch (error) {
      console.error('Error during driver login:', error);
      addNotification('Login failed. Please try again.');
    }
  }, [connectSocket, addNotification]);

  const loginUser = useCallback(async (userData: StoredUserData, isNewRegistration: boolean = false) => {
    try {
      // Clear any existing driver data when logging in as user
      await storageService.removeDriverData();
      await storageService.storeUserData(userData);
      
      // Update state first
      dispatch({ type: 'SET_CURRENT_DRIVER', payload: null });
      dispatch({ type: 'SET_CURRENT_USER', payload: userData });
      
      // Establish socket connection for this session with user data
      console.log(`${isNewRegistration ? 'New user registered' : 'User logged in'}, establishing socket connection...`);
      connectSocket(userData, undefined, isNewRegistration);
    } catch (error) {
      console.error('Error during user login:', error);
      addNotification('Login failed. Please try again.');
    }
  }, [connectSocket, addNotification]);

  const updateDriverStatus = useCallback((status: string) => {
    console.log('Updating driver status in context:', status);
    dispatch({ type: 'UPDATE_CURRENT_DRIVER_STATUS', payload: status });
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Logging out - disconnecting socket and clearing session...');
      
      // Disconnect socket first to end the session
      disconnectSocket();
      
      // Clear all stored data
      await storageService.clearUserSession();
      
      // Reset all state to initial values
      dispatch({ type: 'RESET_STATE' });
      
      // Clear any remaining notifications
      dispatch({ type: 'CLEAR_NOTIFICATIONS' });
      
      addNotification('Logged out successfully');
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, reset the state and disconnect
      disconnectSocket();
      dispatch({ type: 'RESET_STATE' });
      addNotification('Logout completed with errors');
    }
  }, [disconnectSocket, addNotification]);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  // Initialize app state on mount
  useEffect(() => {
    const initializeApp = async () => {
      if (isInitializedRef.current) {
        console.log('App already initialized, skipping...');
        return;
      }
      
      try {
        console.log('Initializing app - checking for existing sessions...');
        isInitializedRef.current = true;
        
        // Check for existing sessions
        const driverData = await storageService.getDriverData();
        const userData = await storageService.getUserData();

        if (driverData) {
          console.log('Found existing driver session, restoring...');
          dispatch({ type: 'SET_CURRENT_DRIVER', payload: driverData });
          
          // Establish socket connection after state update
          console.log('Restoring driver socket connection...');
          connectSocket(undefined, driverData, false);
          
          // Force navigation to drivers tab after a small delay
          setTimeout(() => {
            console.log('🚀 AppContext - Forcing navigation to drivers tab for restored driver');
            // Import router dynamically to avoid circular imports
            import('expo-router').then(({ router }) => {
              router.navigate('/drivers');
            });
          }, 100);
        } else if (userData) {
          console.log('Found existing user session, restoring...');
          dispatch({ type: 'SET_CURRENT_USER', payload: userData });
          
          // Establish socket connection after state update
          console.log('Restoring user socket connection...');
          connectSocket(userData, undefined, false);
          
          // Force navigation to users tab after a small delay
          setTimeout(() => {
            console.log('🚀 AppContext - Forcing navigation to users tab for restored user');
            // Import router dynamically to avoid circular imports
            import('expo-router').then(({ router }) => {
              router.navigate('/users');
            });
          }, 100);
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        addNotification('Error restoring session');
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty to run only once on mount

  // Periodic socket status synchronization with reduced frequency and stability checks
  useEffect(() => {
    const syncSocketStatus = () => {
      const isSocketConnected = socketService.socket?.connected;
      const appContextConnected = state.isConnected;
      
      // Only sync if there's a meaningful change and avoid rapid toggling
      if (isSocketConnected && !appContextConnected) {
        console.log('🔄 Syncing socket status: Socket connected but AppContext disconnected');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      } else if (!isSocketConnected && appContextConnected) {
        // Add a small delay to avoid rapid disconnect/reconnect cycles
        setTimeout(() => {
          // Re-check to ensure this isn't a temporary disconnect
          if (!socketService.socket?.connected && state.isConnected) {
            console.log('🔄 Syncing socket status: Socket disconnected but AppContext connected');
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
          }
        }, 1000);
      }
    };

    // Check immediately
    syncSocketStatus();

    // Set up periodic check every 5 seconds instead of 2 seconds to reduce frequency
    const interval = setInterval(syncSocketStatus, 5000);

    return () => clearInterval(interval);
  }, [state.isConnected]); // Remove excessive dependencies

  // Socket event listeners
  useEffect(() => {
    if (!state.isConnected) return;

    const setupSocketListeners = () => {
      // Common events
      socketService.onNewRideRequest((socketRequest: any) => {
        // Normalize the request data to ensure _id field exists
        const normalizedRequest: RideRequest = {
          ...socketRequest,
          _id: socketRequest._id || socketRequest.requestId,
          createdAt: socketRequest.createdAt || socketRequest.timestamp,
          updatedAt: socketRequest.updatedAt || socketRequest.timestamp,
          bids: socketRequest.bids || []
        };
        
        console.log('📥 Normalized new ride request:', normalizedRequest);
        dispatch({ type: 'ADD_RIDE_REQUEST', payload: normalizedRequest });
        dispatch({ type: 'SET_AVAILABLE_REQUESTS', payload: [...state.availableRequests, normalizedRequest] });
        if (state.userType === 'driver') {
          addNotification('New ride request available!');
        }
      });

      // Handle initial available requests when driver connects
      socketService.on('availableRequests', (socketRequests: any[]) => {
        console.log('📥 Received initial available requests:', socketRequests.length);
        // Normalize each request to ensure _id field exists
        const normalizedRequests: RideRequest[] = socketRequests.map(socketRequest => ({
          ...socketRequest,
          _id: socketRequest._id || socketRequest.requestId,
          createdAt: socketRequest.createdAt || socketRequest.timestamp,
          updatedAt: socketRequest.updatedAt || socketRequest.timestamp,
          bids: socketRequest.bids || []
        }));
        dispatch({ type: 'SET_AVAILABLE_REQUESTS', payload: normalizedRequests });
      });

      socketService.onNewBid((backendBid: any) => {
        // Map backend bid format to frontend format
        const mappedBid: Bid = {
          _id: backendBid._id || `${backendBid.driverId}_${Date.now()}`,
          driverId: backendBid.driverId,
          fareAmount: backendBid.fareAmount || 0,
          bidTime: backendBid.bidTime || new Date().toISOString(),
        };
        dispatch({ type: 'ADD_BID', payload: mappedBid });
        if (state.userType === 'user') {
          addNotification('New bid received!');
        }
      });

      socketService.onBidsUpdated((data: { requestId: string; bids: any[] }) => {
        // Only log if there are actually new bids to reduce console spam
        const currentBidCount = state.currentBids.length;
        if (data.bids.length !== currentBidCount) {
          console.log('📊 Bids updated for request:', data.requestId, 'New bids:', data.bids.length);
        }
        // Map backend bid format to frontend format
        const mappedBids: Bid[] = data.bids.map((backendBid: any) => ({
          _id: backendBid._id || `${backendBid.driverId}_${Date.now()}`,
          driverId: backendBid.driverId,
          fareAmount: backendBid.fareAmount || 0,
          bidTime: backendBid.bidTime || new Date().toISOString(),
          rank: backendBid.rank,
          isLowest: backendBid.isLowest,
          isHighest: backendBid.isHighest,
        }));
        dispatch({ type: 'SET_CURRENT_BIDS', payload: mappedBids });
      });

      socketService.onBiddingClosed((data: { requestId: string }) => {
        dispatch({
          type: 'UPDATE_RIDE_REQUEST',
          payload: {
            _id: data.requestId,
            updates: { status: 'completed' }
          }
        });
        // Remove the request from available requests
        const updatedAvailableRequests = state.availableRequests.filter(req => req._id !== data.requestId);
        dispatch({ type: 'SET_AVAILABLE_REQUESTS', payload: updatedAvailableRequests });
        addNotification('Bidding closed for ride request');
      });

      socketService.onBidAccepted((data: { bidId: string; requestId: string; driverId?: string }) => {
        // Update the ride request status
        dispatch({
          type: 'UPDATE_RIDE_REQUEST',
          payload: {
            _id: data.requestId,
            updates: { status: 'accepted' }
          }
        });
        // Remove accepted bids from current bids if this driver's bid was accepted
        if (data.driverId === state.currentDriver?.id) {
          const updatedBids = state.currentBids.filter(bid => bid._id !== data.bidId);
          dispatch({ type: 'SET_CURRENT_BIDS', payload: updatedBids });
        }
        addNotification('Bid accepted!');
      });

      // Driver-specific events
      if (state.userType === 'driver') {
        socketService.onDriverRegistered(() => {
          console.log('✅ Driver socket registration confirmed');
          dispatch({ type: 'SET_SOCKET_REGISTERED', payload: true });
          addNotification('Driver registration confirmed');
        });

        // Listen for bid confirmations for this driver
        socketService.onBidConfirmed((data) => {
          if (data.driverId === state.currentDriver?.id) {
            // Add the confirmed bid to current bids
            const newBid: Bid = {
              _id: data.bidId || `${data.driverId}_${Date.now()}`,
              driverId: data.driverId,
              fareAmount: data.fareAmount || 0,
              bidTime: data.bidTime || new Date().toISOString(),
            };
            dispatch({ type: 'ADD_BID', payload: newBid });
          }
        });
      }

      // User-specific events
      if (state.userType === 'user') {
        socketService.onUserRegistered(() => {
          console.log('✅ User socket registration confirmed');
          dispatch({ type: 'SET_SOCKET_REGISTERED', payload: true });
          addNotification('User registration confirmed');
        });
      }
    };

    setupSocketListeners();

    return () => {
      // Cleanup listeners
      socketService.off(SOCKET_EVENTS.NEW_RIDE_REQUEST);
      socketService.off(SOCKET_EVENTS.NEW_BID);
      socketService.off(SOCKET_EVENTS.BIDS_UPDATED);
      socketService.off(SOCKET_EVENTS.BIDDING_CLOSED);
      socketService.off(SOCKET_EVENTS.BID_ACCEPTED);
      socketService.off(SOCKET_EVENTS.DRIVER_REGISTERED);
      socketService.off(SOCKET_EVENTS.USER_REGISTERED);
      socketService.off('availableRequests');
      socketService.off('error');
    };
  }, [state.isConnected, state.userType, state.availableRequests, state.currentBids, state.currentDriver?.id, addNotification]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && (state.currentUser || state.currentDriver)) {
        // App became active and we have a logged-in user/driver
        const currentStatus = socketService.getConnectionStatus();
        if (currentStatus === 'disconnected') {
          console.log('App became active, reconnecting socket...');
          connectSocket(state.currentUser || undefined, state.currentDriver || undefined, false);
        }
      }
    };

    const subscription = RNAppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [state.currentUser, state.currentDriver, connectSocket]);

  const contextValue: AppContextType = {
    state,
    dispatch,
    connectSocket,
    disconnectSocket,
    reconnectSocket,
    loginDriver,
    loginUser,
    logout,
    updateDriverStatus,
    addNotification,
    clearNotifications,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
