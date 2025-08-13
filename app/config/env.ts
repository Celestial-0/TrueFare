/**
 * Environment Configuration
 * This file provides a centralized way to access environment variables
 */

import { Platform } from 'react-native';

// Type definitions for environment variables
export interface EnvConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  MAIN_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  DEBUG_MODE: boolean;
  DEFAULT_TIMEOUT: number;
}

// Function to get the correct host URL for development
const getHostUrl = (): string => {
  // Prefer the environment variable if it's set for production or specific overrides.
  const envUrl = process.env.EXPO_PUBLIC_MAIN_URL;
  if (envUrl) {
    return envUrl;
  }

  // For Android emulators, use the environment variable 'ANDROID_LOCALHOST'
  // For iOS simulators, use the environment variable 'IOS_LOCALHOST'
  if (Platform.OS === 'android') {
    return process.env.ANDROID_LOCALHOST || '10.0.2.2';
  }
  return process.env.IOS_LOCALHOST || 'localhost';
};

// Default fallback values
const defaultConfig: EnvConfig = {
  API_BASE_URL: 'http://localhost:8000/api',
  SOCKET_URL: 'http://localhost:8000',
  MAIN_URL: 'localhost',
  APP_NAME: 'TrueFare',
  APP_VERSION: '0.2.1',
  DEBUG_MODE: true,
  DEFAULT_TIMEOUT: 10000,
};

// Get the appropriate host URL
const mainUrl = getHostUrl();

// Environment configuration object with dynamic URL construction
export const config: EnvConfig = {
  MAIN_URL: mainUrl,
  API_BASE_URL: `http://${mainUrl}:8000/api`,
  SOCKET_URL: `http://${mainUrl}:8000`,
  APP_NAME: process.env.APP_NAME || defaultConfig.APP_NAME,
  APP_VERSION: process.env.APP_VERSION || defaultConfig.APP_VERSION,
  DEBUG_MODE: process.env.DEBUG_MODE === 'true' || defaultConfig.DEBUG_MODE,
  DEFAULT_TIMEOUT: process.env.DEFAULT_TIMEOUT ? 
    parseInt(process.env.DEFAULT_TIMEOUT, 10) : defaultConfig.DEFAULT_TIMEOUT,
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => {
  return __DEV__ || config.DEBUG_MODE;
};

// Helper function to log configuration (only in development)
export const logConfig = (): void => {
  if (isDevelopment()) {
    console.log('📱 App Configuration:', {
      ...config,
      // Show environment variable source
      'EXPO_PUBLIC_MAIN_URL': process.env.EXPO_PUBLIC_MAIN_URL,
      'MAIN_URL': process.env.MAIN_URL,
    });
  }
};

// Export default config
export default config;
