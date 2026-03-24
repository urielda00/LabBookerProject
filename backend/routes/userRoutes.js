const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const validateRequest = require('../middleware/validateRequest');
const uploadMulter = require('../middleware/multer'); // Import Multer

// --- Authentication Routes ---
router.post(
	'/send-code',
	userController.validateEmailRequired,
	validateRequest,
	userController.sendVerificationCode
);

router.post(
	'/verify',
	userController.validateLoginVerification,
	validateRequest,
	userController.verifyCodeAndLogin
);

router.post(
	'/resend-code',
	userController.validateEmailRequired,
	validateRequest,
	userController.resendVerificationCode
);

// --- Protected User Routes ---

// Get all users (Simple list)
router.get('/users', authMiddleware.requireAuth, userController.fetchUsers);

// Get user count
router.get('/count', authMiddleware.requireAuth, userController.getUserCount);

// Get my profile
router.get('/profile', authMiddleware.requireAuth, userController.getUserProfile);

// Update my profile (With File Upload)
// Note: Multer middleware is added here to process the file BEFORE the controller
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
	authMiddleware.requireRole(['admin','root']), // Ensure Array format
	userController.getAllUsers
);

router.patch(
	'/admin/users/:userId/role',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']), // Ensure Array format
	authMiddleware.protectRoot, // Prevent role changes to/from root
	userController.validateUpdateRole,
	validateRequest,
	userController.updateUserRole
);

router.patch(
	'/admin/users/:userId/block',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']), // Ensure Array format
	authMiddleware.protectRoot, // Prevent blocking root user
	userController.validateBlockUser,
	validateRequest,
	userController.blockUser
);

router.patch(
	'/admin/users/:userId/unblock',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']), // Ensure Array format
	authMiddleware.protectRoot,
	userController.validateIdParam,
	validateRequest,
	userController.unblockUser
);

router.delete(
	'/admin/users/:userId',
	authMiddleware.requireAuth,
	authMiddleware.requireRole(['admin','root']), // Ensure Array format
	authMiddleware.protectRoot, // Prevent deleting root user
	userController.validateIdParam,
	validateRequest,
	userController.deleteUser
);

module.exports = router;
