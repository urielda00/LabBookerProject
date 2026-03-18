import React, { useState, useEffect, useMemo } from 'react';
import { SidebarLayout } from '../components/layout/SidebarLayout';
import { AlertCircle, Search, CheckCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axiosConfig';

// Configuration for status styling
const STATUS_STYLES = {
	pending: {
		background: 'bg-yellow-50',
		text: 'text-yellow-700',
		hover: 'hover:bg-yellow-100',
		border: 'border-yellow-200',
	},
	'in-progress': {
		background: 'bg-blue-50',
		text: 'text-blue-700',
		hover: 'hover:bg-blue-100',
		border: 'border-blue-200',
	},
	resolved: {
		background: 'bg-green-50',
		text: 'text-green-700',
		hover: 'hover:bg-green-100',
		border: 'border-green-200',
	},
	default: {
		background: 'bg-gray-50',
		text: 'text-gray-700',
		hover: 'hover:bg-gray-100',
		border: 'border-gray-200',
	},
};

const STATUS_OPTIONS = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'in-progress', label: 'In Progress' },
	{ value: 'resolved', label: 'Resolved' },
];

const AllIssues = () => {
	const [issues, setIssues] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('all');
	const [selectedIssue, setSelectedIssue] = useState(null);

	useEffect(() => {
		fetchIssues();
	}, []);

	const fetchIssues = async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			const response = await api.get('/issues/all', {
				headers: { Authorization: `Bearer ${token}` },
			});
			setIssues(response.data);
			setError('');
		} catch (err) {
			setError(err?.response?.data?.msg || 'Failed to fetch issues');
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (issueId, newStatus) => {
		try {
			const token = localStorage.getItem('token');
			const response = await api.patch(
				`/issues/update-status/${issueId}`,
				{ status: newStatus },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			);

			if (response.data.issue) {
				setIssues((prevIssues) =>
					prevIssues.map((issue) => (issue._id === issueId ? response.data.issue : issue))
				);
				showSuccess('Status updated successfully');
			}
		} catch (err) {
			setError(err?.response?.data?.msg || 'Error updating status');
		}
	};

	const handleDelete = async (issueId) => {
		if (!window.confirm('Are you sure you want to delete this issue?')) return;

		try {
			const token = localStorage.getItem('token');
			await api.delete(`/issues/delete/${issueId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setIssues((prevIssues) => prevIssues.filter((issue) => issue._id !== issueId));
			showSuccess('Issue deleted successfully');
		} catch (err) {
			setError(err?.response?.data?.msg || 'Error deleting issue');
		}
	};

	const showSuccess = (msg) => {
		setSuccessMessage(msg);
		setError('');
		setTimeout(() => setSuccessMessage(''), 3000);
	};

	// Filter issues based on search and status
	const filteredIssues = useMemo(() => {
		return issues.filter((issue) => {
			const matchesSearch =
				issue.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				issue.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				issue.issueType?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;

			return matchesSearch && matchesStatus;
		});
	}, [issues, searchTerm, filterStatus]);

	const getStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.default;

	return (
		<SidebarLayout>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-4 sm:p-6 md:p-8 overflow-x-hidden'
			>
				<div className='max-w-7xl mx-auto'>
					{/* Header */}
					<div className='mb-6 sm:mb-8'>
						<h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2'>
							Issue Management
						</h1>
						<p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
							Track and manage all reported issues
						</p>
					</div>

					{/* Main Card */}
					<div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700'>
						{/* Filters */}
						<div className='p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700'>
							<div className='flex flex-col md:flex-row gap-3 sm:gap-4'>
								<div className='flex-1 relative'>
									<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
										<Search className='h-5 w-5 text-gray-400 dark:text-gray-500' />
									</div>
									<input
										type='text'
										placeholder='Search issues...'
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className='w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-200'
									/>
								</div>
								<select
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value)}
									className='w-full md:w-48 px-4 py-2.5 sm:py-3 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-200'
								>
									<option value='all'>All Status</option>
									{STATUS_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Notifications */}
						{error && (
							<div className='mx-4 sm:mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/30 flex items-center gap-2 text-sm'>
								<AlertCircle className='h-5 w-5 text-red-400 dark:text-red-500' />
								<span className='text-red-700 dark:text-red-300'>{error}</span>
							</div>
						)}

						{successMessage && (
							<div className='mx-4 sm:mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/30 flex items-center gap-2 text-sm'>
								<CheckCircle className='h-5 w-5 text-green-400 dark:text-green-500' />
								<span className='text-green-700 dark:text-green-300'>{successMessage}</span>
							</div>
						)}

						{/* Table */}
						<div className='overflow-x-auto'>
							{loading ? (
								<div className='flex items-center justify-center h-64'>
									<div className='flex flex-col items-center'>
										<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-green-500'></div>
										<p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
											Loading issues...
										</p>
									</div>
								</div>
							) : (
								<table className='w-full'>
									<thead className='bg-gray-50 dark:bg-gray-700'>
										<tr>
											{['Type', 'Description', 'Reported By', 'Status', 'Actions'].map((header) => (
												<th
													key={header}
													className='px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'
												>
													{header}
												</th>
											))}
										</tr>
									</thead>
									<tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
										{filteredIssues.map((issue) => (
											<tr key={issue._id} className='hover:bg-gray-50/50 dark:hover:bg-gray-700/30'>
												<td className='px-4 sm:px-6 py-4'>
													<span
														className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
															issue.issueType === 'technical'
																? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
																: issue.issueType === 'booking'
																? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
																: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
														}`}
													>
														{issue.issueType}
													</span>
												</td>
												<td
													className='px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-200 max-w-xs sm:max-w-md truncate cursor-pointer hover:text-blue-600'
													onClick={() => setSelectedIssue(issue)}
												>
													{issue.description}
												</td>
												<td className='px-4 sm:px-6 py-4 text-sm text-gray-600 dark:text-gray-400'>
													{issue.email}
												</td>
												<td className='px-4 sm:px-6 py-4'>
													<select
														value={issue.status}
														onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
														className={`w-full sm:w-48 px-3 py-1.5 rounded-full text-sm border-2 ${
															getStyle(issue.status).background
														} ${getStyle(issue.status).text} ${
															getStyle(issue.status).border
														} focus:ring-2 focus:outline-none`}
													>
														{STATUS_OPTIONS.map((opt) => (
															<option key={opt.value} value={opt.value}>
																{opt.label}
															</option>
														))}
													</select>
												</td>
												<td className='px-4 sm:px-6 py-4'>
													<button
														onClick={() => handleDelete(issue._id)}
														className='flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm px-3 py-1.5 rounded-lg transition-colors'
													>
														<Trash2 className='h-4 w-4' />
														<span className='hidden sm:inline'>Delete</span>
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}

							{!loading && filteredIssues.length === 0 && (
								<div className='flex flex-col items-center justify-center h-64 p-6'>
									<Search className='h-12 w-12 text-gray-400 dark:text-gray-600 mb-3' />
									<h3 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
										No issues found
									</h3>
									<p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
										Try adjusting your search or filters
									</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Modal */}
				<AnimatePresence>
					{selectedIssue && (
						<motion.div
							className='fixed inset-0 z-50 flex items-center justify-center'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div
								className='absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm'
								onClick={() => setSelectedIssue(null)}
							></div>
							<motion.div
								className='relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-xl w-full mx-4'
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.2 }}
							>
								<button
									className='absolute top-3 right-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none'
									onClick={() => setSelectedIssue(null)}
								>
									<X className='h-5 w-5' />
								</button>
								<h2 className='text-xl font-bold mb-4 text-gray-900 dark:text-gray-100'>
									Issue Description
								</h2>
								<p className='text-gray-700 dark:text-gray-300 whitespace-pre-wrap'>
									{selectedIssue.description}
								</p>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</SidebarLayout>
	);
};

export default AllIssues;
