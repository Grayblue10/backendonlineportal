/**
 * Role-based authorization middleware
 * @param  {...string} roles - Roles that are allowed to access the route
 * @returns {Function} - Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires ${roles.join(' or ')} role.`
      });
    }

    next();
  };
};

export default authorize;