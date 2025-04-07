// Create a new file: scripts/process-autopool.js
const mongoose = require('mongoose');
const User = require('../models/User');
const AutoPool = require('../models/AutoPool');
const autopoolController = require('../controllers/autopoolController');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Process autopool for all users
 */
async function processAutopool() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
    
    // Get all users
    const users = await User.find({ isActive: true });
    logger.info(`Processing autopool for ${users.length} users`);
    
    let addedCount = 0;
    let errorCount = 0;
    
    // Process users in order of registration (oldest first)
    const sortedUsers = users.sort((a, b) => 
      new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    );
    
    for (const user of sortedUsers) {
      try {
        // Check if user already exists in autopool
        const existingInAutopool = await AutoPool.findOne({ userId: user.userId });
        
        if (!existingInAutopool) {
          // Add user to autopool
          const result = await autopoolController.addUserToAutopool(user.userId);
          
          logger.info(`Added user ${user.userId} to autopool: ${JSON.stringify(result)}`);
          addedCount++;
        }
      } catch (error) {
        logger.error(`Error processing autopool for user ${user.userId}: ${error.message}`);
        errorCount++;
      }
    }
    
    logger.info(`Autopool processing completed. Added ${addedCount} users. Errors: ${errorCount}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
processAutopool();