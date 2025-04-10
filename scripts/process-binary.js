// Create a script to process binary income: scripts/process-binary.js
const mongoose = require('mongoose');
const User = require('../models/User');
const BinaryNetwork = require('../models/BinaryNetwork');
const UserPackage = require('../models/UserPackage');
const Income = require('../models/Income');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');
const config = require('../config/config');
require('dotenv').config();

/**
 * Process binary income for all users
 */
async function processBinaryIncome() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
    
    // Get all users with binary network
    const binaryNetworks = await BinaryNetwork.find({}).populate('user', 'userId name');
    logger.info(`Processing binary income for ${binaryNetworks.length} users`);
    
    let processedCount = 0;
    let totalDistributed = 0;
    
    for (const network of binaryNetworks) {
      try {
        // Skip if no volumes
        if (network.leftVolume === 0 || network.rightVolume === 0) {
          continue;
        }
        
        // Get user
        const user = await User.findOne({ userId: network.userId });
        if (!user) continue;
        
        // Get active packages
        const activePackages = await UserPackage.find({ 
          userId: user.userId,
          isActive: true
        });
        
        if (activePackages.length === 0) continue;
        
        // Find highest package value for ceiling
        const maxPackageAmount = activePackages.reduce((max, pkg) => 
          Math.max(max, pkg.xeenuxAmount), 0);
        
        // Calculate matching volume (weaker leg)
        const matchingVolume = Math.min(network.leftVolume, network.rightVolume);
        
        // Calculate binary income (10% of matching volume)
        let binaryIncome = (matchingVolume * 10) / 100;
        
        // Apply ceiling limit (package value)
        const ceilingApplied = binaryIncome > maxPackageAmount;
        if (ceilingApplied) {
          binaryIncome = maxPackageAmount;
        }
        
        // Determine which leg is weaker for carry forward
        const isLeftWeaker = network.leftVolume <= network.rightVolume;
        
        let leftCarryForward = 0;
        let rightCarryForward = 0;
        
        if (isLeftWeaker) {
          leftCarryForward = 0; // Left leg is matched completely
          rightCarryForward = network.rightVolume - matchingVolume; // Right leg carries forward
        } else {
          leftCarryForward = network.leftVolume - matchingVolume; // Left leg carries forward
          rightCarryForward = 0; // Right leg is matched completely
        }
        
        // Update binary network
        network.leftVolume = leftCarryForward;
        network.rightVolume = rightCarryForward;
        network.leftCarryForward = leftCarryForward;
        network.rightCarryForward = rightCarryForward;
        network.lastBinaryProcess = Date.now();
        await network.save();
        
        // Create income record
        if (binaryIncome > 0) {
          await Income.create({
            userId: user.userId,
            user: user._id,
            type: 'binary',
            amount: binaryIncome,
            description: 'Binary income',
            isDistributed: true
          });
          
          // Create activity record
          await Activity.create({
            userId: user.userId,
            user: user._id,
            amount: binaryIncome,
            type: 5, // Binary Income
            description: `Binary income from pairmatch (${isLeftWeaker ? 'left' : 'right'} leg)`,
            meta: {
              matchingVolume,
              weaker: isLeftWeaker ? 'left' : 'right',
              originalAmount: (matchingVolume * 10) / 100,
              ceilingApplied,
              packageValueLimit: maxPackageAmount,
              leftCarryForward,
              rightCarryForward
            }
          });
          
          // Update user binary income
          user.binaryIncome += binaryIncome;
          user.lastBinaryDistributed = Date.now();
          await user.save();
          
          totalDistributed += binaryIncome;
          processedCount++;
          
          logger.info(`Processed binary income for user ${user.userId}: ${binaryIncome} XEE`);
        }
      } catch (error) {
        logger.error(`Error processing binary income for network ${network.userId}: ${error.message}`);
      }
    }
    
    logger.info(`Binary income distribution completed. Processed ${processedCount} users. Total distributed: ${totalDistributed} XEE`);
    process.exit(0);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
processBinaryIncome();