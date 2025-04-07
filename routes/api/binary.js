const express = require('express');
const router = express.Router();
const binaryController = require('../../controllers/binaryController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Protect all routes
router.use(authenticateJWT);

// Get binary tree structure
router.get('/tree', binaryController.getBinaryTree);

// Get binary legs information
router.get('/legs', binaryController.getBinaryLegs);

// Get pending binary income
router.get('/pending-income', binaryController.getPendingBinaryIncome);

// Analyze binary tree performance
router.get('/analysis', binaryController.analyzeBinaryTree);

// Admin routes
router.post('/place', isAdmin, binaryController.placeInBinaryNetwork);

module.exports = router;