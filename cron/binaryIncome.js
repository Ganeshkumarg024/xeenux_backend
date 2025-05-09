const logger = require('../utils/logger');
const User = require('../models/User');
const incomeController = require('../controllers/incomeController');

/**
 * Process binary income for all users
 */
async function processBinaryIncome() {
  try {
    logger.info('Starting binary income distribution...');
    
    // Get all active users
    const users = await User.find({ isActive: true });
    
    let processedCount = 0;
    let incomeDistributed = 0;
    
    for (const user of users) {
      try {
        // Process binary income for this user
        const binaryController = require('../controllers/binaryController');
        const result = await binaryController.processBinaryIncomeForUser(user.userId);
        
        if (result.status === 'success') {
          processedCount++;
          incomeDistributed += result.binaryIncome;
        }
      } catch (error) {
        logger.error(`Error processing binary income for user ${user.userId}: ${error.message}`);
      }
    }
    
    logger.info(`Binary income distribution completed. Processed ${processedCount} users. Total distributed: ${incomeDistributed} XEE`);
    return {
      processed: processedCount,
      distributed: incomeDistributed
    };
  } catch (error) {
    logger.error('Failed to process binary income:', error);
    throw error;
  }
}

/**
 * Process binary income for a specific user
 * @param {Number} userId - User ID
 */
async function processUserBinaryIncome(userId) {
  try {
    logger.info(`Processing binary income for user ${userId}...`);
    
    // Validate user
    const user = await User.findOne({ userId });
    
    if (!user) {
      logger.error(`User ${userId} not found`);
      return;
    }
    
    // Process binary income
    const result = await incomeController.distributeBinaryIncomeForUser(userId);
    
    logger.info(`Binary income processing for user ${userId} completed:`, result);
    
    return result;
  } catch (error) {
    logger.error(`Failed to process binary income for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  processBinaryIncome,
  processUserBinaryIncome
};

/**
 * Run binary income distribution when this script is run directly
 */
if (require.main === module) {
  // Connect to database
  require('../config/db').dbConnection()
    .then(() => {
      processBinaryIncome()
        .then(() => {
          logger.info('Binary income distribution script completed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error in binary income distribution script:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}