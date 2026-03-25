import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const useAuth = () => {
	const [user, setUser] = useState(() => {
		const savedUser = localStorage.getItem('user');
		return savedUser ? JSON.parse(savedUser) : null;
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const navigate = useNavigate();

	// Helper to reset UI states before a new request
	const resetStates = () => {
		setIsLoading(true);
		setError('');
		setSuccessMessage('');
	};

	// Helper to handle API errors consistently
	const handleError = (err) => {
		const msg = err.response?.data?.message || 'An unexpected error occurred';
		setError(msg);
		setIsLoading(false);
		return msg;
	};

	// Login Logic
	const login = async (email) => {
		resetStates();
		try {
			await authService.login(email);
			setIsLoading(false);
			return true; // Return success to allow component to switch steps
		} catch (err) {
			handleError(err);
			return false;
		}
	};

	const verifyLogin = async (email, code, fromLocation) => {
		resetStates();
		try {
			const { data } = await authService.verifyLogin(email, code);

			// Save auth data
			localStorage.setItem('user', JSON.stringify(data.user));
			localStorage.setItem('token', data.accessToken);
			localStorage.setItem('refreshToken', data.refreshToken);

			setUser(data.user);
			setIsLoading(false);
			navigate(fromLocation || '/homepage');
		} catch (err) {
			handleError(err);
		}
	};

	// Signup Logic
	const signup = async (userData) => {
		resetStates();
		try {
			await authService.signup(userData);
			setIsLoading(false);
			return true;
		} catch (err) {
			handleError(err);
			return false;
		}
	};

	const verifySignup = async (email, code) => {
		resetStates();
		try {
			await authService.verifySignup(email, code);
			setIsLoading(false);
			navigate('/login');
		} catch (err) {
			handleError(err);
		}
	};

	// Password Management Logic
	const forgotPassword = async (email) => {
		resetStates();
		try {
			const res = await authService.forgotPassword(email);
			setSuccessMessage(res.data.message);
			setIsLoading(false);
			return true;
		} catch (err) {
			handleError(err);
			return false;
		}
	};

	const validateResetCode = async (email, code) => {
		resetStates();
		try {
			const res = await authService.validateResetCode(email, code);
			setSuccessMessage(res.data.message);
			setIsLoading(false);
			return true;
		} catch (err) {
			handleError(err);
			return false;
		}
	};

	const resetPassword = async (email, newPass, confirmPass) => {
		resetStates();
		try {
			const res = await authService.resetPassword(email, newPass, confirmPass);
			setSuccessMessage(res.data.message);
			setIsLoading(false);
			setTimeout(() => navigate('/login'), 2000);
		} catch (err) {
			handleError(err);
		}
	};

	const changePassword = async (email, currentPass, newPass) => {
		resetStates();
		try {
			const res = await authService.changePassword(email, currentPass, newPass);
			setSuccessMessage(res.data.message);
			setIsLoading(false);
			setTimeout(() => navigate('/login'), 2000);
		} catch (err) {
			handleError(err);
		}
	};

	return {
		user,
		isLoading,
		error,
		successMessage,
		login,
		verifyLogin,
		signup,
		verifySignup,
		forgotPassword,
		validateResetCode,
		resetPassword,
		changePassword,
		setError, // Exposed to allow manual error clearing by components
		setSuccessMessage,
	};
};

export default useAuth;
