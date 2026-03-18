import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

// --- Helpers ---

// Helper: Get initial colleagues based on room type
const getInitialColleagues = (type) => {
	if (type === 'Large Seminar') return ['', '', ''];
	if (type === 'Small Seminar') return ['', ''];
	return [];
};

// Helper: Simple Email Validator
const isValidEmail = (email) => {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const useRoomCardBooking = (room, activeRoom, userInfo, handleStartBooking) => {
	const { t } = useTranslation();

	// --- State ---
	const [formData, setFormData] = useState({
		colleagues: [],
		date: '',
		startTime: '',
		endTime: '',
	});

	const [availabilityData, setAvailabilityData] = useState({
		raw: null,
		displaySlots: [],
		availableDates: [],
	});

	const [status, setStatus] = useState({
		isSubmitting: false,
		error: '',
		success: '',
	});

	// --- Effects ---

	// 1. Initialize Form State when room type changes
	useEffect(() => {
		setFormData((prev) => ({
			...prev,
			colleagues: getInitialColleagues(room.type),
		}));
	}, [room.type]);

	// 2. Fetch Availability Logic (Only when room is active)
	useEffect(() => {
		if (activeRoom !== room._id) return;

		const fetchAvailability = async () => {
			try {
				const res = await api.get(`/room/rooms/${room._id}/monthly-availability`);
				const raw = res.data.availability || [];
				setAvailabilityData({
					raw,
					availableDates: raw.map((day) => day.date),
					displaySlots: [],
				});
			} catch (error) {
				console.error('Error fetching availability:', error);
				setStatus((prev) => ({
					...prev,
					error: t('errors.fetchError') || 'Unable to fetch room availability.',
				}));
			}
		};

		fetchAvailability();
	}, [activeRoom, room._id, t]);

	// 3. Reset Handler (When switching/closing rooms)
	useEffect(() => {
		if (activeRoom !== room._id) {
			setFormData({
				colleagues: getInitialColleagues(room.type),
				date: '',
				startTime: '',
				endTime: '',
			});
			setStatus({ isSubmitting: false, error: '', success: '' });
			setAvailabilityData((prev) => ({ ...prev, displaySlots: [] }));
		}
	}, [activeRoom, room._id, room.type]);

	// 4. Auto-clear Success Message
	useEffect(() => {
		if (!status.success) return;

		const timer = setTimeout(() => {
			setFormData((prev) => ({
				...prev,
				colleagues: getInitialColleagues(room.type),
				date: '',
				startTime: '',
				endTime: '',
			}));
			setStatus((prev) => ({ ...prev, success: '' }));
		}, 3000);

		return () => clearTimeout(timer);
	}, [status.success, room.type]);

	// --- Handlers ---

	const handleInputChange = useCallback((e) => {
		const { name, value } = e.target;
		if (name.startsWith('colleague')) {
			const index = parseInt(name.split('_')[1], 10);
			setFormData((prev) => {
				const updatedColleagues = [...prev.colleagues];
				updatedColleagues[index] = value;
				return { ...prev, colleagues: updatedColleagues };
			});
		} else {
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
		setStatus((prev) => ({ ...prev, error: '' }));
	}, []);

	const handleDateSelected = useCallback(
		(date) => {
			if (!date) return;

			// Format Date manually to ensure YYYY-MM-DD local time
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const dateStr = `${year}-${month}-${day}`;

			setFormData((prev) => ({ ...prev, date: dateStr, startTime: '', endTime: '' }));

			if (!availabilityData.raw) return;

			const dayAvailability = availabilityData.raw.find((d) => d.date === dateStr);
			if (dayAvailability) {
				const today = new Date();
				const isToday = dateStr === today.toISOString().split('T')[0];
				const currentTimeValue = today.getHours() * 60 + today.getMinutes();

				const updatedSlots = dayAvailability.slots.map((slot) => {
					if (isToday) {
						const [endHour, endMinute] = slot.endTime.split(':').map(Number);
						return { ...slot, isPast: endHour * 60 + endMinute <= currentTimeValue };
					}
					return { ...slot, isPast: false };
				});

				setAvailabilityData((prev) => ({ ...prev, displaySlots: updatedSlots }));
			} else {
				setAvailabilityData((prev) => ({ ...prev, displaySlots: [] }));
			}
		},
		[availabilityData.raw]
	);

	const handleSlotSelect = useCallback((slot) => {
		if (slot.status !== 'Available' || slot.isPast) return;
		setFormData((prev) => ({ ...prev, startTime: slot.startTime, endTime: slot.endTime }));
		setStatus((prev) => ({ ...prev, error: '' }));
	}, []);

	const handleProceedBooking = async () => {
		setStatus((prev) => ({ ...prev, error: '', isSubmitting: true }));

		// --- Client Side Validation ---

		// Check for invalid colleague emails
		let invalidColleagueIndex = -1;
		for (let i = 0; i < formData.colleagues.length; i++) {
			const email = formData.colleagues[i];
			if (email.trim() !== '' && !isValidEmail(email)) {
				invalidColleagueIndex = i;
				break;
			}
		}

		if (invalidColleagueIndex !== -1) {
			setStatus({
				isSubmitting: false,
				success: '',
				// Using the specific translation key provided
				error: t('errors.invalidEmail', { number: invalidColleagueIndex + 1 }),
			});
			return;
		}

		// Basic check for Date/Time
		if (!formData.date) {
			setStatus({ isSubmitting: false, success: '', error: t('errors.chooseDate') });
			return;
		}
		if (!formData.startTime || !formData.endTime) {
			setStatus({ isSubmitting: false, success: '', error: t('errors.selectTimeSlot') });
			return;
		}

		// --- Server Request ---
		try {
			const response = await api.post('/book/booking', {
				roomId: room._id,
				userId: userInfo._id,
				date: formData.date,
				startTime: formData.startTime,
				endTime: formData.endTime,
				additionalUsers: formData.colleagues,
			});

			if (response.status === 201) {
				setStatus({ isSubmitting: false, error: '', success: response.data.message });
			} else {
				setStatus({ isSubmitting: false, success: '', error: response.data.message });
			}
		} catch (error) {
			console.error('Error booking room:', error);

			let errorMessage = error.response?.data?.message || t('errors.generalError');

			// Fallback for raw backend validation error
			if (errorMessage === 'validation.errors.failed') {
				errorMessage = t('errors.generalError');
			}

			setStatus({
				isSubmitting: false,
				success: '',
				error: errorMessage,
			});
		}
	};

	const formatTime = (timeStr, isEndTime = false) => {
		let [hours, minutes] = timeStr.split(':').map(Number);
		if (isEndTime) {
			minutes += 1;
			if (minutes >= 60) {
				minutes = 0;
				hours += 1;
			}
		}
		return format(new Date(2020, 0, 1, hours, minutes), 'h:mm a');
	};

	const closeModal = () => handleStartBooking(null);

	return {
		formData,
		availabilityData,
		status,
		handleInputChange,
		handleDateSelected,
		handleSlotSelect,
		formatTime,
		handleProceedBooking,
		closeModal,
		setStatus,
	};
};
