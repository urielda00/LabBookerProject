const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const redisClient = require('../utils/redisClient');
const asyncHandler = require('../middleware/asyncHandler');
const { validatePassword } = require('../utils/validatePassword'); 
require('dotenv').config();

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: process.env.EMAIL_PORT,
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

// Helper: Send Verification Email
const sendCustomVerificationEmail = async (email, verificationCode) => {
	const uniqueId = crypto.randomBytes(3).toString('hex');

	const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 6px rgba(0,0,0,0.1);">
        <div style="background-color: #4CAF50; color: white; text-align: center; padding: 20px;">
          <h1 style="margin: 0;">Lab Booker</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="font-size: 24px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; border: 2px dashed #4CAF50; padding: 10px;">
            ${verificationCode}
          </div>
          <p>Please enter this code to verify your account. If you did not request this code, please ignore this email.</p>
        </div>
        <div style="background-color: #f4f4f4; text-align: center; padding: 10px; font-size: 12px; color: #666;">
          <p>© 2024 Lab Booker. All rights reserved.</p>
        </div>
    </div>`;

	await transporter.sendMail({
		from: { name: 'Lab Booker', address: process.env.EMAIL_USER },
		to: email,
		subject: `Verification Code: ${uniqueId}`,
		html: htmlContent,
	});
};

// --- Validators ---

const validateChangePassword = [
	body('email').isEmail().withMessage('Valid email is required'),
	body('currentPassword').notEmpty().withMessage('Current password is required'),
	body('newPassword')
		.notEmpty()
		.withMessage('New password is required')
		.custom((value) => {
			const msg = validatePassword(value);
			if (msg !== 'Valid') throw new Error(msg);
			return true;
		}),
];

const validateForgotPassword = [body('email').isEmail().withMessage('Valid email is required')];

const validateVerifyCode = [
	body('email').isEmail().withMessage('Valid email is required'),
	body('code').notEmpty().withMessage('Verification code is required'),
];

const validateResetPassword = [
	body('email').isEmail().withMessage('Valid email is required'),
	body('newPassword')
		.notEmpty()
		.withMessage('New password is required')
		.custom((value) => {
			const msg = validatePassword(value);
			if (msg !== 'Valid') throw new Error(msg);
			return true;
		}),
	body('confirmNewPassword')
		.notEmpty()
		.withMessage('Confirmation password is required')
		.custom((value, { req }) => {
			if (value !== req.body.newPassword) {
				throw new Error('Passwords do not match');
			}
			return true;
		}),
];

// --- Controller Methods ---

const changePassword = asyncHandler(async (req, res) => {
	const { email, currentPassword, newPassword } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	const isMatch = await bcrypt.compare(currentPassword, user.password);
	if (!isMatch) {
		const error = new Error('Incorrect Password');
		error.statusCode = 401;
		throw error;
	}

	// Hash new password
	const hashedPassword = await bcrypt.hash(newPassword, 10);
	user.password = hashedPassword;
	await user.save();

	res.status(200).json({ message: 'Password changed successfully' });
});

const forgotPassword = asyncHandler(async (req, res) => {
	const { email } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Generate 6-digit code
	const verificationCode = Math.floor(100000 + Math.random() * 900000);

	// Log for development debugging
	if (process.env.NODE_ENV === 'development') {
		console.log(`[DEBUG] Verification Code for ${email}: ${verificationCode}`);
	}

	// Emergency logging for high-level users in production
	if (process.env.NODE_ENV === 'production' && (user.role === 'admin' || user.role === 'root')) {
		console.log(`[EMERGENCY OTP] Forgot Password for ${user.email} (${user.role}), Code: ${verificationCode}`);
	}

	// Store in Redis (Expires in 3 minutes = 180 seconds)
	await redisClient.set(`resetCode:${email}`, verificationCode, 'EX', 180);

	try {
		await sendCustomVerificationEmail(email, verificationCode);
		res.status(200).json({ message: 'Verification code sent successfully' });
	} catch (error) {
		// Environment-aware error logging
		if (process.env.NODE_ENV !== 'production') {
			console.error('Email send error:', error);
		} else {
			console.error('Email send error:', error.message);
		}

		// In development, return the code if email fails
		res.status(200).json({
			message: 'Code generated (Email failed, check logs)',
			devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
		});
	}
});

const validateVerificationCode = asyncHandler(async (req, res) => {
	const { email, code } = req.body;

	const storedCode = await redisClient.get(`resetCode:${email}`);

	if (!storedCode) {
		const error = new Error('Invalid or expired verification code');
		error.statusCode = 400;
		throw error;
	}

	if (String(code) !== String(storedCode)) {
		const error = new Error('Incorrect verification code');
		error.statusCode = 400;
		throw error;
	}

	// Clean up code after validation
	await redisClient.del(`resetCode:${email}`);

	res.status(200).json({ message: 'Verification successful' });
});

const resetPassword = asyncHandler(async (req, res) => {
	const { email, newPassword } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);
	user.password = hashedPassword;
	await user.save();

	res.status(200).json({ message: 'Password reset successfully' });
});

module.exports = {
	// Methods
	changePassword,
	forgotPassword,
	validateVerificationCode,
	resetPassword,
	// Validators
	validateChangePassword,
	validateForgotPassword,
	validateVerifyCode,
	validateResetPassword,
};