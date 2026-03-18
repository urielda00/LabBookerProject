import api from '../utils/axiosConfig';

/**
 * AuthService handles all API requests related to authentication,
 * user settings (password management), and profile updates.
 * * It uses the 'api' instance which already includes the Interceptors
 * for token injection and error handling.
 */
const authService = {
	// Authentication Endpoints (Login, Signup, Verification)

	/**
	 * Logs in the user with email.
	 * Route: POST /auth/login
	 */
	login: (email) => api.post('/auth/login', { email }),

	/**
	 * Verifies the login code.
	 * Route: POST /auth/verify-login
	 */
	verifyLogin: (email, code) => api.post('/auth/verify-login', { email, code }),

	/**
	 * Registers a new user.
	 * Route: POST /auth/signup
	 */
	signup: (userData) => api.post('/auth/signup', userData),

	/**
	 * Verifies the signup code.
	 * Route: POST /auth/verify-signup
	 */
	verifySignup: (email, code) => api.post('/auth/verify-signup', { email, code }),

	/**
	 * Resends the verification code.
	 * Route: POST /auth/request-code
	 */
	resendCode: (email) => api.post('/auth/request-code', { email }),

	/**
	 * Checks if the current token is valid.
	 * Route: GET /auth/verify-token
	 */
	verifyToken: () => api.get('/auth/verify-token'),

	// ============================================================
	// Password Management (Forgot, Reset, Change)
	// ============================================================

	/**
	 * Initiates forgot password flow.
	 * Route: POST /api/settings/forgot-password
	 */
	forgotPassword: (email) => api.post('/api/settings/forgot-password', { email }),

	/**
	 * Validates the code sent to email for password reset.
	 * Route: POST /api/settings/validate-code
	 */
	validateResetCode: (email, code) => api.post('/api/settings/validate-code', { email, code }),

	/**
	 * Resets the password with the new credentials.
	 * Route: PUT /api/settings/reset-password
	 */
	resetPassword: (email, newPassword, confirmNewPassword) =>
		api.put('/api/settings/reset-password', { email, newPassword, confirmNewPassword }),

	/**
	 * Changes password for a logged-in user.
	 * Route: PUT /api/settings/change-password
	 */
	changePassword: (email, currentPassword, newPassword) =>
		api.put('/api/settings/change-password', { email, currentPassword, newPassword }),

	// ============================================================
	// User Profile & Account Settings
	// ============================================================

	/**
	 * Fetches the current user's profile data.
	 * Route: GET /user/profile
	 */
	getProfile: () => api.get('/user/profile'),

	/**
	 * Updates user profile (name, image, etc.).
	 * Note: This request sends FormData, so we explicitly set the Content-Type header.
	 * Route: PUT /user/profile
	 */
	// previous code- for debugging while cloudinary will be added. do not delete
	// updateProfile: (formData) =>
	// 	api.put('/user/profile', formData, {
	// 		headers: { 'Content-Type': 'multipart/form-data' },
	// 	}),
		updateProfile: (formData) => api.put('/user/profile', formData),

	/**
	 * Checks if an email is available for use.
	 * Route: POST /user/check-email
	 */
	checkEmailAvailability: (email) => api.post('/user/check-email', { email }),

	/**
	 * Initiates the email change process.
	 * Route: POST /user/initiate-email-change
	 */
	initiateEmailChange: (newEmail) => api.post('/user/initiate-email-change', { newEmail }),

	/**
	 * Verifies the email change with a code.
	 * Route: POST /user/verify-email-change
	 */
	verifyEmailChange: (verificationCode) =>
		api.post('/user/verify-email-change', { verificationCode }),

	/**
	 * Cancels a pending email change request.
	 * Route: POST /user/cancel-email-change
	 */
	cancelEmailChange: () => api.post('/user/cancel-email-change'),
};

export default authService;
