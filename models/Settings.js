const mongoose = require('mongoose');
const config = require('../config/config');

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required']
    },
    group: {
      type: String,
      enum: ['general', 'token', 'income', 'fees', 'rewards', 'autopool'],
      default: 'general'
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on key and group
settingsSchema.index({ key: 1, group: 1 });

// Static method to get setting value
settingsSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key, isActive: true });
  return setting ? setting.value : defaultValue;
};

// Static method to set setting value
settingsSchema.statics.setValue = async function(key, value, group = 'general', description = '', userId = null) {
  const update = {
    value,
    group,
    description,
    isActive: true,
    updatedBy: userId
  };
  
  return await this.findOneAndUpdate(
    { key },
    update,
    { upsert: true, new: true, runValidators: true }
  );
};

// Static method to get all settings in a group
settingsSchema.statics.getGroupSettings = async function(group) {
  return await this.find({ group, isActive: true });
};

// Static method to initialize default settings
settingsSchema.statics.initializeDefaultSettings = async function() {
  const defaultSettings = [
    // Token settings
    { key: 'xeenux_price', value: config.xeenux.defaultPrice, group: 'token', description: 'Default price of Xeenux token in USD' },
    { key: 'swap_fee', value: config.xeenux.defaultSwapFee, group: 'token', description: 'Default swap fee percentage' },
    { key: 'burn_rate', value: config.xeenux.defaultBurnRate, group: 'token', description: 'Default burn rate percentage' },
    
    // Income settings
    { key: 'daily_roi_rate', value: config.xeenux.dailyRoiRate, group: 'income', description: 'Daily ROI rate (divide by 1000)' },
    { key: 'max_roi_days', value: config.xeenux.maxRoiDays, group: 'income', description: 'Maximum ROI period in days' },
    { key: 'binary_fee', value: config.xeenux.binaryFee, group: 'income', description: 'Binary matching percentage' },
    { key: 'level_income_fees', value: config.xeenux.levelIncomeFees, group: 'income', description: 'Level income percentages' },
    
    // Autopool settings
    { key: 'autopool_max_members', value: config.xeenux.autopoolMaxMembers, group: 'autopool', description: 'Maximum members at each autopool level' },
    { key: 'autopool_fees', value: config.xeenux.autopoolFees, group: 'autopool', description: 'Autopool fees for each level' },
    
    // General settings
    { key: 'default_referral_id', value: config.xeenux.defaultReferralId, group: 'general', description: 'Default referral ID' },
    { key: 'withdrawal_fee', value: 10, group: 'fees', description: 'Withdrawal fee percentage' },
    { key: 'min_withdrawal', value: 10, group: 'fees', description: 'Minimum withdrawal amount in Xeenux tokens' },
    { key: 'income_distribution_interval', value: config.xeenux.allIncomeDistTime, group: 'general', description: 'Income distribution interval in milliseconds' },
    { key: 'weekly_reward_interval', value: config.xeenux.weeklyRewardDistTime, group: 'general', description: 'Weekly reward distribution interval in milliseconds' },
    
    // Package settings
    { key: 'packages', value: config.xeenux.packages, group: 'general', description: 'Package prices in USD' }
  ];
  
  // Insert all settings
  const operations = defaultSettings.map(setting => ({
    updateOne: {
      filter: { key: setting.key },
      update: { $setOnInsert: setting },
      upsert: true
    }
  }));
  
  return await this.bulkWrite(operations);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;