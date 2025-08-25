/**
 * @file Authentication Controller
 * @description Handles user authentication, registration, and password management
 * @version 3.0.0
 */

import { validationResult } from 'express-validator';
import crypto from 'crypto';
// Import utilities
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import AuthService from '../services/authService.js';
import Token from '../models/Token.model.js';
import { ROLES } from '../constants/roles.js';
import Admin from '../models/Admin.model.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';

// Allowed roles array
const ALLOWED_ROLES = Object.values(ROLES);

// Helper function to get model by role
const getModelByRole = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return Admin;
    case ROLES.TEACHER:
      return Teacher;
    case ROLES.STUDENT:
      return Student;
    default:
      return null;
  }
};

// Validation helper
const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new ErrorResponse(errorMessages.join(', '), 400);
  }
};

/**
 * @async
 * @function register
 * @description Register a new user with the system
 * @route POST /api/auth/register
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password (min 6 characters)
 * @param {string} [req.body.role=student] - User role (admin, teacher, or student)
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and token
 * @throws {ErrorResponse} If user already exists or validation fails
 */
const register = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  
  const { email, password, firstName, lastName, role, ...additionalData } = req.body;

  // Validate role
  if (!ALLOWED_ROLES.includes(role)) {
    throw new ErrorResponse('Invalid role specified', 400);
  }

  // Enforce: Only allow up to two admin accounts in the system
  if (role === ROLES.ADMIN) {
    const adminCount = await Admin.countDocuments({});
    if (adminCount >= 2) {
      throw new ErrorResponse('Admin registration limit reached. Only two admins are allowed.', 403);
    }
  }

  const result = await AuthService.register({
    email,
    password,
    firstName,
    lastName,
    role,
    ...additionalData
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result
  });
});

/**
 * @async
 * @function refreshToken
 * @description Refresh token
 * @route POST /api/auth/refresh
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with new token
 * @throws {ErrorResponse} If token is invalid or missing
 */
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    throw new ErrorResponse('No token provided', 401);
  }

  const result = await AuthService.refreshToken(token);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result
  });
});

/**
 * @async
 * @function login
 * @description Authenticate user and get token
 * @route POST /api/auth/login
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {string} [req.body.role] - Optional role filter (admin, teacher, or student)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and token
 * @throws {ErrorResponse} If authentication fails
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  console.log(`🔐 [AuthController] Login request received for email: ${email}`);
  console.log(`🔐 [AuthController] Request body:`, { email, hasPassword: !!password });
  
  if (!email || !password) {
    console.log(`❌ [AuthController] Missing credentials - email: ${!!email}, password: ${!!password}`);
    throw new ErrorResponse('Please provide email and password', 400);
  }

  try {
    console.log(`🔐 [AuthController] Calling AuthService.login...`);
    const result = await AuthService.login(email, password);
    console.log(`✅ [AuthController] Login successful for user: ${email}, role: ${result.user.role}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error(`❌ [AuthController] Login failed for email: ${email}`, error);
    throw error;
  }
});

/**
 * @async
 * @function getMe
 * @description Get current user profile
 * @route GET /api/auth/me
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data
 * @throws {ErrorResponse} If user information is missing
 */
const getMe = asyncHandler(async (req, res) => {
  try {
    // Check if we have the user object from auth middleware
    if (!req.user || !req.user.id || !req.user.role) {
      console.error('User information missing in request:', req.user);
      throw new ErrorResponse('User information not found in request', 400);
    }

    const { id, role } = req.user;
    
    // Get the appropriate model based on role
    const Model = getModelByRole(role);
    if (!Model) {
      console.error('Invalid user role:', role);
      throw new ErrorResponse('Invalid user role', 400);
    }
    
    // Find the user by ID and exclude the password
    const user = await Model.findById(id).select('-password');
    
    if (!user) {
      console.error('User not found with ID:', id);
      throw new ErrorResponse('User not found', 404);
    }

    // Prepare the user data to return
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: role,
      isActive: user.isActive !== false,
      ...(user.studentId && { studentId: user.studentId }),
      ...(user.employeeId && { employeeId: user.employeeId }),
      ...(typeof user.yearLevel !== 'undefined' ? { yearLevel: user.yearLevel } : {})
    };

    console.log('Returning user data for:', userData.email);
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    throw error; // Let the error handler middleware process it
  }
});

/**
 * @async
 * @function changePassword
 * @description Change user's password
 * @route PUT /api/auth/change-password
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - Current password
 * @param {string} req.body.newPassword - New password (min 6 characters)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message
 * @throws {ErrorResponse} If password change fails
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!currentPassword || !newPassword) {
    throw new ErrorResponse('Please provide current and new password', 400);
  }

  const result = await AuthService.changePassword(userId, userRole, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @async
 * @function forgotPassword
 * @description Forgot password - Initiate password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message
 * @throws {ErrorResponse} If email is missing
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ErrorResponse('Please provide email address', 400);
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const result = await AuthService.forgotPassword(email, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @async
 * @function resetPassword
 * @description Reset user password using reset token
 * @route POST /api/auth/reset-password/:token
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.params.token - Password reset token (preferred)
 * @param {string} req.body.password - New password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message
 * @throws {ErrorResponse} If token or password is missing
 */
const resetPassword = asyncHandler(async (req, res) => {
  const token = req.params.token || req.body.token;
  const { password } = req.body;

  if (!token || !password) {
    throw new ErrorResponse('Please provide token and new password', 400);
  }

  const result = await AuthService.resetPassword(token, password);

  res.status(200).json({
    success: true,
    ...result
  });
});

// Update user profile
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { role } = req.user;

  const user = await AuthService.findUserById(id, role);
  
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  // Update user fields
  Object.assign(user, updates);
  await user.save();

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    data: userResponse
  });
});

/**
 * @async
 * @function verifyResetToken
 * @description Verify if a password reset token is valid
 * @route GET /api/auth/reset-password/:token
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response indicating if token is valid
 */
const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ErrorResponse('Token is required', 400);
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  // Find the token in the database
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: 'password-reset',
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate('user');

  if (!tokenDoc) {
    throw new ErrorResponse('Invalid or expired token', 400);
  }

  res.status(200).json({
    success: true,
    message: 'Valid token',
    data: { email: tokenDoc.user?.email || null }
  });
});

// Export all controller functions
export { 
  register, 
  login, 
  getMe, 
  changePassword, 
  forgotPassword, 
  resetPassword, 
  verifyResetToken, 
  updateUser, 
  refreshToken 
};