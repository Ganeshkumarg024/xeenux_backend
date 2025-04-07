const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Protect all routes and ensure admin access
router.use(authenticateJWT, isAdmin);

// Get admin dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// Settings management
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);
router.post('/settings/initialize', adminController.initializeSettings);

// User management
router.get('/users/search', adminController.searchUsers);
router.get('/users/:userId/transactions', adminController.getUserTransactions);
router.get('/users/:userId/activities', adminController.getUserActivities);
router.post('/users/balance', adminController.addUserBalance);
router.patch('/users/rank', adminController.updateUserRank);

// Transaction management
router.get('/transactions/recent', adminController.getRecentTransactions);

// Process scheduled tasks
router.post('/scheduler', adminController.processScheduledTasks);

// System logs
router.get('/logs', adminController.getSystemLogs);

// Generate reports
router.post('/reports', adminController.generateReport);

module.exports = router;