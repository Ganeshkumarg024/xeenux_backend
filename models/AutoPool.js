const mongoose = require('mongoose');
const config = require('../config/config');

const autoPoolSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    // Position in the global autopool (1-based index)
    position: {
      type: Number,
      required: [true, 'Position is required'],
      unique: true
    },
    // Parent's position in the autopool (1-based index)
    parentPosition: {
      type: Number
    },
    // The autopool level (0-based index)
    level: {
      type: Number,
      required: [true, 'Level is required']
    },
    // Children positions in the autopool (1-based index)
    children: [Number],
    // Flag to determine if member is eligible for income
    isEligible: {
      type: Boolean,
      default: true
    },
    // Total income earned from autopool
    totalEarned: {
      type: Number,
      default: 0
    },
    // Timestamp of joining the autopool
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create index on position for faster lookups
autoPoolSchema.index({ position: 1 });

// Create index on level for efficient level-based queries
autoPoolSchema.index({ level: 1 });

// Create index on parentPosition for efficient parent-child relationship queries
autoPoolSchema.index({ parentPosition: 1 });

// Static method to find parent's position for a given position
autoPoolSchema.statics.findParentPosition = function(position) {
  if (position <= 1) return 0; // Root position has no parent
  
  // Find which level the position belongs to
  const level = this.findLevel(position);
  
  if (level === 0) return 0; // If level is 0, it's the root node
  
  // Find the previous level start position
  const prevLevelStart = this.getLevelStartPosition(level);
  
  // Find position in the current level
  const offset = position - prevLevelStart;
  
  // Find parent level start position
  const parentLevelStart = this.getLevelStartPosition(level - 1);
  
  // Calculate parent position
  const parentPosition = parentLevelStart + Math.floor(offset / 4);
  
  return parentPosition;
};

// Static method to find level for a given position
autoPoolSchema.statics.findLevel = function(position) {
  if (position <= 0) return -1;
  if (position === 1) return 0; // Root node is level 0
  
  let level = 0;
  let sum = 1; // Start with Root (position 1 at Level 0)
  
  while (sum < position) {
    level++;
    sum += Math.pow(4, level); // Add 4^level positions for each level
  }
  
  return level;
};