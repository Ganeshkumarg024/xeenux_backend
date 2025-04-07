const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { authenticateJWT, isAdmin, isOwner } = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimiter');

// Protect all routes after this middleware
router.use(authenticateJWT);

// Get current user profile
router.get('/me', userController.getMe);

// Update current user profile
router.patch('/me', userController.updateMe);

// Deactivate current user account
router.delete('/me', userController.deactivateMe);

// Get user dashboard data
router.get('/dashboard', userController.getDashboard);

// Get user binary tree
router.get('/binary-tree', userController.getBinaryTree);

// Get user team members by level
router.get('/team/:level', userController.getTeamMembers);

// Get user activities
router.get('/activities', userController.getActivities);

// Get user packages
router.get('/packages', userController.getUserPackages);

// Admin routes
router.get('/:userId', isAdmin, userController.getUser);
router.patch('/:userId', isAdmin, userController.updateUser);
router.get('/', isAdmin, userController.getAllUsers);

module.exports = router;