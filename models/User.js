const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/config');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [30, 'Name cannot be more than 30 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [50, 'Email cannot be more than 50 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Please provide your phone number'],
      trim: true,
      maxlength: [15, 'Phone number cannot be more than 15 characters']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    walletAddress: {
      type: String,
      required: [true, 'Please provide your wallet address'],
      trim: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    userId: {
      type: Number,
      unique: true,
      required: true
    },
    referrerId: {
      type: Number,
      required: true
    },
    position: {
      type: Number,
      enum: [0, 1], // 0 for left, 1 for right
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    refCount: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      enum: [0, 1, 2, 3, 4], // None, Silver, Gold, Platinum, Diamond
      default: 0
    },
    lastRankSaved: {
      type: Number,
      default: 0
    },
    roiIncome: {
      type: Number,
      default: 0
    },
    levelIncome: {
      type: Number,
      default: 0
    },
    autopoolIncome: {
      type: Number,
      default: 0
    },
    rewardIncome: {
      type: Number,
      default: 0
    },
    binaryIncome: {
      type: Number,
      default: 0
    },
    lastROIDistributed: {
      type: Date,
      default: Date.now
    },
    lastBinaryDistributed: {
      type: Date,
      default: Date.now
    },
    lastRewardDistributed: {
      type: Date,
      default: Date.now
    },
    totalWithdraw: {
      type: Number,
      default: 0
    },
    purchaseWallet: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for calculating total income
userSchema.virtual('totalIncome').get(function() {
  return this.roiIncome + this.levelIncome + this.autopoolIncome + this.rewardIncome + this.binaryIncome;
});

// Hash the password before saving
userSchema.pre('save', async function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return next();
  console.log("password",this.password)
 

  // Update password changed timestamp if not new user
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // -1s to ensure token is created after password change
  }

  next();
});

// Generate userId if it's a new user
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.userId) {
    const totalUsers = await mongoose.model('User').countDocuments();
    this.userId = config.xeenux.defaultReferralId + ((totalUsers + 1) * 7);
  }
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  // Trim any extra spaces from the candidate password
  candidatePassword = candidatePassword.trim();
  const match = await bcrypt.compare(candidatePassword, userPassword);

  // Log the result of the password comparison
  console.log('Password match result:', match);

  return match;
};



// Method to check if password was changed after a JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = resetToken;

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;