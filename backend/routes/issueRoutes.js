const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const validateRequest = require('../middleware/validateRequest');

router.post(
	'/create',
	issueController.validateCreateIssue,
	validateRequest,
	issueController.createIssue
);

router.get('/all', issueController.getAllIssues);

router.get('/:id', issueController.validateIssueId, validateRequest, issueController.getIssueById);

router.put(
	'/update/:id',
	issueController.validateIssueId,
	issueController.validateCreateIssue, // Using create validator for body check
	validateRequest,
	issueController.updateIssue
);

router.patch(
	'/update-status/:id',
	issueController.validateUpdateStatus,
	validateRequest,
	issueController.updateStatus
);

router.delete(
	'/delete/:id',
	issueController.validateIssueId,
	validateRequest,
	issueController.deleteIssue
);

module.exports = router;
