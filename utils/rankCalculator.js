// Create a new file: utils/rankCalculator.js
const User = require('../models/User');
const UserVolume = require('../models/UserVolume');
const tokenService = require('../services/tokenService');

/**
 * Calculate user rank based on requirements
 * @param {Number} userId - User ID
 * @returns {Promise<Number>} - Calculated rank (0-4)
 */// Update in utils/rankCalculator.js

// Fix in utils/rankCalculator.js
exports.calculateUserRank = async (userId) => {
    try {
      // Get user data
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get user volume data
      let userVolume = await UserVolume.findOne({ userId });
      if (!userVolume) {
        userVolume = await UserVolume.create({
          userId,
          user: user._id,
          selfVolume: 0,
          directVolume: 0,
          leftVolume: 0,
          rightVolume: 0,
          totalVolume: 0,
          lastUpdated: Date.now()
        });
      }
      
      // Get token price
      const Settings = require('../models/Settings');
      const config = require('../config/config');
      const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
      
      // Convert XEE values to USD using xeenuxPrice
      const selfVolumeUSD = userVolume.selfVolume * xeenuxPrice;
      const directVolumeUSD = userVolume.directVolume * xeenuxPrice;
      
      console.log(`User ${userId} - Self Volume: ${selfVolumeUSD} USD, Direct Volume: ${directVolumeUSD} USD, Referrals: ${user.refCount}`);
      
      // Check for Silver rank (rank 1)
      if (
        selfVolumeUSD >= 100 && // Self ID $100
        user.refCount >= 5 &&    // 5 Total referrals
        directVolumeUSD >= 300   // 300 USDT direct volume
      ) {
        // Count silver rank referrals for checking Gold eligibility
        const silverRankReferrals = await User.countDocuments({ 
          referrerId: userId,
          rank: { $gte: 1 }
        });
        
        // Check for Gold rank (rank 2)
        if (
          selfVolumeUSD >= 250 && // Self ID $250
          user.refCount >= 6 &&    // 6 Total referrals
          directVolumeUSD >= 1000 && // 1000 USDT direct volume
          silverRankReferrals >= 2   // 2 Silver rank referrals
        ) {
          // Count gold rank referrals for checking Platinum eligibility
          const goldRankReferrals = await User.countDocuments({ 
            referrerId: userId,
            rank: { $gte: 2 }
          });
          
          // Check for Platinum rank (rank 3)
          if (
            selfVolumeUSD >= 500 && // Self ID $500
            user.refCount >= 8 &&    // 8 Total referrals
            directVolumeUSD >= 2500 && // 2500 USDT direct volume
            goldRankReferrals >= 2     // 2 Gold rank referrals
          ) {
            // Count platinum rank referrals for checking Diamond eligibility
            const platinumRankReferrals = await User.countDocuments({ 
              referrerId: userId,
              rank: { $gte: 3 }
            });
            
            // Check for Diamond rank (rank 4)
            if (
              selfVolumeUSD >= 1000 && // Self ID $1000
              user.refCount >= 10 &&    // 10 Total referrals
              directVolumeUSD >= 1500 && // 1500 USDT direct volume
              platinumRankReferrals >= 2 // 2 Platinum rank referrals
            ) {
              console.log(`User ${userId} qualifies for Diamond rank (4)`);
              return 4; // Diamond rank
            }
            
            console.log(`User ${userId} qualifies for Platinum rank (3)`);
            return 3; // Platinum rank
          }
          
          console.log(`User ${userId} qualifies for Gold rank (2)`);
          return 2; // Gold rank
        }
        
        console.log(`User ${userId} qualifies for Silver rank (1)`);
        return 1; // Silver rank
      }
      
      console.log(`User ${userId} remains at default rank (0)`);
      return 0; // Default rank
    } catch (error) {
      console.error(`Error calculating user rank: ${error.message}`);
      return 0; // Default to rank 0 on error
    }
  };