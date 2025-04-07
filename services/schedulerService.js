const cron = require('node-cron');
const logger = require('../utils/logger');
const incomeController = require('../controllers/incomeController');
const Settings = require('../models/Settings');
const config = require('../config/config');

// Mock request and response objects for controller functions
const mockReq = {};
const mockRes = {
  status: () => ({
    json: () => {}
  })
};
const mockNext = (err) => {
  if (err) logger.error('Scheduler error:', err);
};

/**
 * Start all cron jobs
 */
exports.startScheduler = async () => {
  try {
    // Get scheduler settings
    const roiInterval = await Settings.getValue('roi_interval', '0 0 * * *'); // Daily at midnight
    const binaryInterval = await Settings.getValue('binary_interval', '0 12 * * *'); // Daily at noon
    const weeklyInterval = await Settings.getValue('weekly_interval', '0 0 * * 0'); // Weekly on Sunday
    
    logger.info('Starting scheduler...');
    
    // Schedule daily ROI distribution
    cron.schedule(roiInterval, async () => {
      logger.info('Running scheduled ROI distribution');
      try {
        await incomeController.processAllROI(mockReq, mockRes, mockNext);
        logger.info('ROI distribution completed');
      } catch (error) {
        logger.error('Error processing ROI distribution:', error);
      }
    });
    
    // Schedule daily binary income distribution
    cron.schedule(binaryInterval, async () => {
      logger.info('Running scheduled binary income distribution');
      try {
        await incomeController.processAllBinaryIncome(mockReq, mockRes, mockNext);
        logger.info('Binary income distribution completed');
      } catch (error) {
        logger.error('Error processing binary income distribution:', error);
      }
    });
    
    // Schedule weekly rewards distribution
    cron.schedule(weeklyInterval, async () => {
      logger.info('Running scheduled weekly reward distribution');
      try {
        await incomeController.processWeeklyRewards(mockReq, mockRes, mockNext);
        logger.info('Weekly reward distribution completed');
      } catch (error) {
        logger.error('Error processing weekly reward distribution:', error);
      }
    });
    
    logger.info('Scheduler started successfully');
  } catch (error) {
    logger.error('Error starting scheduler:', error);
  }
};

/**
 * Run a specific scheduled task manually
 */
exports.runTask = async (taskName) => {
  try {
    logger.info(`Running task manually: ${taskName}`);
    
    switch (taskName) {
      case 'roi':
        await incomeController.processAllROI(mockReq, mockRes, mockNext);
        break;
      case 'binary':
        await incomeController.processAllBinaryIncome(mockReq, mockRes, mockNext);
        break;
      case 'weekly':
        await incomeController.processWeeklyRewards(mockReq, mockRes, mockNext);
        break;
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
    
    logger.info(`Task completed: ${taskName}`);
    return { status: 'success', taskName };
  } catch (error) {
    logger.error(`Error running task ${taskName}:`, error);
    throw error;
  }
};

/**
 * Get current schedule configuration
 */
exports.getScheduleConfig = async () => {
  try {
    const roiInterval = await Settings.getValue('roi_interval', '0 0 * * *');
    const binaryInterval = await Settings.getValue('binary_interval', '0 12 * * *');
    const weeklyInterval = await Settings.getValue('weekly_interval', '0 0 * * 0');
    
    return {
      roiInterval,
      binaryInterval,
      weeklyInterval
    };
  } catch (error) {
    logger.error('Error getting schedule config:', error);
    throw error;
  }
};

/**
 * Update schedule configuration
 */
exports.updateScheduleConfig = async (config) => {
  try {
    const { roiInterval, binaryInterval, weeklyInterval } = config;
    
    // Validate cron expressions
    if (roiInterval && !cron.validate(roiInterval)) {
      throw new Error('Invalid ROI interval cron expression');
    }
    
    if (binaryInterval && !cron.validate(binaryInterval)) {
      throw new Error('Invalid binary interval cron expression');
    }
    
    if (weeklyInterval && !cron.validate(weeklyInterval)) {
      throw new Error('Invalid weekly interval cron expression');
    }
    
    // Update settings
    if (roiInterval) {
      await Settings.setValue('roi_interval', roiInterval);
    }
    
    if (binaryInterval) {
      await Settings.setValue('binary_interval', binaryInterval);
    }
    
    if (weeklyInterval) {
      await Settings.setValue('weekly_interval', weeklyInterval);
    }
    
    // Restart scheduler
    // In a real implementation, you would need to stop and restart the cron jobs
    logger.info('Schedule config updated, scheduler needs to be restarted');
    
    return {
      status: 'success',
      message: 'Schedule configuration updated'
    };
  } catch (error) {
    logger.error('Error updating schedule config:', error);
    throw error;
  }
};