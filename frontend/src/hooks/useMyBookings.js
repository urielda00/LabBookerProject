import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/axiosConfig';

export const useMyBookings = (navigate) => {
	const [bookings, setBookings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filter, setFilter] = useState('all');

	// Helper: Check if booking is in the past
	const isBookingPast = useCallback((bookingDate, bookingEndTime) => {
		if (!bookingDate || !bookingEndTime) return false;
		const today = new Date();
		const bookingDateTime = new Date(bookingDate);
		const [hours, minutes] = bookingEndTime.split(':');
		bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
		return bookingDateTime < today;
	}, []);

	// Helper: Check for 2-hour cancellation window
	const isWithinTwoHours = useCallback((dateString, startTime) => {
		if (!dateString || !startTime) return false;
		const now = new Date();
		const bookingDate = new Date(dateString);
		const [hours, minutes] = startTime.split(':');
		bookingDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
		const timeDiff = bookingDate.getTime() - now.getTime();
		return timeDiff > 0 && timeDiff < 7200000;
	}, []);

	const fetchBookings = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const userStr = localStorage.getItem('user');
			if (!userStr) {
				if (navigate) navigate('/login');
				return;
			}

			const user = JSON.parse(userStr);

			const response = await api.get('/book/my-bookings', {
				params: {
					userId: user._id,
					email: user.email,
					page: 1,
					limit: 50,
				},
			});

			if (response.data.bookings) {
				setBookings(response.data.bookings);
			}
		} catch (err) {
			console.error('Fetch error:', err);
			setError(err.response?.data?.message || 'Failed to load bookings');
			if (err.response?.status === 401 && navigate) {
				navigate('/login');
			}
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	useEffect(() => {
		fetchBookings();
	}, [fetchBookings]);

	const handleCancelBooking = async (bookingId) => {
		try {
			const response = await api.delete(`/book/booking/${bookingId}`);
			if (response.status === 200) {
				// Optimistic update
				setBookings((prevBookings) =>
					prevBookings.map((booking) =>
						booking._id === bookingId ? { ...booking, status: 'Canceled' } : booking
					)
				);
				return { success: true, message: 'Booking cancelled successfully.' };
			}
		} catch (err) {
			console.error('Cancel booking error:', err);
			const status = err.response?.status;
			let message = 'Failed to cancel booking';

			if (status === 403) message = 'Cannot cancel this booking - it may be in the past';
			else if (status === 401) {
				if (navigate) navigate('/login');
				return { success: false, message: 'Unauthorized' };
			} else if (err.response?.data?.message) {
				message = err.response.data.message;
			}

			return { success: false, message };
		}
	};

	// Memoized filtered and sorted bookings
	const filteredBookings = useMemo(() => {
		if (!bookings || bookings.length === 0) return [];

		return [...bookings]
			.filter((booking) => {
				if (!booking || !booking.date || !booking.endTime) return false;
				const status = booking.status.toLowerCase();
				const isPast = isBookingPast(booking.date, booking.endTime);

				switch (filter) {
					case 'upcoming':
						return !isPast && !['canceled', 'completed', 'missed'].includes(status);
					case 'past':
						return ['completed', 'missed'].includes(status) || isPast || status === 'canceled';
					default:
						return true;
				}
			})
			.sort((a, b) => {
				if (!a || !a.date) return 1;
				if (!b || !b.date) return -1;
				return new Date(b.date) - new Date(a.date);
			});
	}, [bookings, filter, isBookingPast]);

	return {
		bookings: filteredBookings, // Return the processed list
		allBookings: bookings, // Return raw list if needed
		loading,
		error,
		filter,
		setFilter,
		refreshBookings: fetchBookings,
		cancelBooking: handleCancelBooking,
		isBookingPast,
		isWithinTwoHours,
	};
};
