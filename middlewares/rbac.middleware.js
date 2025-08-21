import { ROLES } from '../controllers/auth.controller.js';
import { ADMIN_PERMISSIONS } from '../models/Admin.model.js';
import ErrorResponse from '../utils/errorResponse.js';

// Role hierarchy (higher number means more privileges)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.TEACHER]: 2,
  [ROLES.STUDENT]: 1
};

/**
 * Middleware to check if user has required role
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has minimum required role
 * @param {string} minRole - Minimum required role
 * @returns {Function} Express middleware function
 */
export const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required', 401));
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minRole];

    if (userRoleLevel < requiredRoleLevel) {
      return next(
        new ErrorResponse(
          `Role '${req.user.role}' does not have sufficient privileges`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware function
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required', 401));
    }

    // Super admin bypasses all permission checks
    if (req.user.role === ROLES.ADMIN && req.user.roleType === 'super_admin') {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.permissions?.includes(permission)) {
      return next(
        new ErrorResponse(
          `Insufficient permissions. Required: ${permission}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {...string} permissions - List of permissions (user needs at least one)
 * @returns {Function} Express middleware function
 */
export const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required', 401));
    }

    // Super admin bypasses all permission checks
    if (req.user.role === ROLES.ADMIN && req.user.roleType === 'super_admin') {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission => 
      req.user.permissions?.includes(permission)
    );

    if (!hasPermission) {
      return next(
        new ErrorResponse(
          `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user is the owner of the resource or has admin role
 * @param {string} modelName - Name of the model to check ownership against
 * @param {string} [idParam='id'] - Name of the route parameter containing the resource ID
 * @returns {Function} Express middleware function
 */
export const isOwnerOrAdmin = (modelName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      // Admin can access any resource
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const Model = mongoose.model(modelName);
      const resource = await Model.findById(req.params[idParam]);

      if (!resource) {
        return next(new ErrorResponse('Resource not found', 404));
      }

      // Check if the user is the owner of the resource
      if (resource.user && resource.user.toString() !== req.user.id) {
        return next(
          new ErrorResponse('Not authorized to access this resource', 403)
        );
      }

      // If resource has a different owner field (e.g., 'student', 'teacher')
      const ownerField = modelName.toLowerCase();
      if (resource[ownerField] && resource[ownerField].toString() !== req.user.id) {
        return next(
          new ErrorResponse('Not authorized to access this resource', 403)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  requireRole,
  requireMinRole,
  requirePermission,
  requireAnyPermission,
  isOwnerOrAdmin
};
