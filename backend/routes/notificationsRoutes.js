const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Require authentication for all routes
router.use(authMiddleware.requireAuth);

// GET /api/notifications - Get all
router.get('/', notificationsController.getNotifications);

// PUT /api/notifications/read-all - Mark all as read
// Defined BEFORE /:id/read to prevent route conflict
router.put('/read-all', notificationsController.markAllAsRead);

// PUT /api/notifications/:id/read - Mark single as read
router.put(
	'/:id/read',
	notificationsController.validateNotificationId,
	validateRequest,
	notificationsController.markAsRead
);

// DELETE /api/notifications/clear-all - Delete all
// Defined BEFORE /:id to prevent "clear-all" being interpreted as an ID
router.delete('/clear-all', notificationsController.deleteAllNotifications);

// DELETE /api/notifications/:id - Delete single
router.delete(
	'/:id',
	notificationsController.validateNotificationId,
	validateRequest,
	notificationsController.deleteNotification
);

module.exports = router;
