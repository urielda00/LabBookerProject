import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; 
import { Calendar, Clock, RefreshCw, X, AlertCircle, PlusCircle } from 'lucide-react';  

// Components
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/footer';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Toast from '../components/Toast';

// Hooks & Utils
import api from '../utils/axiosConfig';
import { useMyBookings } from '../hooks/useMyBookings';

const MyBookingsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	// Auth State
	const [userInfo, setUserInfo] = useState(null);

	// UI State for Modals/Toast
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedBookingId, setSelectedBookingId] = useState(null);
	const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

	// Business Logic Hook
	const {
		bookings,
		loading,
		error,
		filter,
		setFilter,
		refreshBookings,
		cancelBooking,
		isBookingPast,
		isWithinTwoHours,
	} = useMyBookings(navigate);

	// Authentication Check
	useEffect(() => {
		const checkAuthentication = async () => {
			try {
				const storedUser = localStorage.getItem('user');
				const token = localStorage.getItem('token');

				if (storedUser && token) {
					setUserInfo(JSON.parse(storedUser));
					// Optional: Refresh profile in background to ensure we have latest data
					api
						.get('/user/profile')
						.then((res) => {
							setUserInfo(res.data);
							localStorage.setItem('user', JSON.stringify(res.data));
						})
						.catch(console.error);
				} else {
					navigate('/login');
				}
			} catch (error) {
				navigate('/login');
			}
		};
		checkAuthentication();
	}, [navigate]);

	const handleConfirmCancel = async () => {
		setIsModalOpen(false);
		if (!selectedBookingId) return;

		const result = await cancelBooking(selectedBookingId);

		setToast({
			isVisible: true,
			type: result.success ? 'success' : 'error',
			message: result.message,
		});

		if (result.success) {
			setSelectedBookingId(null);
		}

		// Hide toast after 3 seconds
		setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
	};

	const openCancelModal = (bookingId) => {
		setSelectedBookingId(bookingId);
		setIsModalOpen(true);
	};

	// Presentation Helper
	const getBookingStatusDisplay = (booking) => {
		const status = booking.status ? booking.status.toLowerCase() : '';

		if (status === 'canceled')
			return {
				color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
				text: t('status.canceled', 'Canceled'),
			};
		if (status === 'pending')
			return {
				color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
				text: t('status.pending', 'Pending'),
			};
		if (status === 'active')
			return {
				color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
				text: t('status.active', 'Active'),
			};
		if (status === 'missed')
			return {
				color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
				text: t('status.missed', 'Missed'),
			};

		// Logic for completed bookings
		if (isBookingPast(booking.date, booking.endTime)) {
			return {
				color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
				text: t('status.completed', 'Completed'),
			};
		}
		return {
			color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
			text: t('status.confirmed', 'Confirmed'),
		};
	};

	const isBookingCancelable = (booking) => {
		// Guard clause: if userInfo or booking details are missing, return false
		if (!userInfo || !booking || !booking.userId) return false;

		const status = booking.status ? booking.status.toLowerCase() : '';
		const isOwner =
			booking.userId === userInfo._id ||
			booking.userId._id === userInfo._id ||
			booking.userId.email === userInfo.email;

		return (
			!['canceled', 'completed', 'missed', 'active'].includes(status) &&
			!isBookingPast(booking.date, booking.endTime) &&
			isOwner &&
			!isWithinTwoHours(booking.date, booking.startTime)
		);
	};

	// Don't render until user is loaded to prevent errors
	if (!userInfo) return null;

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300'>
			<Navbar userInfo={userInfo} setUserInfo={setUserInfo} />

			<main className='container mx-auto px-4 py-8 max-w-7xl pt-24'>
				{/* Header Section */}
				<div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 sticky top-20 z-10 transition-colors duration-300'>
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4'>
						<div>
							<h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
								{t('myBookings.title', 'My Bookings')}
							</h1>
							<p className='text-md text-gray-600 dark:text-gray-400 mt-2'>
								{t('myBookings.subtitle', 'Manage your lab room reservations')}
							</p>
						</div>

						<div className='flex gap-4 flex-wrap'>
							<button
								onClick={() => navigate('/labrooms')}
								className='flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all'
							>
								<PlusCircle className='w-5 h-5' /> {t('myBookings.newBooking', 'New Booking')}
							</button>
							<button
								onClick={refreshBookings}
								className='flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all'
								disabled={loading}
							>
								<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />{' '}
								{loading ? t('common.refreshing', 'Refreshing...') : t('common.refresh', 'Refresh')}
							</button>
						</div>
					</div>

					{/* Filter Section */}
					<div className='mt-6 flex gap-4 overflow-x-auto pb-2'>
						{['all', 'upcoming', 'past'].map((f) => (
							<button
								key={f}
								onClick={() => setFilter(f)}
								className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
									filter === f
										? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
										: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
								}`}
							>
								{t(`myBookings.filters.${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
							</button>
						))}
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className='bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-800 p-4 mb-6 rounded-r-lg flex items-center'>
						<AlertCircle className='w-5 h-5 text-red-500 dark:text-red-400 mr-2' />
						<span className='text-red-700 dark:text-red-300'>{error}</span>
					</div>
				)}

				{/* Content Section */}
				{loading ? (
					<div className='flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm'>
						<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
						<p className='mt-4 text-gray-600 dark:text-gray-400 text-lg'>
							{t('common.loading', 'Loading your bookings...')}
						</p>
					</div>
				) : bookings.length === 0 ? (
					<div className='text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm'>
						<Calendar className='w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto mb-6' />
						<h3 className='text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3'>
							{filter === 'all'
								? t('myBookings.empty.all', 'No bookings found')
								: filter === 'upcoming'
								? t('myBookings.empty.upcoming', 'No upcoming bookings')
								: t('myBookings.empty.past', 'No past bookings')}
						</h3>
					</div>
				) : (
					<div className='space-y-8'>
						<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{bookings.map((booking) => {
								const statusDisplay = getBookingStatusDisplay(booking);
								const isPast = isBookingPast(booking.date, booking.endTime);
								const canCancel = isBookingCancelable(booking);

								return (
									<div
										key={booking._id}
										className='bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700'
									>
										<div className='p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start'>
											<h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
												{booking.roomId?.name || t('common.unknownRoom', 'Lab Room')}
											</h3>
											<span
												className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusDisplay.color}`}
											>
												{statusDisplay.text}
											</span>
										</div>

										<div className='p-6 space-y-4'>
											{/* Booking Details */}
											<div className='flex items-center gap-3 text-gray-700 dark:text-gray-300'>
												<Calendar className='w-5 h-5 text-blue-500' />
												<span>
													{new Date(booking.date).toLocaleDateString()}
													{isPast && (
														<span className='text-sm text-gray-500 ml-2'>
															({t('common.past', 'Past')})
														</span>
													)}
												</span>
											</div>
											<div className='flex items-center gap-3 text-gray-700 dark:text-gray-300'>
												<Clock className='w-5 h-5 text-blue-500' />
												<span>
													{booking.startTime} - {booking.endTime}
												</span>
											</div>

											{/* Action Button */}
											{canCancel ? (
												<button
													onClick={() => openCancelModal(booking._id)}
													className='mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-200 dark:border-red-800'
												>
													<X className='w-4 h-4' /> {t('myBookings.cancelButton', 'Cancel Booking')}
												</button>
											) : (
												<div className='mt-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-500 dark:text-gray-400 text-center'>
													{statusDisplay.text === 'Active'
														? t('myBookings.activeSession', 'Session in progress')
														: t('myBookings.cannotCancel', 'Cannot cancel (Past or < 2h)')}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
						<div className='bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center text-blue-800 dark:text-blue-300 text-sm'>
							{t(
								'myBookings.cancellationPolicy',
								'You can cancel bookings up until 2 hours before their scheduled time.'
							)}
						</div>
					</div>
				)}
			</main>

			{/* Modals & Toasts */}
			<ConfirmationModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setSelectedBookingId(null);
				}}
				onConfirm={handleConfirmCancel}
				title={t('myBookings.cancelTitle', 'Cancel Booking')}
				message={t(
					'myBookings.cancelMessage',
					'Are you sure you want to cancel this booking? This action cannot be undone.'
				)}
				confirmText={t('myBookings.confirmCancel', 'Yes, Cancel')}
				cancelText={t('common.back', 'Go Back')}
				variant='danger'
			/>

			{toast.isVisible && (
				<Toast
					type={toast.type}
					message={toast.message}
					onClose={() => setToast({ ...toast, isVisible: false })}
				/>
			)}

			<Footer />
		</div>
	);
};

export default MyBookingsPage;
