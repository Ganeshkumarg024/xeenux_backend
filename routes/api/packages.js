const express = require('express');
const router = express.Router();
const packageController = require('../../controllers/packageController');
const { authenticateJWT, isAdmin } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Get all available packages (public)
router.get('/', packageController.getAllPackages);

// Get package details (public)
router.get('/:packageIndex', packageController.getPackage);

// Protect all routes after this middleware
router.use(authenticateJWT);

// Purchase a package
router.post('/purchase', packageController.purchasePackage);

// Admin routes
router.post('/', isAdmin, packageController.createPackage);
router.patch('/:packageIndex', isAdmin, packageController.updatePackage);
router.delete('/:packageIndex', isAdmin, packageController.deletePackage);

module.exports = router;