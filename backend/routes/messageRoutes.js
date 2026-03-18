const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Public chat routes (require login)
router.post(
	'/send',
	authMiddleware.requireAuth,
	messageController.validateSendMessage,
	validateRequest,
	messageController.sendMessage
);

router.get(
	'/',
	authMiddleware.requireAuth,
	messageController.validateGetMessages,
	validateRequest,
	messageController.getAllMessages
);

router.post(
	'/mark-read',
	authMiddleware.requireAuth,
	messageController.validateMarkRead,
	validateRequest,
	messageController.markMessagesRead
);

// Admin-only settings
// Added requireRole(['admin']) for better security at the route level
router.get('/settings', authMiddleware.requireAuth, messageController.getChatSettings);

router.post(
	'/settings',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin']),
	messageController.validateSettingsUpdate,
	validateRequest,
	messageController.updateChatSettings
);

module.exports = router;
