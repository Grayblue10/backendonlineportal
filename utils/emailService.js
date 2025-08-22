import nodemailer from 'nodemailer';
import ErrorResponse from './errorResponse.js';

// Create a test account for development
const createTestAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    return {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: { host: 'smtp.ethereal.email', port: 587, secure: false }
    };
  } catch (error) {
    console.error('Failed to create test account:', error);
    throw ErrorResponse.serverError('Failed to initialize email service');
  }
};

// Create a transporter for sending emails
const createTransporter = async () => {
  // Check if Gmail credentials are provided (using EMAIL_USER and EMAIL_PASS from .env)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Using Gmail SMTP configuration with EMAIL_USER credentials');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Fallback to GMAIL_USER and GMAIL_APP_PASSWORD if available
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('Using Gmail SMTP configuration with GMAIL_USER credentials');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  
  // Check if custom SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('Using custom SMTP configuration');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // In development or when no SMTP is configured, use ethereal.email for testing
  console.log('Using Ethereal.email test account for development');
  const testAccount = await createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} [options.html] - HTML email body (optional)
 * @returns {Promise<Object>} Email info object
 */
const sendEmail = async (options) => {
  try {
    console.log('Attempting to send email to:', options.to);
    const transporter = await createTransporter();
    
    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('SMTP server connection verified successfully');
    } catch (verifyError) {
      console.warn('SMTP verification failed, but attempting to send anyway:', verifyError.message);
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@gradingapp.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL for ethereal.email or development
    if (process.env.NODE_ENV !== 'production' || (!process.env.EMAIL_USER && !process.env.GMAIL_USER)) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL: %s', previewUrl);
      }
    }
    
    console.log('Email sent successfully. Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw new ErrorResponse(`Failed to send email: ${error.message}`, 500);
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} token - Password reset token
 * @param {string} userId - User ID
 * @param {string} userRole - User role (admin, teacher, student)
 * @returns {Promise<Object>} Email info object
 */
const sendPasswordResetEmail = async (email, token, userId, userRole = 'user') => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://onlineportal-9rqm.onrender.com'}/reset-password/${token}`;
  
  console.log('Sending password reset email to:', email);
  console.log('Reset URL:', resetUrl);
  
  const subject = 'Password Reset Request - University Grading System';
  const text = `You are receiving this email because you (or someone else) has requested a password reset for your ${userRole} account.\n\n` +
    `Please click on the following link to complete the process:\n\n` +
    `${resetUrl}\n\n` +
    `This link will expire in 1 hour for security reasons.\n\n` +
    `If you did not request this, please ignore this email and your password will remain unchanged.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0;">University Grading System</h1>
          <h2 style="color: #34495e; margin: 10px 0;">Password Reset Request</h2>
        </div>
        
        <p style="color: #555; line-height: 1.6;">Hello,</p>
        <p style="color: #555; line-height: 1.6;">
          You are receiving this email because you (or someone else) has requested a password reset for your <strong>${userRole}</strong> account.
        </p>
        
        <p style="color: #555; line-height: 1.6;">Please click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;
                    font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #555; line-height: 1.6; font-size: 14px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #3498db; word-break: break-all; font-size: 14px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #e74c3c; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </p>
          <p style="color: #777; font-size: 14px; line-height: 1.6;">
            If you did not request this password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message from the University Grading System. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendEmail({
      to: email,
      subject,
      text,
      html
    });
    
    console.log('Password reset email sent successfully to:', email);
    return result;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 * @param {string} email - Recipient email address
 * @param {string} name - User's full name
 * @param {string} role - User role
 * @param {string} tempPassword - Temporary password (optional)
 * @returns {Promise<Object>} Email info object
 */
const sendWelcomeEmail = async (email, name, role, tempPassword = null) => {
  const subject = `Welcome to University Grading System - ${role.charAt(0).toUpperCase() + role.slice(1)} Account Created`;
  
  let text = `Welcome to the University Grading System, ${name}!\n\n`;
  text += `Your ${role} account has been created successfully.\n\n`;
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0;">University Grading System</h1>
          <h2 style="color: #27ae60; margin: 10px 0;">Welcome, ${name}!</h2>
        </div>
        
        <p style="color: #555; line-height: 1.6;">
          Your <strong>${role}</strong> account has been created successfully.
        </p>
  `;
  
  if (tempPassword) {
    text += `Your temporary password is: ${tempPassword}\n`;
    text += `Please log in and change your password immediately for security.\n\n`;
    
    html += `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-weight: bold;">Temporary Password:</p>
          <p style="color: #856404; margin: 5px 0 0 0; font-family: monospace; font-size: 16px;">${tempPassword}</p>
        </div>
        <p style="color: #e74c3c; line-height: 1.6;">
          <strong>Important:</strong> Please log in and change your password immediately for security.
        </p>
    `;
  }
  
  text += `You can now access the system using your credentials.\n\n`;
  text += `If you have any questions, please contact the system administrator.`;
  
  html += `
        <p style="color: #555; line-height: 1.6;">
          You can now access the system using your credentials.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://onlineportal-9rqm.onrender.com'}/login" 
             style="background-color: #3498db; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;
                    font-weight: bold; font-size: 16px;">
            Login to System
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #777; font-size: 14px; line-height: 1.6;">
          If you have any questions, please contact the system administrator.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message from the University Grading System.
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

// Export the email service functions
export { sendEmail, sendPasswordResetEmail, sendWelcomeEmail };
