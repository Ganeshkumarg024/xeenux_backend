const User = require('../models/User');
const UserVolume = require('../models/UserVolume');
const TeamStructure = require('../models/TeamStructure');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Update rank for a specific user
 * @param {Number} userId - User ID
 * @returns {Object} - Update result
 */
exports.updateUserRank = async function(userId) {
  try {
    // Get user
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Get user volume
    const userVolume = await UserVolume.findOne({ userId });
    if (!userVolume) {
      throw new Error(`Volume data for user ${userId} not found`);
    }
    
    // Get referrer for rank requirements
    const referrerId = user.referrerId;
    
    // Get team structure for rank counts
    const teamStructure = await TeamStructure.findOne({ userId: referrerId });
    
    // Get token price for USD conversion
    const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
    
    // Get team rank counts
    let rankCounts = [0, 0, 0, 0, 0]; // None, Silver, Gold, Platinum, Diamond
    
    if (teamStructure && teamStructure.teamRanks) {
      rankCounts[1] = teamStructure.teamRanks.rank1 || 0;
      rankCounts[2] = teamStructure.teamRanks.rank2 || 0;
      rankCounts[3] = teamStructure.teamRanks.rank3 || 0;
      rankCounts[4] = teamStructure.teamRanks.rank4 || 0;
    }
    
    // Calculate rank based on criteria
    let newRank = 0;
    
    // Diamond rank (4)
    if (
      userVolume.selfVolume >= (1000 / xeenuxPrice) &&
      user.refCount >= 10 &&
      userVolume.directVolume >= (5000 / xeenuxPrice) &&
      rankCounts[3] >= 2
    ) {
      newRank = 4;
    }
    // Platinum rank (3)
    else if (
      userVolume.selfVolume >= (500 / xeenuxPrice) &&
      user.refCount >= 8 &&
      userVolume.directVolume >= (2500 / xeenuxPrice) &&
      rankCounts[2] >= 2
    ) {
      newRank = 3;
    }
    // Gold rank (2)
    else if (
      userVolume.selfVolume >= (250 / xeenuxPrice) &&
      user.refCount >= 6 &&
      userVolume.directVolume >= (1000 / xeenuxPrice) &&
      rankCounts[1] >= 2
    ) {
      newRank = 2;
    }
    // Silver rank (1)
    else if (
      userVolume.selfVolume >= (100 / xeenuxPrice) &&
      user.refCount >= 5 &&
      userVolume.directVolume >= (300 / xeenuxPrice)
    ) {
      newRank = 1;
    }
    
    // Log the calculation details
    logger.info(`Rank calculation for user ${userId}:`, {
      selfVolume: userVolume.selfVolume,
      refCount: user.refCount,
      directVolume: userVolume.directVolume,
      rankCounts: rankCounts,
      xeenuxPrice,
      currentRank: user.rank,
      calculatedRank: newRank
    });
    
    // Update user rank if changed
    if (user.rank !== newRank) {
      const oldRank = user.rank;
      user.rank = newRank;
      await user.save();
      
      // Update team structures if rank changed
      if (oldRank !== newRank) {
        // Find users who have this user in their team
        const referrer = await User.findOne({ userId: user.referrerId });
        if (referrer) {
          const referrerTeam = await TeamStructure.findOne({ userId: referrer.userId });
          if (referrerTeam) {
            // Decrement old rank count
            if (oldRank > 0) {
              const oldRankKey = `rank${oldRank}`;
              const oldCount = referrerTeam.teamRanks[oldRankKey] || 0;
              if (oldCount > 0) {
                referrerTeam.teamRanks[oldRankKey] = oldCount - 1;
              }
            }
            
            // Increment new rank count
            if (newRank > 0) {
              const newRankKey = `rank${newRank}`;
              const newCount = referrerTeam.teamRanks[newRankKey] || 0;
              referrerTeam.teamRanks[newRankKey] = newCount + 1;
            }
            
            referrerTeam.markModified('teamRanks');
            await referrerTeam.save();
          }
        }
      }
      
      return {
        userId,
        oldRank,
        newRank,
        updated: true
      };
    }
    
    return {
      userId,
      rank: newRank,
      updated: false
    };
  } catch (error) {
    logger.error(`Error updating rank for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update ranks for all users
 * @returns {Object} - Update results
 */
exports.updateAllRanks = async function() {
  try {
    const users = await User.find({ isActive: true });
    let results = {
      total: users.length,
      updated: 0,
      errors: 0,
      details: []
    };
    
    for (const user of users) {
      try {
        const result = await this.updateUserRank(user.userId);
        if (result.updated) {
          results.updated++;
        }
        results.details.push(result);
      } catch (error) {
        results.errors++;
        results.details.push({
          userId: user.userId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Error updating all ranks:', error);
    throw error;
  }
};