const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Create email transporter
 * @returns {Object} - Nodemailer transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',  // Replace with correct SMTP host
    port: 465,
    secure: true,  // Use true for 465, false for other ports
    auth: {
       user: '#############@gmail.com',
       pass: '##############'  // Use app-specific password if using Gmail
  }
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Email sending result
 */
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Email sending result
 */
exports.sendWelcomeEmail = async (user) => {
  return await this.sendEmail({
    to: user.email,
    subject: 'Welcome to Xeenux Platform',
    text: `Hi ${user.name},\n\nWelcome to Xeenux! We're excited to have you on board.\n\nYour user ID is: ${user.userId}\n\nBest regards,\nThe Xeenux Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Welcome to Xeenux!</h2>
        <p>Hi ${user.name},</p>
        <p>We're excited to have you on board. You're now part of our growing community!</p>
        <p><strong>Your User ID:</strong> ${user.userId}</p>
        <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
          <p><strong>Getting Started:</strong></p>
          <ul>
            <li>Explore available packages</li>
            <li>Invite friends using your referral links</li>
            <li>Track your progress in the dashboard</li>
          </ul>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Xeenux Team</p>
      </div>
    `
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {String} resetToken - Password reset token
 * @param {String} resetUrl - Password reset URL
 * @returns {Promise<Object>} - Email sending result
 */
exports.sendPasswordResetEmail = async (user, resetToken, resetUrl) => {
  return await this.sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    text: `Hi ${user.name},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nThe link is valid for 10 minutes.\n\nBest regards,\nThe Xeenux Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #6d28d9; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this, please ignore this email.</p>
        <p>The link is valid for 10 minutes.</p>
        <p>Best regards,<br>The Xeenux Team</p>
      </div>
    `
  });
};

/**
 * Send transaction confirmation email
 * @param {Object} user - User object
 * @param {Object} transaction - Transaction object
 * @returns {Promise<Object>} - Email sending result
 */
exports.sendTransactionConfirmationEmail = async (user, transaction) => {
  let subject, text, html;
  
  switch (transaction.type) {
    case 'deposit':
      subject = 'Deposit Confirmation';
      text = `Hi ${user.name},\n\nYour deposit of ${transaction.amount} XEE (${transaction.amountUSD} USD) has been confirmed.\n\nTransaction ID: ${transaction._id}\n\nBest regards,\nThe Xeenux Team`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6d28d9;">Deposit Confirmation</h2>
          <p>Hi ${user.name},</p>
          <p>Your deposit has been confirmed.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
            <p><strong>Amount:</strong> ${transaction.amount} XEE (${transaction.amountUSD} USD)</p>
            <p><strong>Transaction ID:</strong> ${transaction._id}</p>
            <p><strong>Status:</strong> ${transaction.status}</p>
          </div>
          <p>Best regards,<br>The Xeenux Team</p>
        </div>
      `;
      break;
    case 'withdrawal':
      subject = 'Withdrawal Confirmation';
      text = `Hi ${user.name},\n\nYour withdrawal of ${transaction.amount} XEE has been ${transaction.status}.\n\nTransaction ID: ${transaction._id}\n\nBest regards,\nThe Xeenux Team`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6d28d9;">Withdrawal ${transaction.status === 'completed' ? 'Confirmation' : 'Update'}</h2>
          <p>Hi ${user.name},</p>
          <p>Your withdrawal request has been ${transaction.status}.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
            <p><strong>Amount:</strong> ${transaction.amount} XEE</p>
            <p><strong>Fee:</strong> ${transaction.fee} XEE</p>
            <p><strong>Net Amount:</strong> ${transaction.amount - transaction.fee} XEE</p>
            <p><strong>Transaction ID:</strong> ${transaction._id}</p>
            <p><strong>Status:</strong> ${transaction.status}</p>
          </div>
          <p>Best regards,<br>The Xeenux Team</p>
        </div>
      `;
      break;
    case 'purchase':
      subject = 'Package Purchase Confirmation';
      text = `Hi ${user.name},\n\nYour package purchase of ${transaction.amount} XEE has been confirmed.\n\nTransaction ID: ${transaction._id}\n\nBest regards,\nThe Xeenux Team`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6d28d9;">Package Purchase Confirmation</h2>
          <p>Hi ${user.name},</p>
          <p>Your package purchase has been confirmed.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
            <p><strong>Amount:</strong> ${transaction.amount} XEE</p>
            <p><strong>Description:</strong> ${transaction.description}</p>
            <p><strong>Transaction ID:</strong> ${transaction._id}</p>
          </div>
          <p>Best regards,<br>The Xeenux Team</p>
        </div>
      `;
      break;
    default:
      subject = 'Transaction Confirmation';
      text = `Hi ${user.name},\n\nYour transaction of ${transaction.amount} XEE has been confirmed.\n\nTransaction ID: ${transaction._id}\n\nBest regards,\nThe Xeenux Team`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6d28d9;">Transaction Confirmation</h2>
          <p>Hi ${user.name},</p>
          <p>Your transaction has been confirmed.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
            <p><strong>Amount:</strong> ${transaction.amount} XEE</p>
            <p><strong>Type:</strong> ${transaction.type}</p>
            <p><strong>Transaction ID:</strong> ${transaction._id}</p>
          </div>
          <p>Best regards,<br>The Xeenux Team</p>
        </div>
      `;
  }
  
  return await this.sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};
