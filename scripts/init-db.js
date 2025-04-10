const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Package = require('../models/Package');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Generate a unique userId
 */
const generateUniqueUserId = async () => {
  while (true) {
    // Generate a random 6-digit number
    const userId = Math.floor(100000 + Math.random() * 900000);
    
    // Check if this userId already exists
    const existingUser = await User.findOne({ userId });
    
    // If no user found with this ID, return it
    if (!existingUser) {
      return userId;
    }
    // If userId exists, the loop will continue and generate a new one
  }
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
  } catch (error) {
    logger.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Initialize Settings
 */
const initializeSettings = async () => {
  logger.info('Initializing settings...');
  await Settings.initializeDefaultSettings();
  logger.info('Settings initialized');
};

/**
 * Create Default Packages
 */
const createDefaultPackages = async () => {
  logger.info('Creating default packages...');
  
  const packages = [
    {
      name: 'Starter',
      priceUSD: 2.5,
      description: 'Entry level package',
      packageIndex: 0,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income']
    },
    {
      name: 'Basic',
      priceUSD: 5,
      description: 'Basic level package',
      packageIndex: 1,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income']
    },
    {
      name: 'Standard',
      priceUSD: 10,
      description: 'Standard package',
      packageIndex: 2,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income']
    },
    {
      name: 'Silver',
      priceUSD: 25, 
      description: 'Silver package',
      packageIndex: 3,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Weekly Reward Eligible']
    },
    {
      name: 'Gold',
      priceUSD: 50,
      description: 'Gold package',
      packageIndex: 4,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Weekly Reward Eligible']
    },
    {
      name: 'Premium',
      priceUSD: 100,
      description: 'Premium package - Silver rank eligible',
      packageIndex: 5,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Silver Rank Eligible']
    },
    {
      name: 'Advanced',
      priceUSD: 250,
      description: 'Advanced package - Gold rank eligible',
      packageIndex: 6,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Gold Rank Eligible']
    },
    {
      name: 'Elite',
      priceUSD: 500,
      description: 'Elite package - Platinum rank eligible',
      packageIndex: 7,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Platinum Rank Eligible']
    },
    {
      name: 'Diamond',
      priceUSD: 1000,
      description: 'Diamond package - Diamond rank eligible',
      packageIndex: 8,
      maxROIMultiplier: 4, // 0.5% daily for 400 days = 2x investment
      features: ['0.5% Daily ROI up to 400 days', 'Binary Income (10% pairmatch)', 'Level Income', 'Diamond Rank Eligible']
    }
  ];
  
  for (const pkg of packages) {
    const existingPackage = await Package.findOne({ packageIndex: pkg.packageIndex });
    
    if (!existingPackage) {
      await Package.create(pkg);
      logger.info(`Created package: ${pkg.name}`);
    } else {
      logger.info(`Package already exists: ${pkg.name}`);
    }
  }
  
  logger.info('Default packages created');
};

/**
 * Create Admin User
 */
const createAdminUser = async () => {
  logger.info('Creating admin user...');
  
  const adminEmail = 'admin@xeenux.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
    // Create default referral ID user first
    const defaultReferrerId = parseInt(process.env.XEENUX_DEFAULT_REFERRAL_ID || 103115);
    const existingDefaultRef = await User.findOne({ userId: defaultReferrerId });
    
    let systemUserId;
    if (!existingDefaultRef) {
      systemUserId = defaultReferrerId; // Use the predefined ID if not taken
    } else {
      systemUserId = await generateUniqueUserId(); // Generate a new unique ID if the default is taken
    }

    const hashedPassword = await bcrypt.hash('system123!', 12);
    
    await User.create({
      name: 'System',
      email: 'system@xeenux.com',
      phone: '0000000000',
      password: hashedPassword,
      walletAddress: '0x0000000000000000000000000000000000000000',
      role: 'admin',
      userId: systemUserId, // Explicitly set userId
      referrerId: systemUserId,
      position: 0,
      isActive: true,
      registeredAt: Date.now(),
      lastROIDistributed: Date.now(),
      lastBinaryDistributed: Date.now(),
      lastRewardDistributed: Date.now()
    });
    
    logger.info(`Created default referrer user with ID: ${systemUserId}`);
    
    // Create admin user with a new unique userId
    const adminUserId = await generateUniqueUserId();
    const adminHashedPassword = await bcrypt.hash('admin123!', 12);
    
    await User.create({
      name: 'Admin',
      email: adminEmail,
      phone: '1234567890',
      password: adminHashedPassword,
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'admin',
      userId: adminUserId, // Explicitly set userId
      referrerId: systemUserId,
      position: 0,
      isActive: true,
      registeredAt: Date.now(),
      lastROIDistributed: Date.now(),
      lastBinaryDistributed: Date.now(),
      lastRewardDistributed: Date.now()
    });
    
    logger.info('Admin user created');
  } else {
    logger.info('Admin user already exists');
  }
};

/**
 * Initialize Database
 */
const initializeDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize settings
    await initializeSettings();
    
    // Create default packages
    await createDefaultPackages();
    
    // Create admin user
    await createAdminUser();
    
    logger.info('Database initialization completed');
    process.exit();
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Run initialization
initializeDatabase();