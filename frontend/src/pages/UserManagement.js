import React, { useEffect, useState, useCallback } from "react";
import { SidebarLayout } from "../components/SidebarLayout";
import {
  User,
  Trash2,
  Edit,
  Ban,
  CircleX,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import api from "../utils/axiosConfig";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import RoleEditModal from "../components/RoleEditModal";
import BlockUserModal from "../components/BlockUserModal";
import ConfirmationModal from "../components/cnfrmModal";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(
    async (
      page = pagination.page,
      role = selectedRole,
      search = searchTerm
    ) => {
      try {
        setLoading(true);
        const response = await api.get("/user/admin/users", {
          params: {
            page,
            limit: pagination.limit,
            role: role !== "all" ? role : undefined,
            search,
          },
        });

        setUsers(response.data.docs);
        setPagination((prev) => ({
          ...prev,
          page: response.data.page,
          totalPages: response.data.totalPages,
        }));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, selectedRole, searchTerm]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, pagination.page]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, selectedRole, searchTerm);
  };

  const handleRoleUpdate = async (newRole) => {
    try {
      await api.patch(`/user/admin/users/${selectedUser._id}/role`, {
        role: newRole,
      });
      toast.success("Role updated successfully");
      fetchUsers();
      setShowRoleModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const handleBlockUser = async (duration) => {
    try {
      await api.patch(`/user/admin/users/${selectedUser._id}/block`, {
        blockDuration: duration,
      });
      toast.success("User blocked successfully");
      fetchUsers();
      setShowBlockModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await api.patch(`/user/admin/users/${userId}/unblock`);
      toast.success("User unblocked successfully");
      fetchUsers();
      setShowUnblockModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/user/admin/users/${userId}`);
      toast.success("User deleted successfully");
      fetchUsers();
      setShowDeleteModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <SidebarLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full p-4 sm:p-6 md:p-8 dark:bg-gray-900 transition-colors duration-300 min-h-screen overflow-x-hidden"
      >
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-green-500"
            >
              <Loader2 size={40} className="animate-spin" />
            </motion.div>
          </div>
        )}

        <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
          {/* Header */}
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6"
          >
            User Management
          </motion.h1>

          {/* Search and Filter */}
          <motion.form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6"
          >
            <div className="flex flex-grow gap-2 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-1 sm:p-2">
              <div className="relative flex-grow flex items-center">
                <Search className="h-5 w-5 text-gray-400 ml-2 sm:ml-3 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full p-2 sm:p-2.5 pl-2 border-0 focus:ring-0 bg-transparent dark:text-gray-200 text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="px-4 sm:px-5 bg-green-500 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm text-sm sm:text-base"
              >
                Search
              </button>
            </div>
            <select
              className="p-2.5 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 shadow-sm appearance-none pr-10 bg-no-repeat bg-right-center [background-image:url('data:image/svg+xml;charset=UTF-8,<svg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22><path%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%2F><%2Fsvg>')] dark:text-gray-200"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </motion.form>

          {/* Users Table */}
          <motion.div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-full">
            <div className="overflow-x-auto max-w-[calc(100vw-2rem)] sm:max-w-full">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["User", "Email", "Role", "Status", "Actions"].map(
                      (header, index) => (
                        <th
                          key={index}
                          className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <AnimatePresence>
                    {users.map((user) => (
                      <motion.tr
                        key={user._id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                      >
                        {/* User Cell */}
                        <td className="px-3 sm:px-5 py-2 sm:py-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                                {user.name || user.username}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email Cell */}
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px] sm:max-w-none">
                          {user.email}
                        </td>

                        {/* Role Cell */}
                        <td className="px-3 sm:px-5 py-2 sm:py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                                : user.role === "manager"
                                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </td>

                        {/* Status Cell */}
                        <td className="px-3 sm:px-5 py-2 sm:py-3">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              if (user.cancellationStats?.blockedUntil) {
                                setShowUnblockModal(true);
                              } else {
                                setShowBlockModal(true);
                              }
                            }}
                            className="flex items-center gap-1 text-xs sm:text-sm focus:outline-none"
                          >
                            {user.cancellationStats?.blockedUntil ? (
                              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                <Ban size={14} className="shrink-0" />
                                <span>Blocked</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={14} className="shrink-0" />
                                <span>Active</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions Cell */}
                        <td className="px-3 sm:px-5 py-2 sm:py-3">
                          <div className="flex justify-center gap-1 sm:gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-blue-600 dark:text-blue-400"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRoleModal(true);
                              }}
                            >
                              <Edit size={16} />
                            </motion.button>

                            {user.cancellationStats?.blockedUntil ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-emerald-600 dark:text-emerald-400"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUnblockModal(true);
                                }}
                              >
                                <CircleX size={16} />
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-amber-600 dark:text-amber-400"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBlockModal(true);
                                }}
                              >
                                <Ban size={16} />
                              </motion.button>
                            )}

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-red-600 dark:text-red-400"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pagination */}
          <motion.div className="flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 gap-3 flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </motion.div>
        </div>
        {/* Modals */}
        <RoleEditModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          user={selectedUser}
          onSave={handleRoleUpdate}
          className="z-[100]"
        />

        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          user={selectedUser}
          onConfirm={handleBlockUser}
          className="z-[100]"
        />

        <ConfirmationModal
          isOpen={showUnblockModal}
          onClose={() => setShowUnblockModal(false)}
          onConfirm={() => handleUnblock(selectedUser?._id)}
          message={`Are you sure you want to unblock ${
            selectedUser?.name || selectedUser?.username
          }?`}
          confirmText="Unblock"
          cancelText="Cancel"
          className="z-[100]"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDelete(selectedUser?._id)}
          message={`Are you sure you want to permanently delete ${
            selectedUser?.name || selectedUser?.username
          }? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          className="z-[100]"
        />
      </motion.div>
    </SidebarLayout>
  );
};

export default UserManagement;
