const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/transactionController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Webhook for payment gateway callback (public)
router.post('/confirm-deposit', transactionController.confirmDeposit);

// Protect all other routes
router.use(authenticateJWT);

// Get user transactions
router.get('/', transactionController.getMyTransactions);

// Get transaction by ID
router.get('/:id', transactionController.getTransaction);

// Deposit tokens
router.post('/deposit', transactionController.depositTokens);

// Request withdrawal
router.post('/withdraw', transactionController.requestWithdrawal);

// Get transaction statistics
router.get('/stats/summary', transactionController.getTransactionStats);

// Swap tokens
router.post('/swap', transactionController.swapTokens);

// Admin routes
router.post('/process-withdrawal', isAdmin, transactionController.processWithdrawal);

module.exports = router;