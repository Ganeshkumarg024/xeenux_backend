const Package = require('../models/Package');
const UserPackage = require('../models/UserPackage');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Activity = require('../models/Activity');
const UserVolume = require('../models/UserVolume');
const BinaryNetwork = require('../models/BinaryNetwork');
const TeamStructure = require('../models/TeamStructure');
const Income = require('../models/Income');
const Settings = require('../models/Settings');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');

/**
 * Get all available packages
 */
exports.getAllPackages = catchAsync(async (req, res, next) => {
  // Get current Xeenux token price
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  
  // Get all active packages
  const packages = await Package.find({ isActive: true }).sort({ priceUSD: 1 });
  
  // Calculate Xeenux amount for each package
  const packagesWithXeenux = packages.map(pkg => {
    const xeenuxAmount = pkg.priceUSD / xeenuxPrice;
    
    return {
      ...pkg._doc,
      xeenuxAmount
    };
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      packages: packagesWithXeenux,
      xeenuxPrice
    }
  });
});

/**
 * Purchase a package
 */
exports.purchasePackage = catchAsync(async (req, res, next) => {
  const { packageIndex, position } = req.body;
  const userId = req.user.userId;
   console.log("Purchase")
  // Validate package index
  const packageData = await Package.findOne({ packageIndex });
  if (!packageData) {
    return next(new AppError('Invalid package', 400));
  }
  
  // Get current Xeenux token price
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  
  // Calculate Xeenux amount required
  const xeenuxAmount = packageData.priceUSD / xeenuxPrice;
  
  // Check if user has enough balance - TO BE IMPLEMENTED WITH PAYMENT GATEWAY
  // For now, assume the payment is processed externally
  
  // Get user
  const user = await User.findOne({ userId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Calculate ceiling limit (4x of package value)
  const ceilingLimit = xeenuxAmount * packageData.maxROIMultiplier;
  
  // Create user package
  const userPackage = await UserPackage.create({
    user: user._id,
    userId: user.userId,
    package: packageData._id,
    packageIndex: packageData.packageIndex,
    amountPaid: packageData.priceUSD,
    xeenuxAmount,
    ceilingLimit,
    isActive: true,
    purchaseDate: Date.now()
  });
  
  // Update user volume
  const userVolume = await UserVolume.findOne({ userId });
  userVolume.selfVolume += xeenuxAmount;
  userVolume.lastUpdated = Date.now();
  await userVolume.save();
  
  // Create transaction record
  await Transaction.create({
    userId: user.userId,
    user: user._id,
    type: 'purchase',
    amount: xeenuxAmount,
    amountUSD: packageData.priceUSD,
    status: 'completed',
    description: `Purchase of ${packageData.name} package`,
    walletAddress: user.walletAddress
  });
  
  // Create activity record
  const activity = await Activity.create({
    userId: user.userId,
    user: user._id,
    amount: xeenuxAmount,
    type: 0, // Investment/Purchase
    description: `Purchased ${packageData.name} package`,
    referenceId: userPackage._id,
    meta: {
      packageIndex: packageData.packageIndex,
      packageName: packageData.name,
      priceUSD: packageData.priceUSD
    }
  });
  
  // Handle binary placement
  const newPosition = position !== undefined ? position : user.position;
  
  // Update binary network volumes
  await BinaryNetwork.updateVolumes(userId, xeenuxAmount);
  
  // Calculate and distribute referral incomes
  await this.processLevelIncome(user, xeenuxAmount);
  
  res.status(201).json({
    status: 'success',
    data: {
      userPackage,
      activity
    }
  });
});

/**
 * Process level income for a purchase
 * @private
 */
exports.processLevelIncome = async (user, amount) => {
  // Get level income percentages
  const levelIncomePercentages = await Settings.getValue(
    'level_income_fees', 
    config.xeenux.levelIncomeFees
  );
  
  let currentUserId = user.referrerId;
  
  // Create an array to store the referrer path for team structure update
  const referrerPath = [];
  
  // Process level income for each level
  for (let level = 0; level < levelIncomePercentages.length; level++) {
    if (currentUserId === 0 || currentUserId === config.xeenux.defaultReferralId) {
      break;
    }
    
    // Find referrer
    const referrer = await User.findOne({ userId: currentUserId });
    if (!referrer) {
      break;
    }
    
    referrerPath.push(referrer.userId);
    
    // Check if referrer is eligible for this level income
    // In the original code, eligibility was based on direct referral count
    if (referrer.refCount >= level + 1) {
      // Calculate income amount
      const incomeAmount = (amount * levelIncomePercentages[level]) / 100;
      
      // Create income record
      await Income.create({
        userId: referrer.userId,
        user: referrer._id,
        type: 'level',
        amount: incomeAmount,
        sourceUserId: user.userId,
        sourceUser: user._id,
        level: level + 1,
        description: `Level ${level + 1} income from ${user.name}`,
        isDistributed: true
      });
      
      // Update referrer's level income
      referrer.levelIncome += incomeAmount;
      await referrer.save();
      
      // Create activity record
      await Activity.create({
        userId: referrer.userId,
        user: referrer._id,
        amount: incomeAmount,
        type: 1, // Referral/Level Income
        level: level + 1,
        description: `Level ${level + 1} income from ${user.name}`,
        meta: {
          sourceUserId: user.userId,
          sourceName: user.name,
          level: level + 1
        }
      });
    }
    
    // Move to next referrer
    currentUserId = referrer.referrerId;
  }
  
  // Update team structure
  if (referrerPath.length > 0) {
    await TeamStructure.updateTeamForNewMember(user.userId, referrerPath, amount);
  }
};

/**
 * Get package details
 */
exports.getPackage = catchAsync(async (req, res, next) => {
  const packageIndex = parseInt(req.params.packageIndex);
  
  // Get package
  const packageData = await Package.findOne({ packageIndex });
  
  if (!packageData) {
    return next(new AppError('Package not found', 404));
  }
  
  // Get current Xeenux token price
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  
  // Calculate Xeenux amount
  const xeenuxAmount = packageData.priceUSD / xeenuxPrice;
  
  res.status(200).json({
    status: 'success',
    data: {
      package: {
        ...packageData._doc,
        xeenuxAmount
      }
    }
  });
});

/**
 * Create a new package (admin only)
 */
exports.createPackage = catchAsync(async (req, res, next) => {
  const { name, priceUSD, description, packageIndex, maxROIMultiplier, features } = req.body;
  
  // Check if package index already exists
  const existingPackage = await Package.findOne({ packageIndex });
  if (existingPackage) {
    return next(new AppError('Package with this index already exists', 400));
  }
  
  // Create package
  const newPackage = await Package.create({
    name,
    priceUSD,
    description,
    packageIndex,
    maxROIMultiplier: maxROIMultiplier || 4,
    features,
    createdBy: req.user._id
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      package: newPackage
    }
  });
});

/**
 * Update a package (admin only)
 */
exports.updatePackage = catchAsync(async (req, res, next) => {
  const packageIndex = parseInt(req.params.packageIndex);
  
  // Find package
  const packageData = await Package.findOne({ packageIndex });
  
  if (!packageData) {
    return next(new AppError('Package not found', 404));
  }
  
  // Update package fields
  const { name, priceUSD, description, maxROIMultiplier, features, isActive } = req.body;
  
  if (name) packageData.name = name;
  if (priceUSD) packageData.priceUSD = priceUSD;
  if (description) packageData.description = description;
  if (maxROIMultiplier) packageData.maxROIMultiplier = maxROIMultiplier;
  if (features) packageData.features = features;
  if (isActive !== undefined) packageData.isActive = isActive;
  
  await packageData.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      package: packageData
    }
  });
});

/**
 * Delete a package (admin only)
 */
exports.deletePackage = catchAsync(async (req, res, next) => {
  const packageIndex = parseInt(req.params.packageIndex);
  
  // Find package
  const packageData = await Package.findOne({ packageIndex });
  
  if (!packageData) {
    return next(new AppError('Package not found', 404));
  }
  
  // Check if there are active users with this package
  const activePackageUsers = await UserPackage.countDocuments({
    packageIndex,
    isActive: true
  });
  
  if (activePackageUsers > 0) {
    return next(new AppError('Cannot delete package with active users', 400));
  }
  
  // Deactivate package instead of deleting
  packageData.isActive = false;
  await packageData.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});