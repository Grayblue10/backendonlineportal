import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import AuthService from '../services/authService.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403)
      );
    }
    next();
  };
};

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  console.log(` [AuthMiddleware] Protecting route: ${req.method} ${req.originalUrl}`);
  console.log(` [AuthMiddleware] Headers:`, req.headers.authorization ? 'Authorization header present' : 'No authorization header');

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log(` [AuthMiddleware] Token extracted: ${token ? token.substring(0, 20) + '...' : 'none'}`);
  }

  // Make sure token exists
  if (!token) {
    console.log(` [AuthMiddleware] No token found in request`);
    return next(new ErrorResponse('Not authorized to access this route - no token found', 401));
  }

  try {
    console.log(` [AuthMiddleware] Verifying token...`);
    // Verify token
    const decoded = AuthService.verifyToken(token);
    console.log(` [AuthMiddleware] Token decoded:`, { id: decoded.id, role: decoded.role });
    
    // Get user from token
    const user = await AuthService.findUserById(decoded.id, decoded.role);
    
    if (!user) {
      console.log(` [AuthMiddleware] User not found for ID: ${decoded.id}, role: ${decoded.role}`);
      return next(new ErrorResponse('Not authorized to access this route - user not found', 401));
    }

    console.log(` [AuthMiddleware] User authenticated:`, { id: user._id, email: user.email, role: decoded.role });
    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.error(` [AuthMiddleware] Token verification or user lookup failed:`, error);

    // Handle JWT errors explicitly
    if (
      error?.message === 'Invalid token' ||
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'TokenExpiredError'
    ) {
      return next(new ErrorResponse('Not authorized to access this route - invalid token', 401));
    }

    // Handle DB/network errors (e.g., ECONNRESET, Mongo errors)
    if (
      (typeof error?.message === 'string' && error.message.includes('ECONNRESET')) ||
      (typeof error?.name === 'string' && error.name.toLowerCase().includes('mongo'))
    ) {
      return next(new ErrorResponse('Authentication service temporarily unavailable. Please try again.', 503));
    }

    // If an ErrorResponse was thrown elsewhere, pass it through
    if (error instanceof ErrorResponse) {
      return next(error);
    }

    // Fallback unauthorized
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});
