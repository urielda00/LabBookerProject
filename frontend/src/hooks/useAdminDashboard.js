import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const useAdminDashboard = () => {
	const navigate = useNavigate();
	const [userInfo, setUserInfo] = useState({ id: '', email: '', username: '' });
	const [dashboardStats, setDashboardStats] = useState({
		totalUsers: 0,
		recentUsers: [],
		usersByRole: [],
		growthStats: {},
	});
	const [bookingCounts, setBookingCounts] = useState({
		total: 0,
		pending: 0,
		confirmed: 0,
		canceled: 0,
		missed: 0,
	});
	const [issues, setIssues] = useState([]);
	const [issueStats, setIssueStats] = useState({
		total: 0,
		pending: 0,
		'in-progress': 0,
		resolved: 0,
	});
	const [loading, setLoading] = useState(true); // Start loading true
	const [errors, setErrors] = useState('');
	const [chatEnabled, setChatEnabled] = useState(false);

	// Authentication and Role Check
	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		if (!storedUser) {
			navigate('/login');
			return;
		}

		try {
			const parsedUser = JSON.parse(storedUser);
			if (!['admin', 'manager'].includes(parsedUser?.role)) {
				navigate('/homepage');
				return;
			}
			setUserInfo({
				id: parsedUser._id,
				email: parsedUser.email || '',
				username: parsedUser.username || '',
			});
		} catch (error) {
			console.error('Error parsing user data', error);
			navigate('/login');
		}
	}, [navigate]);

	// Fetch Chat Settings
	useEffect(() => {
		const fetchChatSettings = async () => {
			try {
				const response = await api.get('/message/settings');
				setChatEnabled(response.data.enabled);
			} catch (error) {
				// Silent fail or log for chat settings
				console.error('Failed to fetch chat settings', error);
			}
		};
		fetchChatSettings();
	}, []);

	const fetchIssues = useCallback(async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await api.get('/issues/all', {
				headers: { Authorization: `Bearer ${token}` },
			});
			setIssues(response.data);

			// Calculate stats logic moved here
			const stats = response.data.reduce(
				(acc, issue) => {
					acc.total++;
					if (acc[issue.status] !== undefined) {
						acc[issue.status]++;
					}
					return acc;
				},
				{ total: 0, pending: 0, 'in-progress': 0, resolved: 0 }
			);

			setIssueStats(stats);
		} catch (error) {
			setErrors(error?.response?.data?.message || 'Error fetching issues');
		}
	}, []);

	const fetchDashboardStats = useCallback(async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await api.get('/dashboard/stats', {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.data.success) {
				setDashboardStats({
					totalUsers: response.data.stats.totalUsers,
					recentUsers: response.data.stats.recentUsers || [],
					usersByRole: response.data.stats.usersByRole || [],
					growthStats: response.data.stats.growthStats || {},
				});
			}
		} catch (error) {
			setErrors(error?.response?.data?.message || 'Error fetching dashboard data');
		}
	}, []);

	const fetchBookingCounts = useCallback(async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await api.get('/book/bookings/count', {
				headers: { Authorization: `Bearer ${token}` },
			});
			const { total, pending, confirmed, canceled, missed } = response.data.counts;
			setBookingCounts({ total, pending, confirmed, canceled, missed });
		} catch (error) {
			setErrors(error?.response?.data?.message || 'Error fetching bookings');
		}
	}, []);

	// Initial Data Load
	useEffect(() => {
		const loadAllData = async () => {
			setLoading(true);
			setErrors('');
			try {
				await Promise.all([fetchDashboardStats(), fetchBookingCounts(), fetchIssues()]);
			} catch (err) {
				setErrors(err.message || 'Failed to fetch initial data');
			} finally {
				setLoading(false);
			}
		};
		loadAllData();
	}, [fetchDashboardStats, fetchBookingCounts, fetchIssues]);

	// Actions
	const toggleChat = async () => {
		try {
			const response = await api.post('/message/settings', {
				requesterId: userInfo.id,
				enabled: !chatEnabled,
			});
			setChatEnabled(response.data.enabled);
		} catch (err) {
			setErrors(err.response?.data?.message || 'Error toggling chat');
		}
	};

	const updateIssueStatus = async (issueId, newStatus) => {
		try {
			const token = localStorage.getItem('token');
			await api.patch(
				`/issues/update-status/${issueId}`,
				{ status: newStatus },
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			await fetchIssues(); // Refresh only issues
		} catch (error) {
			setErrors(error?.response?.data?.message || 'Error updating status');
		}
	};

	return {
		userInfo,
		dashboardStats,
		bookingCounts,
		issues,
		issueStats,
		loading,
		errors,
		chatEnabled,
		toggleChat,
		updateIssueStatus,
	};
};

export default useAdminDashboard;
