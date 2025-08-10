/**
 * @fileoverview This service manages all interactions with the device's local storage.
 * It provides a centralized and consistent way to store, retrieve, and clear
 * application data, such as user credentials, session information, and settings.
 * This service abstracts the underlying storage mechanism (AsyncStorage) and
 * provides a clean, promise-based API for the rest of the application.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Driver } from '../types/types';

/**
 * @description A type for the last login data to be stored.
 */
export interface LastLoginData {
  timestamp: number;
  userType: 'user' | 'driver';
  id: string;
}

/**
 * @description An enumeration of keys used for storing data in AsyncStorage.
 * Using an enum helps prevent typos and ensures consistency across the app.
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  DRIVER_DATA: 'driver_data',
  USER_TYPE: 'user_type',
  LAST_LOGIN: 'last_login',
};

class StorageService {
  /**
   * @description A generic method to store a value in AsyncStorage.
   * The value will be stringified before being stored.
   * @param {string} key - The key under which to store the value.
   * @param {any} value - The value to store.
   * @returns {Promise<void>}
   */
  private async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting item with key "${key}" in storage:`, error);
    }
  }

  /**
   * @description A generic method to retrieve a value from AsyncStorage.
   * The value will be parsed from JSON.
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<T | null>} - The retrieved value, or null if not found or on error.
   */
  private async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? (JSON.parse(jsonValue) as T) : null;
    } catch (error) {
      console.error(`Error getting item with key "${key}" from storage:`, error);
      return null;
    }
  }

  /**
   * @description A generic method to remove an item from AsyncStorage.
   * @param {string} key - The key of the item to remove.
   * @returns {Promise<void>}
   */
  private async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item with key "${key}" from storage:`, error);
    }
  }

  // --- Auth Token --- //
  async setAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return this.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  }

  // --- User Data --- //
  async setUserData(user: User): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_DATA, user);
  }

  async getUserData(): Promise<User | null> {
    return this.getItem<User>(STORAGE_KEYS.USER_DATA);
  }

  // --- Driver Data --- //
  async setDriverData(driver: Driver): Promise<void> {
    await this.setItem(STORAGE_KEYS.DRIVER_DATA, driver);
  }

  async getDriverData(): Promise<Driver | null> {
    return this.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
  }

  // --- User Type --- //
  async setUserType(userType: 'user' | 'driver'): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_TYPE, userType);
  }

  async getUserType(): Promise<'user' | 'driver' | null> {
    return this.getItem<'user' | 'driver'>(STORAGE_KEYS.USER_TYPE);
  }

  // --- Last Login --- //
  async setLastLogin(data: LastLoginData): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_LOGIN, data);
  }

  async getLastLogin(): Promise<LastLoginData | null> {
    return this.getItem<LastLoginData>(STORAGE_KEYS.LAST_LOGIN);
  }

  /**
   * @description Clears all authentication-related data from storage.
   * This is useful for logging out a user or driver completely.
   * @returns {Promise<void>}
   */
  async clearAuthData(): Promise<void> {
    const keys = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.DRIVER_DATA,
      STORAGE_KEYS.USER_TYPE,
      STORAGE_KEYS.LAST_LOGIN,
    ];
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing auth data from storage:', error);
    }
  }

  /**
   * @description Clears all data from AsyncStorage.
   * Use with caution, as this will remove all application data.
   * @returns {Promise<void>}
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data from storage:', error);
    }
  }
}

// Export a singleton instance of the service
export const storageService = new StorageService();
