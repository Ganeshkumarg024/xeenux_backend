// Create a new file: scripts/update-volumes.js
const mongoose = require('mongoose');
const User = require('../models/User');
const UserPackage = require('../models/UserPackage');
const UserVolume = require('../models/UserVolume');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Update user volumes based on their network
 */
async function updateUserVolumes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
    
    // Get all users
    const users = await User.find({ isActive: true });
    logger.info(`Processing volumes for ${users.length} users`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      try {
        // Find all direct referrals
        const directReferrals = await User.find({ referrerId: user.userId });
        
        // Calculate direct volume
        let directVolume = 0;
        
        for (const directRef of directReferrals) {
          // Get user's packages
          const packages = await UserPackage.find({ userId: directRef.userId });
          
          // Add up the package amounts
          for (const pkg of packages) {
            directVolume += pkg.xeenuxAmount;
          }
        }
        
        // Update user volume
        const userVolume = await UserVolume.findOne({ userId: user.userId });
        
        if (userVolume) {
          userVolume.directVolume = directVolume;
          userVolume.totalVolume = userVolume.selfVolume + directVolume + userVolume.leftVolume + userVolume.rightVolume;
          userVolume.lastUpdated = Date.now();
          await userVolume.save();
          
          logger.info(`Updated volumes for user ${user.userId}: directVolume=${directVolume}, totalVolume=${userVolume.totalVolume}`);
          updatedCount++;
        }
      } catch (error) {
        logger.error(`Error updating volumes for user ${user.userId}: ${error.message}`);
      }
    }
    
    logger.info(`Volume update completed. Updated ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
updateUserVolumes();