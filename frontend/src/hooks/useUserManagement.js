import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/axiosConfig';

const useUserManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState({
		search: '',
		role: 'all',
	});
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 10,
		totalPages: 1,
	});

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get('/user/admin/users', {
				params: {
					page: pagination.page,
					limit: pagination.limit,
					role: filters.role !== 'all' ? filters.role : undefined,
					search: filters.search,
				},
			});

			setUsers(response.data.docs);
			setPagination((prev) => ({
				...prev,
				page: response.data.page,
				totalPages: response.data.totalPages,
			}));
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to fetch users');
		} finally {
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, filters.role, filters.search]);

	// Trigger fetch when dependencies change
	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleSearch = (searchTerm) => {
		setFilters((prev) => ({ ...prev, search: searchTerm }));
		setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
	};

	const handleRoleFilterChange = (role) => {
		setFilters((prev) => ({ ...prev, role }));
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handlePageChange = (newPage) => {
		if (newPage >= 1 && newPage <= pagination.totalPages) {
			setPagination((prev) => ({ ...prev, page: newPage }));
		}
	};

	const updateUserRole = async (userId, newRole) => {
		try {
			await api.patch(`/user/admin/users/${userId}/role`, { role: newRole });
			toast.success('Role updated successfully');
			fetchUsers();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to update role');
			return false;
		}
	};

	const blockUser = async (userId, duration) => {
		try {
			await api.patch(`/user/admin/users/${userId}/block`, { blockDuration: duration });
			toast.success('User blocked successfully');
			fetchUsers();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to block user');
			return false;
		}
	};

	const unblockUser = async (userId) => {
		try {
			await api.patch(`/user/admin/users/${userId}/unblock`);
			toast.success('User unblocked successfully');
			fetchUsers();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to unblock user');
			return false;
		}
	};

	const deleteUser = async (userId) => {
		try {
			await api.delete(`/user/admin/users/${userId}`);
			toast.success('User deleted successfully');
			fetchUsers();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to delete user');
			return false;
		}
	};

	return {
		users,
		loading,
		pagination,
		filters,
		actions: {
			setSearch: handleSearch,
			setRoleFilter: handleRoleFilterChange,
			setPage: handlePageChange,
			updateUserRole,
			blockUser,
			unblockUser,
			deleteUser,
			refresh: fetchUsers,
		},
	};
};

export default useUserManagement;
