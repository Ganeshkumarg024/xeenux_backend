const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
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
      enum: ['roi', 'level', 'binary', 'autopool', 'reward'],
      required: [true, 'Income type is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    sourceUserId: {
      type: Number,
      // ID of the user who generated this income (for level, binary, etc.)
    },
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserPackage'
    },
    level: {
      type: Number,
      // For level income or autopool level
    },
    description: {
      type: String,
      trim: true
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    isDistributed: {
      type: Boolean,
      default: false
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      // Additional metadata specific to income type
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on userId and type for faster filtered lookups
incomeSchema.index({ userId: 1, type: 1 });

// Create index on createdAt for efficient time-based queries
incomeSchema.index({ createdAt: -1 });

// Create compound index on isPaid and isDistributed for status-based queries
incomeSchema.index({ userId: 1, isPaid: 1, isDistributed: 1 });

// Static method to get total income by type
incomeSchema.statics.getTotalIncomeByType = async function(userId, type) {
  const result = await this.aggregate([
    { $match: { userId, type } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get total income across all types
incomeSchema.statics.getTotalIncome = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);
  
  const income = {
    roi: 0,
    level: 0,
    binary: 0,
    autopool: 0,
    reward: 0,
    total: 0
  };
  
  result.forEach(item => {
    income[item._id] = item.total;
    income.total += item.total;
  });
  
  return income;
};

// Static method to get pending income (not paid)
incomeSchema.statics.getPendingIncome = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId, isPaid: false } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);
  
  const pendingIncome = {
    roi: 0,
    level: 0,
    binary: 0,
    autopool: 0,
    reward: 0,
    total: 0
  };
  
  result.forEach(item => {
    pendingIncome[item._id] = item.total;
    pendingIncome.total += item.total;
  });
  
  return pendingIncome;
};

const Income = mongoose.model('Income', incomeSchema);

module.exports = Income;