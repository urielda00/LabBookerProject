import { useState, useCallback } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useRoomSchedule = (roomId) => {
	const { t } = useTranslation();
	const [weeklyBookings, setWeeklyBookings] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [declinedRequests, setDeclinedRequests] = useState({});

	// Fetch Weekly Bookings
	const fetchWeeklyBookings = useCallback(async () => {
		if (!roomId) return;

		setLoading(true);
		setError(null);
		try {
			const response = await api.get(`/book/weekly?roomId=${roomId}`);
			setWeeklyBookings(response.data.bookings);
		} catch (err) {
			console.error('Error fetching schedule:', err);
			setError(
				err.response?.data?.message || t('roomCard.failedLoadBookings', 'Failed to load schedule')
			);
		} finally {
			setLoading(false);
		}
	}, [roomId, t]);

	// Check Declined Statuses for a specific user
	const checkDeclinedStatuses = useCallback(async (bookings, userId) => {
		if (!bookings.length || !userId) return;

		const statuses = {};
		// We use a simple loop logic here.
		// OPTIMIZATION: In a real large app, prefer Promise.all, but keeping logic safe as requested.
		for (const booking of bookings) {
			if (booking.userId._id !== userId) {
				try {
					const response = await api.get(`/book/${booking._id}/has-declined-request`, {
						params: { userId },
					});
					statuses[booking._id] = response.data.exists;
				} catch (error) {
					console.error('Error checking declined status:', error);
				}
			}
		}
		setDeclinedRequests(statuses);
	}, []);

	return {
		weeklyBookings,
		loading,
		error,
		declinedRequests,
		fetchWeeklyBookings,
		checkDeclinedStatuses,
		setWeeklyBookings,
	};
};
