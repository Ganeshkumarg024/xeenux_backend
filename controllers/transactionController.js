const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Activity = require('../models/Activity');
const Settings = require('../models/Settings');
const UserVolume = require('../models/UserVolume');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');

/**
 * Get user transactions
 */
exports.getMyTransactions = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const type = req.query.type;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Get transactions
  const result = await Transaction.getUserTransactions(userId, type, status, page, limit);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get transaction by ID
 */
exports.getTransaction = catchAsync(async (req, res, next) => {
  const transactionId = req.params.id;
  
  // Get transaction
  const transaction = await Transaction.findById(transactionId);
  
  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }
  
  // Check if user owns this transaction
  if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this transaction', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

/**
 * Deposit tokens (this would integrate with payment gateway)
 */
exports.depositTokens = catchAsync(async (req, res, next) => {
  const { amount, paymentMethod } = req.body;
  const userId = req.user.userId;
  
  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400));
  }
  
  // Get Xeenux price
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  
  // Calculate Xeenux tokens amount
  const xeenuxAmount = amount / xeenuxPrice;
  
  // Get user
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Create pending transaction
  const transaction = await Transaction.create({
    userId,
    user: user._id,
    type: 'deposit',
    amount: xeenuxAmount,
    amountUSD: amount,
    status: 'pending',
    description: `Deposit ${amount} USD (${xeenuxAmount} XEE)`,
    walletAddress: user.walletAddress,
    meta: {
      paymentMethod,
      xeenuxPrice
    }
  });
  
  // In a real implementation, this would redirect to the payment gateway
  // and the completion would be handled by a webhook
  
  // For demo purposes, we'll simulate a successful payment
  
  // Update transaction to completed
  transaction.status = 'completed';
  await transaction.save();
  
  // Create activity record
  await Activity.create({
    userId,
    user: user._id,
    amount: xeenuxAmount,
    type: 0, // Investment/Deposit
    description: `Deposited ${amount} USD (${xeenuxAmount} XEE)`,
    meta: {
      paymentMethod,
      xeenuxPrice
    }
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      transaction,
      // In a real implementation, this would include payment gateway URL
      paymentInfo: {
        gatewayUrl: 'https://payment.gateway.com/process',
        transactionId: transaction._id,
        amount,
        currency: 'USD'
      }
    }
  });
});

/**
 * Confirm deposit (webhook handler)
 */
exports.confirmDeposit = catchAsync(async (req, res, next) => {
  const { transactionId, status, gatewayReference } = req.body;
  
  if (!transactionId || !status) {
    return next(new AppError('Transaction ID and status are required', 400));
  }
  
  // Get transaction
  const transaction = await Transaction.findById(transactionId);
  
  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }
  
  if (transaction.status !== 'pending') {
    return next(new AppError('Transaction is not pending', 400));
  }
  
  // Update transaction status
  transaction.status = status === 'success' ? 'completed' : 'failed';
  transaction.externalReference = gatewayReference;
  await transaction.save();
  
  // If successful, create activity record
  if (status === 'success') {
    // Get user
    const user = await User.findOne({ userId: transaction.userId });
    
    if (user) {
      await Activity.create({
        userId: transaction.userId,
        user: user._id,
        amount: transaction.amount,
        type: 0, // Investment/Deposit
        description: `Deposit confirmed: ${transaction.description}`,
        meta: {
          transactionId: transaction._id,
          gatewayReference
        }
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

/**
 * Request withdrawal (this would initiate a withdrawal process)
 */
exports.requestWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, walletAddress } = req.body;
  const userId = req.user.userId;
  
  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400));
  }
  
  // Get minimum withdrawal amount
  const minWithdrawal = await Settings.getValue('min_withdrawal', 10);
  
  if (amount < minWithdrawal) {
    return next(new AppError(`Minimum withdrawal amount is ${minWithdrawal} Xeenux tokens`, 400));
  }
  
  // Get user
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if user has sufficient balance
  // In this case, we'll use the user's total income as available balance
  const totalIncome = user.roiIncome + user.levelIncome + user.autopoolIncome + 
                      user.rewardIncome + user.binaryIncome - user.totalWithdraw;
  
  if (totalIncome < amount) {
    return next(new AppError('Insufficient balance', 400));
  }
  
  // Get withdrawal fee percentage
  const withdrawalFee = await Settings.getValue('withdrawal_fee', 10);
  
  // Calculate fee and final amount
  const feeAmount = (amount * withdrawalFee) / 100;
  const finalAmount = amount - feeAmount;
  
  // Get Xeenux price for USD conversion
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  const amountUSD = amount * xeenuxPrice;
  
  // Create withdrawal transaction
  const transaction = await Transaction.create({
    userId,
    user: user._id,
    type: 'withdrawal',
    amount,
    amountUSD,
    fee: feeAmount,
    status: 'pending',
    description: `Withdrawal request for ${amount} XEE (${finalAmount} XEE after fee)`,
    walletAddress: walletAddress || user.walletAddress,
    meta: {
      finalAmount,
      feePercentage: withdrawalFee,
      xeenuxPrice
    }
  });
  
  // Create activity record
  await Activity.create({
    userId,
    user: user._id,
    amount,
    type: 6, // Withdrawal
    description: `Withdrawal request for ${amount} XEE (${finalAmount} XEE after fee)`,
    meta: {
      fee: feeAmount,
      finalAmount,
      xeenuxPrice
    }
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      transaction,
      fee: feeAmount,
      finalAmount,
      status: 'pending'
    }
  });
});

/**
 * Process withdrawal (admin only)
 */
exports.processWithdrawal = catchAsync(async (req, res, next) => {
  const { transactionId, status, remarks } = req.body;
  
  if (!transactionId || !status) {
    return next(new AppError('Transaction ID and status are required', 400));
  }
  
  // Get transaction
  const transaction = await Transaction.findById(transactionId);
  
  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }
  
  if (transaction.type !== 'withdrawal') {
    return next(new AppError('This is not a withdrawal transaction', 400));
  }
  
  if (transaction.status !== 'pending') {
    return next(new AppError('Transaction is not pending', 400));
  }
  
  // Get user
  const user = await User.findOne({ userId: transaction.userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Update transaction status
  transaction.status = status;
  if (remarks) {
    transaction.meta = { ...transaction.meta, remarks };
  }
  await transaction.save();
  
  // If approved, update user's total withdrawal
  if (status === 'completed') {
    user.totalWithdraw += transaction.amount;
    
    // Allocate half of the fee to user's purchase wallet
    if (transaction.fee > 0) {
      user.purchaseWallet += transaction.fee / 2;
    }
    
    await user.save();
    
    // Create activity record
    await Activity.create({
      userId: transaction.userId,
      user: user._id,
      amount: transaction.amount,
      type: 6, // Withdrawal
      description: `Withdrawal processed: ${transaction.amount} XEE`,
      meta: {
        status,
        fee: transaction.fee,
        adminId: req.user._id,
        adminName: req.user.name,
        remarks
      }
    });
  } else if (status === 'cancelled' || status === 'failed') {
    // Create activity record for cancelled withdrawal
    await Activity.create({
      userId: transaction.userId,
      user: user._id,
      amount: transaction.amount,
      type: 6, // Withdrawal
      description: `Withdrawal ${status}: ${transaction.amount} XEE`,
      meta: {
        status,
        adminId: req.user._id,
        adminName: req.user.name,
        remarks
      }
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

/**
 * Get transaction statistics
 */
exports.getTransactionStats = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  
  // Get total deposits
  const totalDeposits = await Transaction.getTotalByType(userId, 'deposit');
  
  // Get total withdrawals
  const totalWithdrawals = await Transaction.getTotalByType(userId, 'withdrawal');
  
  // Get total purchases
  const totalPurchases = await Transaction.getTotalByType(userId, 'purchase');
  
  // Get pending transactions
  const pendingDeposits = await Transaction.countDocuments({
    userId,
    type: 'deposit',
    status: 'pending'
  });
  
  const pendingWithdrawals = await Transaction.countDocuments({
    userId,
    type: 'withdrawal',
    status: 'pending'
  });
  
  // Get recent transactions
  const recentTransactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalDeposits,
        totalWithdrawals,
        totalPurchases,
        pendingDeposits,
        pendingWithdrawals,
        balance: totalDeposits - totalWithdrawals
      },
      recentTransactions
    }
  });
});

/**
 * Swap tokens (from Xeenux to USDT or vice versa)
 */
exports.swapTokens = catchAsync(async (req, res, next) => {
  const { amount, direction } = req.body;
  const userId = req.user.userId;
  
  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400));
  }
  
  if (!direction || !['xeenux_to_usdt', 'usdt_to_xeenux'].includes(direction)) {
    return next(new AppError('Invalid swap direction', 400));
  }
  
  // Get user
  const user = await User.findOne({ userId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Get swap settings
  const xeenuxPrice = await Settings.getValue('xeenux_price', config.xeenux.defaultPrice);
  const swapFee = await Settings.getValue('swap_fee', config.xeenux.defaultSwapFee);
  const burnRate = await Settings.getValue('burn_rate', config.xeenux.defaultBurnRate);
  
  // Calculate fee and amounts
  const feeAmount = (amount * swapFee) / 100;
  const amountAfterFee = amount - feeAmount;
  
  let xeenuxAmount, usdtAmount, burnAmount;
  let description;
  
  if (direction === 'xeenux_to_usdt') {
    xeenuxAmount = amount;
    usdtAmount = amountAfterFee * xeenuxPrice;
    burnAmount = (amount * burnRate) / 100;
    
    description = `Swap ${xeenuxAmount} XEE to ${usdtAmount} USDT`;
  } else { // usdt_to_xeenux
    usdtAmount = amount;
    xeenuxAmount = amountAfterFee / xeenuxPrice;
    burnAmount = (xeenuxAmount * burnRate) / 100;
    
    description = `Swap ${usdtAmount} USDT to ${xeenuxAmount} XEE`;
  }
  
  // Create transaction record
  const transaction = await Transaction.create({
    userId,
    user: user._id,
    type: 'transfer',
    amount: direction === 'xeenux_to_usdt' ? xeenuxAmount : usdtAmount,
    amountUSD: direction === 'xeenux_to_usdt' ? usdtAmount : amount,
    fee: feeAmount,
    status: 'completed',
    description,
    walletAddress: user.walletAddress,
    meta: {
      direction,
      xeenuxAmount,
      usdtAmount,
      xeenuxPrice,
      swapFee,
      burnRate,
      burnAmount
    }
  });
  
  // Create activity record
  await Activity.create({
    userId,
    user: user._id,
    amount: direction === 'xeenux_to_usdt' ? xeenuxAmount : usdtAmount,
    type: 0, // Investment/Transfer
    description,
    meta: {
      direction,
      xeenuxAmount,
      usdtAmount,
      fee: feeAmount,
      burnAmount
    }
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction,
      swapDetails: {
        direction,
        inputAmount: direction === 'xeenux_to_usdt' ? xeenuxAmount : usdtAmount,
        outputAmount: direction === 'xeenux_to_usdt' ? usdtAmount : xeenuxAmount,
        fee: feeAmount,
        burnAmount,
        xeenuxPrice
      }
    }
  });
});