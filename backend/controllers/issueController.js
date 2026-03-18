const { body, param } = require('express-validator');
const Issue = require('../models/Issue');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---
const validateCreateIssue = [
	body('issueType').trim().notEmpty().withMessage('Issue type is required'),
	body('description').trim().notEmpty().withMessage('Description is required'),
	body('email').isEmail().withMessage('Valid email is required'),
	body('bookingReference').optional().trim(),
];

const validateUpdateStatus = [
	param('id').isMongoId().withMessage('Invalid Issue ID'),
	body('status')
		.isIn(['pending', 'in-progress', 'resolved', 'closed'])
		.withMessage('Invalid status'),
];

const validateIssueId = [param('id').isMongoId().withMessage('Invalid Issue ID')];

// --- Methods ---

const createIssue = asyncHandler(async (req, res) => {
	const { issueType, description, email, bookingReference } = req.body;

	const newIssue = new Issue({
		issueType,
		description,
		email,
		bookingReference,
		status: 'pending',
	});

	await newIssue.save();

	res.status(201).json({
		message: 'Issue created successfully',
		issue: newIssue,
	});
});

const getAllIssues = asyncHandler(async (req, res) => {
	const issues = await Issue.find().sort({ createdAt: -1 });
	res.json(issues);
});

const getIssueById = asyncHandler(async (req, res) => {
	const issue = await Issue.findById(req.params.id);
	if (!issue) {
		const error = new Error('Issue not found');
		error.statusCode = 404;
		throw error;
	}
	res.json(issue);
});

const updateIssue = asyncHandler(async (req, res) => {
	const { issueType, description, email, bookingReference, status } = req.body;

	const updatedIssue = await Issue.findByIdAndUpdate(
		req.params.id,
		{ issueType, description, email, bookingReference, status },
		{ new: true }
	);

	if (!updatedIssue) {
		const error = new Error('Issue not found');
		error.statusCode = 404;
		throw error;
	}

	res.json({
		message: 'Issue updated successfully',
		issue: updatedIssue,
	});
});

const updateStatus = asyncHandler(async (req, res) => {
	const { status } = req.body;

	const updatedIssue = await Issue.findByIdAndUpdate(req.params.id, { status }, { new: true });

	if (!updatedIssue) {
		const error = new Error('Issue not found');
		error.statusCode = 404;
		throw error;
	}

	res.json({
		message: 'Status updated successfully',
		issue: updatedIssue,
	});
});

const deleteIssue = asyncHandler(async (req, res) => {
	const deletedIssue = await Issue.findByIdAndDelete(req.params.id);

	if (!deletedIssue) {
		const error = new Error('Issue not found');
		error.statusCode = 404;
		throw error;
	}

	res.json({ message: 'Issue deleted successfully' });
});

module.exports = {
	createIssue,
	getAllIssues,
	getIssueById,
	updateIssue,
	updateStatus,
	deleteIssue,
	// Validators
	validateCreateIssue,
	validateUpdateStatus,
	validateIssueId,
};
