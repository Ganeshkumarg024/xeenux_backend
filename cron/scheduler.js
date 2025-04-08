// Update in cron/scheduler.js
const cron = require('node-cron');
const logger = require('../utils/logger');
const dailyRoi = require('./dailyRoi');
const binaryIncome = require('./binaryIncome');
const weeklyRewards = require('./weeklyRewards');
const updateRanks = require('./updateRanks');
const Settings = require('../models/Settings');
const config = require('../config/config');
const rankCalculation = require("./rankCalculator");


/**
 * Initialize cron jobs
 */
exports.initScheduler = async () => {
  try {
    logger.info('Initializing cron jobs...');
    
    // Get scheduler settings
    const roiInterval = await Settings.getValue('roi_interval', '0 0 * * *'); // Daily at midnight
    const binaryInterval = await Settings.getValue('binary_interval', '* * * * *'); // Daily at noon
    const weeklyInterval = await Settings.getValue('weekly_interval', '* * * * *'); // Weekly on Sunday
    const rankUpdateInterval = await Settings.getValue('rank_update_interval', '0 1 * * *'); // Daily at 1 AM
    
    // Schedule daily ROI distribution
    cron.schedule(roiInterval, async () => {
      logger.info('Running scheduled ROI distribution');
      try {
        await dailyRoi.processROI();
        logger.info('ROI distribution completed');
      } catch (error) {
        logger.error('Error processing ROI distribution:', error);
      }
    });
    
    // Schedule daily binary income distribution
    cron.schedule(binaryInterval, async () => {
      logger.info('Running scheduled binary income distribution');
      console.log("binary income")
      try {
        await binaryIncome.processBinaryIncome();
        logger.info('Binary income distribution completed');
      } catch (error) {
        logger.error('Error processing binary income distribution:', error);
      }
    });
    
    // Schedule weekly rewards distribution
    cron.schedule(weeklyInterval, async () => {
      logger.info('Running scheduled weekly reward distribution');
      try {
        await weeklyRewards.processWeeklyRewards();
        logger.info('Weekly reward distribution completed');
      } catch (error) {
        logger.error('Error processing weekly reward distribution:', error);
      }
    });
    
    // Schedule rank update
    cron.schedule(rankUpdateInterval, async () => {
      logger.info('Running scheduled rank update');
      try {
        await updateRanks.updateAllRanks();
        logger.info('Rank update completed');
      } catch (error) {
        logger.error('Error processing rank update:', error);
      }
    });
    
    logger.info('Scheduler initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduler:', error);
  }


  cron.schedule('* * * * *', async () => { // Run once a day at midnight
    logger.info('Running scheduled rank calculation');
    logger.info('Running scheduled rank calculation');
      try {
        await rankCalculation.processRankCalculation();
        logger.info('Rank calculation completed');
      } catch (error) {
        logger.error('Error processing rank calculation:', error);
      }
  });
};