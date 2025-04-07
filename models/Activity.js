const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: [true, 'Amount is required']
    },
    type: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6], 
      // 0 - Investment/Purchase, 1 - Referral/Level Income, 2 - ROI, 
      // 3 - Autopool, 4 - Weekly Reward, 5 - Binary Income, 6 - Withdrawal
      required: [true, 'Activity type is required']
    },
    level: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      trim: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      // This can reference various entities based on activity type
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      // Additional metadata specific to activity type
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on userId and type for faster filtered lookups
activitySchema.index({ userId: 1, type: 1 });

// Create index on createdAt for efficient time-based queries
activitySchema.index({ createdAt: -1 });

// Static method to get activities for a user with pagination
activitySchema.statics.getUserActivities = async function(userId, type = null, page = 1, limit = 10) {
  const query = { userId };
  
  // Filter by type if provided
  if (type !== null && type !== undefined) {
    query.type = type;
  }
  
  const total = await this.countDocuments(query);
  const activities = await this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  return {
    activities,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;