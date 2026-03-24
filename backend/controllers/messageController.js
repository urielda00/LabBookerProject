const { body, query } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');
const ChatSetting = require('../models/ChatSetting');
const notificationsController = require('./notificationsController');
const asyncHandler = require('../middleware/asyncHandler');

// Validators
const validateSendMessage = [
	body('content')
		.trim()
		.notEmpty()
		.withMessage('Message content is required')
		.isLength({ max: 2000 })
		.withMessage('Message content cannot exceed 2000 characters'),
	body('channel').optional().trim().default('all'),
];

const validateGetMessages = [
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100')
		.toInt(),
	query('channel').optional().trim().default('all'),
];

const validateSettingsUpdate = [
	body('enabled').isBoolean().withMessage('Enabled status must be a boolean'),
];

const validateMarkRead = [body('channel').trim().notEmpty().withMessage('Channel is required')];

// Send a new message
const sendMessage = asyncHandler(async (req, res) => {
	const { content, channel } = req.body;
	const io = req.app.get('io');
	const sender = req.user;

	// Check if chat is globally enabled (skip check for admins and root)
	const settings = await ChatSetting.findOne();
	const isChatEnabled = settings?.enabled ?? true;

	if (!isChatEnabled && !['admin', 'root'].includes(sender.role)) {
		const error = new Error('Chat is currently disabled.');
		error.statusCode = 403;
		throw error;
	}

	// Restrict posting in 'admin' channel (Allow admin and root)
	if (channel === 'admin' && !['admin', 'root'].includes(sender.role)) {
		const error = new Error('Only admins can post in this channel.');
		error.statusCode = 403;
		throw error;
	}

	// Create and save message
	const messageDoc = new Message({
		sender: sender._id,
		content,
		channel,
		readBy: [sender._id], // Sender automatically reads their own message
	});
	await messageDoc.save();

	// Populate sender details for the frontend
	await messageDoc.populate('sender', 'username role profilePicture');

	// Handle @-mentions
	const mentionPattern = /@([A-Za-z0-9_]+)/g;
	let match;
	const processedMentions = new Set();

	while ((match = mentionPattern.exec(content))) {
		const username = match[1];

		// Avoid duplicate notifications for the same user in one message
		if (processedMentions.has(username)) continue;
		processedMentions.add(username);

		const userMentioned = await User.findOne({ username }).select('_id');

		if (userMentioned) {
			// Trigger notification asynchronously (non-blocking)
			notificationsController
				.createNotification(
					userMentioned._id,
					'chat.notify.mention',
					{ from: sender.username, snippet: content.slice(0, 50) },
					'mention',
					messageDoc._id.toString()
				)
				.catch((err) => console.error('Notification error:', err));
		}
	}

	// Broadcast via Socket.io
	io.emit('chatMessage', messageDoc);

	res.status(201).json({ message: messageDoc });
});

// Get messages with pagination
const getAllMessages = asyncHandler(async (req, res) => {
	const { limit = 50, before, channel } = req.query;

	const query = { channel };
	if (before) {
		query.createdAt = { $lt: new Date(before) };
	}

	const rawMessages = await Message.find(query)
		.sort({ createdAt: -1 }) // Newest first
		.limit(limit)
		.populate('sender', 'username role profilePicture');

	const messages = rawMessages.reverse(); // Return oldest -> newest for chat UI

	res.status(200).json({ messages });
});

// Get global chat settings
const getChatSettings = asyncHandler(async (req, res) => {
	const settings = await ChatSetting.findOne();
	res.status(200).json({ enabled: settings?.enabled ?? true });
});

// Update global chat settings (Admin and Root only)
const updateChatSettings = asyncHandler(async (req, res) => {
	const { enabled } = req.body;

	// Check permission for both admin and root
	if (!['admin', 'root'].includes(req.user.role)) {
		const error = new Error('Forbidden: Admin access required');
		error.statusCode = 403;
		throw error;
	}

	const settings = await ChatSetting.findOneAndUpdate(
		{},
		{ enabled },
		{ new: true, upsert: true } // Create if doesn't exist
	);

	res.status(200).json({ enabled: settings.enabled });
});

// Mark messages as read for a specific channel
const markMessagesRead = asyncHandler(async (req, res) => {
	const userId = req.user._id;
	const { channel } = req.body;

	await Message.updateMany(
		{
			channel,
			readBy: { $ne: userId },
			createdAt: { $lte: new Date() },
		},
		{ $addToSet: { readBy: userId } }
	);

	res.sendStatus(204);
});

module.exports = {
	// Methods
	sendMessage,
	getAllMessages,
	getChatSettings,
	updateChatSettings,
	markMessagesRead,
	// Validators
	validateSendMessage,
	validateGetMessages,
	validateSettingsUpdate,
	validateMarkRead,
};