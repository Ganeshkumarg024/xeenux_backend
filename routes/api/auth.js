const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateJWT, authenticateLocal } = require('../../middlewares/auth');
const { loginLimiter } = require('../../middlewares/rateLimiter');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login',authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', authController.resetPassword);

// Update password (requires authentication)
router.patch('/update-password', authenticateJWT, authController.updatePassword);

module.exports = router;