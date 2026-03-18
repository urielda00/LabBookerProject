const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Debug route (remove in production)
if (process.env.NODE_ENV === 'development') {
	router.get('/debug-verification/:email', authController.debugVerification);
}
// Auth routes

// signup
router.post('/signup', authController.validateSignup, validateRequest, authController.signup);
router.post(
	'/verify-signup',
	authController.validateVerify,
	validateRequest,
	authController.verifySignup
);

// login
router.post('/login', authController.validateLogin, validateRequest, authController.login);
router.post(
	'/verify-login',
	authController.validateVerify,
	validateRequest,
	authController.verifyLoginCode
);
router.post(
	'/request-code',
	authController.validateLogin,
	validateRequest,
	authController.requestCode
);

// Token management
router.post('/refresh-token', authMiddleware.refreshTokens);
router.post('/logout', authMiddleware.requireAuth, authMiddleware.logout);

module.exports = router;
