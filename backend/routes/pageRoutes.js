const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Middleware to prevent caching for dynamic CMS pages
const noCache = (req, res, next) => {
	res.set('Cache-Control', 'no-store');
	next();
};

// Middleware to enforce JSON content type for updates
const requireJsonContent = (req, res, next) => {
	if (!req.is('application/json')) {
		return res.status(415).json({ message: 'Unsupported Media Type: application/json required' });
	}
	next();
};

// GET /pages/:slug - Public read access
router.get(
	'/:slug',
	noCache,
	pageController.validateGetPage,
	validateRequest,
	pageController.getPage
);

// PUT /pages/:slug - Protected update/create endpoint
router.put(
	'/:slug',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin']), // Using the standard array format we established
	requireJsonContent,
	pageController.validateUpdatePage,
	validateRequest,
	pageController.updatePage
);

module.exports = router;
