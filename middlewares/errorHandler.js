import ErrorResponse from '../utils/errorResponse.js';
import { isCelebrateError } from 'celebrate';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ValidationError } from 'mongoose';

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for development
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    name: err.name,
    code: err.code,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : {},
    params: req.params,
    query: req.query,
    user: req.user ? { id: req.user.id, role: req.user.role } : 'unauthenticated'
  });

  // Handle specific error types
  if (err.name === 'CastError' || err.kind === 'ObjectId') {
    error = ErrorResponse.notFound('Resource');
  } else if (err.code === 11000) {
    // Handle duplicate field error
    const field = Object.keys(err.keyValue)[0];
    error = ErrorResponse.conflict(`${field} already exists`);
  } else if (err.name === 'ValidationError') {
    // Handle Mongoose validation errors
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    error = ErrorResponse.validationError(errors);
  } else if (isCelebrateError(err)) {
    // Handle Joi validation errors (from celebrate)
    const errors = [];
    for (const [segment, joiError] of err.details.entries()) {
      errors.push(...joiError.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
        type: detail.type
      })));
    }
    error = ErrorResponse.badRequest('Validation failed', errors);
  } else if (err instanceof JsonWebTokenError) {
    error = ErrorResponse.unauthorized('Invalid token');
  } else if (err instanceof TokenExpiredError) {
    error = ErrorResponse.unauthorized('Token expired');
  } else if (err.name === 'MongoError') {
    // Handle other MongoDB errors
    error = ErrorResponse.serverError('Database error occurred');
  } else if (!err.statusCode) {
    // Default to 500 server error
    error = ErrorResponse.serverError('Internal Server Error');
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.details 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

export default errorHandler;
