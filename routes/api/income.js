const express = require('express');
const router = express.Router();
const incomeController = require('../../controllers/incomeController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Protect all routes
router.use(authenticateJWT);

// Get all incomes for a user
router.get('/', incomeController.getMyIncomes);

// Process ROI for current user
router.post('/process-roi', incomeController.processROI);

// Process binary income for current user
router.post('/process-binary', incomeController.processBinaryIncome);

// Withdraw income
router.post('/withdraw', incomeController.withdrawIncome);

// Admin routes
router.post('/process-all-roi', isAdmin, incomeController.processAllROI);
router.post('/process-all-binary', isAdmin, incomeController.processAllBinaryIncome);
router.post('/process-weekly-rewards', isAdmin, incomeController.processWeeklyRewards);

module.exports = router;