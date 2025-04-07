const cron = require('node-cron');
const logger = require('../utils/logger');
const schedulerService = require('../services/schedulerService');

/**
 * Initialize cron jobs
 */
exports.initScheduler = async () => {
  try {
    logger.info('Initializing cron jobs...');
    
    // Start scheduler service
    await schedulerService.startScheduler();
    
    logger.info('Cron jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cron jobs:', error);
  }
};

/**
 * Start cron jobs
 */
exports.start = async () => {
  try {
    logger.info('Starting cron jobs...');
    
    // Initialize scheduler
    await this.initScheduler();
    
    // Listen for process termination signals
    process.on('SIGINT', () => {
      logger.info('Shutting down cron jobs...');
      // Perform any cleanup if needed
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Shutting down cron jobs...');
      // Perform any cleanup if needed
      process.exit(0);
    });
    
    logger.info('Cron jobs started successfully');
  } catch (error) {
    logger.error('Failed to start cron jobs:', error);
    process.exit(1);
  }
};

/**
 * Start scheduler when this script is run directly
 */
if (require.main === module) {
  // Run standalone if this script is executed directly
  logger.info('Starting scheduler in standalone mode...');
  this.start();
}