const mongoose = require('mongoose');

const userPackageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    userId: {
      type: Number,
      required: [true, 'User ID is required']
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package is required']
    },
    packageIndex: {
      type: Number,
      required: [true, 'Package index is required']
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required']
    },
    xeenuxAmount: {
      type: Number,
      required: [true, 'Xeenux token amount is required']
    },
    ceilingLimit: {
      type: Number,
      required: [true, 'Ceiling limit is required']
    },
    earned: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    completedDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on userId and packageIndex for faster lookups
userPackageSchema.index({ userId: 1, packageIndex: 1 });

// Create index on isActive for faster queries on active packages
userPackageSchema.index({ isActive: 1 });

// Virtual field for calculating progress percentage
userPackageSchema.virtual('progressPercentage').get(function() {
  return (this.earned / this.ceilingLimit) * 100;
});

// Method to check if package has reached its ceiling limit
userPackageSchema.methods.isCompleted = function() {
  return this.earned >= this.ceilingLimit;
};

const UserPackage = mongoose.model('UserPackage', userPackageSchema);

module.exports = UserPackage;