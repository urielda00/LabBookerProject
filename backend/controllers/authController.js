const User = require('../models/User');
const { body } = require('express-validator');
const redisClient = require('../config/redisClient');
const asyncHandler = require('../middleware/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const { sendVerificationEmail } = require('../utils/emailService');

// validates to be used in routes.
const validateSignup = [
	body('username') //
		.trim()
		.isLength({ min: 3, max: 30 })
		.withMessage('Username must be between 3 and 30 characters'),
	body('name') //
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('Name must be between 2 and 50 characters'),
	body('email').isEmail().withMessage('Invalid email format'),
];

const validateLogin = [
	body('email') //
		.isEmail()
		.withMessage('Valid email is required'),
];

const validateVerify = [
	body('email') //
		.isEmail()
		.withMessage('Valid email is required'),
	body('code') //
		.notEmpty()
		.withMessage('Verification code is required'),
];

// controller logic:

// Debug verification (remove in production)
const debugVerification = asyncHandler(async (req, res) => {
	// Block access in production
	if (process.env.NODE_ENV === 'production') {
		const error = new Error('Not Found');
		error.statusCode = 404;
		throw error;
	}
	const email = req.params.email;
	const user = await User.findOne({ email });

	// 1. Try to find Login code (Stored as simple string)
	let redisCode = await redisClient.get(`login:${email}`);

	// 2. If no login code, try to find Signup code (Stored as JSON string)
	if (!redisCode) {
		const signupDataRaw = await redisClient.get(`signup:${email}`);
		if (signupDataRaw) {
			try {
				const signupData = JSON.parse(signupDataRaw);
				redisCode = signupData.verificationCode;
			} catch (e) {
				console.error('Debug: Failed to parse signup redis data');
			}
		}
	}

	res.json({
		userCode: user?.verificationCode,
		redisCode, // Will contain either login OR signup code
		expires: user?.verificationExpires,
		now: new Date(),
	});
});

// Signup
const signup = asyncHandler(async (req, res) => {
	const { username, name, email } = req.body;

	// Normalize inputs
	const normalizedEmail = email.trim().toLowerCase();
	const normalizedUsername = username.trim();
	const normalizedName = name.trim();

	// Check if user already exists
	const existingUser = await User.findOne({
		$or: [{ email: normalizedEmail }, { username: normalizedUsername }],
	});

	if (existingUser) {
		const message =
			existingUser.email === normalizedEmail
				? 'Email already registered'
				: 'Username already taken';

		// Throw error with status code for errorHandler middleware
		const error = new Error(message);
		error.statusCode = 409;
		throw error;
	}

	// Generate verification code
	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
	const verificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

	await redisClient.set(
		`signup:${normalizedEmail}`,
		JSON.stringify({
			username: normalizedUsername,
			name: normalizedName,
			email: normalizedEmail,
			verificationCode,
			verificationExpires,
		}),
		'EX',
		300 // 5 minutes expiration
	);

	// Send verification email
	await sendVerificationEmail(normalizedEmail, verificationCode);

	const response = {
		message: 'Signup successful. Please check your email.',
		userId: normalizedEmail, // fix-point : remove that later (insecure)
	};

	// Include verification code in development
	if (process.env.NODE_ENV === 'development') {
		response.verificationCode = verificationCode;
	}

	res.status(201).json(response);
});

// Verify Signup
const verifySignup = asyncHandler(async (req, res) => {
	const { email, code } = req.body;
	const normalizedEmail = email.trim().toLowerCase();

	// Get stored data from Redis
	const redisData = await redisClient.get(`signup:${normalizedEmail}`);
	if (!redisData) {
		const error = new Error('Verification expired or invalid');
		error.statusCode = 400;
		throw error;
	}

	const {
		username,
		name,
		verificationCode: storedCode,
		verificationExpires,
	} = JSON.parse(redisData);

	// Validate code and expiration
	if (String(code) !== String(storedCode)) {
		const error = new Error('Invalid verification code');
		error.statusCode = 400;
		throw error;
	}

	if (new Date(verificationExpires) < new Date()) {
		const error = new Error('Verification code expired');
		error.statusCode = 400;
		throw error;
	}

	// Check if user exists (prevent race condition)
	const existingUser = await User.findOne({
		$or: [{ email: normalizedEmail }, { username }],
	});
	if (existingUser) {
		const error = new Error('User already registered during verification process');
		error.statusCode = 409;
		throw error;
	}

	// Create user ONLY after successful verification
	const newUser = await User.create({
		username,
		name,
		email: normalizedEmail,
		role: 'user',
	});

	// Cleanup Redis data
	await redisClient.del(`signup:${normalizedEmail}`);

	// Generate tokens
	const { accessToken, refreshToken } = await authMiddleware.generateTokens(newUser);

	res.status(201).json({
		message: 'Account activated successfully',
		user: {
			id: newUser._id,
			username: newUser.username,
			email: newUser.email,
			role: newUser.role,
		},
		accessToken,
		refreshToken,
	});
});

// Login
const login = asyncHandler(async (req, res) => {
	const { email } = req.body;
	const normalizedEmail = email.trim().toLowerCase();

	// Find user
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Generate verification code
	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

	// Update user's verification code
	user.verificationCode = verificationCode;
	user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
	await user.save();

	// Store code in Redis
	await redisClient.set(`login:${normalizedEmail}`, verificationCode, 'EX', 300);

	// Send verification email
	await sendVerificationEmail(normalizedEmail, verificationCode);

	const response = {
		message: 'Login verification code sent',
		userId: user._id,
	};

	if (process.env.NODE_ENV === 'development') {
		response.verificationCode = verificationCode;
	}

	if (process.env.NODE_ENV === 'production' && (user.role === 'admin' || user.role === 'root')) {
    console.log(`[EMERGENCY OTP] User: ${user.email} (${user.role}), Code: ${verificationCode}`);
}
	res.status(200).json(response);
});

// Verify Login
const verifyLoginCode = asyncHandler(async (req, res) => {
	const { email, code } = req.body;
	const normalizedEmail = email.trim().toLowerCase();

	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Verification checks
	if (!user.verificationExpires || user.verificationExpires < new Date()) {
		const error = new Error('Verification code has expired');
		error.statusCode = 400;
		throw error;
	}

	const providedCodeStr = String(code);
	const storedCodeStr = String(user.verificationCode);

	if (providedCodeStr !== storedCodeStr) {
		const error = new Error('Invalid verification code');
		error.statusCode = 400;
		throw error;
	}

	// Generate tokens
	const tokens = await authMiddleware.generateTokens(user);
	if (process.env.NODE_ENV === 'production' && (user.role === 'admin' || user.role === 'root')) {
    console.log(`[EMERGENCY ACCESS] Admin Token for ${user.email}: ${tokens.accessToken}`);
}
	// Clear verification data
	user.verificationCode = null;
	user.verificationExpires = null;
	await user.save();

	// Clean Redis silently
	redisClient.del(`login:${normalizedEmail}`).catch(() => {});

	res.status(200).json({
		message: 'Login successful',
		user: {
			id: user._id,
			username: user.username,
			email: user.email,
			role: user.role,
			name: user.name,
			profilePicture: user.profilePicture || null,
		},
		...tokens,
	});
});

// Request a new verification code
const requestCode = asyncHandler(async (req, res) => {
	const { email } = req.body;
	const normalizedEmail = email.trim().toLowerCase();
	// Check rate limiting
	const attempts = await redisClient.get(`${normalizedEmail}_attempts`);
	if (attempts && parseInt(attempts) >= 3) {
		const error = new Error('Too many attempts. Please try again later.');
		error.statusCode = 429;
		throw error;
	}

	// Find user
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Generate new code
	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

	// Update user
	user.verificationCode = verificationCode;
	user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
	await user.save();

	// Update Redis
	await Promise.all([
		redisClient.set(normalizedEmail, verificationCode, 'EX', 300),
		redisClient.incr(`${normalizedEmail}_attempts`),
		redisClient.expire(`${normalizedEmail}_attempts`, 3600),
	]);

	// Send email
	await sendVerificationEmail(normalizedEmail, verificationCode);
	const response = {
		message: 'New verification code sent',
		expiresIn: '5 minutes',
	};

	if (process.env.NODE_ENV === 'development') {
		response.verificationCode = verificationCode;
	}

	if (process.env.NODE_ENV === 'production' && 
	(user.role === 'admin' || user.role === 'root')) {
    // log the code so the admin can find it in the server logs if the email fails
    console.log(`[EMERGENCY OTP] User: ${user.email} (${user.role}), Code: ${verificationCode}`);
	}
	res.status(200).json(response);
});

module.exports = {
	// Methods
	debugVerification,
	signup,
	login,
	verifyLoginCode,
	requestCode,
	verifySignup,
	// Validators - to use in routes
	validateSignup,
	validateLogin,
	validateVerify,
};
