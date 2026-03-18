const { body, param } = require('express-validator');
const Page = require('../models/Pages');
const asyncHandler = require('../middleware/asyncHandler');

// Validators
const validateGetPage = [
	param('slug')
		.trim()
		.notEmpty()
		.withMessage('Page slug is required')
		.isSlug()
		.withMessage('Invalid slug format'),
];

const validateUpdatePage = [
	param('slug').trim().notEmpty().withMessage('Page slug is required'),

	// Validate Nested Objects for Multi-language support
	body('title.en').trim().notEmpty().withMessage('English title is required'),
	body('title.he').trim().notEmpty().withMessage('Hebrew title is required'),
	body('content.en').trim().notEmpty().withMessage('English content is required'),
	body('content.he').trim().notEmpty().withMessage('Hebrew content is required'),
];

// Controller Methods

// Get a page by slug (Public)
const getPage = asyncHandler(async (req, res) => {
	const { slug } = req.params;

	const page = await Page.findOne({ slug })
		.select('slug title content updatedAt lastUpdatedBy')
		.populate('lastUpdatedBy', 'name email role');

	if (!page) {
		const error = new Error('Page not found');
		error.statusCode = 404;
		throw error;
	}

	// Prepare payload matching frontend expectations
	const payload = {
		exists: true,
		slug: page.slug,
		translations: {
			title: page.title,
			content: page.content,
		},
		lastUpdated: page.updatedAt,
		lastUpdatedBy: page.lastUpdatedBy,
	};

	res.status(200).json(payload);
});

// Create or Update a page (Admin only)
const updatePage = asyncHandler(async (req, res) => {
	const { slug } = req.params;
	const { title, content } = req.body;

	const updateData = {
		title: {
			en: title.en,
			he: title.he,
		},
		content: {
			en: content.en,
			he: content.he,
		},
		lastUpdatedBy: req.user._id,
	};

	// findOneAndUpdate with upsert: true handles both creation and updates
	const page = await Page.findOneAndUpdate({ slug }, updateData, {
		new: true,
		upsert: true,
		runValidators: true,
		setDefaultsOnInsert: true,
	}).populate('lastUpdatedBy', 'name email role');

	const payload = {
		slug: page.slug,
		translations: {
			title: page.title,
			content: page.content,
		},
		lastUpdated: page.updatedAt,
		lastUpdatedBy: page.lastUpdatedBy,
	};

	res.status(200).json(payload);
});

module.exports = {
	// Methods
	getPage,
	updatePage,
	// Validators
	validateGetPage,
	validateUpdatePage,
};
