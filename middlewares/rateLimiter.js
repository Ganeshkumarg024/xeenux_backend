const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorHandler');

/**
 * General API rate limiter
 * Limits the number of requests from the same IP
 */
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests, please try again later',
  handler: (req, res, next, options) => {
    next(new AppError('Too many requests, please try again later', 429));
  }
});

/**
 * Login rate limiter
 * More restrictive limit for login attempts to prevent brute force attacks
 */
exports.loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again after an hour',
  handler: (req, res, next, options) => {
    next(new AppError('Too many login attempts, please try again after an hour', 429));
  }
});