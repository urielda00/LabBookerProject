import { useState } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useUpdateBooking = (onSuccess) => {
	const { t } = useTranslation();

	// State
	const [username, setUsername] = useState('');
	const [userBookings, setUserBookings] = useState([]);
	const [selectedBookingId, setSelectedBookingId] = useState('');
	const [statusToUpdate, setStatusToUpdate] = useState('Pending');

	// Status State
	const [status, setStatus] = useState({
		loadingBookings: false,
		loadingUpdate: false,
		error: '',
		success: '',
	});

	const resetMessages = () => {
		setStatus((prev) => ({ ...prev, error: '', success: '' }));
	};

	const resetForm = () => {
		setUsername('');
		setUserBookings([]);
		setSelectedBookingId('');
		setStatusToUpdate('Pending');
		resetMessages();
	};

	// 1. Fetch Bookings by Username
	const fetchBookings = async () => {
		if (!username.trim()) {
			setStatus((prev) => ({ ...prev, error: t('updateBooking.errors.usernameRequired') }));
			return;
		}

		resetMessages();
		setStatus((prev) => ({ ...prev, loadingBookings: true }));
		setUserBookings([]);
		setSelectedBookingId('');

		try {
			const response = await api.get(`/book/bookings/upcoming/${username}`);
			if (response.status === 200) {
				const bookings = response.data.bookings || [];
				setUserBookings(bookings);

				if (bookings.length === 0) {
					setStatus((prev) => ({ ...prev, error: t('updateBooking.noBookings', { username }) }));
				} else {
					setStatus((prev) => ({
						...prev,
						success: t('updateBooking.foundBookings', { count: bookings.length }),
					}));
				}
			}
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: err.response?.data?.message || t('updateBooking.fetchError', { username }),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, loadingBookings: false }));
		}
	};

	// 2. Update Booking Status
	const handleUpdate = async () => {
		if (!username.trim()) {
			setStatus((prev) => ({ ...prev, error: t('updateBooking.errors.usernameRequired') }));
			return;
		}
		if (!selectedBookingId) {
			setStatus((prev) => ({ ...prev, error: t('updateBooking.errors.bookingRequired') }));
			return;
		}

		const currentStatus = userBookings.find((b) => b._id === selectedBookingId)?.status;

		if (statusToUpdate === currentStatus) {
			setStatus((prev) => ({ ...prev, error: t('updateBooking.errors.sameStatus') }));
			return;
		}

		resetMessages();
		setStatus((prev) => ({ ...prev, loadingUpdate: true }));

		try {
			// API call requires specific query param structure
			const response = await api.patch(
				`/book/booking/${selectedBookingId}/status/by-username?username=${username}`,
				{ status: statusToUpdate }
			);

			if (response.status === 200) {
				const successMsg = t('updateBooking.successUpdate', {
					from: currentStatus,
					to: statusToUpdate,
				});

				setStatus((prev) => ({ ...prev, success: successMsg }));
				onSuccess?.(response.data.message);

				// Refresh the list to show new status
				await fetchBookings();
			}
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: err.response?.data?.message || t('updateBooking.errors.updateFailed'),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, loadingUpdate: false }));
		}
	};

	return {
		username,
		userBookings,
		selectedBookingId,
		statusToUpdate,
		status,
		// Setters
		setUsername,
		setSelectedBookingId,
		setStatusToUpdate,
		// Actions
		fetchBookings,
		handleUpdate,
		resetForm,
		resetMessages,
	};
};
