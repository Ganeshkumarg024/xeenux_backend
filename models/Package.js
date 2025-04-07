const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true
    },
    priceUSD: {
      type: Number,
      required: [true, 'Package price in USD is required'],
      min: [0, 'Price cannot be negative']
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    packageIndex: {
      type: Number,
      required: [true, 'Package index is required'],
      unique: true
    },
    maxROIMultiplier: {
      type: Number,
      default: 4, // 4x ROI ceiling
      min: [1, 'ROI multiplier must be at least 1']
    },
    features: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Create index on packageIndex for faster lookups
packageSchema.index({ packageIndex: 1 });

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;