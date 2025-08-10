import { io, Socket } from 'socket.io-client';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

// ---[ BASE AND SHARED INTERFACES ]------------------------------------------

interface SocketEventPayload {
  timestamp: number;
  version?: string; // Optional API versioning
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface VehicleInfo {
  type: string;
  licensePlate?: string;
  comfort?: number;
  price?: number;
}

// ---[ PAYLOAD INTERFACES: FRONTEND -> BACKEND ]-----------------------------

export interface RegisterUserPayload extends SocketEventPayload {
  userId: string;
  location?: Location;
}

export interface RegisterDriverPayload extends SocketEventPayload {
  driverId: string;
  name: string;
  phone: string;
  email?: string;
  location?: Location;
  vehicleInfo?: VehicleInfo;
}

export interface NewRideRequestPayload extends SocketEventPayload {
  requestId: string;
  userId: string;
  rideType: string;
  vehicleType?: string; 
  pickupLocation: { address: string; coordinates: Location };
  destination: { address: string; coordinates: Location };
}

export interface PlaceBidPayload extends SocketEventPayload {
  requestId: string;
  driverId: string;
  fareAmount: number;
  estimatedArrival: number;
}

export interface AcceptBidPayload extends SocketEventPayload {
    requestId: string;
    bidId: string;
    userId: string;
}

export interface DriverStatusUpdatePayload extends SocketEventPayload {
  driverId: string;
  status: 'available' | 'busy' | 'offline';
  vehicleId?: string;
}

export interface DriverLocationUpdatePayload extends SocketEventPayload {
  driverId: string;
  location: Location;
}

export interface CompleteRidePayload extends SocketEventPayload {
  rideId: string;
}

export interface CancelRidePayload extends SocketEventPayload {
  rideId: string;
  reason: string;
}

// ---[ PAYLOAD INTERFACES: BACKEND -> FRONTEND ]-----------------------------

export interface RideRequestBroadcastPayload extends SocketEventPayload {
  requestId: string;
  userId: string;
  pickupLocation: {
    address: string;
    coordinates: Location;
  };
  destination: {
    address: string;
    coordinates: Location;
  };
  rideType: string;
  vehicleType?: string;
  estimatedDistance?: number;
}

export interface BidUpdatePayload extends SocketEventPayload {
  requestId: string;
  bidId: string;
  driverId: string;
  fareAmount: number;
  estimatedArrival?: number;
  status: 'pending' | 'accepted' | 'rejected';
  driverName?: string;
  driverRating?: number;
}

// Emitted by backend when a driver's status changes
export interface DriverStatusUpdatedPayload extends SocketEventPayload {
  driverId: string;
  status: 'available' | 'busy' | 'offline';
}

export interface RideAcceptedPayload extends SocketEventPayload {
  requestId: string;
  driverId: string;
  bid: {
    _id: string;
    bidId?: string;
    driverId: string;
    fareAmount: number;
    estimatedArrival?: number;
    bidTime?: Date;
    status: 'accepted';
    acceptedAt?: Date;
  };
  // Optional driver info fields that may be included
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleInfo?: any;
  // Legacy fields for backward compatibility
  acceptedBid?: {
    bidId: string;
    driverId: string;
    fareAmount: number;
    estimatedArrival?: number;
    bidTime?: Date;
    status: 'accepted';
  };
  driverInfo?: {
    driverId: string;
    name: string;
    phone?: string;
    rating?: number;
    vehicleInfo?: any;
  };
  acceptedAt?: Date;
}

export interface BidAcceptedPayload extends SocketEventPayload {
  requestId: string;
  bidId: string;
  userId: string;
  fareAmount: number;
  pickupLocation: Location;
  destination: Location;
  userInfo?: {
    name: string;
    phone?: string;
  };
  bid?: {
    fareAmount: number;
    driverId: string;
  };
}

export interface RideCompletedPayload extends SocketEventPayload {
  rideId: string;
  status: 'completed';
}

export interface RideCancelledPayload extends SocketEventPayload {
  cancelledAt: Date;
  requestId: string;
  rideId: string;
  cancelledBy: 'user' | 'driver' | 'system';
  reason: string;
}

export interface RideCancelledByUserPayload extends SocketEventPayload {
  requestId: string;
  message: string;
  fareAmount: number;
  pickupAddress?: string;
  destinationAddress?: string;
  cancelledAt: Date;
  reason: string;
}

export interface RideRequestCreatedPayload extends SocketEventPayload {
  requestId: string;
  userId: string;
  status: string;
  rideType: string;
  pickupLocation: { address: string; coordinates: Location };
  destination: { address: string; coordinates: Location };
  createdAt: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: any;
}

export interface UserRegisteredPayload extends SocketEventPayload {
  success: boolean;
  message?: string;
  userId: string;
  user: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    isOnline?: boolean;
    lastSeen?: Date | string;
  };
}

export interface DriverRegisteredPayload extends SocketEventPayload {
  success: boolean;
  message?: string;
  driverId: string;
  driver: any;
}

// ---[ EVENT MAPS ]------------------------------------------------------------

// ---[ EVENT MAPS FOR TYPE-SAFE EMIT/ON ]------------------------------------

export interface FrontendEventMap {
    'user:register': RegisterUserPayload;
    'driver:register': RegisterDriverPayload;
    'ride:newRequest': NewRideRequestPayload;
    'ride:bidPlaced': PlaceBidPayload;
    'ride:bidAccepted': AcceptBidPayload;
    'ride:complete': CompleteRidePayload;
    'ride:cancel': CancelRidePayload;
    'driver:updateStatus': DriverStatusUpdatePayload;
    'driver:updateLocation': DriverLocationUpdatePayload;
}
  
export interface BackendEventMap {
    'connect': undefined;
    'disconnect': string; // reason
    'user:registered': UserRegisteredPayload;
    'driver:registered': DriverRegisteredPayload;
    'ride:newRequest': RideRequestBroadcastPayload;
    'ride:bidUpdate': BidUpdatePayload;
    'ride:accepted': RideAcceptedPayload;
    'ride:bidAccepted': BidAcceptedPayload;
    'ride:completed': RideCompletedPayload;
    'ride:cancelled': RideCancelledPayload;
    'ride:requestCreated': RideRequestCreatedPayload;
    'ride:cancelledByUser': RideCancelledByUserPayload;
    'driver:statusUpdated': DriverStatusUpdatedPayload;
    'error': ErrorPayload;
}

// ---[ WEBSOCKET SERVICE ]-----------------------------------------------------

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(token?: string): void {
    if (this.socket && this.socket.connected) {
      logger.warn('WebSocket is already connected.');
      return;
    }

    const options = token ? { auth: { token }, reconnectionAttempts: 5 } : { reconnectionAttempts: 5 };
    this.socket = io(config.SOCKET_URL, options);
    logger.info('Attempting to connect to WebSocket server...');
    this.setupListeners();
  }

  public disconnect(): void {
    if (this.socket) {
      logger.info('Disconnecting from WebSocket server.');
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info(`Successfully connected to WebSocket server with id: ${this.socket?.id}`);
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.warn(`Disconnected from WebSocket server. Reason: ${reason}`);
      if (reason !== 'io client disconnect') {
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('WebSocket connection error:', error.message);
      this.reconnect();
    });

    this.socket.onAny((eventName, ...args) => {
        logger.debug(`Received event: '${eventName}'`, { payload: args[0] });
    });
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= 5) {
        logger.error('Max reconnection attempts reached. Giving up.');
        return;
    }
    if (this.reconnectTimeout) return; // Already scheduled

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    logger.info(`Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
        this.connect();
        this.reconnectTimeout = null;
    }, delay);
  }

  public emit<K extends keyof FrontendEventMap>(eventName: K, data: FrontendEventMap[K]): void {
    if (!this.socket || !this.socket.connected) {
      logger.error(`Cannot emit event '${eventName}'. WebSocket is not connected.`);
      return;
    }
    logger.debug(`Emitting event: '${eventName}'`, { payload: data });
    this.socket.emit(eventName, data);
  }

  public on<K extends keyof BackendEventMap>(eventName: K, callback: (data: BackendEventMap[K]) => void): void {
    if (!this.socket) {
      logger.error(`Cannot listen for event '${eventName}'. WebSocket is not initialized.`);
      return;
    }
    this.socket.on(eventName, callback as any);
  }

  public off<K extends keyof BackendEventMap>(eventName: K): void {
    if (!this.socket) {
        logger.error(`Cannot remove listener for event '${eventName}'. WebSocket is not initialized.`);
        return;
    }
    this.socket.off(eventName);
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = WebSocketService.getInstance();
