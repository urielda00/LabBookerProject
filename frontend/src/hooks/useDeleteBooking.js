import { useState } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useDeleteBooking = (onSuccess) => {
	const { t } = useTranslation();
	const token = localStorage.getItem('token');

	// State
	const [username, setUsername] = useState('');
	const [userBookings, setUserBookings] = useState([]);
	const [selectedBookingId, setSelectedBookingId] = useState('');

	// UI State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [status, setStatus] = useState({
		loadingBookings: false,
		loadingDelete: false,
		error: '',
		success: '', // Store success message object or string here
	});

	const resetMessages = () => {
		setStatus((prev) => ({ ...prev, error: '', success: '' }));
	};

	const resetForm = () => {
		setUsername('');
		setUserBookings([]);
		setSelectedBookingId('');
		setIsModalOpen(false);
		resetMessages();
	};

	// Fetch bookings associated with the username
	const fetchBookings = async () => {
		if (!username.trim()) {
			setStatus((prev) => ({ ...prev, error: t('deleteBooking.errors.usernameRequired') }));
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
					setStatus((prev) => ({
						...prev,
						error: t('deleteBooking.errors.noBookings', { username }),
					}));
				} else {
					// Optional: You can set a temporary success msg here if needed
				}
			}
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: err.response?.data?.message || t('deleteBooking.errors.fetchFailed', { username }),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, loadingBookings: false }));
		}
	};

	// Prepare for deletion
	const handleDeleteRequest = () => {
		if (!username.trim()) {
			setStatus((prev) => ({ ...prev, error: t('deleteBooking.errors.usernameRequired') }));
			return;
		}
		if (!selectedBookingId) {
			setStatus((prev) => ({ ...prev, error: t('deleteBooking.errors.selectRequired') }));
			return;
		}
		setIsModalOpen(true);
	};

	// Execute deletion
	const confirmDelete = async () => {
		setIsModalOpen(false);
		resetMessages();
		setStatus((prev) => ({ ...prev, loadingDelete: true }));

		try {
			const response = await api.delete(
				`/book/booking/${selectedBookingId}/by-username?username=${username}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (response.status === 200) {
				const deletedBooking = userBookings.find((b) => b._id === selectedBookingId);

				// Return details for the UI to construct the success message
				const successDetails = {
					roomName: deletedBooking?.roomId?.name,
					date: deletedBooking?.date,
					startTime: deletedBooking?.startTime,
					endTime: deletedBooking?.endTime,
				};

				resetForm();

				if (onSuccess) onSuccess(response.data.message);

				return successDetails;
			}
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: err.response?.data?.message || t('deleteBooking.errors.deleteFailed'),
			}));
			setTimeout(() => resetMessages(), 5000);
		} finally {
			setStatus((prev) => ({ ...prev, loadingDelete: false }));
		}
	};

	return {
		// State
		username,
		userBookings,
		selectedBookingId,
		isModalOpen,
		status,
		// Setters
		setUsername,
		setSelectedBookingId,
		setIsModalOpen,
		setStatus,
		// Actions
		fetchBookings,
		handleDeleteRequest,
		confirmDelete,
		resetForm,
		resetMessages,
	};
};
