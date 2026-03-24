const fs = require('fs');
const crypto = require('crypto');
const { body, query, param } = require('express-validator');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const redisClient = require('../utils/redisClient');
const authMiddleware = require('../middleware/authMiddleware');
const { sendVerificationEmail } = require('../utils/emailService');
const notificationsController = require('../controllers/notificationsController');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---

const validateEmailRequired = [body('email').isEmail().withMessage('Valid email is required')];

const validateLoginVerification = [
	body('email').isEmail().withMessage('Valid email is required'),
	body('verificationCode').notEmpty().withMessage('Verification code is required'),
];

const validateEmailChangeInit = [
	body('newEmail')
		.isEmail()
		.withMessage('Valid new email is required')
		.custom((value, { req }) => {
			if (value === req.user.email) {
				throw new Error('New email must be different from current email');
			}
			return true;
		}),
];

const validateEmailChangeVerify = [
	body('verificationCode').notEmpty().withMessage('Verification code is required'),
];

const validateUpdateRole = [
	param('userId').isMongoId().withMessage('Invalid User ID'),
	body('role')
		.isIn(['user', 'admin', 'manager','root'])
		.withMessage('Role must be one of: user, admin, manager, root'),
];

const validateBlockUser = [
	param('userId').isMongoId().withMessage('Invalid User ID'),
	body('blockDuration')
		.isInt({ min: 1 })
		.withMessage('Block duration must be a positive integer (hours)'),
];

const validateIdParam = [param('userId').isMongoId().withMessage('Invalid User ID')];

// --- Auth Functions ---

const sendVerificationCode = asyncHandler(async (req, res) => {
	const { email } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	const verificationCode = crypto.randomInt(100000, 999999).toString();
	const codeExpiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

	user.verificationCode = verificationCode;
	user.verificationExpires = codeExpiration;
	await user.save();

	// In a real scenario, you'd send an email here.
	// Returning code for dev/demo purposes as per original logic.
	res.status(200).json({
		message: 'user.success.verificationSent',
		verificationCode, // Remove in production if sensitive
		codeExpiration: codeExpiration.toISOString(),
	});
});

const verifyCodeAndLogin = asyncHandler(async (req, res) => {
	const { email, verificationCode } = req.body;

	const user = await User.findOne({
		email,
		verificationCode,
		verificationExpires: { $gt: new Date() },
	});

	if (!user) {
		const error = new Error('user.errors.invalidCode');
		error.statusCode = 401;
		throw error;
	}

	// Clear verification code
	user.verificationCode = null;
	user.verificationExpires = null;
	await user.save();

	// Generate tokens
	const { accessToken, refreshToken } = await authMiddleware.generateTokens(user);

	res.status(200).json({
		message: 'user.success.loginSuccess',
		user: {
			id: user._id,
			username: user.username,
			email: user.email,
			role: user.role,
		},
		accessToken,
		refreshToken,
	});
});

const resendVerificationCode = asyncHandler(async (req, res) => {
	const { email } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	const verificationCode = crypto.randomInt(100000, 999999).toString();
	const codeExpiration = new Date(Date.now() + 15 * 60 * 1000);

	user.verificationCode = verificationCode;
	user.verificationExpires = codeExpiration;
	await user.save();

	res.status(200).json({
		message: 'user.success.resendSuccess',
		verificationCode,
		codeExpiration: codeExpiration.toISOString(),
	});
});

// --- Profile & User Data Functions ---

const fetchUsers = asyncHandler(async (req, res) => {
	const users = await User.find().select('-verificationCode -verificationExpires');
	res.status(200).json({
		message: 'user.success.usersFetched',
		users,
	});
});

const getUserCount = asyncHandler(async (req, res) => {
	const count = await User.countDocuments();
	res.status(200).json({
		message: 'user.success.countFetched',
		count,
	});
});

const getUserProfile = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user._id).select('-verificationCode -verificationExpires');
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}
	res.status(200).json(user);
});

// Refactored to assume Multer Middleware runs BEFORE this controller
const updateUserProfile = asyncHandler(async (req, res) => {
	const { name, removeImage } = req.body;
	const user = await User.findById(req.user._id);

	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Logic 1: Remove Image
	if (removeImage === 'true' || removeImage === true) {
		if (user.profilePicture) {
			const publicId = user.profilePicture.split('/').pop().split('.')[0];
			await cloudinary.uploader.destroy(`profile-pictures/${publicId}`).catch(console.error);
		}
		user.profilePicture = null;
	}

	// Logic 2: Upload New Image
	if (req.file) {
		try {
			// If existing picture exists and we are not explicitly removing it,
			// we should delete the old one to save space (Standard practice)
			if (user.profilePicture && !removeImage) {
				const publicId = user.profilePicture.split('/').pop().split('.')[0];
				await cloudinary.uploader.destroy(`profile-pictures/${publicId}`).catch(console.error);
			}

			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: 'profile-pictures',
			});
			user.profilePicture = result.secure_url;
		} catch (uploadError) {
			console.error('Profile upload error:', uploadError);
			const error = new Error('user.errors.uploadFailed');
			error.statusCode = 500;
			throw error;
		} finally {
			// Always clean up local file
			if (fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
		}
	}

	// Logic 3: Update Name
	if (name) user.name = name;

	await user.save();

	// Notify
	notificationsController
		.createNotification(user._id, 'user.notify.profileUpdated', {}, 'profileUpdate')
		.catch(console.error);

	// Return clean user object
	const updatedUser = user.toObject();
	delete updatedUser.verificationCode;
	delete updatedUser.verificationExpires;
	delete updatedUser.emailChangeRequest;
	delete updatedUser.password;

	res.status(200).json({
		message: 'user.success.profileUpdated',
		user: updatedUser,
	});
});

// --- Email Change Functions ---

const checkEmailAvailability = asyncHandler(async (req, res) => {
	const { email } = req.body;
	const existingUser = await User.findOne({
		email,
		_id: { $ne: req.user._id },
	});

	res.status(200).json({
		message: 'user.success.emailChecked',
		available: !existingUser,
	});
});

const initiateEmailChange = asyncHandler(async (req, res) => {
	const { newEmail } = req.body;
	const userId = req.user._id;

	const existingUser = await User.findOne({
		email: newEmail.toLowerCase(),
		_id: { $ne: userId },
	});

	if (existingUser) {
		const error = new Error('user.errors.emailInUse');
		error.statusCode = 409;
		throw error;
	}

	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
	const codeExpiration = new Date(Date.now() + 15 * 60 * 1000);

	await redisClient.set(`changeEmail:${userId}`, verificationCode, 'EX', 300);
	await redisClient.set(`changeEmail:newEmail:${userId}`, newEmail, 'EX', 300);

	const user = await User.findById(userId);
	user.emailChangeRequest = {
		newEmail: newEmail.toLowerCase(),
		verificationCode,
		expiresAt: codeExpiration,
	};
	await user.save();

	await sendVerificationEmail(req.user.email, verificationCode);

	res.status(200).json({
		message: 'user.success.emailChangeInitiated',
		email: newEmail,
	});
});

const verifyEmailChange = asyncHandler(async (req, res) => {
	const { verificationCode } = req.body;
	const userId = req.user._id;

	const storedCode = await redisClient.get(`changeEmail:${userId}`);
	if (!storedCode) {
		const error = new Error('user.errors.noActiveRequest');
		error.statusCode = 400;
		throw error;
	}
	if (storedCode !== verificationCode) {
		const error = new Error('user.errors.invalidCode');
		error.statusCode = 400;
		throw error;
	}

	const pendingNewEmail = await redisClient.get(`changeEmail:newEmail:${userId}`);
	if (!pendingNewEmail) {
		const error = new Error('user.errors.emailNotFound');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findById(userId);
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	// Double check availability before final commit
	const emailInUse = await User.findOne({
		email: pendingNewEmail.toLowerCase(),
		_id: { $ne: userId },
	});
	if (emailInUse) {
		const error = new Error('user.errors.emailUnavailable');
		error.statusCode = 409;
		throw error;
	}

	// Update Email
	user.email = pendingNewEmail.toLowerCase();
	user.emailChangeRequest = null;
	await user.save();

	// Cleanup Redis
	await redisClient.del(`changeEmail:${userId}`);
	await redisClient.del(`changeEmail:newEmail:${userId}`);

	// Notify
	notificationsController
		.createNotification(user._id, 'user.notify.emailChanged', {}, 'emailChange')
		.catch(console.error);

	res.status(200).json({
		message: 'user.success.emailUpdated',
		email: pendingNewEmail,
		user: { id: user._id, username: user.username, email: user.email },
	});
});

const cancelEmailChange = asyncHandler(async (req, res) => {
	const userId = req.user._id;
	const user = await User.findById(userId);

	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	user.emailChangeRequest = null;
	await user.save();

	await redisClient.del(`changeEmail:${userId}`);
	await redisClient.del(`changeEmail:newEmail:${userId}`);

	notificationsController
		.createNotification(user._id, 'user.notify.emailChangeCancelled', {}, 'emailChangeCancel')
		.catch(console.error);

	res.status(200).json({ message: 'user.success.emailChangeCancelled' });
});

// --- Admin Functions ---

const getAllUsers = asyncHandler(async (req, res) => {
	const { page = 1, limit = 10, role, search } = req.query;
	const query = {};

	if (role && role !== 'all') query.role = role;
	if (search) {
		query.$or = [
			{ username: { $regex: search, $options: 'i' } },
			{ email: { $regex: search, $options: 'i' } },
			{ name: { $regex: search, $options: 'i' } },
		];
	}

	const options = {
		page: parseInt(page),
		limit: parseInt(limit),
		select: '-verificationCode -verificationExpires -emailChangeRequest -__v',
		sort: { createdAt: -1 },
		collation: { locale: 'en', strength: 2 },
	};

	const result = await User.paginate(query, options);

	res.status(200).json({
		message: 'user.success.usersFetched',
		docs: result.docs,
		total: result.totalDocs,
		limit: result.limit,
		page: result.page,
		totalPages: result.totalPages,
	});
});

const updateUserRole = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { role } = req.body;

	if (userId === req.user._id.toString()) {
		const error = new Error('user.errors.selfAction');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findByIdAndUpdate(
		userId,
		{ role },
		{ new: true, runValidators: true }
	).select('-verificationCode -verificationExpires');

	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	notificationsController
		.createNotification(user._id, 'user.notify.roleUpdated', { role }, 'roleUpdate')
		.catch(console.error);

	res.status(200).json({
		message: 'user.success.roleUpdated',
		role,
		user,
	});
});

const blockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { blockDuration } = req.body;

	if (userId === req.user._id.toString()) {
		const error = new Error('user.errors.selfAction');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findById(userId);
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	const blockUntil = new Date(Date.now() + blockDuration * 60 * 60 * 1000);
	user.cancellationStats.blockedUntil = blockUntil;
	await user.save();

	notificationsController
		.createNotification(
			user._id,
			'user.notify.accountBlocked',
			{ date: blockUntil.toLocaleDateString() },
			'accountBlocked'
		)
		.catch(console.error);

	res.status(200).json({
		message: 'user.success.accountBlocked',
		date: blockUntil.toLocaleDateString('en-IL'),
	});
});

const unblockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const user = await User.findById(userId);

	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	user.cancellationStats.blockedUntil = null;
	await user.save();

	notificationsController
		.createNotification(user._id, 'user.notify.accountUnblocked', {}, 'accountUnblocked')
		.catch(console.error);

	res.status(200).json({ message: 'user.success.accountUnblocked' });
});

const deleteUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;

	if (userId === req.user._id.toString()) {
		const error = new Error('user.errors.selfAction');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findByIdAndDelete(userId);
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json({ message: 'user.success.userDeleted' });
});

module.exports = {
	// Methods
	blockUser,
	fetchUsers,
	deleteUser,
	getAllUsers,
	unblockUser,
	getUserCount,
	getUserProfile,
	updateUserRole,
	updateUserProfile,
	verifyEmailChange,
	cancelEmailChange,
	verifyCodeAndLogin,
	initiateEmailChange,
	sendVerificationCode,
	resendVerificationCode,
	checkEmailAvailability,
	// Validators
	validateEmailRequired,
	validateLoginVerification,
	validateEmailChangeInit,
	validateEmailChangeVerify,
	validateUpdateRole,
	validateBlockUser,
	validateIdParam,
};
