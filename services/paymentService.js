const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const config = require('../config/config');

/**
 * Generate payment gateway URL
 * @param {Object} transaction - Transaction object
 * @param {Object} user - User object
 * @returns {Object} - Payment gateway URL and parameters
 */
exports.generatePaymentUrl = async (transaction, user) => {
  try {
    // Get payment gateway config
    const apiKey = config.paymentGateway.apiKey;
    const secretKey = config.paymentGateway.secretKey;
    const baseUrl = config.paymentGateway.baseUrl;
    
    // Generate payment parameters
    const params = {
      merchant_id: apiKey,
      order_id: transaction._id.toString(),
      amount: transaction.amountUSD.toFixed(2),
      currency: 'USD',
      description: transaction.description,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: `${process.env.API_URL}/api/transactions/confirm-deposit`,
      customer_email: user.email,
      customer_name: user.name
    };
    
    // Generate signature
    const payload = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
    
    params.signature = signature;
    
    // In a real implementation, you would make an API call to the payment gateway
    // For demo purposes, we'll return a mock URL
    return {
      url: `${baseUrl}/checkout`,
      params
    };
  } catch (error) {
    logger.error('Error generating payment URL:', error);
    throw error;
  }
};

/**
 * Verify payment gateway callback
 * @param {Object} params - Callback parameters
 * @returns {Boolean} - Verification result
 */
exports.verifyCallback = (params) => {
  try {
    const { signature, ...rest } = params;
    const secretKey = config.paymentGateway.secretKey;
    
    // Regenerate signature
    const payload = Object.keys(rest)
      .sort()
      .map(key => `${key}=${rest[key]}`)
      .join('&');
    
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    logger.error('Error verifying payment callback:', error);
    return false;
  }
};

/**
 * Process payment callback
 * @param {Object} params - Callback parameters
 * @returns {Object} - Processing result
 */
exports.processCallback = async (params) => {
  try {
    // Verify signature
    const isValid = this.verifyCallback(params);
    
    if (!isValid) {
      throw new Error('Invalid payment callback signature');
    }
    
    // Find transaction
    const transaction = await Transaction.findById(params.order_id);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Update transaction status
    transaction.status = params.status === 'COMPLETED' ? 'completed' : 'failed';
    transaction.externalReference = params.transaction_id;
    
    // Add additional details
    transaction.meta = {
      ...transaction.meta,
      gatewayResponse: params
    };
    
    await transaction.save();
    
    return {
      status: 'success',
      transaction
    };
  } catch (error) {
    logger.error('Error processing payment callback:', error);
    throw error;
  }
};

/**
 * Initiate withdrawal to user's wallet
 * @param {Object} transaction - Withdrawal transaction
 * @returns {Object} - Withdrawal result
 */
exports.initiateWithdrawal = async (transaction) => {
  try {
    // Get payment gateway config
    const apiKey = config.paymentGateway.apiKey;
    const secretKey = config.paymentGateway.secretKey;
    const baseUrl = config.paymentGateway.baseUrl;
    
    // In a real implementation, you would make an API call to the payment gateway
    // For demo purposes, we'll simulate a successful withdrawal
    
    // Update transaction status
    transaction.status = 'completed';
    transaction.externalReference = `W${Date.now()}`;
    await transaction.save();
    
    return {
      status: 'success',
      transaction
    };
  } catch (error) {
    logger.error('Error initiating withdrawal:', error);
    throw error;
  }
};

/**
 * Check balance with payment gateway
 * @returns {Object} - Balance information
 */
exports.checkBalance = async () => {
  try {
    // Get payment gateway config
    const apiKey = config.paymentGateway.apiKey;
    const secretKey = config.paymentGateway.secretKey;
    const baseUrl = config.paymentGateway.baseUrl;
    
    // In a real implementation, you would make an API call to the payment gateway
    // For demo purposes, we'll return mock data
    
    return {
      status: 'success',
      balance: {
        available: 10000,
        pending: 500,
        currency: 'USD'
      }
    };
  } catch (error) {
    logger.error('Error checking payment gateway balance:', error);
    throw error;
  }
};