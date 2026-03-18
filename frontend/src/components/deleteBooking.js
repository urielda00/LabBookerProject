import React, { useState } from 'react';
import Message from './common/Error_successMessage';
import ConfirmationModal from './common/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDeleteBooking } from '../hooks/useDeleteBooking';

const DeleteBooking = ({ onSuccess }) => {
	const { t } = useTranslation();
	const [successDisplay, setSuccessDisplay] = useState(null); // Local state for rich success UI

	const {
		username,
		userBookings,
		selectedBookingId,
		isModalOpen,
		status,
		setUsername,
		setSelectedBookingId,
		setIsModalOpen,
		fetchBookings,
		handleDeleteRequest,
		confirmDelete,
		resetForm,
		resetMessages,
	} = useDeleteBooking((msg) => {
		// Optional: trigger parent onSuccess if needed
		if (onSuccess) onSuccess(msg);
	});

	// Wrapper to handle the rich success message specific to this view
	const onConfirmWrapper = async () => {
		const details = await confirmDelete();
		if (details) {
			setSuccessDisplay(
				<div className='space-y-2'>
					<p>{t('deleteBooking.successTitle')}</p>
					<div className='text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md'>
						<p className='font-medium text-blue-800 dark:text-blue-200'>
							{t('deleteBooking.successDetails')}
						</p>
						<ul className='mt-1 text-blue-700 dark:text-blue-300'>
							<li>
								{t('deleteBooking.room')}: {details.roomName}
							</li>
							<li>
								{t('deleteBooking.date')}: {details.date}
							</li>
							<li>
								{t('deleteBooking.time')}: {details.startTime} - {details.endTime}
							</li>
						</ul>
					</div>
				</div>
			);
			setTimeout(() => setSuccessDisplay(null), 5000);
		}
	};

	return (
		<>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300'
			>
				<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8'>
					{t('deleteBooking.title')}
				</h2>

				<form className='space-y-6 sm:space-y-8 md:space-y-10' onSubmit={(e) => e.preventDefault()}>
					{/* Username Section */}
					<div className='space-y-4 sm:space-y-6'>
						<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700'>
							{t('deleteBooking.sectionUser')}
						</h3>
						<div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
							<div className='flex-grow'>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
									{t('deleteBooking.usernameLabel')} <span className='text-red-500'>*</span>
								</label>
								<input
									type='text'
									value={username}
									onChange={(e) => {
										setUsername(e.target.value);
										resetMessages();
									}}
									className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
									placeholder={t('deleteBooking.usernamePlaceholder')}
								/>
							</div>
							<button
								type='button'
								onClick={fetchBookings}
								disabled={status.loadingBookings || !username.trim()}
								className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap ${
									status.loadingBookings || !username.trim()
										? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
										: 'bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400'
								}`}
							>
								{status.loadingBookings ? t('deleteBooking.fetching') : t('deleteBooking.fetch')}
							</button>
						</div>
					</div>

					{/* Booking Selection */}
					{userBookings.length > 0 && (
						<div className='space-y-4 sm:space-y-6'>
							<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700'>
								{t('deleteBooking.sectionSelect')}
							</h3>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								{t('deleteBooking.availableBookings')}
							</label>
							<select
								value={selectedBookingId}
								onChange={(e) => {
									setSelectedBookingId(e.target.value);
									resetMessages();
								}}
								className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
							>
								<option value=''>{t('deleteBooking.selectPrompt')}</option>
								{userBookings.map((booking) => (
									<option key={booking._id} value={booking._id}>
										{t('deleteBooking.room')}: {booking.roomId?.name} | {t('deleteBooking.date')}:{' '}
										{booking.date} | {t('deleteBooking.time')}: {booking.startTime}-
										{booking.endTime}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Messages */}
					<div className='text-center'>
						<AnimatePresence mode='wait'>
							{status.error && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3 }}
								>
									<Message message={status.error} type='error' onClose={resetMessages} />
								</motion.div>
							)}
							{successDisplay && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3 }}
								>
									<Message
										message={successDisplay}
										type='success'
										onClose={() => setSuccessDisplay(null)}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Actions */}
					<div className='flex flex-col sm:flex-row justify-end gap-3 sm:gap-4'>
						{userBookings.length > 0 && (
							<button
								type='button'
								onClick={resetForm}
								className='px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base'
							>
								{t('deleteBooking.reset')}
							</button>
						)}
						{selectedBookingId && (
							<button
								type='button'
								onClick={handleDeleteRequest}
								disabled={status.loadingDelete}
								className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
									status.loadingDelete
										? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
										: 'bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400'
								}`}
							>
								{status.loadingDelete ? t('deleteBooking.deleting') : t('deleteBooking.delete')}
							</button>
						)}
					</div>
				</form>
			</motion.div>

			<ConfirmationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onConfirm={onConfirmWrapper}
				confirmText={t('deleteBooking.delete')}
				cancelText={t('deleteBooking.reset')}
				message={
					<>
						<h3>{t('deleteBooking.confirmTitle')}</h3>
						<p>{t('deleteBooking.confirmMessage')}</p>
						<p className='text-sm text-red-500 mt-2'>{t('deleteBooking.cannotUndo')}</p>
					</>
				}
			/>
		</>
	);
};

export default DeleteBooking;
