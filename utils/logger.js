/**
 * @file Logger Utility
 * @description Centralized logging for the application
 * @version 1.0.0
 */

import winston from 'winston';
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json, errors } = winston.format;
import { v4 as uuidv4 } from 'uuid';

// Generate a unique request ID for each incoming request
const requestId = () => {
  return { requestId: uuidv4() };
};

/**
 * Custom log format with colors and timestamps for console output
 */
const consoleFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const requestIdStr = requestId ? `[${requestId}] ` : '';
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} ${requestIdStr}[${level}]: ${message}${metaString}`;
});

/**
 * Configure the logger based on the environment
 * @type {import('winston').Logger}
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include error stack traces
    process.env.NODE_ENV === 'production' 
      ? json() 
      : combine(colorize(), consoleFormat) // Pretty print for non-production
  ),
  defaultMeta: { service: 'grading-system-api' },
  transports: [
    // Console transport for all environments
    new transports.Console(),
    // File transport for errors in production
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true
      }),
      // Combined log for all levels in production
      new transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true
      })
    ] : [])
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

// If we're not in production then log to the `console` with the format:
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      consoleFormat
    )
  }));
}

// Create a stream object with a 'write' function that will be used by morgan
const stream = {
  /**
   * Write log messages in a format that works with Express's morgan
   * @param {string} message - The log message
   * @param {string} encoding - The message encoding
   */
  write: (message, encoding) => {
    // Use the info log level so the output will be picked up by both transports (file and console)
    logger.info(message.trim(), { component: 'http' });
  }
};

/**
 * Middleware to add request context to logs
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const requestLogger = (req, res, next) => {
  const requestId = uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  const start = Date.now();
  
  // Add a unique ID to the request for logging purposes
  req.requestId = requestId;
  
  // Log the request
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    component: 'http'
  });
  
  // Log when the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      component: 'http'
    });
  });
  
  next();
};

/**
 * Error logger middleware
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      name: err.name,
      ...(err.response?.data && { response: err.response.data })
    },
    component: 'http'
  });
  
  next(err);
};

// Export the logger and related functions
export { logger, requestLogger, errorLogger, stream, requestId };
