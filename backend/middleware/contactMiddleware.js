const { body } = require('express-validator');

const validateContactForm = [
	body('name').trim().notEmpty().withMessage('Name is required'),
	body('email').isEmail().withMessage('Invalid email address'),
	body('message').trim().notEmpty().withMessage('Message is required'),
];

module.exports = { validateContactForm };
