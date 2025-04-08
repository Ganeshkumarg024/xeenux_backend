const User = require('../models/User');
const Income = require('../models/Income');
const UserPackage = require('../models/UserPackage');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const BinaryNetwork = require('../models/BinaryNetwork');
const UserVolume = require('../models/UserVolume');
const Settings = require('../models/Settings');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');

/**
 * Get all incomes for a user
 */
exports.getMyIncomes = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const type = req.query.type; // Optional filter by income type
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Create query
  const query = { userId };
  if (type) {
    query.type = type;
  }
  
  // Count total records
  const total = await Income.countDocuments(query);
  
  // Get paginated incomes
  const incomes = await Income.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  // Get income summary
  const summary = await Income.getTotalIncome(userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      incomes,
      summary,
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
 * Process daily ROI for a user
 */
exports.processROI = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Process ROI
  const result = await this.distributeROIForUser(userId);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Process daily ROI for all users (admin only, scheduled job)
 */
exports.processAllROI = catchAsync(async (req, res, next) => {
  // Get all users
  const users = await User.find({ isActive: true });
  
  const results = [];
  for (const user of users) {
    try {
      const result = await this.distributeROIForUser(user.userId);
      results.push({
        userId: user.userId,
        result
      });
    } catch (error) {
      results.push({
        userId: user.userId,
        error: error.message
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      processed: results.length,
      results
    }
  });
});

/**
 * Distribute ROI for a specific user
 * @private
 */
// Update in controllers/incomeController.js - distributeROIForUser method
exports.distributeROIForUser = async (userId) => {
  try {
    // Get user
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is eligible for ROI distribution
    const maxROITime = await Settings.getValue('max_roi_days', config.xeenux.maxRoiDays) * 24 * 60 * 60 * 1000;
    
    // Check if maximum ROI period reached
    const roiElapsedTime = Date.now() - user.registeredAt.getTime();
    if (roiElapsedTime >= maxROITime) {
      return {
        status: 'skipped',
        reason: 'Maximum ROI period reached',
        elapsedDays: Math.floor(roiElapsedTime / (24 * 60 * 60 * 1000)),
        maxDays: config.xeenux.maxRoiDays
      };
    }
    
    // Get income distribution interval
    const allIncomeDistTime = await Settings.getValue('income_distribution_interval', config.xeenux.allIncomeDistTime);
    
    // Check if distribution time has elapsed since last distribution
    const timeSinceLastROI = Date.now() - user.lastROIDistributed.getTime();
    if (timeSinceLastROI < allIncomeDistTime) {
      return {
        status: 'skipped',
        reason: 'Distribution interval not elapsed',
        nextDistribution: new Date(user.lastROIDistributed.getTime() + allIncomeDistTime),
        timeRemaining: allIncomeDistTime - timeSinceLastROI
      };
    }
    
    // Get active packages
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
    
    // Calculate active volume (sum of all active packages)
    const activeVolume = activePackages.reduce((sum, pkg) => sum + pkg.xeenuxAmount, 0);
    
    // Get daily ROI rate (0.5% = 5/1000)
    const dailyROIRate = await Settings.getValue('daily_roi_rate', config.xeenux.dailyRoiRate);
    
    // Calculate ROI
    const roiAmount = (dailyROIRate * activeVolume) / 1000;
    
    if (roiAmount <= 0) {
      return {
        status: 'skipped',
        reason: 'ROI amount is zero',
        activeVolume,
        dailyROIRate
      };
    }
    
    // Distribute ROI to packages starting with the oldest
    let remainingROI = roiAmount;
    const updatedPackages = [];
    
    const sortedPackages = [...activePackages].sort((a, b) => 
      new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );
    
    for (const pkg of sortedPackages) {
      // Calculate available capacity in this package
      const packageCap = pkg.ceilingLimit - pkg.earned;
      
      if (packageCap <= 0) {
        // Package reached ceiling, deactivate it
        pkg.isActive = false;
        pkg.completedDate = Date.now();
        await pkg.save();
        continue;
      }
      
      if (remainingROI <= packageCap) {
        // This package can handle all remaining ROI
        pkg.earned += remainingROI;
        
        if (pkg.earned >= pkg.ceilingLimit) {
          pkg.isActive = false;
          pkg.completedDate = Date.now();
        }
        
        await pkg.save();
        updatedPackages.push(pkg);
        remainingROI = 0;
        break;
      } else {
        // Fill this package completely and continue to next
        pkg.earned = pkg.ceilingLimit;
        pkg.isActive = false;
        pkg.completedDate = Date.now();
        
        await pkg.save();
        updatedPackages.push(pkg);
        
        remainingROI -= packageCap;
      }
    }
    
    const earnedAmount = roiAmount - remainingROI;
    
    if (earnedAmount > 0) {
      // Create income record
      await Income.create({
        userId: user.userId,
        user: user._id,
        type: 'roi',
        amount: earnedAmount,
        description: 'Daily ROI income',
        isDistributed: true
      });
      
      // Create activity record
      await Activity.create({
        userId: user.userId,
        user: user._id,
        amount: earnedAmount,
        type: 2, // ROI
        description: 'Daily ROI income',
        meta: {
          totalCalculated: roiAmount,
          activeVolume,
          roiRate: dailyROIRate
        }
      });
      
      // Update user ROI income
      user.roiIncome += earnedAmount;
    }
    
    // Update last ROI distribution time
    user.lastROIDistributed = Date.now();
    await user.save();
    
    return {
      status: 'success',
      roiAmount: earnedAmount,
      totalROI: roiAmount,
      remainingROI,
      updatedPackages: updatedPackages.length,
      lastDistribution: user.lastROIDistributed
    };
  } catch (error) {
    console.error(`Error in distributeROIForUser: ${error.message}`);
    throw error;
  }
};

/**
 * Process binary income for a user
 */
exports.processBinaryIncome = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Process binary income
  const result = await this.distributeBinaryIncomeForUser(userId);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Process binary income for all users (admin only, scheduled job)
 */
exports.processAllBinaryIncome = catchAsync(async (req, res, next) => {
  // Get all users
  const users = await User.find({ isActive: true });
  
  const results = [];
  for (const user of users) {
    try {
      const result = await this.distributeBinaryIncomeForUser(user.userId);
      results.push({
        userId: user.userId,
        result
      });
    } catch (error) {
      results.push({
        userId: user.userId,
        error: error.message
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      processed: results.length,
      results
    }
  });
});

/**
 * Distribute binary income for a specific user
 * @private
 */
// Update in controllers/incomeController.js - distributeBinaryIncomeForUser method
exports.distributeBinaryIncomeForUser = async (userId) => {
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
    
    // Get active packages for ceiling limit - get highest active package value
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
    
    // Get user's active package in USD value
    const highestPackage = activePackages.reduce((max, pkg) => {
      return pkg.amountPaid > max ? pkg.amountPaid : max;
    }, 0);
    
    // Convert package value to XEE tokens for ceiling comparison
    const tokenService = require('../services/tokenService');
    const packageValueInXEE = await tokenService.usdToXeenux(highestPackage);
    
    // Calculate matching volume (weaker leg)
    const matchingVolume = Math.min(binaryNetwork.leftVolume, binaryNetwork.rightVolume);
    
    // Calculate binary income (10% of matching volume)
    const binaryFee = await Settings.getValue('binary_fee', 10);
    let binaryIncome = (matchingVolume * binaryFee) / 100;
    
    // Apply daily ceiling limit - should be package value
    if (binaryIncome > packageValueInXEE) {
      binaryIncome = packageValueInXEE;
    }
    
    // Determine which leg is weaker for carry forward calculation
    const isLeftWeaker = binaryNetwork.leftVolume <= binaryNetwork.rightVolume;
    
    // Update carry forward values and reset volumes
    let leftCarryForward = 0;
    let rightCarryForward = 0;
    
    if (isLeftWeaker) {
      // Left leg is matched completely (weaker)
      leftCarryForward = 0;
      // Right leg carries forward the difference
      rightCarryForward = binaryNetwork.rightVolume - matchingVolume;
    } else {
      // Right leg is matched completely (weaker)
      rightCarryForward = 0;
      // Left leg carries forward the difference
      leftCarryForward = binaryNetwork.leftVolume - matchingVolume;
    }
    
    // Update binary network
    binaryNetwork.leftVolume = leftCarryForward;
    binaryNetwork.rightVolume = rightCarryForward;
    binaryNetwork.leftCarryForward = leftCarryForward;
    binaryNetwork.rightCarryForward = rightCarryForward;
    binaryNetwork.lastBinaryProcess = Date.now();
    await binaryNetwork.save();
    
    // Create income record
    if (binaryIncome > 0) {
      await Income.create({
        userId: user.userId,
        user: user._id,
        type: 'binary',
        amount: binaryIncome,
        description: 'Binary income',
        isDistributed: true
      });
      
      // Create activity record
      await Activity.create({
        userId: user.userId,
        user: user._id,
        amount: binaryIncome,
        type: 5, // Binary Income
        description: 'Binary income',
        meta: {
          matchingVolume: matchingVolume,
          leftCarryForward: leftCarryForward,
          rightCarryForward: rightCarryForward,
          packageValue: packageValueInXEE,
          originalCalculation: (matchingVolume * binaryFee) / 100
        }
      });
      
      // Update user binary income
      user.binaryIncome += binaryIncome;
      user.lastBinaryDistributed = Date.now();
      await user.save();
    }
    
    return {
      status: 'success',
      binaryIncome: binaryIncome,
      matchingVolume: matchingVolume,
      carryForward: {
        left: leftCarryForward,
        right: rightCarryForward
      },
      packageValue: packageValueInXEE,
      leftVolume: binaryNetwork.leftVolume,
      rightVolume: binaryNetwork.rightVolume,
      lastDistribution: user.lastBinaryDistributed
    };
  } catch (error) {
    console.error(`Error in distributeBinaryIncomeForUser: ${error.message}`);
    throw error;
  }
};

/**
 * Process weekly rewards for all users (admin only, scheduled job)
 */
exports.processWeeklyRewards = catchAsync(async (req, res, next) => {
  // Get weekly reward interval
  console.log("weekly reward started")
  const weeklyRewardInterval = await Settings.getValue(
    'weekly_reward_interval', 
    config.xeenux.weeklyRewardDistTime
  );
  
  // Get last weekly reward distribution time
  const lastWeeklyRewardDist = await Settings.getValue('last_weekly_reward_dist', Date.now() - weeklyRewardInterval);
  
  // Check if distribution time has elapsed
  if ((lastWeeklyRewardDist + weeklyRewardInterval) > Date.now()) {
    return res.status(200).json({
      status: 'skipped',
      reason: 'Distribution interval not elapsed',
      nextDistribution: new Date(lastWeeklyRewardDist + weeklyRewardInterval)
    });
  }
  
  // Get total turnover for the week
  const weekStart = new Date(lastWeeklyRewardDist);
  const turnoverQuery = {
    createdAt: { $gte: weekStart, $lte: new Date() },
    type: 'purchase',
    status: 'completed'
  };
  
  const weeklyTurnover = await Transaction.aggregate([
    { $match: turnoverQuery },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const totalWeeklyTurnover = weeklyTurnover.length > 0 ? weeklyTurnover[0].total : 0;
  
  if (totalWeeklyTurnover <= 0) {
    // Update last distribution time even if no turnover
    await Settings.setValue('last_weekly_reward_dist', Date.now());
    
    return res.status(200).json({
      status: 'skipped',
      reason: 'No weekly turnover'
    });
  }
  
  // Calculate rewards for each rank
  const rewardPercentages = [
    { rank: 1, percentage: 1 }, // Silver - 1%
    { rank: 2, percentage: 1 }, // Gold - 1%
    { rank: 3, percentage: 1.5 }, // Platinum - 1.5%
    { rank: 4, percentage: 2 } // Diamond - 2%
  ];
  
  const results = [];
  
  for (const reward of rewardPercentages) {
    // Get users with this rank
    const users = await User.find({ rank: reward.rank, isActive: true });
    
    if (users.length === 0) {
      results.push({
        rank: reward.rank,
        usersCount: 0,
        status: 'skipped',
        reason: 'No users with this rank'
      });
      continue;
    }
    
    // Calculate reward amount per user
    const totalRewardAmount = (totalWeeklyTurnover * reward.percentage) / 100;
    const rewardPerUser = totalRewardAmount / users.length;
    
    // Distribute rewards
    for (const user of users) {
      try {
        // Create income record
        await Income.create({
          userId: user.userId,
          user: user._id,
          type: 'reward',
          amount: rewardPerUser,
          description: `Weekly reward (${reward.rank} rank)`,
          isDistributed: true
        });
        
        // Create activity record
        await Activity.create({
          userId: user.userId,
          user: user._id,
          amount: rewardPerUser,
          type: 4, // Weekly Reward
          description: `Weekly reward (${reward.rank} rank)`,
          meta: {
            rank: reward.rank,
            percentage: reward.percentage,
            totalTurnover: totalWeeklyTurnover
          }
        });
        
        // Update user reward income
        user.rewardIncome += rewardPerUser;
        user.lastRewardDistributed = Date.now();
        await user.save();
      } catch (error) {
        console.error(`Error processing reward for user ${user.userId}:`, error);
      }
    }
    
    results.push({
      rank: reward.rank,
      usersCount: users.length,
      rewardPerUser,
      totalReward: totalRewardAmount,
      status: 'success'
    });
  }
  
  // Update last distribution time
  await Settings.setValue('last_weekly_reward_dist', Date.now());
  
  // Reset weekly turnover counter
  await Settings.setValue('weekly_turnover', 0);
  
  res.status(200).json({
    status: 'success',
    data: {
      weeklyTurnover: totalWeeklyTurnover,
      results
    }
  });
});

/**
 * Withdraw income
 */
exports.withdrawIncome = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400));
  }
  
  // Get minimum withdrawal amount
  const minWithdrawal = await Settings.getValue('min_withdrawal', 10);
  
  if (amount < minWithdrawal) {
    return next(new AppError(`Minimum withdrawal amount is ${minWithdrawal} Xeenux tokens`, 400));
  }
  
  // Get pending income
  const pendingIncome = await Income.getPendingIncome(userId);
  
  if (pendingIncome.total < amount) {
    return next(new AppError('Insufficient balance', 400));
  }
  
  // Get withdrawal fee percentage
  const withdrawalFee = await Settings.getValue('withdrawal_fee', 10);
  
  // Calculate fee and final amount
  const feeAmount = (amount * withdrawalFee) / 100;
  const finalAmount = amount - feeAmount;
  
  // Get user
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Process withdrawal
  // Deduct from different income types in order
  let remainingAmount = amount;
  const deductions = {};
  
  const incomeTypes = ['level', 'binary', 'autopool', 'reward', 'roi'];
  
  for (const type of incomeTypes) {
    if (remainingAmount <= 0) break;
    
    const pendingForType = pendingIncome[type] || 0;
    
    if (pendingForType > 0) {
      const deduction = Math.min(pendingForType, remainingAmount);
      remainingAmount -= deduction;
      deductions[type] = deduction;
      
      // Mark incomes as paid
      await Income.updateMany(
        { userId, type, isPaid: false },
        { 
          $set: { isPaid: true },
          $currentDate: { updatedAt: true }
        }
      );
    }
  }
  
  // Create withdrawal transaction
  const transaction = await Transaction.create({
    userId: user.userId,
    user: user._id,
    type: 'withdrawal',
    amount,
    amountUSD: amount * (await Settings.getValue('xeenux_price', config.xeenux.defaultPrice)),
    fee: feeAmount,
    status: 'completed',
    description: 'Income withdrawal',
    walletAddress: user.walletAddress
  });
  
  // Create activity record
  await Activity.create({
    userId: user.userId,
    user: user._id,
    amount,
    type: 6, // Withdrawal
    description: 'Income withdrawal',
    meta: {
      fee: feeAmount,
      finalAmount,
      deductions
    }
  });
  
  // Allocate half of the fee to user's purchase wallet (as per original code)
  user.purchaseWallet += feeAmount / 2;
  user.totalWithdraw += amount;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction,
      fee: feeAmount,
      finalAmount,
      deductions
    }
  });
});