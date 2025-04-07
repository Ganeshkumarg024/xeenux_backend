const logger = require('../utils/logger');
const incomeController = require('../controllers/incomeController');

/**
 * Process weekly rewards
 */
async function processWeeklyRewards() {
  try {
    logger.info('Starting weekly rewards distribution...');
    
    // Create mock request and response objects for controller
    const mockReq = {};
    const mockRes = {
      status: () => ({
        json: () => {}
      })
    };
    const mockNext = (err) => {
      if (err) logger.error('Error in weekly rewards distribution:', err);
    };
    
    // Process weekly rewards
    await incomeController.processWeeklyRewards(mockReq, mockRes, mockNext);
    
    logger.info('Weekly rewards distribution completed');
  } catch (error) {
    logger.error('Failed to process weekly rewards:', error);
  }
}

module.exports = {
  processWeeklyRewards
};

/**
 * Run weekly rewards distribution when this script is run directly
 */
if (require.main === module) {
  // Connect to database
  require('../config/db').dbConnection()
    .then(() => {
      processWeeklyRewards()
        .then(() => {
          logger.info('Weekly rewards distribution script completed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error in weekly rewards distribution script:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}