const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Connection
 */
exports.dbConnection = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 6+ doesn't need these options anymore, they're now default
      // But keeping for clarity and compatibility with older versions
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 100
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Set up database event listeners
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Close MongoDB Connection
 */
exports.closeConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
};