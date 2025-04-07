const User = require('../models/User');
const Package = require('../models/Package');
const Transaction = require('../models/Transaction');
const Activity = require('../models/Activity');
const Income = require('../models/Income');
const Settings = require('../models/Settings');
const BinaryNetwork = require('../models/BinaryNetwork');
const UserVolume = require('../models/UserVolume');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');

/**
 * Get admin dashboard stats
 */
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  // Get user stats
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const newUsersToday = await User.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  
  // Get transaction stats
  const totalDeposits = await Transaction.aggregate([
    { $match: { type: 'deposit', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const totalWithdrawals = await Transaction.aggregate([
    { $match: { type: 'withdrawal', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const totalPurchases = await Transaction.aggregate([
    { $match: { type: 'purchase', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // Get income stats
  const totalIncome = await Income.aggregate([
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);
  
  // Format income data
  const incomeByType = {
    roi: 0,
    level: 0,
    binary: 0,
    autopool: 0,
    reward: 0
  };
  
  totalIncome.forEach(item => {
    if (incomeByType.hasOwnProperty(item._id)) {
      incomeByType[item._id] = item.total;
    }
  });
  
  // Get package stats
  const packageCounts = await Package.aggregate([
    { $group: { _id: '$packageIndex', count: { $sum: 1 } } }
  ]);
  
  // Get system balance
  const currentBalance = await Transaction.aggregate([
    {
      $match: {
        status: 'completed',
        $or: [
          { type: 'deposit' },
          { type: 'purchase' },
          { type: 'withdrawal', amount: { $lt: 0 } }
        ]
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // Get rank distribution
  const rankDistribution = await User.aggregate([
    { $group: { _id: '$rank', count: { $sum: 1 } } }
  ]);
  
  // Format rank data
  const ranks = [
    { rank: 0, name: 'None', count: 0 },
    { rank: 1, name: 'Silver', count: 0 },
    { rank: 2, name: 'Gold', count: 0 },
    { rank: 3, name: 'Platinum', count: 0 },
    { rank: 4, name: 'Diamond', count: 0 }
  ];
  
  rankDistribution.forEach(item => {
    const rank = ranks.find(r => r.rank === item._id);
    if (rank) {
      rank.count = item.count;
    }
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        inactive: totalUsers - activeUsers
      },
      transactions: {
        deposits: totalDeposits.length > 0 ? totalDeposits[0].total : 0,
        withdrawals: totalWithdrawals.length > 0 ? totalWithdrawals[0].total : 0,
        purchases: totalPurchases.length > 0 ? totalPurchases[0].total : 0
      },
      income: incomeByType,
      balance: currentBalance.length > 0 ? currentBalance[0].total : 0,
      packages: packageCounts,
      ranks
    }
  });
});

/**
 * Get system settings
 */
exports.getSettings = catchAsync(async (req, res, next) => {
  const group = req.query.group;
  
  let settings;
  if (group) {
    // Get settings for specific group
    settings = await Settings.getGroupSettings(group);
  } else {
    // Get all settings
    settings = await Settings.find();
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      settings
    }
  });
});

/**
 * Update system settings
 */
exports.updateSettings = catchAsync(async (req, res, next) => {
  const { key, value, group, description } = req.body;
  
  if (!key || value === undefined) {
    return next(new AppError('Key and value are required', 400));
  }
  
  // Update setting
  const setting = await Settings.setValue(
    key,
    value,
    group || 'general',
    description || '',
    req.user._id
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      setting
    }
  });
});

/**
 * Initialize default settings
 */
exports.initializeSettings = catchAsync(async (req, res, next) => {
  const result = await Settings.initializeDefaultSettings();
  
  res.status(200).json({
    status: 'success',
    data: {
      result
    }
  });
});

/**
 * Get recent transactions
 */
exports.getRecentTransactions = catchAsync(async (req, res, next) => {
  const type = req.query.type;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Create query
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  
  // Count total documents
  const total = await Transaction.countDocuments(query);
  
  // Get transactions with pagination
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name email userId');
  
  res.status(200).json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get user search by various criteria
 */
exports.searchUsers = catchAsync(async (req, res, next) => {
  const { query, field } = req.query;
  
  if (!query) {
    return next(new AppError('Search query is required', 400));
  }
  
  let searchQuery = {};
  
  // Determine search field
  if (field === 'userId') {
    searchQuery.userId = parseInt(query);
  } else if (field === 'walletAddress') {
    searchQuery.walletAddress = { $regex: query, $options: 'i' };
  } else if (field === 'phone') {
    searchQuery.phone = { $regex: query, $options: 'i' };
  } else {
    // Default to name or email search
    searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };
  }
  
  // Find users
  const users = await User.find(searchQuery)
    .select('name email userId walletAddress phone rank isActive registeredAt');
  
  res.status(200).json({
    status: 'success',
    data: {
      users,
      count: users.length
    }
  });
});

/**
 * Get user transactions
 */
exports.getUserTransactions = catchAsync(async (req, res, next) => {
  const userId = parseInt(req.params.userId);
  const type = req.query.type;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get transactions
  const result = await Transaction.getUserTransactions(userId, type, null, page, limit);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get user activities
 */
exports.getUserActivities = catchAsync(async (req, res, next) => {
  const userId = parseInt(req.params.userId);
  const type = req.query.type !== undefined ? parseInt(req.query.type) : null;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get activities
  const result = await Activity.getUserActivities(userId, type, page, limit);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Manually add balance to user
 */
exports.addUserBalance = catchAsync(async (req, res, next) => {
  const { userId, amount, type, description } = req.body;
  
  if (!userId || !amount || amount <= 0) {
    return next(new AppError('User ID and positive amount are required', 400));
  }
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Create transaction
  const transaction = await Transaction.create({
    userId,
    user: user._id,
    type: type || 'admin',
    amount,
    amountUSD: amount * (await Settings.getValue('xeenux_price', config.xeenux.defaultPrice)),
    status: 'completed',
    description: description || 'Manual balance adjustment by admin',
    reference: `admin-${req.user._id}`
  });
  
  // Create activity
  await Activity.create({
    userId,
    user: user._id,
    amount,
    type: type === 'roi' ? 2 : type === 'level' ? 1 : type === 'binary' ? 5 : type === 'reward' ? 4 : 0,
    description: description || 'Manual balance adjustment by admin',
    meta: {
      adminId: req.user._id,
      adminName: req.user.name
    }
  });
  
  // Update user income if needed
  if (type === 'roi') {
    user.roiIncome += amount;
  } else if (type === 'level') {
    user.levelIncome += amount;
  } else if (type === 'binary') {
    user.binaryIncome += amount;
  } else if (type === 'autopool') {
    user.autopoolIncome += amount;
  } else if (type === 'reward') {
    user.rewardIncome += amount;
  }
  
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

/**
 * Manually update user rank
 */
exports.updateUserRank = catchAsync(async (req, res, next) => {
  const { userId, rank } = req.body;
  
  if (!userId || rank === undefined || rank < 0 || rank > 4) {
    return next(new AppError('User ID and valid rank (0-4) are required', 400));
  }
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Update user rank
  user.rank = rank;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        userId: user.userId,
        name: user.name,
        rank: user.rank
      }
    }
  });
});

/**
 * Process scheduled tasks (ROI, Binary, Weekly Rewards)
 */
exports.processScheduledTasks = catchAsync(async (req, res, next) => {
  const { task } = req.body;
  
  if (!task) {
    return next(new AppError('Task type is required', 400));
  }
  
  let result;
  
  // Import controllers
  const incomeController = require('./incomeController');
  
  switch (task) {
    case 'roi':
      result = await incomeController.processAllROI(req, res, next);
      break;
    case 'binary':
      result = await incomeController.processAllBinaryIncome(req, res, next);
      break;
    case 'weekly':
      result = await incomeController.processWeeklyRewards(req, res, next);
      break;
    default:
      return next(new AppError('Invalid task type', 400));
  }
  
  // Response is handled by the individual controllers
});

/**
 * Get system logs (limited to most recent entries)
 */
exports.getSystemLogs = catchAsync(async (req, res, next) => {
  // This would typically connect to a logging system
  // For simplicity, we'll return recent activities as logs
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  const activities = await Activity.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name email userId');
  
  res.status(200).json({
    status: 'success',
    data: {
      logs: activities.map(activity => ({
        time: activity.createdAt,
        type: activity.type,
        userId: activity.userId,
        userName: activity.user ? activity.user.name : 'Unknown',
        description: activity.description,
        amount: activity.amount
      })),
      count: activities.length
    }
  });
});

/**
 * Generate system report
 */
exports.generateReport = catchAsync(async (req, res, next) => {
  const { type, startDate, endDate } = req.body;
  
  if (!type) {
    return next(new AppError('Report type is required', 400));
  }
  
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate ? new Date(endDate) : new Date();
  
  let report = {};
  
  switch (type) {
    case 'income':
      // Income distribution report
      const incomeData = await Income.aggregate([
        { 
          $match: { 
            createdAt: { $gte: start, $lte: end } 
          } 
        },
        {
          $group: {
            _id: { 
              type: '$type',
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            total: { $sum: '$amount' }
          }
        },
        {
          $sort: { '_id.day': 1 }
        }
      ]);
      
      // Format income data
      const incomeByType = {};
      const incomeByDay = {};
      
      incomeData.forEach(item => {
        const { type, day } = item._id;
        
        // Initialize types if not exists
        if (!incomeByType[type]) {
          incomeByType[type] = 0;
        }
        
        // Initialize days if not exists
        if (!incomeByDay[day]) {
          incomeByDay[day] = {
            roi: 0,
            level: 0,
            binary: 0,
            autopool: 0,
            reward: 0,
            total: 0
          };
        }
        
        // Update values
        incomeByType[type] += item.total;
        incomeByDay[day][type] = item.total;
        incomeByDay[day].total += item.total;
      });
      
      report = {
        type: 'income',
        startDate: start,
        endDate: end,
        summary: {
          byType: incomeByType,
          total: Object.values(incomeByType).reduce((sum, val) => sum + val, 0)
        },
        details: Object.entries(incomeByDay).map(([day, data]) => ({
          day,
          ...data
        }))
      };
      break;
      
    case 'users':
      // User registration report
      const userData = await User.aggregate([
        {
          $match: {
            registeredAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { 
              day: { $dateToString: { format: '%Y-%m-%d', date: '$registeredAt' } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.day': 1 }
        }
      ]);
      
      // User rank distribution
      const rankData = await User.aggregate([
        {
          $match: {
            registeredAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$rank',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Format user data
      const usersByDay = {};
      userData.forEach(item => {
        usersByDay[item._id.day] = item.count;
      });
      
      // Format rank data
      const rankCounts = {
        0: 0, // None
        1: 0, // Silver
        2: 0, // Gold
        3: 0, // Platinum
        4: 0  // Diamond
      };
      
      rankData.forEach(item => {
        rankCounts[item._id] = item.count;
      });
      
      report = {
        type: 'users',
        startDate: start,
        endDate: end,
        summary: {
          total: Object.values(usersByDay).reduce((sum, val) => sum + val, 0),
          byRank: rankCounts
        },
        details: Object.entries(usersByDay).map(([day, count]) => ({
          day,
          count
        }))
      };
      break;
      
    case 'transactions':
      // Transaction report
      const transactionData = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              type: '$type',
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.day': 1 }
        }
      ]);
      
      // Format transaction data
      const transactionsByType = {};
      const transactionsByDay = {};
      
      transactionData.forEach(item => {
        const { type, day } = item._id;
        
        // Initialize types if not exists
        if (!transactionsByType[type]) {
          transactionsByType[type] = {
            amount: 0,
            count: 0
          };
        }
        
        // Initialize days if not exists
        if (!transactionsByDay[day]) {
          transactionsByDay[day] = {
            deposit: { amount: 0, count: 0 },
            withdrawal: { amount: 0, count: 0 },
            purchase: { amount: 0, count: 0 },
            transfer: { amount: 0, count: 0 },
            total: { amount: 0, count: 0 }
          };
        }
        
        // Update values
        transactionsByType[type].amount += item.total;
        transactionsByType[type].count += item.count;
        
        transactionsByDay[day][type] = {
          amount: item.total,
          count: item.count
        };
        
        transactionsByDay[day].total.amount += item.total;
        transactionsByDay[day].total.count += item.count;
      });
      
      report = {
        type: 'transactions',
        startDate: start,
        endDate: end,
        summary: {
          byType: transactionsByType,
          total: {
            amount: Object.values(transactionsByType).reduce((sum, data) => sum + data.amount, 0),
            count: Object.values(transactionsByType).reduce((sum, data) => sum + data.count, 0)
          }
        },
        details: Object.entries(transactionsByDay).map(([day, data]) => ({
          day,
          ...data
        }))
      };
      break;
      
    default:
      return next(new AppError('Invalid report type', 400));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      report
    }
  });
});