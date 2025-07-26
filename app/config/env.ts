/**
 * Environment Configuration
 * This file provides a centralized way to access environment variables
 */

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

// Default fallback values
const defaultConfig: EnvConfig = {
  API_BASE_URL: 'http://192.168.137.55:8000/api',
  SOCKET_URL: 'http://192.168.137.55:8000',
  MAIN_URL: '192.168.137.55',
  APP_NAME: 'TrueFare',
  APP_VERSION: '1.0.0',
  DEBUG_MODE: true,
  DEFAULT_TIMEOUT: 10000,
};

// Get MAIN_URL from environment or use default
const mainUrl = process.env.EXPO_PUBLIC_MAIN_URL || process.env.MAIN_URL || defaultConfig.MAIN_URL;

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
