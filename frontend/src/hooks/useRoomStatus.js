import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';

export const useRoomStatus = () => {
	const [roomStatuses, setRoomStatuses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchRoomStatuses = useCallback(async () => {
		try {
			setLoading(true);

			// Execute requests in parallel
			const [roomsResponse, activeBookingsResponse] = await Promise.all([
				api.get('room/rooms'),
				api.get('/book/bookings', { params: { status: 'Active' } }),
			]);

			const rooms = roomsResponse.data;
			const activeBookings = activeBookingsResponse.data.bookings || activeBookingsResponse.data;

			const statusData = rooms.map((room) => {
				const activeBooking = activeBookings.find((booking) => {
					const bookingRoomId = booking.roomId?._id
						? booking.roomId._id.toString()
						: booking.roomId.toString();
					return bookingRoomId === room._id.toString();
				});

				return {
					id: room._id,
					name: room.name,
					isActive: !!activeBooking,
					currentBooking: activeBooking ? { endTime: activeBooking.endTime } : null,
				};
			});

			setRoomStatuses(statusData);
			setError(null);
		} catch (err) {
			console.error('Failed to fetch room statuses', err);
			setError('Failed to load room statuses');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchRoomStatuses();

		// Optional: Set up polling every minute to keep statuses fresh
		const interval = setInterval(fetchRoomStatuses, 60000);
		return () => clearInterval(interval);
	}, [fetchRoomStatuses]);

	return { roomStatuses, loading, error, refreshRoomStatuses: fetchRoomStatuses };
};
