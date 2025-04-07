// Update in cron/updateRanks.js
const User = require('../models/User');
const rankCalculator = require('../utils/rankCalculator');
const logger = require('../utils/logger');

/**
 * Update ranks for all users
 */
async function updateAllRanks() {
  try {
    logger.info('Starting rank update process...');
    
    // Get all active users
    const users = await User.find({ isActive: true });
    
    let updatedCount = 0;
    
    for (const user of users) {
      try {
        // Calculate user's rank
        const newRank = await rankCalculator.calculateUserRank(user.userId);
        
        // Ensure newRank is a valid number
        const validRank = typeof newRank === 'number' && !isNaN(newRank) ? 
                         Math.max(0, Math.min(4, Math.floor(newRank))) : 0;
        
        // Update rank if changed
        if (user.rank !== validRank) {
          const oldRank = user.rank;
          user.rank = validRank;
          await user.save();
          
          logger.info(`Updated user ${user.userId} rank from ${oldRank} to ${validRank}`);
          updatedCount++;
        }
      } catch (error) {
        logger.error(`Error updating rank for user ${user.userId}: ${error.message}`);
      }
    }
    
    logger.info(`Rank update completed. Updated ${updatedCount} users.`);
  } catch (error) {
    logger.error(`Error in rank update process: ${error.message}`);
  }
}

module.exports = {
  updateAllRanks
};

// Run rank update if script is executed directly
if (require.main === module) {
  // Connect to database
  require('../config/db').dbConnection()
    .then(() => {
      updateAllRanks()
        .then(() => {
          logger.info('Rank update script completed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error in rank update script:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}