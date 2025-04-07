// Create a new file: scripts/create-missing-volumes.js
const mongoose = require('mongoose');
const User = require('../models/User');
const UserVolume = require('../models/UserVolume');
const BinaryNetwork = require('../models/BinaryNetwork');
const TeamStructure = require('../models/TeamStructure');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Create missing user-related records
 */
async function createMissingRecords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected');
    
    // Get all users
    const users = await User.find();
    logger.info(`Found ${users.length} users total`);
    
    let volumeCreated = 0;
    let binaryCreated = 0;
    let teamCreated = 0;
    
    for (const user of users) {
      try {
        // Check for UserVolume
        const existingVolume = await UserVolume.findOne({ userId: user.userId });
        if (!existingVolume) {
          await UserVolume.create({
            userId: user.userId,
            user: user._id,
            selfVolume: 0,
            directVolume: 0,
            leftVolume: 0,
            rightVolume: 0,
            totalVolume: 0,
            lastUpdated: Date.now()
          });
          volumeCreated++;
        }
        
        // Check for BinaryNetwork
        const existingBinary = await BinaryNetwork.findOne({ userId: user.userId });
        if (!existingBinary) {
          await BinaryNetwork.create({
            userId: user.userId,
            user: user._id,
            position: user.position,
            parentId: user.referrerId,
            leftChildId: 0,
            rightChildId: 0,
            leftVolume: 0,
            rightVolume: 0,
            leftCarryForward: 0,
            rightCarryForward: 0,
            totalLeftVolume: 0,
            totalRightVolume: 0,
            leftCount: 0,
            rightCount: 0,
            lastBinaryProcess: Date.now()
          });
          binaryCreated++;
        }
        
        // Check for TeamStructure
        const existingTeam = await TeamStructure.findOne({ userId: user.userId });
        if (!existingTeam) {
          await TeamStructure.create({
            userId: user.userId,
            user: user._id,
            directTeam: 0,
            totalTeam: 0,
            directBusiness: 0,
            totalBusiness: 0,
            team: {
              level1: [],
              level2: [],
              level3: [],
              level4: [],
              level5: [],
              level6: [],
              level7: []
            },
            volume: {
              level1: 0,
              level2: 0,
              level3: 0,
              level4: 0,
              level5: 0,
              level6: 0,
              level7: 0
            },
            teamRanks: {
              rank0: 0,
              rank1: 0,
              rank2: 0,
              rank3: 0,
              rank4: 0
            },
            lastUpdated: Date.now()
          });
          teamCreated++;
        }
      } catch (error) {
        logger.error(`Error processing user ${user.userId}: ${error.message}`);
      }
    }
    
    logger.info(`Data integrity check completed.`);
    logger.info(`Created ${volumeCreated} missing user volume records.`);
    logger.info(`Created ${binaryCreated} missing binary network records.`);
    logger.info(`Created ${teamCreated} missing team structure records.`);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
createMissingRecords();