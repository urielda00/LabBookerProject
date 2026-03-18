import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/axiosConfig';

export const useNextBooking = (userInfo, showToast) => {
	const [booking, setBooking] = useState(null);
	const [loading, setLoading] = useState(true);
	const [timeRemaining, setTimeRemaining] = useState(0);
	const [progress, setProgress] = useState(0);
	const [bookingState, setBookingState] = useState('upcoming');
	const [shouldRefetch, setShouldRefetch] = useState(true);

	// Alerts state
	const [showLeaveAlert, setShowLeaveAlert] = useState(false);
	const [canCancel, setCanCancel] = useState(false);

	const intervalRef = useRef(null);

	// Helper to safely parse dates
	const parseDateTime = (dateStr, timeStr) => {
		if (!dateStr || !timeStr) return null;
		try {
			// Ensure format is YYYY-MM-DDTHH:mm:00
			const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
			return new Date(`${datePart}T${timeStr}:00`);
		} catch (e) {
			console.error('Date parsing error:', e);
			return null;
		}
	};

	// 1. Fetch Booking Logic
	useEffect(() => {
		if (!shouldRefetch) return;

		const fetchNextBooking = async () => {
			try {
				setLoading(true);
				const response = await api.get('/book/booking/next');

				// FIX: Check for booking object directly, ignore 'success' flag
				if (response.data && response.data.booking) {
					setBooking(response.data.booking);
				} else {
					setBooking(null);
				}
			} catch (error) {
				// 404 is valid (no booking found), other errors are logged
				if (error.response?.status !== 404) {
					console.error('Error fetching next booking:', error);
				}
				setBooking(null);
			} finally {
				setLoading(false);
				setShouldRefetch(false);
			}
		};

		fetchNextBooking();
	}, [shouldRefetch]);

	// 2. Time & Progress Logic
	useEffect(() => {
		if (!booking) {
			setTimeRemaining(0);
			setProgress(0);
			return;
		}

		const updateState = () => {
			const now = new Date();
			const start = parseDateTime(booking.date, booking.startTime);
			const end = parseDateTime(booking.date, booking.endTime);

			if (!start || !end) return;

			const timeToStart = start - now;
			const timeToEnd = end - now;

			// Case 1: Booking ended
			if (timeToEnd <= 0) {
				setBooking(null);
				setShouldRefetch(true);
				return;
			}

			// Case 2: Upcoming
			if (timeToStart > 0) {
				setBookingState('upcoming');
				setTimeRemaining(Math.floor(timeToStart / 1000));

				// Allow cancel if more than 2 hours left
				setCanCancel(timeToStart > 2 * 60 * 60 * 1000);

				const createdAt = booking.createdAt ? new Date(booking.createdAt) : new Date();
				const totalWait = start - createdAt;
				const elapsed = now - createdAt;

				const safeTotalWait = totalWait > 0 ? totalWait : 1;
				setProgress(Math.max(0, Math.min((elapsed / safeTotalWait) * 100, 100)));

				setShowLeaveAlert(false);
			}
			// Case 3: Active
			else {
				setBookingState('active');
				setTimeRemaining(Math.floor(timeToEnd / 1000));

				const totalDuration = end - start;
				const elapsed = now - start;

				const safeDuration = totalDuration > 0 ? totalDuration : 1;
				setProgress(Math.max(0, Math.min((elapsed / safeDuration) * 100, 100)));

				// Alerts logic
				const minutesLeft = Math.floor(timeToEnd / 60000);
				if (booking.checkedIn) {
					if (minutesLeft <= 3) setShowLeaveAlert('urgent');
					else if (minutesLeft <= 15) setShowLeaveAlert('warning');
					else setShowLeaveAlert(false);
				}
			}
		};

		updateState();
		intervalRef.current = setInterval(updateState, 1000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [booking]);

	// 3. Actions
	const handleCheckIn = useCallback(async () => {
		if (!booking) return;
		try {
			setBooking((prev) => ({ ...prev, checkedIn: true }));
			const response = await api.post(`/book/booking/${booking._id}/check-in`);
			if (response.data && (response.data.success || response.status === 200)) {
				if (showToast) showToast('success', 'Successfully checked in!');
			}
		} catch (error) {
			console.error('Check-in failed:', error);
			if (showToast) showToast('error', error.response?.data?.message || 'Check-in failed');
			setShouldRefetch(true);
		}
	}, [booking, showToast]);

	const handleCancelBooking = useCallback(async () => {
		if (!booking) return;
		try {
			await api.delete(`/book/booking/${booking._id}`);
			if (showToast) showToast('success', 'Booking cancelled successfully');
			setBooking(null);
			setShouldRefetch(true);
		} catch (error) {
			console.error('Cancellation failed:', error);
			if (showToast) showToast('error', 'Failed to cancel booking');
		}
	}, [booking, showToast]);

	const refreshBooking = useCallback(() => {
		setShouldRefetch(true);
	}, []);

	return {
		booking,
		loading,
		timeRemaining,
		progress,
		bookingState,
		showLeaveAlert,
		canCancel,
		handleCheckIn,
		handleCancelBooking,
		refreshBooking,
	};
};
