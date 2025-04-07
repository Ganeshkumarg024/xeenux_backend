/**
 * Export middleware for easy importing
 */

// Authentication middleware
const { 
    authenticateJWT, 
    authenticateLocal, 
    restrictTo, 
    isAdmin, 
    isOwner 
  } = require('./auth');
  
  // Error handling middleware
  const { 
    errorHandler, 
    AppError, 
    catchAsync 
  } = require('./errorHandler');
  
  // Rate limiting middleware
  const { 
    apiLimiter, 
    loginLimiter 
  } = require('./rateLimiter');
  
  // Validation middleware
  const { 
    validate,
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updatePasswordSchema,
    updateUserSchema,
    purchasePackageSchema,
    depositSchema,
    withdrawalSchema,
    swapSchema,
    createPackageSchema,
    updatePackageSchema,
    updateSettingsSchema,
    processWithdrawalSchema,
    addUserBalanceSchema,
    updateUserRankSchema,
    scheduledTaskSchema,
    reportSchema
  } = require('./validation');
  
  // Export all middleware
  module.exports = {
    // Authentication
    authenticateJWT,
    authenticateLocal,
    restrictTo,
    isAdmin,
    isOwner,
    
    // Error handling
    errorHandler,
    AppError,
    catchAsync,
    
    // Rate limiting
    apiLimiter,
    loginLimiter,
    
    // Validation
    validate,
    schemas: {
      registerSchema,
      loginSchema,
      forgotPasswordSchema,
      resetPasswordSchema,
      updatePasswordSchema,
      updateUserSchema,
      purchasePackageSchema,
      depositSchema,
      withdrawalSchema,
      swapSchema,
      createPackageSchema,
      updatePackageSchema,
      updateSettingsSchema,
      processWithdrawalSchema,
      addUserBalanceSchema,
      updateUserRankSchema,
      scheduledTaskSchema,
      reportSchema
    }
  };