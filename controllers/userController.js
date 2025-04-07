const User = require('../models/User');
const UserVolume = require('../models/UserVolume');
const BinaryNetwork = require('../models/BinaryNetwork');
const TeamStructure = require('../models/TeamStructure');
const Income = require('../models/Income');
const Activity = require('../models/Activity');
const UserPackage = require('../models/UserPackage');
const { catchAsync, AppError } = require('../middlewares/errorHandler');

/**
 * Filter object to only allowed fields
 * @param {Object} obj - Object to filter
 * @param {Array} allowedFields - Allowed fields
 * @returns {Object} - Filtered object
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 * Get current user profile
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // Get user with additional details
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get user volume
  const userVolume = await UserVolume.findOne({ userId: user.userId });
  
  // Get user incomes
  const incomes = await Income.getTotalIncome(user.userId);
  
  // Get pending income
  const pendingIncome = await Income.getPendingIncome(user.userId);
  
  // Get active packages
  const activePackages = await UserPackage.find({ 
    userId: user.userId,
    isActive: true
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
      volume: userVolume,
      incomes,
      pendingIncome,
      activePackages
    }
  });
});

/**
 * Update user profile
 */
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Check if user is trying to update password
  if (req.body.password) {
    return next(new AppError('This route is not for password updates. Please use /updatePassword', 400));
  }
  
  // 2) Filter out unwanted fields
  const filteredBody = filterObj(req.body, 'name', 'email', 'phone', 'walletAddress');
  
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

/**
 * Deactivate user account
 */
exports.deactivateMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Get user dashboard data
 */
exports.getDashboard = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get user with details
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get user volume
  const userVolume = await UserVolume.findOne({ userId });
  
  // Get binary network structure
  const binaryNetwork = await BinaryNetwork.findOne({ userId });
  
  // Get team structure
  const teamStructure = await TeamStructure.findOne({ userId });
  
  // Get active packages
  const activePackages = await UserPackage.find({ 
    userId,
    isActive: true
  });
  
  // Get incomes
  const incomes = await Income.getTotalIncome(userId);
  
  // Get recent activities
  const { activities } = await Activity.getUserActivities(userId, null, 1, 5);
  
  // Get referral links
  const referralLinks = {
    left: `https://xeenux.io/register/?ref=${userId}&pos=0`,
    right: `https://xeenux.io/register/?ref=${userId}&pos=1`
  };
  
  // Get binary tree structure for display
  const binaryTree = await BinaryNetwork.getBinaryTreeStructure(userId, 2);
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
      volume: userVolume,
      binaryNetwork,
      teamStructure,
      activePackages,
      incomes,
      recentActivities: activities,
      referralLinks,
      binaryTree
    }
  });
});

/**
 * Get user binary tree
 */
exports.getBinaryTree = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const depth = parseInt(req.query.depth) || 2;
  
  // Get binary tree structure for display
  const binaryTree = await BinaryNetwork.getBinaryTreeStructure(userId, depth);
  
  if (!binaryTree) {
    return next(new AppError('Binary tree not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      binaryTree
    }
  });
});

/**
 * Get user team members
 */
exports.getTeamMembers = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const level = parseInt(req.params.level) || 1;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Get team members with pagination
  const result = await TeamStructure.getTeamMembers(userId, level, page, limit);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get user activities
 */
exports.getActivities = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const type = req.query.type !== undefined ? parseInt(req.query.type) : null;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Get activities with pagination
  const result = await Activity.getUserActivities(userId, type, page, limit);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get user packages
 */
exports.getUserPackages = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get all user packages
  const packages = await UserPackage.find({ userId })
    .sort({ purchaseDate: -1 });
  
  res.status(200).json({
    status: 'success',
    data: {
      packages
    }
  });
});

/**
 * Get user by ID (admin only)
 */
exports.getUser = catchAsync(async (req, res, next) => {
  const userId = parseInt(req.params.userId);
  
  // Get user with details
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get user volume
  const userVolume = await UserVolume.findOne({ userId });
  
  // Get incomes
  const incomes = await Income.getTotalIncome(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
      volume: userVolume,
      incomes
    }
  });
});

/**
 * Update user (admin only)
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const userId = parseInt(req.params.userId);
  
  // Filter out unwanted fields
  const filteredBody = filterObj(
    req.body, 
    'name', 
    'email', 
    'phone', 
    'walletAddress', 
    'isActive',
    'rank'
  );
  
  // Update user document
  const user = await User.findOneAndUpdate({ userId }, filteredBody, {
    new: true,
    runValidators: true
  });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * Get all users (admin only, with pagination)
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  
  // Create search query
  const searchQuery = search 
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }
    : {};
  
  // Get total count
  const total = await User.countDocuments(searchQuery);
  
  // Get users with pagination
  const users = await User.find(searchQuery)
    .sort({ registeredAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    data: {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});