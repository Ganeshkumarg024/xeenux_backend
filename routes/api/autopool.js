const express = require('express');
const router = express.Router();
const autopoolController = require('../../controllers/autopoolController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Protect all routes
router.use(authenticateJWT);

// Get autopool position
router.get('/position', autopoolController.getAutopoolPosition);

// Get autopool income history
router.get('/income', autopoolController.getAutopoolIncome);

// Get user's autopool team
router.get('/team', autopoolController.getAutopoolTeam);

// Admin routes
router.get('/overview', isAdmin, autopoolController.getAutopoolOverview);
router.post('/add', isAdmin, autopoolController.addToAutopool);

module.exports = router;