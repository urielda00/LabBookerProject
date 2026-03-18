const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const validateRequest = require('../middleware/validateRequest');

router.post(
	'/submit',
	contactController.validateContactForm,
	validateRequest,
	contactController.submitContactForm
);

module.exports = router;
