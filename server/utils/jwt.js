const jwt = require('jsonwebtoken');

/**
 * Generate access token with shorter expiry
 * @param {string} userId - User ID to encode in the token
 * @returns {string} Access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h' // Access token expires in 1 hour
  });
};

/**
 * Generate refresh token with longer expiry
 * @param {string} userId - User ID to encode in the token
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: '30d' // Refresh token expires in 30 days
  });
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID to encode in the tokens
 * @returns {Object} Object containing both tokens
 */
const generateTokens = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @param {string} secret - Secret key to use for verification (defaults to JWT_SECRET)
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} Object containing success status and either new access token or error
 */
const refreshAccessToken = (refreshToken) => {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    
    // Generate a new access token
    const newAccessToken = generateAccessToken(decoded.id);
    
    return {
      success: true,
      accessToken: newAccessToken
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  refreshAccessToken
};