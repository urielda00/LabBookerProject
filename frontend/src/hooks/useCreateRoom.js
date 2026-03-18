import { useState } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useCreateRoom = (onSuccess) => {
	const { t } = useTranslation();

	// State
	const [formData, setFormData] = useState({
		name: '',
		type: '',
		capacity: '',
		description: '',
		image: null,
	});

	const [selectedAmenities, setSelectedAmenities] = useState([]);
	const [status, setStatus] = useState({
		loading: false,
		error: '',
		success: '',
	});

	// --- Handlers ---

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		// Clear errors on change
		if (status.error) setStatus((prev) => ({ ...prev, error: '' }));
	};

	const handleImageChange = (e) => {
		setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
	};

	const handleAmenityToggle = (amenity) => {
		setSelectedAmenities((prev) =>
			prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
		);
	};

	// --- Submit Logic ---

	const validateForm = () => {
		if (!formData.name || !formData.type || !formData.capacity) {
			return t(
				'createRoom.validation.requiredFields',
				'Please fill in the name, type, and capacity fields.'
			);
		}
		if (selectedAmenities.length < 3) {
			return t('createRoom.validation.minAmenities', 'Please select at least three amenities.');
		}
		return null;
	};

	const submitRoom = async (e) => {
		e.preventDefault();

		// 1. Validate
		const validationError = validateForm();
		if (validationError) {
			setStatus((prev) => ({ ...prev, error: validationError, success: '' }));
			return;
		}

		setStatus((prev) => ({ ...prev, loading: true, error: '', success: '' }));

		// 2. Prepare Payload (FormData for file upload)
		const amenitiesPayload = selectedAmenities.map((name) => ({ name, icon: name }));

		const formPayload = new FormData();
		formPayload.append('name', formData.name);
		formPayload.append('type', formData.type);
		formPayload.append('capacity', formData.capacity);
		formPayload.append('description', formData.description);
		formPayload.append('amenities', JSON.stringify(amenitiesPayload));
		if (formData.image) formPayload.append('image', formData.image);

		// 3. Send Request
		try {
			const response = await api.post('/room/rooms', formPayload, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			if (response.status === 201) {
				const successMsg = t('createRoom.success', 'Room created successfully!');
				setStatus({ loading: false, error: '', success: successMsg });
				onSuccess?.(successMsg);

				// Reset Form
				setFormData({
					name: '',
					type: '',
					capacity: '',
					description: '',
					image: null,
				});
				setSelectedAmenities([]);
			}
		} catch (err) {
			const errorMsg =
				err.response?.data?.message ||
				t('createRoom.error', 'An error occurred while creating the room');
			setStatus({ loading: false, error: errorMsg, success: '' });
		}
	};

	const clearMessages = () => {
		setStatus((prev) => ({ ...prev, error: '', success: '' }));
	};

	return {
		formData,
		selectedAmenities,
		status,
		handleInputChange,
		handleImageChange,
		handleAmenityToggle,
		submitRoom,
		clearMessages,
	};
};
