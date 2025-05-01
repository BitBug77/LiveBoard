const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const sendEmail = require('../../utils/sendEmail');
const config = require('../../config/config');
const crypto = require('crypto');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  refreshAccessToken,
  verifyToken 
} = require('../../utils/jwt');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  console.log('Registration attempt for:', email);

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate verification token (random string)
    const verificationToken = crypto.randomBytes(20).toString('hex');
    console.log('Generated verification token:', verificationToken);
    
    // Set token expiry (24 hours from now)
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    // Create new user with verification fields explicitly set
    console.log('Creating new user with verification token');
    const user = new User({
      username,
      email,
      password,
      isVerified: false, // Explicitly set this
      verificationToken,
      verificationTokenExpiry
    });

    // Save the user
    await user.save();
    console.log('User created with ID:', user._id);
    console.log('User verification token stored:', verificationToken);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();
    console.log('Refresh token stored in user document');

    // Create verification URL - make sure the token is properly included
    const verificationUrl = `${config.clientUrl}/verify-email/${verificationToken}`;
    
    // Debug logging to verify URL and token
    console.log('Config client URL:', config.clientUrl);
    console.log('Full verification URL:', verificationUrl);
    console.log('Token in URL:', verificationToken);

    // Email content with improved HTML formatting and explicit token display
    const emailContent = `
      <h1>Email Verification</h1>
      <p>Hello ${username},</p>
      <p>Thank you for registering with our application. Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Your Email</a></p>
      <p>This link is valid for 24 hours.</p>
      <p>If you can't click the button above, copy and paste the following URL into your browser:</p>
      <p>${verificationUrl}</p>
      <p>If you did not register for an account, please ignore this email.</p>
    `;

    try {
      console.log('Attempting to send verification email to:', email);
      
      // Send verification email
      const emailResult = await sendEmail({
        to: email,
        subject: 'Email Verification',
        html: emailContent
      });
      
      console.log('Verification email sent successfully to:', email, 'Result:', emailResult);
      
      // Return user data with success message including email verification mention
      return res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        emailSent: true,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified || false
        },
        accessToken,
        refreshToken
      });
      
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Still return user data but with warning about email
      return res.status(201).json({
        message: 'User registered successfully, but verification email could not be sent.',
        emailSent: false,
        emailError: emailError.message,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified || false
        },
        accessToken,
        refreshToken
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user email is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        message: 'Please verify your email before logging in',
        needsVerification: true
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    // Return user data (excluding password)
    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Email verification attempt with token:', token);

    // Find user by verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    // Check if token is valid
    if (!user) {
      console.log('Invalid or expired verification token');
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    console.log('Found user for verification:', user.email);

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();
    
    console.log('User email verified successfully:', user.email);

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification', error: error.message });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  console.log('Resend verification email request for:', email);

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      console.log('User not found for resend verification:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already verified
    if (user.isVerified) {
      console.log('User already verified:', email);
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    console.log('Generated new verification token:', verificationToken);
    
    // Set token expiry (24 hours from now)
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    // Update user
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();
    console.log('Updated user with new verification token:', verificationToken);

    // Create verification URL with explicit token
    const verificationUrl = `${config.clientUrl}/verify-email/${verificationToken}`;
    console.log('New verification URL:', verificationUrl);

    // Email content with improved HTML formatting and explicit token display
    const emailContent = `
      <h1>Email Verification</h1>
      <p>Hello ${user.username},</p>
      <p>You requested to resend the verification email. Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Your Email</a></p>
      <p>This link is valid for 24 hours.</p>
      <p>If you can't click the button above, copy and paste the following URL into your browser:</p>
      <p>${verificationUrl}</p>
      <p>If you did not register for an account, please ignore this email.</p>
    `;

    try {
      // Send verification email
      console.log('Attempting to resend verification email');
      await sendEmail({
        to: email,
        subject: 'Email Verification',
        html: emailContent
      });
      console.log('Verification email resent successfully');

      res.status(200).json({ message: 'Verification email resent successfully' });
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({ 
        message: 'Server error while sending verification email', 
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({ message: 'Server error during resend verification email', error: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  // Check if refresh token is provided
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    // Verify the refresh token
    const decoded = verifyToken(refreshToken, config.refreshTokenSecret || config.jwtSecret);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Find user by ID and check if refresh token matches
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new access token
    const result = refreshAccessToken(refreshToken);
    
    if (!result.success) {
      return res.status(401).json({ message: 'Failed to refresh token', error: result.error });
    }

    // Return new access token
    res.status(200).json({
      accessToken: result.accessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error during token refresh', error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    // Clear refresh token in database
    const user = await User.findById(req.user.id);
    
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout', error: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log('Forgot password request for:', email);

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      console.log('User not found for forgot password:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    console.log('Generated password reset token:', resetToken);
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token expiry (10 minutes from now)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    // Save user
    await user.save();
    console.log('Updated user with reset token');

    // Create reset URL with explicit token
    const resetUrl = `${config.clientUrl}/reset-password/${resetToken}`;
    console.log('Reset URL with token:', resetUrl);

    // Email content with improved HTML formatting and explicit token display
    const emailContent = `
      <h1>Password Reset</h1>
      <p>Hello ${user.username},</p>
      <p>You requested to reset your password. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
      <p>This link is valid for 10 minutes.</p>
      <p>If you can't click the button above, copy and paste the following URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `;

    try {
      // Send reset email
      console.log('Attempting to send password reset email');
      await sendEmail({
        to: email,
        subject: 'Password Reset',
        html: emailContent
      });
      console.log('Password reset email sent successfully');

      res.status(200).json({ message: 'Password reset email sent successfully' });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Reset the token fields in case of email failure
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      res.status(500).json({ 
        message: 'Server error while sending password reset email', 
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during forgot password', error: error.message });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get token from params
    const { token } = req.params;
    console.log('Password reset attempt with token:', token);
    
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by reset token and check if token is expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    // Check if token is valid
    if (!user) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    console.log('Found user for password reset:', user.email);

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    console.log('Password reset successful');

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: 'Password reset successful',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during reset password', error: error.message });
  }
};

// @desc    Get verification link (DEVELOPMENT ONLY)
// @route   GET /api/auth/dev/get-verification/:email
// @access  Public (but should be restricted to development environment)
exports.getVerificationLink = async (req, res) => {
  // Check if in development environment
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Endpoint not found' });
  }

  try {
    const { email } = req.params;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }
    
    if (!user.verificationToken || !user.verificationTokenExpiry) {
      return res.status(400).json({ message: 'No verification pending for this user' });
    }
    
    // Create verification URL
    const verificationUrl = `${config.clientUrl}/verify-email/${user.verificationToken}`;
    
    // Return verification info
    return res.status(200).json({
      message: 'Verification info retrieved successfully',
      verificationInfo: {
        token: user.verificationToken,
        url: verificationUrl,
        expires: user.verificationTokenExpiry
      }
    });
  } catch (error) {
    console.error('Get verification link error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};