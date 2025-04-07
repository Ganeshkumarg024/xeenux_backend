const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'purchase', 'transfer', 'fee', 'reward', 'admin'],
      required: [true, 'Transaction type is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    amountUSD: {
      type: Number,
      required: [true, 'USD amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    description: {
      type: String,
      trim: true
    },
    reference: {
      type: String,
      trim: true
    },
    externalReference: {
      type: String,
      trim: true
    },
    walletAddress: {
      type: String,
      trim: true
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      // Additional metadata specific to transaction type
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on userId and type for faster filtered lookups
transactionSchema.index({ userId: 1, type: 1 });

// Create index on status for efficient status-based queries
transactionSchema.index({ status: 1 });

// Create index on createdAt for efficient time-based queries
transactionSchema.index({ createdAt: -1 });

// Static method to get transactions for a user with pagination
transactionSchema.statics.getUserTransactions = async function(userId, type = null, status = null, page = 1, limit = 10) {
  const query = { userId };
  
  // Filter by type if provided
  if (type !== null && type !== undefined) {
    query.type = type;
  }
  
  // Filter by status if provided
  if (status !== null && status !== undefined) {
    query.status = status;
  }
  
  const total = await this.countDocuments(query);
  const transactions = await this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Static method to get total deposit/withdrawal
transactionSchema.statics.getTotalByType = async function(userId, type) {
  const result = await this.aggregate([
    { $match: { userId, type, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;