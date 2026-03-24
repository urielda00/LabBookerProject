const { param } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User'); // Added User model import
const asyncHandler = require('../middleware/asyncHandler');

// Validators
const validateNotificationId = [
	param('id').isMongoId().withMessage('Invalid notification ID format'),
];

// Helper for internal use (by other controllers)
const createNotification = async (userId, key, params = {}, type = '') => {
	try {
		return await Notification.create({
			user: userId,
			key,
			params,
			type,
			isRead: false,
		});
	} catch (error) {
		console.error('Error creating internal notification:', error);
	}
};

// New helper: Notify all admins and the root user (Option 3)
const notifyAdmins = async (key, params = {}, type = '') => {
	try {
		// Find all users with admin or root roles
		const admins = await User.find({ role: { $in: ['admin', 'root'] } }).select('_id');
		
		const notificationPromises = admins.map(admin => 
			createNotification(admin._id, key, params, type)
		);
		
		await Promise.all(notificationPromises);
	} catch (error) {
		console.error('Error notifying all admins:', error);
	}
};

// Get all notifications for the current user
const getNotifications = asyncHandler(async (req, res) => {
	const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });

	const result = notifications.map((n) => ({
		id: n._id,
		type: n.type,
		createdAt: n.createdAt,
		readAt: n.readAt,
		isRead: n.isRead,
		message: typeof req.t === 'function' ? req.t(n.key, n.params) : n.key,
	}));

	res.status(200).json(result);
});

// Mark a specific notification as read
const markAsRead = asyncHandler(async (req, res) => {
	const { id } = req.params;

	const notification = await Notification.findOneAndUpdate(
		{ _id: id, user: req.user._id },
		{ isRead: true, readAt: new Date() },
		{ new: true }
	);

	if (!notification) {
		const error = new Error('Notification not found');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json({
		id: notification._id,
		type: notification.type,
		createdAt: notification.createdAt,
		readAt: notification.readAt,
		isRead: notification.isRead,
		message:
			typeof req.t === 'function' ? req.t(notification.key, notification.params) : notification.key,
	});
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
	await Notification.updateMany(
		{ user: req.user._id, isRead: false },
		{ isRead: true, readAt: new Date() }
	);

	res.status(200).json({ message: 'All notifications marked as read' });
});

// Delete a specific notification
const deleteNotification = asyncHandler(async (req, res) => {
	const { id } = req.params;

	const notification = await Notification.findOneAndDelete({
		_id: id,
		user: req.user._id,
	});

	if (!notification) {
		const error = new Error('Notification not found');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json({ message: 'Notification deleted.' });
});

// Delete all notifications for the user
const deleteAllNotifications = asyncHandler(async (req, res) => {
	await Notification.deleteMany({ user: req.user._id });
	res.status(200).json({ message: 'All notifications deleted.' });
});

module.exports = {
	createNotification,
	notifyAdmins, // Export the new helper
	getNotifications,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	deleteAllNotifications,
	validateNotificationId,
};