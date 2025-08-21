import { ADMIN_PERMISSIONS } from '../models/Admin.model.js';

// Define route permissions based on roles
const ROUTE_PERMISSIONS = {
  // Admin routes
  '/api/admin/users': {
    roles: ['admin'],
    permissions: [ADMIN_PERMISSIONS.MANAGE_USERS]
  },
  '/api/admin/courses': {
    roles: ['admin', 'teacher'],
    permissions: [ADMIN_PERMISSIONS.MANAGE_COURSES]
  },
  '/api/admin/grades': {
    roles: ['admin', 'teacher'],
    permissions: [ADMIN_PERMISSIONS.MANAGE_GRADES]
  },
  '/api/admin/settings': {
    roles: ['admin'],
    permissions: [ADMIN_PERMISSIONS.MANAGE_SETTINGS]
  },
  
  // Teacher routes
  '/api/teacher/courses': {
    roles: ['teacher'],
    permissions: []
  },
  '/api/teacher/students': {
    roles: ['teacher'],
    permissions: []
  },
  
  // Student routes
  '/api/student/courses': {
    roles: ['student'],
    permissions: []
  },
  '/api/student/grades': {
    roles: ['student'],
    permissions: []
  },
};

/**
 * Check if user has access to a specific route
 * @param {string} path - Request path
 * @param {Object} user - Authenticated user object
 * @returns {boolean} - Whether access is granted
 */
export const hasRouteAccess = (path, user) => {
  // Allow access to public routes
  const publicRoutes = ['/api/auth/login', '/api/auth/register'];
  if (publicRoutes.includes(path)) return true;
  
  // Find matching route configuration
  const routeConfig = Object.entries(ROUTE_PERMISSIONS).find(([route]) => 
    path.startsWith(route)
  )?.[1];
  
  // If no specific configuration exists, deny access by default
  if (!routeConfig) return false;
  
  // Check if user has required role
  const hasRole = routeConfig.roles.includes(user.role);
  if (!hasRole) return false;
  
  // For admin users, check permissions if required
  if (user.role === 'admin' && routeConfig.permissions?.length > 0) {
    if (user.roleType === 'super_admin') return true;
    return routeConfig.permissions.every(perm => 
      user.permissions?.includes(perm)
    );
  }
  
  return true;
};

/**
 * Middleware to check route access
 */
export const checkRouteAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const hasAccess = hasRouteAccess(req.path, req.user);
  
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Insufficient permissions.'
    });
  }
  
  next();
};
