const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const faqController = require('../controllers/faqController');
const validateRequest = require('../middleware/validateRequest');

router.get('/', faqController.getFAQ);

router.put(
	'/',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin', 'manager']),
	faqController.validateUpdateFAQ,
	validateRequest,
	faqController.updateFAQ
);

module.exports = router;
