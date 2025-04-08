/**
 * Script to manually update a user's metrics to qualify for a rank
 * and then test the rank calculation
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const UserVolume = require('../models/UserVolume');
const TeamStructure = require('../models/TeamStructure');
const rankService = require('../services/rankService');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Update user eligibility for rank testing
 */
async function updateUserForRankTest() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
    
    // Choose a user to update (e.g., the one with high selfVolume)
    const userId = 243744; // Replace with the user ID you want to test
    
    // Get user
    const user = await User.findOne({ userId });
    if (!user) {
      logger.error(`User ${userId} not found`);
      process.exit(1);
    }
    
    logger.info(`Updating user ${userId} (${user.name}) for rank test...`);
    
    // Step 1: Update refCount to qualify for Silver rank
    user.refCount = 5; // Minimum for Silver rank
    await user.save();
    logger.info(`Updated refCount to ${user.refCount}`);
    
    // Step 2: Update UserVolume for directVolume
    const userVolume = await UserVolume.findOne({ userId });
    if (!userVolume) {
      logger.error(`Volume data for user ${userId} not found`);
      process.exit(1);
    }
    
    // Set directVolume to qualify for Silver rank
    // If xeenuxPrice is 0.00011, then 300/0.00011 = 2,727,272.73
    userVolume.directVolume = 2800000; // Slightly more than required
    await userVolume.save();
    logger.info(`Updated directVolume to ${userVolume.directVolume}`);
    
    // Step 3: Update TeamStructure for this user's referrer
    if (user.referrerId) {
      const referrerTeamStructure = await TeamStructure.findOne({ userId: user.referrerId });
      if (referrerTeamStructure) {
        // Make sure the teamRanks map exists
        if (!referrerTeamStructure.teamRanks) {
          referrerTeamStructure.teamRanks = {
            rank0: 0,
            rank1: 0,
            rank2: 0,
            rank3: 0,
            rank4: 0
          };
        }
        
        // Update to have 2 Silver ranked users (for Gold rank qualification)
        referrerTeamStructure.teamRanks.rank1 = 2;
        referrerTeamStructure.markModified('teamRanks');
        await referrerTeamStructure.save();
        logger.info(`Updated referrer's team rank counts`);
      }
    }
    
    // Step 4: Run rank calculation for this user
    logger.info(`Running rank calculation for user ${userId}...`);
    const result = await rankService.updateUserRank(userId);
    
    logger.info(`Rank calculation result:`, result);
    
    // Log the final state
    const updatedUser = await User.findOne({ userId });
    logger.info(`Final user state: Rank = ${updatedUser.rank}`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error in rank test script:', error);
    process.exit(1);
  }
}

// Run the script
updateUserForRankTest();