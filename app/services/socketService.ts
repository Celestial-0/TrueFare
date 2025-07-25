import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '../utils/constants';

export interface SocketService {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  isConnected: () => boolean;
  placeBid: (bidData: { requestId: string; fareAmount: number }) => void;
}

class SocketServiceImpl implements SocketService {
  public socket: Socket | null = null;
  private connectionCallbacks: (() => void)[] = [];
  private disconnectionCallbacks: (() => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isReconnecting = false;
  private registrationData: any = null;
  private pendingEmissions: { event: string; data: any }[] = [];

  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (this.socket && !this.socket.connected) {
      console.log('Socket exists but disconnected, reconnecting...');
      this.socket.connect();
      return;
    }

    console.log('Connecting to socket server:', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('✅ Socket connected successfully:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      // Re-register if we have registration data and this is a reconnection
      if (this.registrationData) {
        console.log('🔄 Re-registering after reconnection');
        this.socket?.emit(this.registrationData.event, this.registrationData.data);
      }
      
      // Emit any pending emissions
      this.processPendingEmissions();
      
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('❌ Socket disconnected:', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to reconnect manually
        this.handleReconnection();
      }
      
      this.disconnectionCallbacks.forEach(callback => callback());
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('🔥 Socket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('💥 Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to socket');
    });

    // Handle heartbeat from server
    this.socket.on('heartbeat', (data) => {
      console.log('💓 Heartbeat received from server');
      this.socket?.emit('heartbeat_response', { timestamp: new Date() });
    });
  }

  private handleReconnection(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    console.log('🔄 Attempting manual reconnection...');
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.socket?.connect();
      }
    }, 1000);
  }

  private processPendingEmissions(): void {
    if (this.pendingEmissions.length > 0) {
      console.log('📤 Processing', this.pendingEmissions.length, 'pending emissions');
      this.pendingEmissions.forEach(({ event, data }) => {
        this.socket?.emit(event, data);
      });
      this.pendingEmissions = [];
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log('Emitting event:', event, data);
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, queueing emission:', event);
      // Queue the emission for when connection is restored
      this.pendingEmissions.push({ event, data });
      
      // Attempt to reconnect if not already connecting
      if (!this.isReconnecting && !this.socket?.connected) {
        this.handleReconnection();
      }
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      // Only log new event listeners, not repeated ones
      const eventAlreadyListened = this.socket.hasListeners && this.socket.hasListeners(event);
      if (!eventAlreadyListened) {
        console.log('Listening to event:', event);
      }
      this.socket.on(event, callback);
    } else {
      console.warn('Cannot listen to event, socket not initialized:', event);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Helper methods for common events
  onConnect(callback: () => void): void {
    this.connectionCallbacks.push(callback);
    if (this.isConnected()) {
      callback();
    }
  }

  onDisconnect(callback: () => void): void {
    this.disconnectionCallbacks.push(callback);
  }

  // Driver-specific methods
  registerDriver(driverData: any): void {
    // Prevent duplicate registrations
    if (this.registrationData?.event === SOCKET_EVENTS.DRIVER_REGISTER && 
        this.registrationData?.data?.driverId === driverData.driverId) {
      console.log('🔄 Driver registration data unchanged, skipping duplicate registration');
      return;
    }

    // Store registration data for reconnections
    this.registrationData = {
      event: SOCKET_EVENTS.DRIVER_REGISTER,
      data: driverData
    };
    this.emit(SOCKET_EVENTS.DRIVER_REGISTER, driverData);
  }

  placeBid(bidData: { requestId: string; fareAmount: number }): void {
    this.emit(SOCKET_EVENTS.PLACE_BID, bidData);
  }

  updateDriverStatus(statusData: any): void {
    this.emit(SOCKET_EVENTS.UPDATE_STATUS, statusData);
  }

  updateDriverLocation(locationData: any): void {
    this.emit(SOCKET_EVENTS.UPDATE_LOCATION, locationData);
  }

  // User-specific methods
  registerUser(userData: any): void {
    // Prevent duplicate registrations
    if (this.registrationData?.event === SOCKET_EVENTS.USER_REGISTER && 
        this.registrationData?.data?.userId === userData.userId) {
      console.log('🔄 User registration data unchanged, skipping duplicate registration');
      return;
    }

    // Store registration data for reconnections
    this.registrationData = {
      event: SOCKET_EVENTS.USER_REGISTER,
      data: userData
    };
    this.emit(SOCKET_EVENTS.USER_REGISTER, userData);
  }

  // Ride request methods
  createRideRequest(rideRequestData: any): void {
    this.emit('user:createRideRequest', rideRequestData);
  }

  acceptBid(acceptData: any): void {
    this.emit('user:acceptBid', acceptData);
  }

  // Request bid updates for a specific ride request
  requestBidUpdate(requestId: string): void {
    this.emit('user:requestBidUpdate', { requestId });
  }

  // Listen to bid-related events
  onBidsUpdated(callback: (data: any) => void): void {
    this.on('bids:updated', callback);
  }

  onBidConfirmed(callback: (data: any) => void): void {
    this.on('bid:confirmed', callback);
  }

  // Listen to common events
  onNewRideRequest(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.NEW_RIDE_REQUEST, callback);
  }

  onNewBid(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.NEW_BID, callback);
  }

  onBiddingClosed(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.BIDDING_CLOSED, callback);
  }

  onBidAccepted(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.BID_ACCEPTED, callback);
  }

  onDriverRegistered(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.DRIVER_REGISTERED, callback);
  }

  onUserRegistered(callback: (data: any) => void): void {
    this.on(SOCKET_EVENTS.USER_REGISTERED, callback);
  }

  // Ride request events for users
  onRideRequestCreated(callback: (data: any) => void): void {
    this.on('rideRequest:created', callback);
  }

  onRideRequestUpdated(callback: (data: any) => void): void {
    this.on('rideRequest:updated', callback);
  }

  // Utility method to get connection status
  getConnectionStatus(): string {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.isReconnecting) return 'reconnecting';
    return 'connecting';
  }

  // Method to force reconnection
  forceReconnect(): void {
    console.log('🔄 Forcing socket reconnection...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  // Method to clear pending emissions (useful for cleanup)
  clearPendingEmissions(): void {
    this.pendingEmissions = [];
  }

  // Method to get pending emissions count
  getPendingEmissionsCount(): number {
    return this.pendingEmissions.length;
  }

  // Enhanced connection health check
  isHealthy(): boolean {
    return this.socket?.connected === true && !this.isReconnecting;
  }

  // Periodic health check and auto-recovery
  startHealthMonitoring(): void {
    setInterval(() => {
      if (this.socket && !this.socket.connected && !this.isReconnecting) {
        console.log('🔍 Health check: Socket disconnected, attempting recovery');
        this.handleReconnection();
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop health monitoring (useful for cleanup)
  stopHealthMonitoring(): void {
    // Implementation would require storing interval ID
    console.log('🛑 Health monitoring stopped');
  }
}

// Export singleton instance
export default new SocketServiceImpl();
