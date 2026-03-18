import React, { useEffect, useState } from 'react';
import BaseModal from '../common/BaseModal';
import TransferRequestModal from './TransferRequestModal';
import TransferRequestsModal from './TransferRequestsModal';
import { CalendarClock, Clock, User, Users, Lock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoomSchedule } from '../../hooks/useRoomSchedule';

const RoomScheduleModal = ({ isOpen, onClose, room, userInfo }) => {
	const { t, i18n } = useTranslation();
	const isRTL = i18n.dir() === 'rtl';

	// Hook Data
	const {
		weeklyBookings,
		loading,
		error,
		fetchWeeklyBookings,
		checkDeclinedStatuses,
		declinedRequests,
	} = useRoomSchedule(room?._id);

	// Local UI State
	const [selectedBooking, setSelectedBooking] = useState(null);
	const [showTransferRequest, setShowTransferRequest] = useState(false);
	const [showManageRequests, setShowManageRequests] = useState(false);

	// 1. Fetch on Open
	useEffect(() => {
		if (isOpen && room) {
			fetchWeeklyBookings();
		}
	}, [isOpen, room, fetchWeeklyBookings]);

	// 2. Check Declined Statuses when bookings arrive
	useEffect(() => {
		if (weeklyBookings.length > 0 && userInfo) {
			checkDeclinedStatuses(weeklyBookings, userInfo._id);
		}
	}, [weeklyBookings, userInfo, checkDeclinedStatuses]);

	if (!room) return null;

	// Helper to render booking item
	const renderBookingItem = (booking) => {
		const isMyBooking = booking.userId._id === userInfo._id;
		const hasPendingRequest = booking.transferRequests?.some(
			(req) => req.fromUser._id === userInfo._id && req.status === 'pending'
		);
		const hasDeclined = declinedRequests[booking._id];
		const statusColor =
			booking.status === 'Active' ? 'green' : booking.status === 'Confirmed' ? 'blue' : 'yellow';

		return (
			<div
				key={booking._id}
				className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow'
			>
				<div
					className={`flex flex-col sm:flex-row justify-between items-start gap-4 ${
						isRTL ? 'sm:flex-row-reverse' : ''
					}`}
				>
					{/* Info Block */}
					<div className='flex-grow space-y-2'>
						<div
							className={`flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 ${
								isRTL ? 'flex-row-reverse' : ''
							}`}
						>
							<Clock className='w-4 h-4 text-blue-600 dark:text-blue-400' />
							<span className='bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs'>
								{new Date(booking.date).toLocaleDateString(i18n.language)}
							</span>
							<span className='text-gray-400'>•</span>
							<span className='bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-xs text-green-800 dark:text-green-200'>
								{booking.startTime} - {booking.endTime}
							</span>
						</div>

						<div
							className={`flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ${
								isRTL ? 'flex-row-reverse' : ''
							}`}
						>
							<User className='w-3 h-3' />
							<span className='font-medium'>{booking.userId?.username}</span>
							<span className='text-gray-400'>|</span>
							<span>{booking.userId?.email}</span>
						</div>

						{booking.additionalUsers?.length > 0 && (
							<div
								className={`flex flex-wrap items-center gap-1 text-xs text-gray-500 ${
									isRTL ? 'flex-row-reverse' : ''
								}`}
							>
								<Users className='w-3 h-3' />
								<span>{t('roomCard.participants', 'Participants')}:</span>
								{booking.additionalUsers.map((u) => u.username).join(', ')}
							</div>
						)}

						<div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
							<span
								className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-${statusColor}-100 text-${statusColor}-700`}
							>
								{booking.status}
							</span>
						</div>
					</div>

					{/* Actions Block */}
					<div className='flex-shrink-0'>
						{isMyBooking
							? booking.transferRequests?.length > 0 && (
									<button
										onClick={() => {
											setSelectedBooking(booking);
											setShowManageRequests(true);
										}}
										className='text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 transition-colors font-medium'
									>
										{t('roomCard.viewRequests', 'Requests')} ({booking.transferRequests.length})
									</button>
							  )
							: room.type === 'Open' && (
									<div className='flex flex-col items-end gap-2'>
										{['Pending', 'Active'].includes(booking.status) ? (
											<span className='flex items-center gap-1 text-xs text-gray-400'>
												<Lock className='w-3 h-3' /> Transfer Locked
											</span>
										) : hasDeclined ? (
											<span className='flex items-center gap-1 text-xs text-red-500'>
												<X className='w-3 h-3' /> Declined
											</span>
										) : hasPendingRequest ? (
											<span className='px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-md'>
												Request Sent
											</span>
										) : (
											<button
												onClick={() => {
													setSelectedBooking(booking);
													setShowTransferRequest(true);
												}}
												className='text-xs px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-md hover:bg-sky-100 transition-colors font-medium'
											>
												Request Transfer
											</button>
										)}
									</div>
							  )}
					</div>
				</div>
			</div>
		);
	};

	return (
		<>
			<BaseModal
				isOpen={isOpen}
				onClose={onClose}
				title={
					<div className='flex items-center gap-2'>
						<CalendarClock className='w-6 h-6 text-blue-600 dark:text-blue-400' />
						<span>
							{room.name} - {t('roomCard.scheduleTitle', 'Schedule')}
						</span>
					</div>
				}
				maxWidth='max-w-2xl'
				showCloseButton={true}
			>
				<div className='flex-1 overflow-y-auto max-h-[60vh] pr-2'>
					{loading ? (
						<div className='flex justify-center py-8'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
						</div>
					) : error ? (
						<div className='p-4 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-lg text-center'>
							{error}
						</div>
					) : weeklyBookings.length === 0 ? (
						<div className='p-8 text-center text-gray-500'>
							{t('roomCard.noBookingsScheduled', 'No bookings scheduled.')}
						</div>
					) : (
						<div className='space-y-3'>{weeklyBookings.map(renderBookingItem)}</div>
					)}
				</div>
			</BaseModal>

			{/* Sub Modals */}
			{showTransferRequest && selectedBooking && (
				<TransferRequestModal
					booking={selectedBooking}
					onClose={() => setShowTransferRequest(false)}
					fetchWeeklyBookings={fetchWeeklyBookings}
				/>
			)}

			{showManageRequests && selectedBooking && (
				<TransferRequestsModal
					booking={selectedBooking}
					onClose={() => {
						setShowManageRequests(false);
						fetchWeeklyBookings();
					}}
				/>
			)}
		</>
	);
};

export default RoomScheduleModal;
