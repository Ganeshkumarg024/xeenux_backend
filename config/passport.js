// config/passport.js
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/User');
const config = require('./config');
const bcrypt = require('bcryptjs');

// JWT Strategy for token authentication - ensure this is properly registered
passport.use('jwt', new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.secret,
  },
  async (jwtPayload, done) => {
    try {
      // Find the user by ID from JWT payload
      const user = await User.findById(jwtPayload.id).select('-password');
      
      // If user doesn't exist or is not active
      if (!user || !user.isActive) {
        return done(null, false);
      }
      
      // Return the user if found
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
));

// Local Strategy for username/password authentication  
passport.use('local', new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email });
      
      // If user doesn't exist or is not active
      if (!user || !user.isActive) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      
      // Check if the password is correct
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      
      // Return the user if authentication is successful
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

module.exports = passport;