// A simple logger utility for consistent logging across the application.

const getTimestamp = (): string => new Date().toISOString();

const log = (level: string, message: string, ...args: any[]) => {
  console.log(`[${getTimestamp()}] [${level.toUpperCase()}] ${message}`, ...args);
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    // Debug logs can be noisy, so we might want to disable them in production.
    if (process.env.NODE_ENV !== 'production') {
      log('DEBUG', message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    log('INFO', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    log('WARN', message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    log('ERROR', message, ...args);
  },
};
