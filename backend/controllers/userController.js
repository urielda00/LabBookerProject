const fs = require('fs');
const { body, query, param } = require('express-validator');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const redisClient = require('../config/redisClient'); // Fixed path if needed
const { sendOTP, verifyOTP } = require('../utils/emailService');
const notificationsController = require('../controllers/notificationsController');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---

const validateEmailRequired = [body('email').isEmail().withMessage('Valid email is required')];

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
	body('verificationCode')
		.notEmpty()
		.withMessage('Verification code is required'),
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

// --- Profile & User Data Functions ---

const fetchUsers = asyncHandler(async (req, res) => {
	const users = await User.find().select('-emailChangeRequest');
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
	const user = await User.findById(req.user._id).select('-emailChangeRequest');
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}
	res.status(200).json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
	const { name, removeImage } = req.body;
	const user = await User.findById(req.user._id);

	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	if (removeImage === 'true' || removeImage === true) {
		if (user.profilePicture) {
			const publicId = user.profilePicture.split('/').pop().split('.')[0];
			await cloudinary.uploader.destroy(`profile-pictures/${publicId}`).catch(console.error);
		}
		user.profilePicture = null;
	}

	if (req.file) {
		try {
			if (user.profilePicture && !removeImage) {
				const publicId = user.profilePicture.split('/').pop().split('.')[0];
				await cloudinary.uploader.destroy(`profile-pictures/${publicId}`).catch(console.error);
			}

			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: 'profile-pictures',
			});
			user.profilePicture = result.secure_url;
		} catch (uploadError) {
			const error = new Error('user.errors.uploadFailed');
			error.statusCode = 500;
			throw error;
		} finally {
			if (fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
		}
	}

	if (name) user.name = name;
	await user.save();

	notificationsController
		.createNotification(user._id, 'user.notify.profileUpdated', {}, 'profileUpdate')
		.catch(console.error);

	const updatedUser = user.toObject();
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
		email: email.toLowerCase(),
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
	const currentEmail = req.user.email;
	const normalizedNewEmail = newEmail.toLowerCase();

	const existingUser = await User.findOne({
		email: normalizedNewEmail,
		_id: { $ne: userId },
	});

	if (existingUser) {
		const error = new Error('user.errors.emailInUse');
		error.statusCode = 409;
		throw error;
	}

	// 1. Store only the metadata in DB
	const user = await User.findById(userId);
	user.emailChangeRequest = { newEmail: normalizedNewEmail };
	await user.save();

	// 2. Store new email in Redis for the verification step
	await redisClient.set(`pendingEmailChange:${userId}`, normalizedNewEmail, 'EX', 600);

	// 3. Send OTP to the CURRENT email for security
	await sendOTP(currentEmail, 'emailChange');

	res.status(200).json({
		message: 'user.success.emailChangeInitiated',
		email: normalizedNewEmail,
	});
});

const verifyEmailChange = asyncHandler(async (req, res) => {
	const code = req.body.code || req.body.verificationCode; 
	const userId = req.user._id.toString();
	const currentEmail = req.user.email.toLowerCase().trim();

	// 1. Verify OTP from Redis (checks otp:emailChange:currentEmail)
	const isCodeValid = await verifyOTP(currentEmail, code, 'emailChange');
	if (!isCodeValid) {
		const error = new Error('user.errors.invalidCode');
		error.statusCode = 400;
		throw error;
	}

	// 2. Get pending email from Redis
	const pendingNewEmail = await redisClient.get(`pendingEmailChange:${userId}`);
	if (!pendingNewEmail) {
		const error = new Error('user.errors.noActiveRequest');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findById(userId);
	
	// 3. Final availability check
	const emailInUse = await User.findOne({
		email: pendingNewEmail,
		_id: { $ne: userId },
	});
	if (emailInUse) {
		const error = new Error('user.errors.emailUnavailable');
		error.statusCode = 409;
		throw error;
	}

	// 4. Commit changes
	user.email = pendingNewEmail;
	user.emailChangeRequest = null;
	await user.save();

	await redisClient.del(`pendingEmailChange:${userId}`);

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
	if (user) {
		user.emailChangeRequest = null;
		await user.save();
	}

	await redisClient.del(`pendingEmailChange:${userId}`);
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
		select: '-emailChangeRequest -__v',
		sort: { createdAt: -1 },
	};

	const result = await User.paginate(query, options);
	res.status(200).json(result);
});

const updateUserRole = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { role } = req.body;

	if (userId === req.user._id.toString()) {
		const error = new Error('user.errors.selfAction');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json({ message: 'user.success.roleUpdated', role, user });
});

const blockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { blockDuration } = req.body;
	const blockUntil = new Date(Date.now() + blockDuration * 3600000);

	const user = await User.findByIdAndUpdate(userId, { 'cancellationStats.blockedUntil': blockUntil });
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json({ message: 'user.success.accountBlocked', date: blockUntil.toLocaleDateString('en-IL') });
});

const unblockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const user = await User.findByIdAndUpdate(userId, { 'cancellationStats.blockedUntil': null });
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}
	res.status(200).json({ message: 'user.success.accountUnblocked' });
});

const deleteUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const user = await User.findByIdAndDelete(userId);
	if (!user) {
		const error = new Error('user.errors.userNotFound');
		error.statusCode = 404;
		throw error;
	}
	res.status(200).json({ message: 'user.success.userDeleted' });
});

module.exports = {
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
	initiateEmailChange,
	checkEmailAvailability,
	validateEmailRequired,
	validateEmailChangeInit,
	validateEmailChangeVerify,
	validateUpdateRole,
	validateBlockUser,
	validateIdParam,
};