import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

// XSS protection middleware
const xssProtection = xss();

// NoSQL injection protection
const noSqlInjectionProtection = mongoSanitize();

// Common sanitization rules for user input
const sanitizeInput = [
  // Sanitize all string fields to prevent XSS
  (req, res, next) => {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.sanitize ? 
            req.sanitize(req.body[key]) : 
            req.body[key].replace(/<[^>]*>?/gm, '');
        }
      });
    }
    next();
  },
  
  // Trim whitespace from all string fields
  (req, res, next) => {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  }
];

// Validation and sanitization for user registration
const validateRegisterInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role'),
  
  // Custom error handling
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', { errors: errors.array(), path: req.path });
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
];

// Validation and sanitization for login
const validateLoginInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  
  // Custom error handling
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', { email: req.body.email });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
];

// Export sanitization and validation utilities
export {
  xssProtection,
  noSqlInjectionProtection,
  sanitizeInput,
  validateRegisterInput,
  validateLoginInput
};
