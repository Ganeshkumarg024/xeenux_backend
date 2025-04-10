const logger = require('../utils/logger');
const rankService = require('../services/rankService');

/**
 * Process rank calculation for all users
 */
async function processRankCalculation() {
  try {
    logger.info('Starting rank calculation for all users...');
    
    const results = await rankService.updateAllRanks();
    
    logger.info('Rank calculation completed', {
      total: results.total,
      updated: results.updated,
      errors: results.errors
    });
    
    return results;
  } catch (error) {
    logger.error('Failed to process rank calculation:', error);
    throw error;
  }
}

module.exports = {
  processRankCalculation
};

/**
 * Run rank calculation when this script is run directly
 */
if (require.main === module) {
  // Connect to database
  require('../config/db').dbConnection()
    .then(() => {
      processRankCalculation()
        .then(() => {
          logger.info('Rank calculation script completed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error in rank calculation script:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}