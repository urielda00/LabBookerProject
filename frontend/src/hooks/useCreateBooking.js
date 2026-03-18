import { useState, useCallback } from 'react';
import api from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

export const useCreateBooking = (onSuccess) => {
	const { t } = useTranslation();

	// Form State
	const [formData, setFormData] = useState({
		roomName: '',
		username: '',
		colleagues: [],
		date: '',
		startTime: '',
		endTime: '',
	});
	const [colleagueEmail, setColleagueEmail] = useState('');

	// Logic State
	const [roomConfig, setRoomConfig] = useState({
		type: null,
		requiredUsers: 0,
		maxAdditionalUsers: 0,
	});

	// Availability State
	const [availabilityData, setAvailabilityData] = useState({
		raw: null,
		displaySlots: [],
		availableDates: [],
	});

	// UI Status State
	const [status, setStatus] = useState({
		loadingAvailability: false,
		isSubmitting: false,
		error: '',
		success: '',
	});

	// --- Actions ---

	const updateField = (name, value) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		setStatus((prev) => ({ ...prev, error: '', success: '' }));
	};

	const setStatusMsg = (type, msg) => {
		setStatus((prev) => ({ ...prev, [type]: msg }));
	};

	// 1. Fetch Room Details
	const fetchRoomDetails = async () => {
		if (!formData.roomName.trim()) {
			setStatusMsg('error', 'Please enter a room name before fetching details.');
			return;
		}

		try {
			const response = await api.get(`/room/rooms/${formData.roomName.trim()}`);
			if (response.status === 200) {
				const room = response.data;

				// Determine constraints based on room type
				let required = 0;
				let max = 0;

				switch (room.type) {
					case 'Small Seminar':
						required = 2;
						max = 2;
						break;
					case 'Large Seminar':
						required = 3;
						max = 3;
						break;
					default: // "Open" or others
						required = 0;
						max = 0;
				}

				setRoomConfig({ type: room.type, requiredUsers: required, maxAdditionalUsers: max });

				// Reset dependent fields
				setColleagueEmail('');
				setFormData((prev) => ({ ...prev, colleagues: [] }));

				setStatus({
					loadingAvailability: false,
					isSubmitting: false,
					error: '',
					success: t('createBookingByNames.roomFetched'),
				});
			}
		} catch (error) {
			setStatusMsg(
				'error',
				error.response?.data?.message || t('createBookingByNames.fetchRoomError')
			);
			setRoomConfig({ type: null, requiredUsers: 0, maxAdditionalUsers: 0 });
			setFormData((prev) => ({ ...prev, colleagues: [] }));
		}
	};

	// 2. Colleague Management
	const addColleague = () => {
		const email = colleagueEmail.trim();
		if (!email) {
			setStatusMsg('error', t('createBookingByNames.invalidEmail'));
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setStatusMsg('error', t('createBookingByNames.invalidEmail'));
			return;
		}

		if (formData.colleagues.length >= roomConfig.maxAdditionalUsers) {
			setStatusMsg(
				'error',
				t('createBookingByNames.maxUsers', { count: roomConfig.maxAdditionalUsers })
			);
			return;
		}

		if (formData.colleagues.includes(email)) {
			setStatusMsg('error', t('createBookingByNames.duplicateEmail'));
			return;
		}

		setFormData((prev) => ({ ...prev, colleagues: [...prev.colleagues, email] }));
		setColleagueEmail('');
		setStatusMsg('success', t('createBookingByNames.colleagueAdded'));
	};

	const removeColleague = (emailToRemove) => {
		setFormData((prev) => ({
			...prev,
			colleagues: prev.colleagues.filter((email) => email !== emailToRemove),
		}));
		setStatusMsg('success', t('createBookingByNames.colleagueRemoved'));
	};

	// 3. Availability
	const fetchAvailability = async () => {
		if (!formData.roomName) {
			setStatusMsg('error', t('createBookingByNames.roomRequired'));
			return;
		}

		setStatus((prev) => ({ ...prev, loadingAvailability: true, error: '', success: '' }));
		setAvailabilityData({ raw: null, displaySlots: [], availableDates: [] });

		try {
			const response = await api.get(
				`/room/rooms-by-name/${formData.roomName}/monthly-availability`
			);
			if (response.status === 200) {
				const raw = response.data.availability || [];
				setAvailabilityData({
					raw,
					availableDates: raw.map((day) => day.date),
					displaySlots: [],
				});
				setStatusMsg('success', t('createBookingByNames.success.availabilityFetched'));
			}
		} catch (error) {
			setStatusMsg(
				'error',
				error.response?.data?.message ||
					t('createBookingByNames.errors.fetchAvailabilityError', { roomName: formData.roomName })
			);
		} finally {
			setStatus((prev) => ({ ...prev, loadingAvailability: false }));
		}
	};

	const handleDateSelected = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;

		setFormData((prev) => ({ ...prev, date: dateStr, startTime: '', endTime: '' }));

		if (availabilityData.raw) {
			const dayAvailability = availabilityData.raw.find((d) => d.date === dateStr);

			if (dayAvailability) {
				const today = new Date();
				const isToday = dateStr === today.toISOString().split('T')[0];
				const currentTime = today.getHours() * 60 + today.getMinutes();

				const updatedSlots = dayAvailability.slots.map((slot) => {
					if (isToday) {
						const [endHour, endMinute] = slot.endTime.split(':').map(Number);
						const slotEndTime = endHour * 60 + endMinute;
						return { ...slot, isPast: slotEndTime <= currentTime };
					}
					return { ...slot, isPast: false };
				});

				setAvailabilityData((prev) => ({ ...prev, displaySlots: updatedSlots }));
			} else {
				setAvailabilityData((prev) => ({ ...prev, displaySlots: [] }));
			}
		}
	};

	const handleSlotSelect = (slot) => {
		if (slot.status !== 'Available' || slot.isPast) return;
		setFormData((prev) => ({ ...prev, startTime: slot.startTime, endTime: slot.endTime }));
		setStatusMsg('error', '');
	};

	// 4. Submit
	const validateForm = () => {
		if (!formData.roomName.trim()) return t('createBookingByNames.errors.roomRequired');
		if (!formData.username.trim()) return t('createBookingByNames.errors.usernameRequired');
		if (!formData.date) return t('createBookingByNames.errors.dateRequired');
		if (!formData.startTime || !formData.endTime)
			return t('createBookingByNames.errors.timeRequired');

		if (roomConfig.type !== 'Open' && formData.colleagues.length !== roomConfig.requiredUsers) {
			return t('createBookingByNames.errors.smallSeminarRequirement'); // Generic message for requirements
		}
		return '';
	};

	const submitBooking = async (e) => {
		e.preventDefault();
		const errorMsg = validateForm();
		if (errorMsg) {
			setStatusMsg('error', errorMsg);
			return;
		}

		setStatus((prev) => ({ ...prev, isSubmitting: true, error: '', success: '' }));

		try {
			const token = localStorage.getItem('token');
			const response = await api.post(
				'/book/booking/create-by-names',
				{
					username: formData.username.trim(),
					roomName: formData.roomName.trim(),
					date: formData.date,
					startTime: formData.startTime,
					endTime: formData.endTime,
					additionalUsers: formData.colleagues,
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (response.status === 201) {
				setStatusMsg('success', response.data.message || t('createBookingByNames.bookingCreated'));
				onSuccess?.(response.data.message);

				// Reset Logic
				setFormData({
					roomName: '',
					username: '',
					colleagues: [],
					date: '',
					startTime: '',
					endTime: '',
				});
				setColleagueEmail('');
				setAvailabilityData({ raw: null, displaySlots: [], availableDates: [] });
				setRoomConfig({ type: null, requiredUsers: 0, maxAdditionalUsers: 0 });
			}
		} catch (err) {
			setStatusMsg(
				'error',
				err.response?.data?.message || t('createBookingByNames.createBookingError')
			);
		} finally {
			setStatus((prev) => ({ ...prev, isSubmitting: false }));
		}
	};

	return {
		formData,
		colleagueEmail,
		roomConfig,
		availabilityData,
		status,
		// Setters
		setColleagueEmail,
		setStatusMsg,
		updateField,
		// Actions
		fetchRoomDetails,
		addColleague,
		removeColleague,
		fetchAvailability,
		handleDateSelected,
		handleSlotSelect,
		submitBooking,
	};
};
