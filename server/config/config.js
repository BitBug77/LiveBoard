require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name',
  jwtSecret: process.env.JWT_SECRET || 'your-default-jwt-secret',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Email configuration
  email: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'LiveBoard <noreply@yourapp.com>'
  }
};

module.exports = config;