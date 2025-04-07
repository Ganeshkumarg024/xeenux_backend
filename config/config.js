require('dotenv').config();

const config = {
  // Server configuration
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // JWT config
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // MongoDB config
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/xeenux',
  },
  
  // Email config
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@xeenux.com',
  },
  
  // Payment gateway configuration (Way2Pay)
  paymentGateway: {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY,
    secretKey: process.env.PAYMENT_GATEWAY_SECRET_KEY,
    baseUrl: process.env.PAYMENT_GATEWAY_BASE_URL,
  },
  
  // Xeenux token specific configurations
  xeenux: {
    defaultPrice: 0.00011, // Default price of Xeenux token in USD
    defaultSwapFee: 1, // Default swap fee percentage
    defaultBurnRate: 100, // Default burn rate percentage
    defaultReferralId: 103115, // Default referral ID
    
    // Income distribution settings
    dailyRoiRate: 5, // 0.5% (5/1000)
    maxRoiDays: 400, // Maximum ROI period in days
    binaryFee: 10, // 10% binary matching
    
    // Level income percentages
    levelIncomeFees: [5, 1, 1, 1, 1, 1, 5], // Percentages for each level
    
    // Autopool settings
    autopoolMaxMembers: [
      4, 16, 64, 256, 1024, 4096, 16384, 65536, 
      262144, 1048576, 4194304, 16777216
    ],
    
    autopoolFees: [
      0.05, 0.05, 0.075, 0.0375, 0.01875, 0.01875, 
      0.00625, 0.00625, 0.00625, 0.00625, 0.00625, 0.0125
    ],
    
    // Package prices in USD
    packages: [2.5, 5, 10, 25, 50, 100, 250, 500, 1000],
    
    // Distribution times
    allIncomeDistTime: process.env.NODE_ENV === 'development' ? 60000 : 86400000, // 1 min in dev, 24h in prod
    weeklyRewardDistTime: process.env.NODE_ENV === 'development' ? 600000 : 604800000, // 10 min in dev, 7d in prod
  },
};

module.exports = config;