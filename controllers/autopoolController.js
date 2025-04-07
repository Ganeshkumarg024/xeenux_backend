const User = require('../models/User');
const AutoPool = require('../models/AutoPool');
const Income = require('../models/Income');
const Activity = require('../models/Activity');
const Settings = require('../models/Settings');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');

/**
 * Get autopool position for a user
 */
exports.getAutopoolPosition = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get user's autopool position
  const autopool = await AutoPool.findOne({ userId });
  
  if (!autopool) {
    return next(new AppError('User not found in autopool', 404));
  }
  
  // Get autopool settings
  const autopoolMaxMembers = await Settings.getValue('autopool_max_members', config.xeenux.autopoolMaxMembers);
  const autopoolFees = await Settings.getValue('autopool_fees', config.xeenux.autopoolFees);
  
  // Get parent information if exists
  const parent = autopool.parentPosition ? 
    await AutoPool.findOne({ position: autopool.parentPosition }) : null;
  
  const parentUser = parent ? 
    await User.findOne({ userId: parent.userId }).select('name userId') : null;
  
  // Get children information
  const children = [];
  for (const childPosition of autopool.children) {
    const child = await AutoPool.findOne({ position: childPosition });
    if (child) {
      const childUser = await User.findOne({ userId: child.userId }).select('name userId');
      children.push({
        position: child.position,
        level: child.level,
        userId: child.userId,
        name: childUser ? childUser.name : 'Unknown',
        joinedAt: child.joinedAt
      });
    }
  }
  
  // Calculate level metrics
  const currentLevelMembers = await AutoPool.countDocuments({ level: autopool.level });
  const maxLevelMembers = autopoolMaxMembers[autopool.level];
  const levelProgress = (currentLevelMembers / maxLevelMembers) * 100;
  
  res.status(200).json({
    status: 'success',
    data: {
      userPosition: autopool,
      parent: parentUser ? {
        position: parent.position,
        level: parent.level,
        userId: parentUser.userId,
        name: parentUser.name
      } : null,
      children,
      levelMetrics: {
        currentLevel: autopool.level,
        currentMembers: currentLevelMembers,
        maxMembers: maxLevelMembers,
        progress: levelProgress,
        feePerMember: autopoolFees[autopool.level]
      }
    }
  });
});

/**
 * Get autopool income history
 */
exports.getAutopoolIncome = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Get autopool income records
  const query = { 
    userId, 
    type: 'autopool'
  };
  
  const total = await Income.countDocuments(query);
  
  const incomes = await Income.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  // Get total autopool income
  const totalAutopoolIncome = await Income.getTotalIncomeByType(userId, 'autopool');
  
  res.status(200).json({
    status: 'success',
    data: {
      incomes,
      totalAutopoolIncome,
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
 * Get autopool overview and statistics (admin only)
 */
exports.getAutopoolOverview = catchAsync(async (req, res, next) => {
  // Get autopool settings
  const autopoolMaxMembers = await Settings.getValue('autopool_max_members', config.xeenux.autopoolMaxMembers);
  const autopoolFees = await Settings.getValue('autopool_fees', config.xeenux.autopoolFees);
  
  // Get level statistics
  const levelStats = [];
  
  for (let level = 0; level < autopoolMaxMembers.length; level++) {
    const currentMembers = await AutoPool.countDocuments({ level });
    const maxMembers = autopoolMaxMembers[level];
    const levelFee = autopoolFees[level];
    
    levelStats.push({
      level,
      currentMembers,
      maxMembers,
      levelFee,
      progress: (currentMembers / maxMembers) * 100,
      totalFees: currentMembers * levelFee
    });
  }
  
  // Get total members and income
  const totalMembers = await AutoPool.countDocuments();
  const totalIncome = await Income.aggregate([
    { $match: { type: 'autopool' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      totalMembers,
      totalIncome: totalIncome.length > 0 ? totalIncome[0].total : 0,
      levelStats
    }
  });
});

/**
 * Add user to autopool (admin or system use)
 */
exports.addToAutopool = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  
  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if user is already in autopool
  const existingPosition = await AutoPool.findOne({ userId });
  if (existingPosition) {
    return next(new AppError('User already exists in autopool', 400));
  }
  
  // Get total members to determine new position
  const totalMembers = await AutoPool.countDocuments();
  const newPosition = totalMembers + 1;
  
  // Calculate level based on position
  const level = AutoPool.findLevel(newPosition);
  
  // Find parent position
  const parentPosition = AutoPool.findParentPosition(newPosition);
  
  // Create new autopool entry
  const newAutopool = await AutoPool.create({
    userId,
    user: user._id,
    position: newPosition,
    parentPosition,
    level,
    children: [],
    isEligible: true,
    joinedAt: Date.now()
  });
  
  // Update parent's children array
  if (parentPosition > 0) {
    const parent = await AutoPool.findOne({ position: parentPosition });
    if (parent) {
      parent.children.push(newPosition);
      await parent.save();
    }
  }
  
  // Process autopool income for the new member
  const incomeRecipients = await AutoPool.processNewMemberIncome(userId);
  
  // Distribute income to recipients
  const autopoolFees = await Settings.getValue('autopool_fees', config.xeenux.autopoolFees);
  const distributionResults = [];
  
  for (const recipient of incomeRecipients) {
    const recipientAutopool = await AutoPool.findOne({ position: recipient.position });
    if (recipientAutopool && recipientAutopool.isEligible) {
      const recipientUser = await User.findOne({ userId: recipientAutopool.userId });
      if (recipientUser) {
        // Calculate income for this level
        const incomeAmount = autopoolFees[recipient.level];
        
        // Create income record
        await Income.create({
          userId: recipientUser.userId,
          user: recipientUser._id,
          type: 'autopool',
          amount: incomeAmount,
          level: recipient.level + 1,
          description: `Autopool level ${recipient.level + 1} income`,
          isDistributed: true
        });
        
        // Create activity record
        await Activity.create({
          userId: recipientUser.userId,
          user: recipientUser._id,
          amount: incomeAmount,
          type: 3, // Autopool
          level: recipient.level + 1,
          description: `Autopool level ${recipient.level + 1} income`
        });
        
        // Update user autopool income
        recipientUser.autopoolIncome += incomeAmount;
        await recipientUser.save();
        
        // Update recipientAutopool total earned
        recipientAutopool.totalEarned += incomeAmount;
        await recipientAutopool.save();
        
        distributionResults.push({
          recipientId: recipientUser.userId,
          level: recipient.level + 1,
          amount: incomeAmount
        });
      }
    }
  }
  
  res.status(201).json({
    status: 'success',
    data: {
      autopool: newAutopool,
      incomesDistributed: distributionResults
    }
  });
});

/**
 * Get user's autopool team (direct children)
 */
exports.getAutopoolTeam = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get user's autopool position
  const autopool = await AutoPool.findOne({ userId });
  
  if (!autopool) {
    return next(new AppError('User not found in autopool', 404));
  }
  
  // Get direct children in autopool
  const team = [];
  
  for (const childPosition of autopool.children) {
    const child = await AutoPool.findOne({ position: childPosition });
    if (child) {
      const childUser = await User.findOne({ userId: child.userId });
      if (childUser) {
        team.push({
          position: child.position,
          level: child.level,
          userId: child.userId,
          name: childUser.name,
          joinedAt: child.joinedAt,
          childrenCount: child.children.length,
          totalEarned: child.totalEarned
        });
      }
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      team,
      count: team.length
    }
  });
});