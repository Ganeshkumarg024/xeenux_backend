const Settings = require('../models/Settings');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Service for handling Xeenux token operations and conversions
 */

/**
 * Convert USD amount to Xeenux tokens
 * @param {Number} usdAmount - Amount in USD
 * @returns {Promise<Number>} - Amount in Xeenux tokens
 */
exports.usdToXeenux = async (usdAmount) => {
  try {
    // Get current Xeenux token price
    const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
    
    // Convert USD to Xeenux
    const xeenuxAmount = usdAmount / xeenuxPrice;
    
    return xeenuxAmount;
  } catch (error) {
    logger.error('Error converting USD to Xeenux:', error);
    throw error;
  }
};

/**
 * Convert Xeenux tokens to USD
 * @param {Number} xeenuxAmount - Amount in Xeenux tokens
 * @returns {Promise<Number>} - Amount in USD
 */
exports.xeenuxToUsd = async (xeenuxAmount) => {
  try {
    // Get current Xeenux token price
    const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
    
    // Convert Xeenux to USD
    const usdAmount = xeenuxAmount * xeenuxPrice;
    
    return usdAmount;
  } catch (error) {
    logger.error('Error converting Xeenux to USD:', error);
    throw error;
  }
};

/**
 * Calculate swap fee
 * @param {Number} amount - Amount to swap
 * @returns {Promise<Object>} - Fee details
 */
exports.calculateSwapFee = async (amount) => {
  try {
    // Get swap fee percentage
    const swapFee = await Settings.getValue('swap_fee', config.xeenux.defaultSwapFee);
    
    // Calculate fee amount
    const feeAmount = (amount * swapFee) / 100;
    const amountAfterFee = amount - feeAmount;
    
    return {
      originalAmount: amount,
      feePercentage: swapFee,
      feeAmount,
      amountAfterFee
    };
  } catch (error) {
    logger.error('Error calculating swap fee:', error);
    throw error;
  }
};

/**
 * Calculate burn amount
 * @param {Number} amount - Amount to burn
 * @returns {Promise<Object>} - Burn details
 */
exports.calculateBurnAmount = async (amount) => {
  try {
    // Get burn rate
    const burnRate = await Settings.getValue('burn_rate', config.xeenux.defaultBurnRate);
    
    // Calculate burn amount
    const burnAmount = (amount * burnRate) / 100;
    
    return {
      originalAmount: amount,
      burnRate,
      burnAmount
    };
  } catch (error) {
    logger.error('Error calculating burn amount:', error);
    throw error;
  }
};

/**
 * Get current token statistics
 * @returns {Promise<Object>} - Token statistics
 */
exports.getTokenStats = async () => {
  try {
    // Get settings
    const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
    const swapFee = await Settings.getValue('swap_fee', config.xeenux.defaultSwapFee);
    const burnRate = await Settings.getValue('burn_rate', config.xeenux.defaultBurnRate);
    const totalBurned = await Settings.getValue('total_burned', 0);
    
    return {
      price: xeenuxPrice,
      swapFee,
      burnRate,
      totalBurned
    };
  } catch (error) {
    logger.error('Error getting token stats:', error);
    throw error;
  }
};

/**
 * Update token price
 * @param {Number} newPrice - New token price
 * @returns {Promise<Object>} - Updated token details
 */
exports.updateTokenPrice = async (newPrice) => {
  try {
    if (newPrice <= 0) {
      throw new Error('Price must be greater than zero');
    }
    
    // Update price setting
    await Settings.setValue('xeenux_price', newPrice);
    
    return {
      newPrice,
      oldPrice: await Settings.getValue('xeenux_price', config.xeenux.defaultPrice)
    };
  } catch (error) {
    logger.error('Error updating token price:', error);
    throw error;
  }
};