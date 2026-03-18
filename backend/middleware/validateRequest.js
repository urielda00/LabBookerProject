const { validationResult } = require('express-validator');
const R = require('../utils/response');

/**
 * Checks for validation errors from express-validator.
 * If errors exist, it sends a formatted 400 response immediately.
 */
const validateRequest = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		// Format errors to a simple array of messages or keep the object structure
		return R.send(req, res, 400, 'validation.errors.failed', {
			errors: errors.array(),
		});
	}
	next();
};

module.exports = validateRequest;
