const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const packageRoutes = require('./api/packages');
const incomeRoutes = require('./api/income');
const transactionRoutes = require('./api/transactions');
const binaryRoutes = require('./api/binary');
const autopoolRoutes = require('./api/autopool');
const adminRoutes = require('./api/admin');
const debugRoutes = require('./debug');

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/packages', packageRoutes);
router.use('/income', incomeRoutes);
router.use('/transactions', transactionRoutes);
router.use('/binary', binaryRoutes);
router.use('/autopool', autopoolRoutes);
router.use('/admin', adminRoutes);
router.use('/debug', debugRoutes)

module.exports = router;