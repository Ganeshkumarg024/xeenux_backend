const passport = require('passport');
const { AppError, catchAsync } = require('./errorHandler');
const User = require('../models/User');

/**
 * Middleware to authenticate with JWT
 */
exports.authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new AppError('Unauthorized. Please log in to access this resource.', 401));
    }
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Middleware to authenticate with email/password
 */
exports.authenticateLocal = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new AppError(info?.message || 'Invalid credentials', 401));
    }
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Middleware to restrict access based on roles
 * @param {Array} roles - Array of allowed roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized. Please log in to access this resource.', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

/**
 * Middleware to check if user is admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

/**
 * Middleware to check if the logged-in user is accessing their own resource
 */
exports.isOwner = catchAsync(async (req, res, next) => {
  // Get user ID from request parameter
  const userId = req.params.userId || req.params.id;
  
  // Check if the logged-in user is the owner of the requested resource
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to access this resource', 403));
  }
  
  next();
});