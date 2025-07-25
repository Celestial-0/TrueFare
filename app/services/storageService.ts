import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  DRIVER_DATA: 'driver_data',
  USER_DATA: 'user_data',
  APP_SETTINGS: 'app_settings',
  LAST_LOCATION: 'last_location',
  RIDE_HISTORY: 'ride_history',
} as const;

export interface StoredDriverData {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: string;
    licensePlate: string;
    color: string;
  };
  lastLogin: string;
}

export interface StoredUserData {
  id: string;
  name: string;
  email?: string;
  phone: string;
  lastLogin: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  locationSharing: boolean;
  autoConnect: boolean;
}

class StorageService {
  // Generic storage methods
  private async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }

  private async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  private async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  // Driver data methods
  async storeDriverData(driverData: StoredDriverData): Promise<void> {
    const dataWithTimestamp = {
      ...driverData,
      lastLogin: new Date().toISOString(),
    };
    await this.setItem(STORAGE_KEYS.DRIVER_DATA, dataWithTimestamp);
  }

  async getDriverData(): Promise<StoredDriverData | null> {
    return this.getItem<StoredDriverData>(STORAGE_KEYS.DRIVER_DATA);
  }

  async removeDriverData(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.DRIVER_DATA);
  }

  // User data methods
  async storeUserData(userData: StoredUserData): Promise<void> {
    const dataWithTimestamp = {
      ...userData,
      lastLogin: new Date().toISOString(),
    };
    await this.setItem(STORAGE_KEYS.USER_DATA, dataWithTimestamp);
  }

  async getUserData(): Promise<StoredUserData | null> {
    return this.getItem<StoredUserData>(STORAGE_KEYS.USER_DATA);
  }

  async removeUserData(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // App settings methods
  async storeAppSettings(settings: Partial<AppSettings>): Promise<void> {
    const currentSettings = await this.getAppSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await this.setItem(STORAGE_KEYS.APP_SETTINGS, updatedSettings);
  }

  async getAppSettings(): Promise<AppSettings> {
    const settings = await this.getItem<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
    return {
      theme: 'auto',
      notifications: true,
      locationSharing: true,
      autoConnect: true,
      ...settings,
    };
  }

  // Location methods
  async storeLastLocation(location: { latitude: number; longitude: number; timestamp: string }): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_LOCATION, location);
  }

  async getLastLocation(): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
    return this.getItem(STORAGE_KEYS.LAST_LOCATION);
  }

  // Ride history methods
  async storeRideHistory(rides: any[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.RIDE_HISTORY, rides);
  }

  async getRideHistory(): Promise<any[]> {
    const history = await this.getItem<any[]>(STORAGE_KEYS.RIDE_HISTORY);
    return history || [];
  }

  async addRideToHistory(ride: any): Promise<void> {
    const currentHistory = await this.getRideHistory();
    const updatedHistory = [ride, ...currentHistory].slice(0, 50); // Keep last 50 rides
    await this.storeRideHistory(updatedHistory);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async clearUserSession(): Promise<void> {
    await Promise.all([
      this.removeDriverData(),
      this.removeUserData(),
    ]);
  }

  // Check if user is logged in
  async isDriverLoggedIn(): Promise<boolean> {
    const driverData = await this.getDriverData();
    return driverData !== null;
  }

  async isUserLoggedIn(): Promise<boolean> {
    const userData = await this.getUserData();
    return userData !== null;
  }
}

export default new StorageService();
