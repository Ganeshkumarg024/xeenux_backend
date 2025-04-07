const User = require('../models/User');
const BinaryNetwork = require('../models/BinaryNetwork');
const UserVolume = require('../models/UserVolume');
const UserPackage = require('../models/UserPackage');
const Activity = require('../models/Activity');
const Income = require('../models/Income');
const Transaction = require('../models/Transaction');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const Settings = require('../models/Settings')

/**
 * Get binary tree structure for a user
 */
exports.getBinaryTree = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const depth = parseInt(req.query.depth) || 2;
  
  // Get binary tree structure
  const binaryTree = await BinaryNetwork.getBinaryTreeStructure(userId, depth);
  
  if (!binaryTree) {
    return next(new AppError('Binary tree not found', 404));
  }
  
  // Get binary network data for user
  const binaryNetwork = await BinaryNetwork.findOne({ userId });
  
  // Get user volume data
  const userVolume = await UserVolume.findOne({ userId });
  
  res.status(200).json({
    status: 'success',
    data: {
      binaryTree,
      binaryNetwork,
      userVolume
    }
  });
});

/**
 * Get binary legs information
 */
exports.getBinaryLegs = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get binary network data
  const binaryNetwork = await BinaryNetwork.findOne({ userId });
  
  if (!binaryNetwork) {
    return next(new AppError('Binary network not found', 404));
  }
  
  // Get left leg information
  const leftLegData = binaryNetwork.leftChildId ? 
    await BinaryNetwork.findOne({ userId: binaryNetwork.leftChildId }) : null;
  
  // Get right leg information
  const rightLegData = binaryNetwork.rightChildId ? 
    await BinaryNetwork.findOne({ userId: binaryNetwork.rightChildId }) : null;
  
  // Get user data for left and right children
  const leftUser = binaryNetwork.leftChildId ? 
    await User.findOne({ userId: binaryNetwork.leftChildId }) : null;
  
  const rightUser = binaryNetwork.rightChildId ? 
    await User.findOne({ userId: binaryNetwork.rightChildId }) : null;
  
  // Prepare response
  const leftLeg = leftLegData ? {
    userId: leftLegData.userId,
    name: leftUser ? leftUser.name : 'Unknown',
    position: 0,
    volume: binaryNetwork.leftVolume,
    totalVolume: binaryNetwork.totalLeftVolume,
    carryForward: binaryNetwork.leftCarryForward,
    count: binaryNetwork.leftCount
  } : null;
  
  const rightLeg = rightLegData ? {
    userId: rightLegData.userId,
    name: rightUser ? rightUser.name : 'Unknown',
    position: 1,
    volume: binaryNetwork.rightVolume,
    totalVolume: binaryNetwork.totalRightVolume,
    carryForward: binaryNetwork.rightCarryForward,
    count: binaryNetwork.rightCount
  } : null;
  
  res.status(200).json({
    status: 'success',
    data: {
      userId: binaryNetwork.userId,
      leftLeg,
      rightLeg,
      weakerLeg: binaryNetwork.weakerLegVolume,
      strongerLeg: binaryNetwork.strongerLegVolume,
      lastBinaryProcess: binaryNetwork.lastBinaryProcess
    }
  });
});

/**
 * Get pending binary income
 */
exports.getPendingBinaryIncome = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get binary network data
  const binaryNetwork = await BinaryNetwork.findOne({ userId });
  
  if (!binaryNetwork) {
    return next(new AppError('Binary network not found', 404));
  }
  
  // Get active packages for ceiling limit
  const activePackages = await UserPackage.find({
    userId,
    isActive: true
  });
  
  // Calculate maximum earnable based on active packages
  const maxEarnable = activePackages.reduce((sum, pkg) => sum + pkg.amount, 0);
  
  // Calculate matching volume (weaker leg)
  const matchingVolume = Math.min(binaryNetwork.leftVolume, binaryNetwork.rightVolume);
  
  // Calculate potential binary income (10% of matching volume)
  let potentialIncome = (matchingVolume * 10) / 100; // 10% binary matching
  
  // Apply ceiling limit
  if (potentialIncome > maxEarnable) {
    potentialIncome = maxEarnable;
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      matchingVolume,
      potentialIncome,
      maxEarnable,
      leftVolume: binaryNetwork.leftVolume,
      rightVolume: binaryNetwork.rightVolume,
      leftCarryForward: binaryNetwork.leftCarryForward,
      rightCarryForward: binaryNetwork.rightCarryForward
    }
  });
});

/**
 * Place a new member in binary network
 * This is typically called when a new user registers, but can be used by admin to manually place users
 */
exports.placeInBinaryNetwork = catchAsync(async (req, res, next) => {
  const { userId, referrerId, position } = req.body;
  
  if (!userId || !referrerId) {
    return next(new AppError('User ID and referrer ID are required', 400));
  }
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if referrer exists
  const referrer = await User.findOne({ userId: referrerId });
  if (!referrer) {
    return next(new AppError('Referrer not found', 404));
  }
  
  // Check if user already exists in binary network
  const existingNode = await BinaryNetwork.findOne({ userId });
  if (existingNode) {
    return next(new AppError('User already exists in binary network', 400));
  }
  
  // Place user in binary network
  const result = await BinaryNetwork.placeNewMember(userId, referrerId, position || 0);
  
  res.status(201).json({
    status: 'success',
    data: {
      result
    }
  });
});

/**
 * Analyze binary tree performance
 */
exports.analyzeBinaryTree = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get binary network data
  const binaryNetwork = await BinaryNetwork.findOne({ userId });
  
  if (!binaryNetwork) {
    return next(new AppError('Binary network not found', 404));
  }
  
  // Get recent activity in both legs
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  // Get recent transactions in left leg
  const leftLegTransactions = binaryNetwork.leftChildId ? 
    await Transaction.countDocuments({
      createdAt: { $gte: lastMonth },
      type: 'purchase',
      status: 'completed',
      userId: binaryNetwork.leftChildId
    }) : 0;
  
  // Get recent transactions in right leg
  const rightLegTransactions = binaryNetwork.rightChildId ? 
    await Transaction.countDocuments({
      createdAt: { $gte: lastMonth },
      type: 'purchase',
      status: 'completed',
      userId: binaryNetwork.rightChildId
    }) : 0;
  
  // Calculate balance ratio
  const totalVolume = binaryNetwork.leftVolume + binaryNetwork.rightVolume;
  const balanceRatio = totalVolume > 0 ? 
    Math.min(binaryNetwork.leftVolume, binaryNetwork.rightVolume) / totalVolume : 0;
  
  // Determine if tree is balanced
  const isBalanced = balanceRatio >= 0.4; // Consider balanced if weaker leg is at least 40% of total
  
  // Determine growth trend
  const leftGrowth = binaryNetwork.leftVolume > 0 ? 
    leftLegTransactions / binaryNetwork.leftVolume : 0;
  
  const rightGrowth = binaryNetwork.rightVolume > 0 ? 
    rightLegTransactions / binaryNetwork.rightVolume : 0;
  
  // Suggest focus area
  let suggestedFocus = '';
  if (binaryNetwork.leftVolume < binaryNetwork.rightVolume) {
    suggestedFocus = 'Focus on growing your left leg to improve balance';
  } else if (binaryNetwork.rightVolume < binaryNetwork.leftVolume) {
    suggestedFocus = 'Focus on growing your right leg to improve balance';
  } else {
    suggestedFocus = 'Your tree is perfectly balanced, keep growing both legs equally';
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      leftVolume: binaryNetwork.leftVolume,
      rightVolume: binaryNetwork.rightVolume,
      totalVolume,
      balanceRatio,
      isBalanced,
      recentActivity: {
        leftLegTransactions,
        rightLegTransactions
      },
      growthTrend: {
        leftGrowth,
        rightGrowth
      },
      suggestedFocus
    }
  });
});


/**
 * Process binary income for a user
 * @param {Number} userId - User ID
 * @returns {Promise<Object>} - Processing result
 */
exports.processBinaryIncomeForUser = async (userId) => {
  try {
    // Get user
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get binary network data
    const binaryNetwork = await BinaryNetwork.findOne({ userId });
    
    if (!binaryNetwork) {
      return {
        status: 'skipped',
        reason: 'No binary network found'
      };
    }
    
    // Check if user has both left and right volume
    if (binaryNetwork.leftVolume === 0 || binaryNetwork.rightVolume === 0) {
      return {
        status: 'skipped',
        reason: 'Insufficient binary volume',
        leftVolume: binaryNetwork.leftVolume,
        rightVolume: binaryNetwork.rightVolume
      };
    }
    
    // Get user's active packages
    const activePackages = await UserPackage.find({
      userId: user.userId,
      isActive: true
    });
    
    if (activePackages.length === 0) {
      return {
        status: 'skipped',
        reason: 'No active packages'
      };
    }
    
    // Convert user's highest package value to XEE for ceiling limit
    const tokenService = require('../services/tokenService');
    
    // Find highest package in USD
    const highestPackageUSD = activePackages.reduce((max, pkg) => {
      return pkg.amountPaid > max ? pkg.amountPaid : max;
    }, 0);
    
    // Get XEE equivalent of highest package
    const packageValueInXEE = await tokenService.usdToXeenux(highestPackageUSD);
    
    // Determine which leg is weaker
    const isLeftWeaker = binaryNetwork.leftVolume <= binaryNetwork.rightVolume;
    
    // Calculate matching volume (always the weaker leg)
    const matchingVolume = isLeftWeaker ? binaryNetwork.leftVolume : binaryNetwork.rightVolume;
    
    // Calculate potential binary income (10% of matching volume)
    const binaryFee = await Settings.getValue('binary_fee', 10);
    let calculatedIncome = (matchingVolume * binaryFee) / 100;
    
    // Apply daily ceiling limit - must not exceed package value
    let binaryIncome = calculatedIncome;
    let ceilingApplied = false;
    
    if (calculatedIncome > packageValueInXEE) {
      binaryIncome = packageValueInXEE;
      ceilingApplied = true;
    }
    
    // Handle carry forward logic - THIS IS KEY FOR BINARY MATCHING
    let leftCarryForward = 0;
    let rightCarryForward = 0;
    
    if (isLeftWeaker) {
      // Left leg is the weaker leg - it gets washed out completely
      leftCarryForward = 0;
      // Right leg carries forward the difference (stronger leg - weaker leg)
      rightCarryForward = binaryNetwork.rightVolume - matchingVolume;
    } else {
      // Right leg is the weaker leg - it gets washed out completely
      rightCarryForward = 0;
      // Left leg carries forward the difference (stronger leg - weaker leg)
      leftCarryForward = binaryNetwork.leftVolume - matchingVolume;
    }
    
    // Update binary network with new volumes and carry forwards
    binaryNetwork.leftVolume = leftCarryForward;
    binaryNetwork.rightVolume = rightCarryForward;
    binaryNetwork.leftCarryForward = leftCarryForward;
    binaryNetwork.rightCarryForward = rightCarryForward;
    binaryNetwork.lastBinaryProcess = Date.now();
    await binaryNetwork.save();
    
    // Create income record and activity if there's income to distribute
    if (binaryIncome > 0) {
      // Create income record
      await Income.create({
        userId: user.userId,
        user: user._id,
        type: 'binary',
        amount: binaryIncome,
        description: `Binary income from pairmatch (${isLeftWeaker ? 'left' : 'right'} leg)`,
        isDistributed: true,
        meta: {
          matchingVolume,
          leftVolume: binaryNetwork.leftVolume,
          rightVolume: binaryNetwork.rightVolume,
          leftCarryForward,
          rightCarryForward,
          ceilingApplied,
          calculatedIncome,
          packageValue: packageValueInXEE
        }
      });
      
      // Create activity record
      await Activity.create({
        userId: user.userId,
        user: user._id,
        amount: binaryIncome,
        type: 5, // Binary Income
        description: `Binary income from pairmatch (${isLeftWeaker ? 'left' : 'right'} leg)`,
        meta: {
          matchingVolume,
          weaker: isLeftWeaker ? 'left' : 'right',
          originalAmount: calculatedIncome,
          ceilingApplied,
          packageValueLimit: packageValueInXEE,
          leftCarryForward,
          rightCarryForward
        }
      });
      
      // Update user binary income
      user.binaryIncome += binaryIncome;
      user.lastBinaryDistributed = Date.now();
      await user.save();
    }
    
    return {
      status: 'success',
      binaryIncome,
      matchingVolume,
      weaker: isLeftWeaker ? 'left' : 'right',
      washout: isLeftWeaker ? binaryNetwork.leftVolume : binaryNetwork.rightVolume,
      carryForward: {
        left: leftCarryForward,
        right: rightCarryForward
      },
      originalAmount: calculatedIncome,
      ceilingApplied,
      packageValue: packageValueInXEE,
      lastDistribution: user.lastBinaryDistributed
    };
  } catch (error) {
    console.error(`Error in processBinaryIncomeForUser: ${error.message}`);
    throw error;
  }
};