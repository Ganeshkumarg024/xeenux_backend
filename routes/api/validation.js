/**
 * Apply validation middleware to routes
 */
const { validate } = require('../../middlewares/validation');
const validationSchemas = require('../../middlewares/validation');

/**
 * Apply validation to auth routes
 * @param {Object} router - Express router
 */
exports.applyAuthValidation = (router) => {
  // Register
  router.post('/register', validate(validationSchemas.registerSchema));
  
  // Login
  router.post('/login', validate(validationSchemas.loginSchema));
  
  // Forgot password
  router.post('/forgot-password', validate(validationSchemas.forgotPasswordSchema));
  
  // Reset password
  router.post('/reset-password/:token', validate(validationSchemas.resetPasswordSchema));
  
  // Update password
  router.patch('/update-password', validate(validationSchemas.updatePasswordSchema));
};

/**
 * Apply validation to user routes
 * @param {Object} router - Express router
 */
exports.applyUserValidation = (router) => {
  // Update user profile
  router.patch('/me', validate(validationSchemas.updateUserSchema));
};

/**
 * Apply validation to package routes
 * @param {Object} router - Express router
 */
exports.applyPackageValidation = (router) => {
  // Purchase package
  router.post('/purchase', validate(validationSchemas.purchasePackageSchema));
  
  // Create package (admin)
  router.post('/', validate(validationSchemas.createPackageSchema));
  
  // Update package (admin)
  router.patch('/:packageIndex', validate(validationSchemas.updatePackageSchema));
};

/**
 * Apply validation to income routes
 * @param {Object} router - Express router
 */
exports.applyIncomeValidation = (router) => {
  // Withdraw income
  router.post('/withdraw', validate(validationSchemas.withdrawalSchema));
};

/**
 * Apply validation to transaction routes
 * @param {Object} router - Express router
 */
exports.applyTransactionValidation = (router) => {
  // Deposit tokens
  router.post('/deposit', validate(validationSchemas.depositSchema));
  
  // Request withdrawal
  router.post('/withdraw', validate(validationSchemas.withdrawalSchema));
  
  // Swap tokens
  router.post('/swap', validate(validationSchemas.swapSchema));
  
  // Process withdrawal (admin)
  router.post('/process-withdrawal', validate(validationSchemas.processWithdrawalSchema));
};

/**
 * Apply validation to admin routes
 * @param {Object} router - Express router
 */
exports.applyAdminValidation = (router) => {
  // Update settings
  router.patch('/settings', validate(validationSchemas.updateSettingsSchema));
  
  // Add user balance
  router.post('/users/balance', validate(validationSchemas.addUserBalanceSchema));
  
  // Update user rank
  router.patch('/users/rank', validate(validationSchemas.updateUserRankSchema));
  
  // Process scheduled tasks
  router.post('/scheduler', validate(validationSchemas.scheduledTaskSchema));
  
  // Generate reports
  router.post('/reports', validate(validationSchemas.reportSchema));
};