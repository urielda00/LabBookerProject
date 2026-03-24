import React, { useEffect, useState } from 'react';
import { SidebarLayout } from '../components/layout/SidebarLayout';
import { useTranslation } from 'react-i18next';
import { User, Trash2, Edit, Ban, CircleX, CheckCircle2, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RoleEditModal from '../components/modals/RoleEditModal';
import BlockUserModal from '../components/modals/BlockUserModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import useUserManagement from '../hooks/useUserManagement';

const UserManagement = () => {
	const { users, loading, pagination, filters, actions } = useUserManagement();
	const { t } = useTranslation();

	const [localSearch, setLocalSearch] = useState(filters.search || '');

	useEffect(() => {
		const timer = setTimeout(() => {
			if (localSearch !== filters.search) {
				actions.setSearch(localSearch);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [localSearch, actions, filters.search]);

	const [selectedUser, setSelectedUser] = useState(null);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [showBlockModal, setShowBlockModal] = useState(false);
	const [showUnblockModal, setShowUnblockModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const onSearchSubmit = (e) => {
		e.preventDefault();
		actions.setSearch(localSearch);
	};

	const handleRoleUpdateWrapper = async (newRole) => {
		const success = await actions.updateUserRole(selectedUser._id, newRole);
		if (success) setShowRoleModal(false);
	};

	const handleBlockUserWrapper = async (duration) => {
		const success = await actions.blockUser(selectedUser._id, duration);
		if (success) setShowBlockModal(false);
	};

	const handleUnblockWrapper = async () => {
		const success = await actions.unblockUser(selectedUser?._id);
		if (success) setShowUnblockModal(false);
	};

	const handleDeleteWrapper = async () => {
		const success = await actions.deleteUser(selectedUser?._id);
		if (success) setShowDeleteModal(false);
	};

	const isBackgroundLoading = loading && users.length > 0;

	return (
		<SidebarLayout>
			<motion.div
				dir='ltr'
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className='w-full p-4 sm:p-6 md:p-8 dark:bg-gray-900 transition-colors duration-300 min-h-screen overflow-x-hidden'
			>
				{loading && users.length === 0 && (
					<div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
						<motion.div
							initial={{ rotate: 0 }}
							animate={{ rotate: 360 }}
							transition={{ repeat: Infinity, duration: 1 }}
							className='text-green-500'
						>
							<Loader2 size={40} className='animate-spin' />
						</motion.div>
					</div>
				)}

				<div className='max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-4rem)]'>
					<motion.h1
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6'
					>
						{t('userManagement.header')}
					</motion.h1>

					<motion.form
						onSubmit={onSearchSubmit}
						className='flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6'
					>
						<div className='flex flex-grow gap-2 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-1 sm:p-2'>
							<div className='relative flex-grow flex items-center'>
								<Search className='h-5 w-5 text-gray-400 ml-2 sm:ml-3 dark:text-gray-500' />
								<input
									type='text'
									placeholder={t('userManagement.searchButton')}
									className='w-full p-2 sm:p-2.5 pl-2 border-0 focus:ring-0 bg-transparent dark:text-gray-200 text-sm sm:text-base'
									value={localSearch}
									onChange={(e) => setLocalSearch(e.target.value)}
								/>
								{isBackgroundLoading && (
									<div className='absolute right-2 top-1/2 -translate-y-1/2'>
										<Loader2 className='w-4 h-4 animate-spin text-green-500' />
									</div>
								)}
							</div>
							<button
								type='submit'
								className='px-4 sm:px-5 bg-green-500 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm text-sm sm:text-base'
							>
								{t('userManagement.searchButton')}
							</button>
						</div>
						<select
							className="p-2.5 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 shadow-sm appearance-none pr-10 bg-no-repeat bg-right-center [background-image:url('data:image/svg+xml;charset=UTF-8,<svg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22><path%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%2F><%2Fsvg>')] dark:text-gray-200"
							value={filters.role}
							onChange={(e) => actions.setRoleFilter(e.target.value)}
						>
							<option value='all'>{t('userManagement.allRoles')}</option>
							<option value='user'>{t('userManagement.user')}</option>
							<option value='admin'>{t('userManagement.admin')}</option>
							<option value='manager'>{t('userManagement.manager')}</option>
							<option value='root'>ROOT</option>
						</select>
					</motion.form>

					{/* Users Table Container with min-height to prevent jumping */}
					<motion.div
						className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-full transition-all duration-500 min-h-[400px] flex flex-col ${
							isBackgroundLoading ? 'opacity-50 grayscale-[20%]' : 'opacity-100'
						}`}
					>
						<div className='overflow-x-auto flex-grow max-w-[calc(100vw-2rem)] sm:max-w-full'>
							<table className='w-full'>
								<thead className='bg-gray-50 dark:bg-gray-700 sticky top-0 z-10'>
									<tr>
										{[
											t('userManagement.columns.user'),
											t('userManagement.columns.email'),
											t('userManagement.columns.role'),
											t('userManagement.columns.status'),
											t('userManagement.columns.actions'),
										].map((header, index) => (
											<th
												key={index}
												className='px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300'
											>
												{header}
											</th>
										))}
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
									<AnimatePresence mode='popLayout'>
										{users.map((user) => (
											<motion.tr
												layout
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.2 }}
												key={user._id}
												className='hover:bg-gray-50/50 dark:hover:bg-gray-700/30'
											>
												<td className='px-3 sm:px-5 py-2 sm:py-3'>
													<div className='flex items-center gap-2 sm:gap-3'>
														<div className='w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center overflow-hidden'>
															{user.profilePicture ? (
																<img
																	src={user.profilePicture}
																	alt={user.username}
																	className='w-full h-full object-cover'
																/>
															) : (
																<User className='w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400' />
															)}
														</div>
														<div>
															<p className='text-sm font-medium text-gray-900 dark:text-gray-200 truncate'>
																{user.name || user.username}
															</p>
															<p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
																@{user.username}
															</p>
														</div>
													</div>
												</td>
												<td className='px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px] sm:max-w-none'>
													{user.email}
												</td>
												<td className='px-3 sm:px-5 py-2 sm:py-3'>
													<span
														className={`px-2 py-1 rounded-full text-xs font-medium ${
															user.role === 'admin'
																? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
																: user.role === 'manager'
																? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
																: user.role === 'root'
																? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
																: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
														}`}
													>
														{user.role.toUpperCase()}
													</span>
												</td>
												<td className='px-3 sm:px-5 py-2 sm:py-3'>
													{user.role === 'root' ? (
														<div className='flex items-center gap-1 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400'>
															<CheckCircle2 size={14} className='shrink-0' />
															<span>{t('userManagement.status.active')}</span>
														</div>
													) : (
														<button
															onClick={() => {
																setSelectedUser(user);
																if (user.cancellationStats?.blockedUntil) {
																	setShowUnblockModal(true);
																} else {
																	setShowBlockModal(true);
																}
															}}
															className='flex items-center gap-1 text-xs sm:text-sm focus:outline-none'
														>
															{user.cancellationStats?.blockedUntil ? (
																<span className='text-red-600 dark:text-red-400 flex items-center gap-1'>
																	<Ban size={14} className='shrink-0' />
																	<span>{t('userManagement.status.blocked')}</span>
																</span>
															) : (
																<span className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1'>
																	<CheckCircle2 size={14} className='shrink-0' />
																	<span>{t('userManagement.status.active')}</span>
																</span>
															)}
														</button>
													)}
												</td>
												<td className='px-3 sm:px-5 py-2 sm:py-3'>
													{user.role !== 'root' && (
														<div className='flex justify-center gap-1 sm:gap-2'>
															<motion.button
																whileHover={{ scale: 1.05 }}
																whileTap={{ scale: 0.95 }}
																className='p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-blue-600 dark:text-blue-400'
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
																	className='p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-emerald-600 dark:text-emerald-400'
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
																	className='p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-amber-600 dark:text-amber-400'
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
																className='p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-red-600 dark:text-red-400'
																onClick={() => {
																	setSelectedUser(user);
																	setShowDeleteModal(true);
																}}
															>
																<Trash2 size={16} />
															</motion.button>
														</div>
													)}
												</td>
											</motion.tr>
										))}
									</AnimatePresence>
								</tbody>
							</table>
						</div>
					</motion.div>

					{/* Pagination remains fixed because of min-h on the table container */}
					<motion.div className='flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 gap-3 flex-shrink-0'>
						<div className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
							{t('userManagement.pagination.page')} {pagination.page} of {pagination.totalPages}
						</div>
						<div className='flex gap-2'>
							<button
								onClick={() => actions.setPage(pagination.page - 1)}
								disabled={pagination.page === 1}
								className='px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50'
							>
								{t('userManagement.pagination.prev')}
							</button>
							<button
								onClick={() => actions.setPage(pagination.page + 1)}
								disabled={pagination.page === pagination.totalPages}
								className='px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50'
							>
								{t('userManagement.pagination.next')}
							</button>
						</div>
					</motion.div>
				</div>

				{/* Modals remain the same */}
				<RoleEditModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} user={selectedUser} onSave={handleRoleUpdateWrapper} className='z-[100]' />
				<BlockUserModal isOpen={showBlockModal} onClose={() => setShowBlockModal(false)} user={selectedUser} onConfirm={handleBlockUserWrapper} className='z-[100]' />
				<ConfirmationModal
					isOpen={showUnblockModal}
					onClose={() => setShowUnblockModal(false)}
					onConfirm={handleUnblockWrapper}
					message={`Are you sure you want to unblock ${selectedUser?.name || selectedUser?.username}?`}
					confirmText='Unblock'
					cancelText='Cancel'
					className='z-[100]'
				/>
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleDeleteWrapper}
					message={`Are you sure you want to permanently delete ${selectedUser?.name || selectedUser?.username}? This action cannot be undone.`}
					confirmText='Delete'
					cancelText='Cancel'
					confirmColor='red'
					className='z-[100]'
				/>
			</motion.div>
		</SidebarLayout>
	);
};

export default UserManagement;