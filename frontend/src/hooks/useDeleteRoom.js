import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useDeleteRoom = (onSuccess) => {
	const { t } = useTranslation();
	const [roomsList, setRoomsList] = useState([]);
	const [selectedRoomId, setSelectedRoomId] = useState('');
	const [relatedBookings, setRelatedBookings] = useState([]);

	const [status, setStatus] = useState({
		loading: false,
		loadingRooms: true,
		error: '',
		success: '',
	});

	// 1. Fetch Rooms List
	const fetchRooms = useCallback(async () => {
		setStatus((prev) => ({ ...prev, loadingRooms: true, error: '' }));
		try {
			const response = await api.get('/room/rooms');
			setRoomsList(response.data);
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: t('deleteRoom.errors.loadFailed', 'Failed to load rooms'),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, loadingRooms: false }));
		}
	}, [t]);

	useEffect(() => {
		fetchRooms();
	}, [fetchRooms]);

	// 2. Handle Room Selection & Fetch Bookings
	const handleRoomSelect = async (roomId) => {
		setSelectedRoomId(roomId);
		setRelatedBookings([]);
		setStatus((prev) => ({ ...prev, error: '', success: '' }));

		if (!roomId) return;

		try {
			const response = await api.get(`/book/bookings/by-room/${roomId}`);
			if (response.data.success) {
				setRelatedBookings(response.data.bookings);
			}
		} catch (err) {
			console.error('Failed to fetch related bookings', err);
			// We don't block deletion if booking fetch fails, but we warn
		}
	};

	// 3. Delete Logic
	const confirmDelete = async () => {
		if (!selectedRoomId) return;

		setStatus((prev) => ({ ...prev, loading: true, error: '' }));

		try {
			const response = await api.delete(`/room/rooms/${selectedRoomId}`);
			if (response.status === 200) {
				const deletedRoom = roomsList.find((r) => r.name === selectedRoomId);

				// Update Local List
				setRoomsList((prev) => prev.filter((r) => r.name !== selectedRoomId));
				setRelatedBookings([]);
				setSelectedRoomId('');

				// Construct success message object or string
				const successMsg = {
					title: t('deleteRoom.successMessage.title'),
					details: deletedRoom,
					bookingsCount: relatedBookings.length,
				};

				setStatus((prev) => ({ ...prev, success: successMsg }));
				onSuccess?.(successMsg);
			}
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: err.response?.data?.message || t('deleteRoom.errors.deleteFailed'),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, loading: false }));
		}
	};

	const clearMessages = () => setStatus((prev) => ({ ...prev, error: '', success: '' }));

	return {
		roomsList,
		selectedRoomId,
		relatedBookings,
		status,
		handleRoomSelect,
		confirmDelete,
		clearMessages,
	};
};
