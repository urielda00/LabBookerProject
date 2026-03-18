import { useState, useCallback, useEffect } from 'react';
import api from '../utils/axiosConfig';

// Hook for SENDING a transfer request (User wants a room)
export const useCreateTransferRequest = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const submitRequest = useCallback(async (bookingId, message) => {
		setLoading(true);
		setError(null);
		try {
			const response = await api.post(`/book/${bookingId}/transfer-request`, { message });
			return { success: true, data: response.data };
		} catch (err) {
			const errorMsg = err.response?.data?.message || 'Failed to send request';
			setError(errorMsg);
			return { success: false, error: errorMsg };
		} finally {
			setLoading(false);
		}
	}, []);

	return { submitRequest, loading, error };
};

// Hook for MANAGING incoming requests (User owns the room)
export const useBookingTransfers = (bookingId) => {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchRequests = useCallback(async () => {
		if (!bookingId) return;
		try {
			setLoading(true);
			const response = await api.get(`/book/${bookingId}/transfer-requests`);
			setRequests(response.data.requests || []);
			setError(null);
		} catch (err) {
			console.error('Fetch error:', err);
			setError('Failed to load requests');
		} finally {
			setLoading(false);
		}
	}, [bookingId]);

	useEffect(() => {
		fetchRequests();
	}, [fetchRequests]);

	const handleAction = async (requestId, action) => {
		// action = 'accept' | 'decline'
		try {
			await api.patch(`/book/transfer-requests/${requestId}/${action}`);

			// Optimistic update
			setRequests((prev) => prev.filter((req) => req._id !== requestId));
			return { success: true };
		} catch (err) {
			const errorMsg = err.response?.data?.message || `Failed to ${action} request`;
			return { success: false, message: errorMsg };
		}
	};

	return {
		requests,
		loading,
		error,
		fetchRequests,
		acceptRequest: (id) => handleAction(id, 'accept'),
		declineRequest: (id) => handleAction(id, 'decline'),
	};
};
