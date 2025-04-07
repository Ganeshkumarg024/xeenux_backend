const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Middleware for validating request data
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} - Express middleware
 */
exports.validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    const { error } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }
    
    next();
  };
};

/**
 * Validation schema for user registration
 */
exports.registerSchema = Joi.object({
  name: Joi.string().max(30).required(),
  email: Joi.string().email().max(50).required(),
  phone: Joi.string().max(15).required(),
  password: Joi.string().min(8).required(),
  walletAddress: Joi.string().required(),
  referrerId: Joi.number(),
  position: Joi.number().valid(0, 1)
});

/**
 * Validation schema for user login
 */
exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Validation schema for password reset request
 */
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

/**
 * Validation schema for password reset
 */
exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required()
});

/**
 * Validation schema for password update
 */
exports.updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

/**
 * Validation schema for user profile update
 */
exports.updateUserSchema = Joi.object({
  name: Joi.string().max(30),
  email: Joi.string().email().max(50),
  phone: Joi.string().max(15),
  walletAddress: Joi.string()
});

/**
 * Validation schema for package purchase
 */
exports.purchasePackageSchema = Joi.object({
  packageIndex: Joi.number().required(),
  position: Joi.number().valid(0, 1)
});

/**
 * Validation schema for deposit
 */
exports.depositSchema = Joi.object({
  amount: Joi.number().greater(0).required(),
  paymentMethod: Joi.string().required()
});

/**
 * Validation schema for withdrawal
 */
exports.withdrawalSchema = Joi.object({
  amount: Joi.number().greater(0).required(),
  walletAddress: Joi.string()
});

/**
 * Validation schema for swap
 */
exports.swapSchema = Joi.object({
  amount: Joi.number().greater(0).required(),
  direction: Joi.string().valid('xeenux_to_usdt', 'usdt_to_xeenux').required()
});

/**
 * Validation schema for creating a package
 */
exports.createPackageSchema = Joi.object({
  name: Joi.string().required(),
  priceUSD: Joi.number().greater(0).required(),
  description: Joi.string(),
  packageIndex: Joi.number().required(),
  maxROIMultiplier: Joi.number().min(1),
  features: Joi.array().items(Joi.string())
});

/**
 * Validation schema for updating a package
 */
exports.updatePackageSchema = Joi.object({
  name: Joi.string(),
  priceUSD: Joi.number().greater(0),
  description: Joi.string(),
  maxROIMultiplier: Joi.number().min(1),
  features: Joi.array().items(Joi.string()),
  isActive: Joi.boolean()
});

/**
 * Validation schema for updating settings
 */
exports.updateSettingsSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.required(),
  group: Joi.string(),
  description: Joi.string()
});

/**
 * Validation schema for processing withdrawal
 */
exports.processWithdrawalSchema = Joi.object({
  transactionId: Joi.string().required(),
  status: Joi.string().valid('completed', 'failed', 'cancelled').required(),
  remarks: Joi.string()
});

/**
 * Validation schema for adding user balance
 */
exports.addUserBalanceSchema = Joi.object({
  userId: Joi.number().required(),
  amount: Joi.number().greater(0).required(),
  type: Joi.string().valid('roi', 'level', 'binary', 'autopool', 'reward', 'admin'),
  description: Joi.string()
});

/**
 * Validation schema for updating user rank
 */
exports.updateUserRankSchema = Joi.object({
  userId: Joi.number().required(),
  rank: Joi.number().min(0).max(4).required()
});

/**
 * Validation schema for scheduled tasks
 */
exports.scheduledTaskSchema = Joi.object({
  task: Joi.string().valid('roi', 'binary', 'weekly').required()
});

/**
 * Validation schema for generating reports
 */
exports.reportSchema = Joi.object({
  type: Joi.string().valid('income', 'users', 'transactions').required(),
  startDate: Joi.date(),
  endDate: Joi.date()
});