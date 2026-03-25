const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const uploadMulter = require('../middleware/multer');

// --- Authentication Routes ---
// Pointing to authController to use the new Redis/SendGrid logic without breaking frontend paths

router.post(
	'/send-code',
	authController.validateLogin, // Use auth validator to match new logic
	validateRequest,
	authController.login // Redirect to unified login (sends OTP)
);

router.post(
	'/verify',
	authController.validateVerify, // Use auth validator (expects 'email' and 'code')
	validateRequest,
	authController.verifyLoginCode // Redirect to unified verification
);

router.post(
	'/resend-code',
	authController.validateLogin,
	validateRequest,
	authController.requestCode // Redirect to unified request code with rate limiting
);

// --- Protected User Routes ---

// Get all users (Simple list)
router.get('/users', authMiddleware.requireAuth, userController.fetchUsers);

// Get user count
router.get('/count', authMiddleware.requireAuth, userController.getUserCount);

// Get my profile
router.get('/profile', authMiddleware.requireAuth, userController.getUserProfile);

// Update my profile (With File Upload)
router.put('/profile', authMiddleware.requireAuth, uploadMulter, userController.updateUserProfile);

// --- Email Change Routes ---

router.post(
	'/check-email',
	authMiddleware.requireAuth,
	userController.validateEmailRequired,
	validateRequest,
	userController.checkEmailAvailability
);

router.post(
	'/initiate-email-change',
	authMiddleware.requireAuth,
	userController.validateEmailChangeInit,
	validateRequest,
	userController.initiateEmailChange
);

router.post(
	'/verify-email-change',
	authMiddleware.requireAuth,
	userController.validateEmailChangeVerify,
	validateRequest,
	userController.verifyEmailChange
);

router.post('/cancel-email-change', authMiddleware.requireAuth, userController.cancelEmailChange);

// --- Admin Routes ---

router.get(
	'/admin/users',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']),
	userController.getAllUsers
);

router.patch(
	'/admin/users/:userId/role',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']),
	authMiddleware.protectRoot,
	userController.validateUpdateRole,
	validateRequest,
	userController.updateUserRole
);

router.patch(
	'/admin/users/:userId/block',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']),
	authMiddleware.protectRoot,
	userController.validateBlockUser,
	validateRequest,
	userController.blockUser
);

router.patch(
	'/admin/users/:userId/unblock',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']),
	authMiddleware.protectRoot,
	userController.validateIdParam,
	validateRequest,
	userController.unblockUser
);

router.delete(
	'/admin/users/:userId',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['root']),
	authMiddleware.protectRoot,
	userController.validateIdParam,
	validateRequest,
	userController.deleteUser
);

module.exports = router;