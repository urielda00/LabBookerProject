const { body } = require('express-validator');
const FAQ = require('../models/FAQ');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---
const validateUpdateFAQ = [
	body('sections').isObject().withMessage('Sections object is required'),
	// Additional deep validation can be added here if needed
];

// --- Helpers ---
const transformToFrontend = (dbSections) => {
	const transformed = {};
	dbSections.forEach((section) => {
		transformed[section.key] = section.questions.map((q, idx) => ({
			id: `${section.key}-${idx}`,
			question: q.question,
			answer: q.answer,
		}));
	});
	return transformed;
};

const transformToDB = (frontendSections) => {
	return Object.keys(frontendSections).map((key) => ({
		key,
		questions: frontendSections[key].map((q) => ({
			question: q.question,
			answer: q.answer,
		})),
	}));
};

const getEmptyStructure = () => ({
	sections: {
		general: [],
		support: [],
		booking: [],
		account: [],
		privacy: [],
		feedback: [],
	},
});

// --- Methods ---

const getFAQ = asyncHandler(async (req, res) => {
	const faq = await FAQ.findOne().sort({ createdAt: -1 });

	if (!faq) {
		return res.status(200).json(getEmptyStructure());
	}

	res.json({
		sections: transformToFrontend(faq.sections),
		lastUpdated: faq.updatedAt,
		lastUpdatedBy: faq.lastUpdatedBy,
	});
});

const updateFAQ = asyncHandler(async (req, res) => {
	const { sections } = req.body;
	const userId = req.user._id;

	const updatedSections = transformToDB(sections);

	const faq = await FAQ.findOneAndUpdate(
		{},
		{ sections: updatedSections, lastUpdatedBy: userId },
		{ new: true, upsert: true }
	).populate('lastUpdatedBy', 'name email role');

	res.json({
		message: 'FAQ updated successfully',
		faq: {
			sections: faq.sections,
			lastUpdated: faq.updatedAt,
			lastUpdatedBy: faq.lastUpdatedBy,
		},
	});
});

module.exports = {
	getFAQ,
	updateFAQ,
	validateUpdateFAQ,
};
