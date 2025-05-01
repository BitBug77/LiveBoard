// email-debug.js - Run this script to test your email configuration
// Usage: node email-debug.js

const nodemailer = require('nodemailer');
const config = require('./config/config'); // Adjust path as needed

async function testEmailConnection() {
  console.log('Testing email configuration...');
  console.log('----------------------------------------');
  console.log('Email Config:', {
    user: config.email.user,
    from: config.email.from,
    hasPassword: !!config.email.password,
    clientUrl: config.clientUrl
  });
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
    
    console.log('Attempting to verify SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Test sending email
    console.log('Attempting to send test email...');
    
    const info = await transporter.sendMail({
      from: `"Test App" <${config.email.user}>`,
      to: config.email.user, // Send to yourself
      subject: 'Nodemailer Test Email',
      text: 'If you can read this, your email configuration is working!',
      html: '<b>If you can read this, your email configuration is working!</b>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication failed. Check your email and password.\n');
      console.log('If using Gmail, make sure you:');
      console.log('1. Have 2-Step Verification enabled');
      console.log('2. Are using an App Password (not your regular password)');
      console.log('3. Have correctly copied the 16-character App Password');
    }
    
    if (error.code === 'ESOCKET') {
      console.error('\n⚠️  Socket connection failed. Check your network and firewall settings.\n');
    }
  }
}

testEmailConnection().catch(console.error);