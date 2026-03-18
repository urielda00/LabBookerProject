const Joi = require('joi');

const validateIssue = (req, res, next) => {
	const schema = Joi.object({
		issueType: Joi.string().required(),
		description: Joi.string().required(),
		email: Joi.string().email().required(),
		bookingReference: Joi.string().allow('', null).optional(), // Assuming this can be optional
		status: Joi.string().valid('pending', 'in-progress', 'resolved').optional(),
	});

	const { error } = schema.validate(req.body);
	if (error) {
		return res.status(400).json({ msg: error.details[0].message });
	}
	next();
};

const validateStatusUpdate = (req, res, next) => {
	const schema = Joi.object({
		status: Joi.string().valid('pending', 'in-progress', 'resolved').required(),
	});

	const { error } = schema.validate(req.body);
	if (error) {
		return res.status(400).json({ msg: 'Invalid status value' });
	}
	next();
};

module.exports = { validateIssue, validateStatusUpdate };
