const Joi = require('joi');

const validateFAQ = (req, res, next) => {
	const schema = Joi.object({
		sections: Joi.object()
			.pattern(
				Joi.string(), // key name (e.g., 'general')
				Joi.array().items(
					Joi.object({
						question: Joi.string().required(),
						answer: Joi.string().required(),
						// allow optional id if frontend sends it back, though we regen it
						id: Joi.string().optional().allow(''),
					})
				)
			)
			.required(),
	});

	const { error } = schema.validate(req.body);

	if (error) {
		return res.status(400).json({
			message: 'Validation Error',
			error: error.details[0].message,
		});
	}

	next();
};

module.exports = { validateFAQ };
