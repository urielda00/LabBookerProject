const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Get Configuration
// Usually accessible to authenticated users so the frontend knows the rules
router.get('/', authMiddleware.requireAuth, configController.getConfig);

// Update Configuration
// Strictly restricted to Admins
router.put(
	'/',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin']),
	configController.validateConfigUpdate,
	validateRequest,
	configController.updateConfig
);

module.exports = router;
