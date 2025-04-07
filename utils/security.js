const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Hash password
 * @param {String} password - Plain password
 * @returns {Promise<String>} - Hashed password
 */
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

/**
 * Compare password
 * @param {String} candidatePassword - Plain password
 * @param {String} userPassword - Hashed password
 * @returns {Promise<Boolean>} - Password match result
 */
exports.comparePassword = async (candidatePassword, userPassword) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * Generate JWT token
 * @param {String} id - User ID
 * @returns {String} - JWT token
 */
exports.signToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Generate refresh token
 * @param {String} id - User ID
 * @returns {String} - Refresh token
 */
exports.signRefreshToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} - Decoded payload
 */
exports.verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Generate random token
 * @returns {String} - Random token
 */
exports.generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash token
 * @param {String} token - Plain token
 * @returns {String} - Hashed token
 */
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate secure ID
 * @param {Number} baseId - Base ID
 * @returns {Number} - Secure ID
 */
exports.generateSecureId = (baseId = 100000) => {
  return baseId + Math.floor(Math.random() * 900000);
};

/**
 * Sanitize object
 * @param {Object} obj - Object to sanitize
 * @param {Array} allowedFields - Allowed fields
 * @returns {Object} - Sanitized object
 */
exports.sanitizeObject = (obj, allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 * Validate wallet address
 * @param {String} address - Wallet address
 * @returns {Boolean} - Validation result
 */
exports.isValidWalletAddress = (address) => {
  // Simple Ethereum address validation pattern
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Generate API key
 * @returns {String} - API key
 */
exports.generateApiKey = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate API secret
 * @returns {String} - API secret
 */
exports.generateApiSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};