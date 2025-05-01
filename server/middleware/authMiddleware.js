const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({ 
      message: 'Not authorized to access this route', 
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        message: 'Token is invalid or expired', 
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ 
        message: 'User not found', 
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      message: 'Not authorized to access this route', 
      error: error.message,
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to handle token expiration and automatic refresh
 */
exports.handleTokenExpiration = (err, req, res, next) => {
  // Check if error is due to token expiration
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Token expired', 
      code: 'TOKEN_EXPIRED'
    });
  }
  
  next(err);
};