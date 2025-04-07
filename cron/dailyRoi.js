const logger = require('../utils/logger');
const User = require('../models/User');
const incomeController = require('../controllers/incomeController');

/**
 * Process daily ROI for all users
 */
async function processROI() {
  try {
    logger.info('Starting daily ROI distribution...');
    
    // Create mock request and response objects for controller
    const mockReq = {};
    const mockRes = {
      status: () => ({
        json: () => {}
      })
    };
    const mockNext = (err) => {
      if (err) logger.error('Error in daily ROI distribution:', err);
    };
    
    // Process ROI
    await incomeController.processAllROI(mockReq, mockRes, mockNext);
    
    logger.info('Daily ROI distribution completed');
  } catch (error) {
    logger.error('Failed to process daily ROI:', error);
  }
}

/**
 * Process daily ROI for a specific user
 * @param {Number} userId - User ID
 */
async function processUserROI(userId) {
  try {
    logger.info(`Processing ROI for user ${userId}...`);
    
    // Validate user
    const user = await User.findOne({ userId });
    
    if (!user) {
      logger.error(`User ${userId} not found`);
      return;
    }
    
    // Process ROI
    const result = await incomeController.distributeROIForUser(userId);
    
    logger.info(`ROI processing for user ${userId} completed:`, result);
    
    return result;
  } catch (error) {
    logger.error(`Failed to process ROI for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  processROI,
  processUserROI
};

/**
 * Run daily ROI distribution when this script is run directly
 */
if (require.main === module) {
  // Connect to database
  require('../config/db').dbConnection()
    .then(() => {
      processROI()
        .then(() => {
          logger.info('Daily ROI distribution script completed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error in daily ROI distribution script:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}