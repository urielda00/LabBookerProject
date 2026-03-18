import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import authService from '../services/authService';

const useProfile = () => {
	const { t } = useTranslation();

	const [userInfo, setUserInfo] = useState({
		email: '',
		username: '',
		name: '',
		profilePicture: null,
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	// Helper to clear messages
	const clearMessages = useCallback(() => {
		setError('');
		setSuccessMessage('');
	}, []);

	// Fetch user profile
	const fetchProfile = useCallback(async () => {
		try {
			const response = await authService.getProfile();
			setUserInfo(response.data);
		} catch (err) {
			setError(t('profileSettings.errors.loadProfileError'));
		}
	}, [t]);

	// Update profile (Name, Image)
	const updateProfile = async (formData) => {
		setLoading(true);
		clearMessages();
		try {
			const response = await authService.updateProfile(formData);
			const { user } = response.data;

			// Update local state
			setUserInfo(user);

			// Update local storage to keep session in sync
			localStorage.setItem('user', JSON.stringify(user));

			setSuccessMessage(t('profileSettings.success.profileUpdated'));
			return user;
		} catch (err) {
			setError(err.response?.data?.message || t('profileSettings.errors.updateProfile'));
			return null;
		} finally {
			setLoading(false);
		}
	};

	// Check email availability
	const checkEmailAvailability = async (newEmail) => {
		try {
			const response = await authService.checkEmailAvailability(newEmail);
			return response.data.available;
		} catch (err) {
			setError(t('profileSettings.errors.initiateEmailChange'));
			return false;
		}
	};

	// Initiate email change
	const initiateEmailChange = async (newEmail) => {
		clearMessages();
		try {
			await authService.initiateEmailChange(newEmail);
			return true;
		} catch (err) {
			setError(t('profileSettings.errors.initiateEmailChange'));
			return false;
		}
	};

	// Verify email change
	const verifyEmailChange = async (verificationCode) => {
		clearMessages();
		try {
			await authService.verifyEmailChange(verificationCode);
			setSuccessMessage(t('profileSettings.success.emailUpdated'));
			return true;
		} catch (err) {
			// Return the error message to allow the modal to display it
			throw err;
		}
	};

	// Cancel email change
	const cancelEmailChange = async () => {
		try {
			await authService.cancelEmailChange();
			setSuccessMessage(t('profileSettings.success.emailChangeCancelled'));
		} catch (err) {
			setError(err.response?.data?.message || t('profileSettings.errors.cancelEmailChange'));
		}
	};

	return {
		userInfo,
		setUserInfo, // Exposed for optimistic updates if needed
		loading,
		error,
		successMessage,
		fetchProfile,
		updateProfile,
		checkEmailAvailability,
		initiateEmailChange,
		verifyEmailChange,
		cancelEmailChange,
		clearMessages,
		setError,
		setSuccessMessage,
	};
};

export default useProfile;
