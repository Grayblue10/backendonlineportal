import nodemailer from 'nodemailer';
import logger from './logger.js';

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @returns {Promise<Object>} - Result of the send operation
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`, { error });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send a password reset email
 * @param {string} to - Recipient email address
 * @param {string} token - Password reset token
 * @returns {Promise<Object>} - Result of the send operation
 */
const sendPasswordResetEmail = async (to, token) => {
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://onlineportal-9rqm.onrender.com';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${token}`;
  
  return sendEmail({
    to,
    subject: 'Password Reset Request',
    text: `You are receiving this email because you (or someone else) has requested a password reset.\n\n` +
      `Please click on the following link to complete the process:\n\n` +
      `${resetUrl}\n\n` +
      `If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You are receiving this email because you (or someone else) has requested a password reset.</p>
        <p>Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a></p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `,
  });
};

/**
 * Send a welcome email
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @param {string} password - Temporary password (if applicable)
 * @returns {Promise<Object>} - Result of the send operation
 */
const sendWelcomeEmail = async (to, name, password = null) => {
  let text = `Welcome to ${process.env.APP_NAME}, ${name}!\n\n` +
    `Your account has been created successfully.`;
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${process.env.APP_NAME}, ${name}!</h2>
      <p>Your account has been created successfully.</p>
  `;

  if (password) {
    text += `\n\nYour temporary password is: ${password}\n` +
      `Please change your password after logging in.`;
    
    html += `
      <p>Your temporary password is: <strong>${password}</strong></p>
      <p>Please change your password after logging in.</p>
    `;
  }

  html += `
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>The ${process.env.APP_NAME} Team</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Welcome to ${process.env.APP_NAME}!`,
    text,
    html,
  });
};

const emailService = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};

export default emailService;
