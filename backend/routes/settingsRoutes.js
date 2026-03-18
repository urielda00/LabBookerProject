const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const validateRequest = require('../middleware/validateRequest');
// Note: You might want to add authMiddleware.requireAuth for 'change-password'
// if the user is expected to be logged in.

router.put(
	'/change-password',
	settingsController.validateChangePassword,
	validateRequest,
	settingsController.changePassword
);

router.post(
	'/forgot-password',
	settingsController.validateForgotPassword,
	validateRequest,
	settingsController.forgotPassword
);

router.post(
	'/validate-code',
	settingsController.validateVerifyCode,
	validateRequest,
	settingsController.validateVerificationCode
);

router.put(
	'/reset-password',
	settingsController.validateResetPassword,
	validateRequest,
	settingsController.resetPassword
);

module.exports = router;
