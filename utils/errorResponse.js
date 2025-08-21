/**
 * Custom error class for consistent error responses
 * @extends Error
 */
class ErrorResponse extends Error {
  /**
   * Create an error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} errors - Array of error objects (optional)
   * @param {string} code - Error code (optional)
   */
  constructor(message, statusCode, errors = [], code) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code || this.constructor.name;
    this.isOperational = true; // This is to distinguish operational errors from programming errors
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a bad request error (400)
   * @param {string} message - Error message
   * @param {Array} errors - Array of error objects (optional)
   * @returns {ErrorResponse} Bad request error
   */
  static badRequest(message = 'Bad Request', errors = []) {
    return new ErrorResponse(message, 400, errors);
  }

  /**
   * Create an unauthorized error (401)
   * @param {string} message - Error message
   * @returns {ErrorResponse} Unauthorized error
   */
  static unauthorized(message = 'Unauthorized') {
    return new ErrorResponse(message, 401);
  }

  /**
   * Create a forbidden error (403)
   * @param {string} message - Error message
   * @returns {ErrorResponse} Forbidden error
   */
  static forbidden(message = 'Forbidden') {
    return new ErrorResponse(message, 403);
  }

  /**
   * Create a not found error (404)
   * @param {string} resource - Name of the resource not found
   * @returns {ErrorResponse} Not found error
   */
  static notFound(resource = 'Resource') {
    return new ErrorResponse(`${resource} not found`, 404);
  }

  /**
   * Create a conflict error (409)
   * @param {string} message - Error message
   * @returns {ErrorResponse} Conflict error
   */
  static conflict(message = 'Conflict') {
    return new ErrorResponse(message, 409);
  }

  /**
   * Create a validation error (422)
   * @param {Array} errors - Array of validation error objects
   * @returns {ErrorResponse} Validation error
   */
  static validationError(errors = []) {
    return new ErrorResponse('Validation Error', 422, errors);
  }

  /**
   * Create a server error (500)
   * @param {string} message - Error message
   * @returns {ErrorResponse} Internal server error
   */
  static serverError(message = 'Internal Server Error') {
    return new ErrorResponse(message, 500);
  }

  /**
   * Convert error to JSON
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.errors.length > 0 && { errors: this.errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      },
    };
  }
}

export default ErrorResponse;
