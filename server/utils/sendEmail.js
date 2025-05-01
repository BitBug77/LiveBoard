// Enhanced sendEmail utility with better error handling and debugging

const nodemailer = require('nodemailer');
const config = require('../config/config'); // Adjust path as needed

/**
 * Send an email with enhanced error handling
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content (optional if html is provided)
 * @param {string} options.html - HTML content (optional if text is provided)
 * @returns {Promise} - Result of sending email
 */
const sendEmail = async (options) => {
  // Validate required parameters
  if (!options.to) {
    throw new Error('Email recipient (to) is required');
  }
  
  if (!options.subject) {
    throw new Error('Email subject is required');
  }
  
  if (!options.text && !options.html) {
    throw new Error('Either text or html content is required');
  }
  
  // Validate email configuration
  if (!config.email || !config.email.user || !config.email.password) {
    throw new Error('Email configuration is missing or incomplete');
  }
  
  console.log('sendEmail called with options:', {
    to: options.to,
    subject: options.subject,
    hasHtml: !!options.html,
    hasText: !!options.text
  });
  
  // Log email config (excluding sensitive info)
  console.log('Email config:', {
    user: config.email.user,
    from: config.email.from || config.email.user,
    hasPassword: !!config.email.password
  });
  
  try {
    // Create transporter
    console.log('Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    // Verify connection configuration
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Build email options
    const mailOptions = {
      from: `"${config.email.from || 'App'}" <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || '',
    };

    console.log('Sending email to:', options.to);
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // Provide more helpful error information
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your email and password.');
      console.error('If using Gmail, make sure you:');
      console.error('1. Have 2-Step Verification enabled');
      console.error('2. Are using an App Password (not your regular password)');
    }
    
    if (error.responseCode === 535) {
      console.error('Username and password not accepted.');
    }
    
    throw error; // Re-throw to handle in the calling function
  }
};

module.exports = sendEmail;