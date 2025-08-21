import { validationResult } from 'express-validator';
import ErrorResponse from './errorResponse.js';

/**
 * Validate request using express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {ErrorResponse} If validation fails
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
    }));
    throw new ErrorResponse('Validation failed', 400, errorMessages);
  }
  next();
};

/**
 * Validate object ID format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePassword = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { 
      valid: false, 
      message: `Password must be at least ${minLength} characters long` 
    };
  }
  if (!hasUppercase) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter' 
    };
  }
  if (!hasLowercase) {
    return { 
      valid: false, 
      message: 'Password must contain at least one lowercase letter' 
    };
  }
  if (!hasNumber) {
    return { 
      valid: false, 
      message: 'Password must contain at least one number' 
    };
  }
  if (!hasSpecialChar) {
    return { 
      valid: false, 
      message: 'Password must contain at least one special character' 
    };
  }
  
  return { valid: true, message: 'Password is valid' };
};

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/**
 * Validate and parse date string
 * @param {string} dateString - Date string to validate
 * @returns {Date|null} Valid Date object or null if invalid
 */
const validateAndParseDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Export all utility functions
export {
  validateRequest,
  isValidObjectId,
  isValidEmail,
  validatePassword,
  sanitizeInput,
  validateAndParseDate
};
