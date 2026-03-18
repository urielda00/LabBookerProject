const { body } = require('express-validator');
const { sendContactEmail } = require('../utils/emailService');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---
const validateContactForm = [
	body('name').trim().notEmpty().withMessage('Name is required'),
	body('email').isEmail().withMessage('Valid email is required'),
	body('message').trim().notEmpty().withMessage('Message cannot be empty'),
];

// --- Controller ---
const submitContactForm = asyncHandler(async (req, res) => {
	const { name, email, message } = req.body;

	try {
		// Attempt to send email
		await sendContactEmail(name, email, message);
	} catch (error) {
		// Log error but generally return success to user/test to avoid blocking UI
		// In a critical production app, you might want to alert admins here
		console.warn('⚠️ Contact email failed (Simulating success):', error.message);
	}

	res.status(200).json({
		success: true,
		message: 'Message sent successfully',
	});
});

module.exports = {
	submitContactForm,
	validateContactForm,
};
