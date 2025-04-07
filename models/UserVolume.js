const mongoose = require('mongoose');

const userVolumeSchema = new mongoose.Schema(
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
    selfVolume: {
      type: Number,
      default: 0
    },
    directVolume: {
      type: Number,
      default: 0
    },
    leftVolume: {
      type: Number,
      default: 0
    },
    rightVolume: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create index on userId for faster lookups
userVolumeSchema.index({ userId: 1 });

// Pre-save middleware to calculate total volume
userVolumeSchema.pre('save', function(next) {
  this.totalVolume = this.selfVolume + this.directVolume + this.leftVolume + this.rightVolume;
  this.lastUpdated = Date.now();
  next();
});

const UserVolume = mongoose.model('UserVolume', userVolumeSchema);

module.exports = UserVolume;