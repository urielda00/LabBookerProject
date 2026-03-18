import { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useUpdateRoom = (roomId, setRoomId, roomDetails, setRoomDetails, onSuccess) => {
	const { t } = useTranslation();

	// Local State
	const [roomsList, setRoomsList] = useState([]);
	const [formData, setFormData] = useState({
		name: '',
		type: '',
		capacity: '',
		description: '',
		amenities: [], // Stores names of amenities
		image: null,
	});

	const [selectedAmenities, setSelectedAmenities] = useState([]);
	const [showForm, setShowForm] = useState(false);

	// UI Status State
	const [status, setStatus] = useState({
		loading: false, // For submission
		fetchingRoom: false, // For fetching details
		error: '',
		success: '',
	});

	// 1. Fetch All Rooms (for the dropdown list)
	useEffect(() => {
		const fetchAllRooms = async () => {
			try {
				const response = await api.get('/room/rooms');
				setRoomsList(response.data);
			} catch (err) {
				setStatus((prev) => ({
					...prev,
					error: t('updateRoom.validation.loadRoomsError', 'Failed to load rooms list.'),
				}));
			}
		};
		fetchAllRooms();
	}, [t]);

	// 2. Fetch Specific Room Details
	const handleRoomFetch = async () => {
		if (!roomId) {
			setStatus((prev) => ({
				...prev,
				error: t('updateRoom.validation.noRoomSelected', 'Please select a room.'),
			}));
			return;
		}

		setStatus((prev) => ({ ...prev, fetchingRoom: true, error: '', success: '' }));

		try {
			const response = await api.get(`/room/rooms/${roomId}`);
			const room = response.data;

			// Populate Form Data
			setFormData({
				name: room.name,
				type: room.type,
				capacity: room.capacity,
				description: room.description,
				amenities: room.amenities.map((a) => a.name), // Map objects to names
				image: room.imageUrl,
			});

			// Initialize selected amenities for checkboxes
			setSelectedAmenities(room.amenities.map((a) => a.name));

			// Update parent state
			setRoomDetails(room);
			setShowForm(true);
		} catch (err) {
			setStatus((prev) => ({
				...prev,
				error: t('updateRoom.validation.fetchRoomError', 'Failed to fetch room details.'),
			}));
		} finally {
			setStatus((prev) => ({ ...prev, fetchingRoom: false }));
		}
	};

	// 3. Form Field Handlers
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleImageChange = (e) => {
		setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
	};

	const handleAmenityToggle = (amenity) => {
		setSelectedAmenities((prev) =>
			prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
		);
	};

	const clearMessages = () => {
		setStatus((prev) => ({ ...prev, error: '', success: '' }));
	};

	// 4. Submit Logic
	const validateForm = () => {
		if (!formData.name || !formData.type || !formData.capacity) {
			return t('updateRoom.validation.requiredFields', 'Please fill in required fields.');
		}
		if (selectedAmenities.length < 3) {
			return t('updateRoom.validation.minAmenities', 'Please select at least 3 amenities.');
		}
		return null;
	};

	const submitUpdate = async (e) => {
		e.preventDefault();

		// Validate
		const validationError = validateForm();
		if (validationError) {
			setStatus((prev) => ({ ...prev, error: validationError }));
			return;
		}

		setStatus((prev) => ({ ...prev, loading: true, error: '', success: '' }));

		// Prepare Payload
		const amenitiesPayload = selectedAmenities.map((name) => ({
			name,
			icon: name, // Assuming icon name matches amenity name as per original logic
		}));

		const formPayload = new FormData();
		formPayload.append('name', formData.name);
		// Important: Send original name to backend for identification if name changed
		formPayload.append('originalName', roomDetails?.name);
		formPayload.append('type', formData.type);
		formPayload.append('capacity', formData.capacity);
		formPayload.append('description', formData.description);
		formPayload.append('amenities', JSON.stringify(amenitiesPayload));

		if (formData.image instanceof File) {
			formPayload.append('image', formData.image);
		}

		try {
			const response = await api.put(`/room/rooms/${roomId}`, formPayload, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			if (response.status === 200) {
				const successMsg = t('updateRoom.messages.success', 'Room updated successfully!');
				setStatus((prev) => ({ ...prev, success: successMsg }));
				onSuccess?.(successMsg);

				// Reset everything
				setFormData({
					name: '',
					type: '',
					capacity: '',
					description: '',
					amenities: [],
					image: null,
				});
				setSelectedAmenities([]);
				setRoomId('');
				setRoomDetails(null);
				setShowForm(false);
			}
		} catch (err) {
			const errorMsg =
				err.response?.data?.message || t('updateRoom.messages.error', 'Update failed.');
			setStatus((prev) => ({ ...prev, error: errorMsg }));
		} finally {
			setStatus((prev) => ({ ...prev, loading: false }));
		}
	};

	return {
		roomsList,
		formData,
		selectedAmenities,
		showForm,
		status,
		handleRoomFetch,
		handleInputChange,
		handleImageChange,
		handleAmenityToggle,
		submitUpdate,
		clearMessages,
	};
};
