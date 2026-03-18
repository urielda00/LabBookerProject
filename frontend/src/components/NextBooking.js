import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
	Clock,
	Calendar,
	MapPin,
	Download,
	CalendarCheck, // Changed to specific icon to avoid naming conflict
	X,
	CheckCircle,
	AlertTriangle,
	Lock,
	ExternalLink,
} from 'lucide-react';

// Hooks
import { useNextBooking } from '../hooks/useNextBooking';

// Modals
import TransferRequestsModal from './modals/TransferRequestsModal';
import ConfirmationModal from './common/ConfirmationModal';

const NextBooking = ({ showToast, userInfo }) => {
	const { t } = useTranslation();

	// 1. Hook Logic
	const {
		booking,
		loading,
		timeRemaining,
		progress,
		bookingState,
		showLeaveAlert,
		canCancel,
		handleCheckIn,
		handleCancelBooking,
		refreshBooking,
	} = useNextBooking(userInfo, showToast);

	// 2. Local UI State
	const [isExpanded, setIsExpanded] = useState(true);
	const [showRequestsModal, setShowRequestsModal] = useState(false);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);

	// 3. Helper Functions
	const formatTimeDisplay = (seconds) => {
		if (seconds < 0) return '00:00:00';
		const days = Math.floor(seconds / (3600 * 24));
		const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (days > 0) return `${days}d ${hrs}h`;
		return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
			.toString()
			.padStart(2, '0')}`;
	};

	const handleDownloadICS = () => {
		if (!booking) return;

		const eventTitle = `Lab Booking: ${booking.roomId.name}`;
		const eventStart = new Date(`${booking.date}T${booking.startTime}:00`);
		const eventEnd = new Date(`${booking.date}T${booking.endTime}:00`);
		const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

		const icsContent = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//LabBooker//EN',
			'BEGIN:VEVENT',
			`UID:${booking._id}@labbooker.com`,
			`DTSTAMP:${formatDate(new Date())}`,
			`DTSTART:${formatDate(eventStart)}`,
			`DTEND:${formatDate(eventEnd)}`,
			`SUMMARY:${eventTitle}`,
			`DESCRIPTION:Your lab booking for room ${booking.roomId.name}`,
			'END:VEVENT',
			'END:VCALENDAR',
		].join('\r\n');

		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'booking.ics';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const getGoogleCalendarUrl = () => {
		if (!booking) return '#';
		const eventTitle = encodeURIComponent(`Lab Booking: ${booking.roomId.name}`);
		const eventDetails = encodeURIComponent(`Your lab booking for room ${booking.roomId.name}`);
		const formatDateForGoogle = (dateStr, timeStr) => {
			const date = new Date(`${dateStr}T${timeStr}:00`);
			return date.toISOString().replace(/[-:.]/g, '');
		};
		const start = formatDateForGoogle(booking.date, booking.startTime);
		const end = formatDateForGoogle(booking.date, booking.endTime);

		return `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}&details=${eventDetails}`;
	};

	// --- Renders ---

	if (loading) {
		return (
			<div className='bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-md mb-8 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 min-h-[200px]'>
				<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mb-4'></div>
				<p className='text-gray-500 dark:text-gray-400'>
					{t('nextBooking.loadingTitle', 'Loading booking details...')}
				</p>
			</div>
		);
	}

	if (!booking) {
		return (
			<div className='bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg mb-8 border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300'>
				<div
					className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<div className='flex items-center gap-4'>
						<div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
							<Clock className='w-6 h-6 text-blue-600 dark:text-blue-400' />
						</div>
						<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
							{t('nextBooking.overviewTitle', 'Booking Overview')}
						</h2>
					</div>
				</div>

				{isExpanded && (
					<div className='p-8 text-center border-t border-gray-100 dark:border-gray-700'>
						<Calendar className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
						<h3 className='text-xl font-semibold text-gray-700 dark:text-gray-200'>
							{t('nextBooking.noneTitle', 'No Upcoming Bookings')}
						</h3>
						<p className='text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto'>
							{t(
								'nextBooking.noneMessage',
								"You don't have any scheduled sessions right now. Use the 'Book a Room' option to get started."
							)}
						</p>
					</div>
				)}
			</div>
		);
	}

	return (
		<>
			<div className='bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg mb-8 border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300'>
				{/* Header */}
				<div
					className='flex items-center justify-between p-6 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<div className='flex items-center gap-4'>
						<div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
							<Clock className='w-6 h-6 text-blue-600 dark:text-blue-400' />
						</div>
						<div>
							<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200 flex flex-wrap items-center gap-3'>
								{bookingState === 'active'
									? t('nextBooking.currentSession', 'Current Session')
									: t('nextBooking.upcomingReservation', 'Upcoming Reservation')}

								{booking.status === 'Pending' && (
									<span className='text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-full flex items-center gap-1 border border-yellow-200 dark:border-yellow-800'>
										<AlertTriangle size={12} /> Pending
									</span>
								)}
							</h2>
						</div>
					</div>

					<button
						onClick={(e) => {
							e.stopPropagation();
							setShowRequestsModal(true);
						}}
						className='text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline px-3 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
					>
						{t('nextBooking.manageRequests', 'Manage Requests')}
					</button>
				</div>

				{/* Expanded Content */}
				{isExpanded && (
					<div className='p-6 space-y-6'>
						{/* Alerts */}
						{showLeaveAlert && (
							<div
								className={`border-l-4 p-4 rounded-r-lg ${
									showLeaveAlert === 'urgent'
										? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-300'
										: 'bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
								}`}
							>
								<p className='font-bold flex items-center gap-2'>
									<Clock className='w-5 h-5' />
									{showLeaveAlert === 'urgent'
										? t('nextBooking.alertUrgent', 'Urgent: Booking ends in less than 3 minutes!')
										: t(
												'nextBooking.alertWarning',
												'Notice: Booking ends in less than 15 minutes.'
										  )}
								</p>
							</div>
						)}

						{/* Timer & Progress */}
						<div className='flex flex-col sm:flex-row items-center gap-6'>
							<div className='w-32 h-32 flex-shrink-0'>
								<CircularProgressbar
									value={progress}
									text={`${Math.round(progress)}%`}
									styles={buildStyles({
										pathColor: bookingState === 'active' ? '#16a34a' : '#2563eb', // green-600 : blue-600
										textColor: bookingState === 'active' ? '#16a34a' : '#2563eb',
										trailColor: '#e5e7eb',
										textSize: '20px',
										pathTransitionDuration: 0.5,
									})}
								/>
							</div>
							<div className='flex-1 w-full bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-600 text-center sm:text-left'>
								<p className='text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold'>
									{bookingState === 'active'
										? t('nextBooking.timeRemaining', 'Time Remaining')
										: t('nextBooking.timeUntilStart', 'Starts In')}
								</p>
								<p className='text-4xl font-mono font-bold text-gray-800 dark:text-gray-100 mt-2 tracking-tight'>
									{formatTimeDisplay(timeRemaining)}
								</p>
								<div className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
									{new Date(booking.date).toLocaleDateString()} • {booking.startTime} -{' '}
									{booking.endTime}
								</div>
							</div>
						</div>

						{/* Info Grid */}
						<div className='grid md:grid-cols-3 gap-4'>
							<InfoCard
								icon={Calendar}
								label={t('nextBooking.labels.date', 'Date')}
								value={new Date(booking.date).toLocaleDateString()}
								colorClass='text-blue-600'
								bgClass='bg-blue-100'
							/>
							<InfoCard
								icon={MapPin}
								label={t('nextBooking.labels.room', 'Room')}
								value={booking.roomId?.name || 'Unknown Room'}
								colorClass='text-green-600'
								bgClass='bg-green-100'
							/>
							<InfoCard
								icon={Clock}
								label={t('nextBooking.labels.time', 'Time')}
								value={`${booking.startTime} - ${booking.endTime}`}
								colorClass='text-purple-600'
								bgClass='bg-purple-100'
							/>
						</div>

						{/* Actions Toolbar */}
						<div className='flex flex-wrap gap-3 pt-6 border-t border-gray-100 dark:border-gray-700'>
							{/* Check In Action */}
							{bookingState === 'active' && !booking.checkedIn && (
								<ActionButton
									onClick={handleCheckIn}
									icon={CheckCircle}
									label={t('nextBooking.confirmArrival', 'Check In Now')}
									variant='primary'
									disabled={userInfo?.email !== booking.userId?.email}
								/>
							)}

							{/* Cancel Action */}
							{bookingState === 'upcoming' &&
								(canCancel ? (
									<ActionButton
										onClick={() => setShowCancelConfirm(true)}
										icon={X}
										label={t('nextBooking.cancelBooking', 'Cancel')}
										variant='danger'
									/>
								) : (
									<div className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed border border-transparent'>
										<Lock size={16} />
										<span className='text-sm font-medium'>
											{t('nextBooking.cancelUnavailable', 'Cancellation locked')}
										</span>
									</div>
								))}

							<div className='flex-grow hidden sm:block'></div>

							{/* Tools */}
							<ActionButton
								onClick={handleDownloadICS}
								icon={Download}
								label='ICS'
								variant='neutral'
							/>
							<a
								href={getGoogleCalendarUrl()}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm'
							>
								<CalendarCheck size={16} /> Google Cal{' '}
								<ExternalLink size={12} className='opacity-50' />
							</a>
						</div>
					</div>
				)}
			</div>

			{/* Modals */}
			{showRequestsModal && (
				<TransferRequestsModal
					booking={booking}
					onClose={() => {
						setShowRequestsModal(false);
						refreshBooking();
					}}
				/>
			)}

			<ConfirmationModal
				isOpen={showCancelConfirm}
				onClose={() => setShowCancelConfirm(false)}
				onConfirm={handleCancelBooking}
				title={t('nextBooking.cancelHeading', 'Cancel Booking')}
				message={t(
					'nextBooking.confirmation',
					'Are you sure you want to cancel this booking? This action cannot be undone.'
				)}
				confirmText={t('nextBooking.confirmText', 'Yes, Cancel')}
				cancelText={t('common.back', 'Go Back')}
				variant='danger'
			/>
		</>
	);
};

// Sub-components
const InfoCard = ({ icon: Icon, label, value, colorClass, bgClass }) => (
	<div className='flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 transition-all hover:border-gray-300 dark:hover:border-gray-500'>
		<div className={`p-2.5 rounded-lg ${bgClass} dark:bg-opacity-20`}>
			<Icon className={`w-5 h-5 ${colorClass} dark:text-gray-200`} />
		</div>
		<div>
			<p className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
				{label}
			</p>
			<p className='font-semibold text-gray-800 dark:text-gray-100 mt-0.5'>{value}</p>
		</div>
	</div>
);

const ActionButton = ({ onClick, icon: Icon, label, variant = 'neutral', disabled }) => {
	const baseStyles =
		'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2';

	const variants = {
		primary:
			'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700',
		danger:
			'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus:ring-red-500 dark:bg-gray-800 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20',
		neutral:
			'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600',
	};

	if (disabled) {
		return (
			<button
				disabled
				className={`${baseStyles} bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-600`}
			>
				<Icon size={16} /> {label}
			</button>
		);
	}

	return (
		<button onClick={onClick} className={`${baseStyles} ${variants[variant]}`}>
			<Icon size={16} /> {label}
		</button>
	);
};

export default NextBooking;
