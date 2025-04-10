// Update/create in services/tokenService.js
const Settings = require('../models/Settings');
const config = require('../config/config');

/**
 * Convert USD amount to Xeenux tokens
 * @param {Number} usdAmount - Amount in USD
 * @returns {Promise<Number>} - Amount in Xeenux tokens
 */
exports.usdToXeenux = async (usdAmount) => {
  try {
    // Get current Xeenux token price
    const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
    
    // Convert USD to Xeenux - make sure to handle division by zero
    const xeenuxAmount = xeenuxPrice > 0 ? (usdAmount / xeenuxPrice) : 0;
    
    return xeenuxAmount;
  } catch (error) {
    console.error('Error converting USD to Xeenux:', error);
    // Fallback calculation using default price
    return usdAmount / config.xeenux.defaultPrice;
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
    console.error('Error converting Xeenux to USD:', error);
    // Fallback calculation using default price
    return xeenuxAmount * config.xeenux.defaultPrice;
  }
};