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
  IS_DEV: boolean;
  PORT: number | null; // Port is only used in development
}

// Configuration for different environments
const ENV = {
  development: {
    port: 8000,
    // Development URLs without protocol for flexible construction
    host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
  },
  production: {
    // Production URLs are fully qualified and don't need a separate port
    apiUrl: 'https://truefare.onrender.com/api',
    socketUrl: 'https://truefare.onrender.com',
  }
};

// Helper function to get the appropriate host URL based on platform
const getHostUrl = (): string => {
  if (__DEV__) {
    // In development mode
    return ENV.development.host;
  } else {
    // In production mode, return the Render backend domain
    return 'truefare.onrender.com';
  }
};

// Get the API URL based on environment
const getApiUrl = (): string => {
  if (__DEV__) {
    const host = getHostUrl();
    const port = ENV.development.port;
    return `http://${host}:${port}/api`;
  } else {
    // Production API URL with HTTPS
    return ENV.production.apiUrl;
  }
};

// Get the WebSocket URL based on environment
const getSocketUrl = (): string => {
  if (__DEV__) {
    const host = getHostUrl();
    const port = ENV.development.port;
    return `http://${host}:${port}`;
  } else {
    // Production Socket URL with HTTPS
    return ENV.production.socketUrl;
  }
};

// Default fallback values
const defaultConfig: EnvConfig = {
  API_BASE_URL: getApiUrl(),
  SOCKET_URL: getSocketUrl(),
  MAIN_URL: getHostUrl(),
  APP_NAME: 'TrueFare',
  APP_VERSION: '0.2.1',
  DEBUG_MODE: __DEV__,
  DEFAULT_TIMEOUT: 10000,
  IS_DEV: __DEV__,
  PORT: __DEV__ ? ENV.development.port : null, // Port is null in production
};

// Environment configuration object with dynamic URL construction
export const config: EnvConfig = {
  MAIN_URL: defaultConfig.MAIN_URL,
  API_BASE_URL: defaultConfig.API_BASE_URL,
  SOCKET_URL: defaultConfig.SOCKET_URL,
  APP_NAME: defaultConfig.APP_NAME,
  APP_VERSION: defaultConfig.APP_VERSION,
  DEBUG_MODE: defaultConfig.DEBUG_MODE,
  DEFAULT_TIMEOUT: defaultConfig.DEFAULT_TIMEOUT,
  IS_DEV: defaultConfig.IS_DEV,
  PORT: defaultConfig.PORT,
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => {
  return __DEV__ || config.DEBUG_MODE;
};

// Helper function to get full API URL with /api suffix
export const getFullApiUrl = (): string => {
  return `${config.API_BASE_URL}/api`;
};

// Helper function to log environment info (dev mode only)
export const logEnvironmentInfo = (): void => {
  if (__DEV__) {
    console.log('🔧 Environment Configuration:');
    console.log(`   Platform: ${Platform.OS}`);
    console.log(`   Host: ${config.MAIN_URL}`);
    console.log(`   API URL: ${config.API_BASE_URL}`);
    console.log(`   Socket URL: ${config.SOCKET_URL}`);
    console.log(`   Full API URL: ${getFullApiUrl()}`);
    console.log(`   Debug Mode: ${config.DEBUG_MODE}`);
    console.log(`   Port: ${config.PORT !== null ? config.PORT : 'N/A (production)'}`);
  }
};

// Export default config
export default config;
