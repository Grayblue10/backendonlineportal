import ErrorResponse from './errorResponse.js';

/**
 * Wraps an async function to handle errors and pass them to the next middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((error) => {
    // If the error is already an instance of ErrorResponse, pass it along
    if (error instanceof ErrorResponse) {
      return next(error);
    }
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      return next(new ErrorResponse('Validation failed', 400, errors));
    }
    
    // Handle CastError (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return next(new ErrorResponse('Invalid ID format', 400));
    }
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return next(new ErrorResponse('Invalid token', 401));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Token expired', 401));
    }
    
    // Default to 500 server error
    console.error('Unhandled error:', error);
    return next(ErrorResponse.serverError('An unexpected error occurred'));
  });
};

export default asyncHandler;
