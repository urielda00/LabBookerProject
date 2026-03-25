const User = require('../models/User');
const { body } = require('express-validator');
const redisClient = require('../config/redisClient');
const asyncHandler = require('../middleware/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const { sendOTP, verifyOTP } = require('../utils/emailService');

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

		const error = new Error(message);
		error.statusCode = 409;
		throw error;
	}

	// Store only user data in Redis for 10 minutes
	// (the OTP code is managed separately by sendOTP)
	await redisClient.set(
		`signup:${normalizedEmail}`,
		JSON.stringify({
			username: normalizedUsername,
			name: normalizedName,
			email: normalizedEmail,
		}),
		'EX',
		600 // 10 minutes session for registration data
	);

	// Generate, store code in Redis, and send via SendGrid
	await sendOTP(normalizedEmail, 'signup');

	res.status(201).json({
		message: 'Signup successful. Please check your email for the verification code.',
		email: normalizedEmail,
	});
});

// Verify Signup
const verifySignup = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. First, verify the OTP using the service (checks 'otp:signup:email')
  const isCodeValid = await verifyOTP(normalizedEmail, code, 'signup');
  if (!isCodeValid) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  // 2. Get the actual user data from the separate Redis key (stored during signup)
  const redisData = await redisClient.get(`signup:${normalizedEmail}`);
  if (!redisData) {
    const error = new Error('Registration session expired. Please sign up again.');
    error.statusCode = 400;
    throw error;
  }

  const { username, name } = JSON.parse(redisData);

  // 3. Check if user exists (prevent race condition)
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username }],
  });
  
  if (existingUser) {
    const error = new Error('User already registered during verification process');
    error.statusCode = 409;
    throw error;
  }

  // 4. Create user in MongoDB ONLY after successful verification
  const newUser = await User.create({
    username,
    name,
    email: normalizedEmail,
    role: 'user',
  });

  // 5. Cleanup the pending registration data from Redis
  await redisClient.del(`signup:${normalizedEmail}`);

  // 6. Generate tokens
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

	// 1. Find user in database
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// 2. Use consolidated service to generate, store in Redis, and send via SendGrid.
	// This replaces manual code generation, user.save(), and manual redisClient.set.
	await sendOTP(normalizedEmail, 'login');

	// 3. Response to client
	// Note: Emergency logs for Admin/Root are now handled within the emailService
	// to keep the controller logic clean and consistent with the requirements.
	res.status(200).json({
		message: 'Login verification code sent',
		userId: user._id,
	});
});

// Verify Login
const verifyLoginCode = asyncHandler(async (req, res) => {
	const { email, code } = req.body;
	const normalizedEmail = email.trim().toLowerCase();

	// 1. Find user to ensure they exist
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// 2. Verify OTP against Redis using the unified service.
	// This replaces manual checks of user.verificationCode and user.verificationExpires.
	// The service automatically deletes the code from Redis upon successful verification.
	const isValid = await verifyOTP(normalizedEmail, code, 'login');
	if (!isValid) {
		const error = new Error('Invalid or expired verification code');
		error.statusCode = 400;
		throw error;
	}

	// 3. Generate tokens
	const tokens = await authMiddleware.generateTokens(user);

	// 4. Success response
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

	// 1. Rate limiting check using Redis
	const attempts = await redisClient.get(`${normalizedEmail}_attempts`);
	if (attempts && parseInt(attempts) >= 3) {
		const error = new Error('Too many attempts. Please try again later.');
		error.statusCode = 429;
		throw error;
	}

	// 2. Find user to ensure the email is registered
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// 3. Generate, store in Redis, and send new OTP via SendGrid
	// This replaces manual generation, user.save(), and manual code storage
	await sendOTP(normalizedEmail, 'login');

	// 4. Update rate limit counter in Redis
	await redisClient.incr(`${normalizedEmail}_attempts`);
	await redisClient.expire(`${normalizedEmail}_attempts`, 3600); // 1 hour window

	res.status(200).json({
		message: 'New verification code sent',
		expiresIn: '5 minutes',
	});
});

module.exports = {
	// Methods
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
