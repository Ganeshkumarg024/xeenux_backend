const mongoose = require('mongoose');

const binaryTreeSchema = new mongoose.Schema(
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
    leftChildId: {
      type: Number,
      default: 0
    },
    rightChildId: {
      type: Number,
      default: 0
    },
    parentId: {
      type: Number,
      default: 0
    },
    position: {
      type: Number,
      enum: [0, 1], // 0 for left, 1 for right
      required: true
    },
    leftVolume: {
      type: Number,
      default: 0
    },
    rightVolume: {
      type: Number,
      default: 0
    },
    leftCarryForward: {
      type: Number,
      default: 0
    },
    rightCarryForward: {
      type: Number,
      default: 0
    },
    totalLeftCount: {
      type: Number,
      default: 0
    },
    totalRightCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create index on userId for faster lookups
binaryTreeSchema.index({ userId: 1 });

// Create indexes on leftChildId and rightChildId for faster tree traversal
binaryTreeSchema.index({ leftChildId: 1 });
binaryTreeSchema.index({ rightChildId: 1 });

// Create index on parentId for upward tree traversal
binaryTreeSchema.index({ parentId: 1 });

const BinaryTree = mongoose.model('BinaryTree', binaryTreeSchema);

module.exports = BinaryTree;