const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const BinaryNetwork = require('../models/BinaryNetwork');
const UserVolume = require('../models/UserVolume');
const TeamStructure = require('../models/TeamStructure');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const config = require('../config/config');
const Settings = require('../models/Settings');
const emailService = require('../services/emailService');
const security = require('../utils/security');

/**
 * Generate JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Create and send JWT token
 */
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  
  // Create refresh token
  const refreshToken = jwt.sign({ id: user._id }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  });
};

/**
 * Generate a unique userId
 * @returns {Promise<number>} Unique user ID
 */
const generateUniqueUserId = async () => {
  while (true) {
    // Generate a random 6-digit number
    const userId = Math.floor(100000 + Math.random() * 900000);
    
    // Check if this userId already exists
    const existingUser = await User.findOne({ userId });
    
    // If no user found with this ID, return it
    if (!existingUser) {
      return userId;
    }
    // If userId exists, the loop will continue and generate a new one
  }
};

/**
 * Register a new user
 */
exports.register = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    password,
    walletAddress,
    referrerId,
    position
  } = req.body;
  console.log("auth")

  // Validate input
  if (!name || !email || !phone || !password || !walletAddress) {
    return next(new AppError('Please provide all required fields', 400));
  }
  
  // Validate data length constraints
  if (name.length > 30) {
    return next(new AppError('Name cannot be more than 30 characters', 400));
  }
  if (email.length > 50) {
    return next(new AppError('Email cannot be more than 50 characters', 400));
  }
  if (phone.length > 15) {
    return next(new AppError('Phone number cannot be more than 15 characters', 400));
  }
  
  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }
  
  // Get default referral ID if not provided
  let refId = referrerId;
  if (!refId) {
    refId = await Settings.getValue('default_referral_id', config.xeenux.defaultReferralId);
  }
  
  // Verify that referrer exists
  const referrer = await User.findOne({ userId: refId });
  if (!referrer && refId !== config.xeenux.defaultReferralId) {
    return next(new AppError('Invalid referrer ID', 400));
  }
  const userId = await generateUniqueUserId();
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Create user
  const newUser = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    walletAddress,
    userId,
    referrerId: refId,
    position: position || 0,
    registeredAt: Date.now(),
    lastROIDistributed: Date.now(),
    lastBinaryDistributed: Date.now(),
    lastRewardDistributed: Date.now()
  });
  
  // Create binary network entry
  await BinaryNetwork.create({
    userId: newUser.userId,
    user: newUser._id,
    position: newUser.position,
    parentId: refId
  });
  
  // Create user volume entry
  await UserVolume.create({
    userId: newUser.userId,
    user: newUser._id
  });
  
  // Create team structure entry
  await TeamStructure.create({
    userId: newUser.userId,
    user: newUser._id
  });
  
  // Update referrer's direct referral count
  if (referrer) {
    referrer.refCount += 1;
    await referrer.save();
    
    // Add new user to referrer's team structure
    const referrerTeamStructure = await TeamStructure.findOne({ userId: referrer.userId });
    if (referrerTeamStructure) {
      referrerTeamStructure.addTeamMember(newUser.userId, 1);
      referrerTeamStructure.directTeam += 1;
      referrerTeamStructure.totalTeam += 1;
      await referrerTeamStructure.save();
    }
    
    // Update binary tree placement
    if (position !== undefined) {
      // Find placement position in binary tree
      const placementNode = await BinaryNetwork.findExtremePlacement(refId, position);
      
      if (placementNode) {
        // Update placement node with the new child
        if (position === 0) {
          placementNode.leftChildId = newUser.userId;
        } else {
          placementNode.rightChildId = newUser.userId;
        }
        
        await placementNode.save();
      }
    }
  }
  
  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(newUser);
  } catch (error) {
    // Log error but continue
    console.error('Failed to send welcome email:', error);
  }
  
  // Create and send token
  createSendToken(newUser, 201, req, res);
});

/**
 * Login user
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  console.log("login")
  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  
  // Find user by email
  const user = await User.findOne({ email }).select('+password');
  console.log(user)
  
  // Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact admin.', 401));
  }
  
  // Create and send token
  createSendToken(user, 200, req, res);
});


/**
 * Refresh token
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return next(new AppError('No refresh token provided', 400));
  }
  
  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.secret);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
  
  // Find user
  const user = await User.findById(decoded.id);
  
  // Check if user exists
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists', 401));
  }
  
  // Check if user changed password after token was issued
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please log in again', 401));
  }
  
  // Create and send new token
  createSendToken(user, 200, req, res);
});

/**
 * Forgot password
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  
  // Generate random reset token
  const resetToken = user.createPasswordResetToken();
  
  console.log("Hashed Token________________________________:", resetToken);
  await user.save({ validateBeforeSave: false });
  
  // Create password reset URL
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  try {
    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetToken, resetURL);
    
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    // If email sending fails, clear the reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

/**
 * Reset password
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Decode and sanitize token (if necessary)
  const decodedToken = req.params.token.trim(); // trim spaces
  
  // Find user by token and expiration
  const user = await User.findOne({
    passwordResetToken: decodedToken,
    passwordResetExpires: { $gt: Date.now() }, // Ensure token hasn't expired
  });

  // Debugging: Print token and expiration values
  console.log('Request Token:', decodedToken);
  console.log('Database Token:', user ? user.passwordResetToken : 'No user found');
  console.log('Password Reset Expires:', user ? user.passwordResetExpires : 'No user found');

  // If user is not found or token is expired
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Proceed with resetting the password
  user.password = await bcrypt.hash(req.body.password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now() - 1000; // Ensure token is created after password change
  await user.save();

  // Send token and log in the user
  createSendToken(user, 200, req, res);
});


/**
 * Update password
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user._id).select('+password');
  
  // Check if current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }
  
  // Update password
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after password change
  await user.save();
  
  // Log user in, send JWT
  createSendToken(user, 200, req, res);
});

/**
 * Verify email (used for email verification after registration)
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  // Hash token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with the token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
  
  // If no user found or token expired
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  
  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  
  // Return success response
  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

/**
 * Generate email verification token (used for resending verification email)
 */
exports.generateEmailVerificationToken = catchAsync(async (req, res, next) => {
  // Get user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if already verified
  if (user.isEmailVerified) {
    return next(new AppError('Email already verified', 400));
  }
  
  // Generate token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Save hashed token to user
  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save({ validateBeforeSave: false });
  
  // Create verification URL
  const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  try {
    // TODO: Send verification email
    // await emailService.sendEmailVerification(user, verificationURL);
    
    res.status(200).json({
      status: 'success',
      message: 'Verification email sent'
    });
  } catch (err) {
    // If email sending fails, clear the verification token
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

/**
 * Check if user is authenticated (useful for frontend to verify token)
 */
exports.isAuthenticated = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

/**
 * Logout (client-side only, just for completion)
 */
exports.logout = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

/**
 * Change email
 */
exports.changeEmail = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  
  // Get user
  const user = await User.findById(req.user._id).select('+password');
  
  // Check if password is correct
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Your password is incorrect', 401));
  }
  
  // Check if email is already in use
  const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }
  
  // Update email
  user.email = email;
  user.isEmailVerified = false;
  await user.save();
  
  // Generate verification token and send email
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Save hashed token to user
  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save({ validateBeforeSave: false });
  
  // Create verification URL
  const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  try {
    // TODO: Send verification email
    // await emailService.sendEmailVerification(user, verificationURL);
  } catch (err) {
    // Log error but continue
    console.error('Failed to send verification email:', err);
  }
  
  // Return success
  res.status(200).json({
    status: 'success',
    message: 'Email updated successfully'
  });
});

/**
 * Send 2FA code (for future implementation)
 */
exports.send2FACode = catchAsync(async (req, res, next) => {
  // Get user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save code to user
  user.twoFactorCode = code;
  user.twoFactorExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });
  
  try {
    // TODO: Send 2FA code via email or SMS
    // await emailService.send2FACode(user, code);
    
    res.status(200).json({
      status: 'success',
      message: '2FA code sent'
    });
  } catch (err) {
    // If sending fails, clear the code
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('There was an error sending the 2FA code. Try again later!', 500));
  }
});

/**
 * Verify 2FA code (for future implementation)
 */
exports.verify2FACode = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  
  // Get user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if code exists and is valid
  if (!user.twoFactorCode || user.twoFactorExpires < Date.now()) {
    return next(new AppError('Code is invalid or has expired', 400));
  }
  
  // Check if code matches
  if (user.twoFactorCode !== code) {
    return next(new AppError('Incorrect code', 400));
  }
  
  // Clear code
  user.twoFactorCode = undefined;
  user.twoFactorExpires = undefined;
  user.isTwoFactorVerified = true;
  await user.save({ validateBeforeSave: false });
  
  // Return success
  res.status(200).json({
    status: 'success',
    message: '2FA verified successfully'
  });
});