const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Comprehensive password debug route
router.post('/password-verify', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email, select password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('=== COMPREHENSIVE PASSWORD DEBUG ===');
    console.log('Email:', email);
    console.log('Candidate Password:', password);
    console.log('Stored Password Hash:', user.password);

    // Direct BCrypt comparison
    const bcryptCompareResult = await bcrypt.compare(password, user.password);
    console.log('BCrypt Compare Result:', bcryptCompareResult);

    // Try multiple hashing scenarios
    console.log('\n--- Multiple Verification Attempts ---');
    
    // Attempt 1: Direct comparison
    console.log('Attempt 1 - Direct Compare:');
    const attempt1 = await bcrypt.compare(password, user.password);
    console.log('Result:', attempt1);

    // Attempt 2: Verify original registration process
    console.log('\nAttempt 2 - Simulate Original Registration:');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Newly Hashed Password:', hashedPassword);
    console.log('Matches Stored Hash:', hashedPassword === user.password);
    const attempt2 = await bcrypt.compare(password, hashedPassword);
    console.log('Compare Newly Hashed Result:', attempt2);

    // Attempt 3: Detailed hash comparison
    console.log('\nAttempt 3 - Detailed Hash Analysis:');
    console.log('Stored Hash Length:', user.password.length);
    console.log('Candidate Password Length:', password.length);
    
    // Extract salt from stored hash
    const storedSalt = user.password.slice(0, 29);
    console.log('Extracted Salt:', storedSalt);

    // Manually hash with extracted salt
    const manualHash = await bcrypt.hash(password, storedSalt);
    console.log('Manually Hashed with Stored Salt:', manualHash);
    console.log('Matches Stored Hash:', manualHash === user.password);
    const attempt3 = await bcrypt.compare(password, manualHash);
    console.log('Manual Hash Compare Result:', attempt3);

    res.status(200).json({
      status: 'success',
      data: {
        bcryptCompareResult,
        attempt1,
        attempt2,
        attempt3,
        storedHashLength: user.password.length,
        candidatePasswordLength: password.length
      }
    });
  } catch (error) {
    console.error('Comprehensive Password Verification Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during comprehensive password verification'
    });
  }
});

module.exports = router;