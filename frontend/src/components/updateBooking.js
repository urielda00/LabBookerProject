import Message from './common/Error_successMessage';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUpdateBooking } from '../hooks/useUpdateBooking';

const validStatuses = ['Pending', 'Confirmed', 'Canceled'];

const UpdateBooking = ({ onSuccess }) => {
	const { t } = useTranslation();

	const {
		username,
		userBookings,
		selectedBookingId,
		statusToUpdate,
		status,
		setUsername,
		setSelectedBookingId,
		setStatusToUpdate,
		fetchBookings,
		handleUpdate,
		resetForm,
		resetMessages,
	} = useUpdateBooking(onSuccess);

	// --- Helpers ---
	const getCurrentBooking = () => userBookings.find((b) => b._id === selectedBookingId);

	const getStatusColor = (currentStatus) => {
		if (currentStatus === 'Confirmed') return 'bg-blue-500 dark:bg-blue-600';
		if (currentStatus === 'Canceled') return 'bg-red-500 dark:bg-red-600';
		return 'bg-yellow-500 dark:bg-yellow-600';
	};

	const isFetchDisabled = status.loadingBookings || !username.trim();
	const isUpdateDisabled = status.loadingUpdate;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300'
		>
			<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8'>
				{t('updateBooking.title')}
			</h2>

			<form className='space-y-6 sm:space-y-8 md:space-y-10' onSubmit={(e) => e.preventDefault()}>
				{/* --- Section 1: Username --- */}
				<div className='space-y-4 sm:space-y-6'>
					<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700'>
						{t('updateBooking.sectionUser')}
					</h3>
					<div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
						<div className='flex-grow'>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
								{t('updateBooking.username')} <span className='text-red-500'>*</span>
							</label>
							<input
								type='text'
								value={username}
								onChange={(e) => {
									setUsername(e.target.value);
									resetMessages();
								}}
								className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
								placeholder={t('updateBooking.usernamePlaceholder')}
							/>
						</div>
						<button
							type='button'
							onClick={fetchBookings}
							disabled={isFetchDisabled}
							className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap ${
								isFetchDisabled
									? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
									: 'bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400'
							}`}
						>
							{status.loadingBookings ? t('updateBooking.fetching') : t('updateBooking.fetch')}
						</button>
					</div>
				</div>

				{/* --- Section 2: Booking Selection --- */}
				{userBookings.length > 0 && (
					<div className='space-y-4 sm:space-y-6'>
						<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700'>
							{t('updateBooking.sectionSelect')}
						</h3>
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								{t('updateBooking.availableBookings')}
							</label>
							<select
								value={selectedBookingId}
								onChange={(e) => {
									setSelectedBookingId(e.target.value);
									resetMessages();
								}}
								className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
							>
								<option value=''>{t('updateBooking.selectBooking')}</option>
								{userBookings.map((booking) => (
									<option key={booking._id} value={booking._id}>
										Room: {booking.roomId?.name} | Date: {booking.date} | Time: {booking.startTime}-
										{booking.endTime}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				{/* --- Section 3: Status Update --- */}
				{selectedBookingId && (
					<div className='space-y-4 sm:space-y-6'>
						<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700'>
							{t('updateBooking.sectionUpdate')}
						</h3>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
							{/* Current Status Indicator */}
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									{t('updateBooking.currentStatus')}
								</label>
								<div className='p-2 sm:p-3 bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg'>
									<div className='flex items-center space-x-2'>
										<span
											className={`inline-block w-2 h-2 rounded-full ${getStatusColor(
												getCurrentBooking()?.status
											)}`}
										/>
										<span className='font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base'>
											{getCurrentBooking()?.status || 'Unknown'}
										</span>
									</div>
								</div>
							</div>

							{/* New Status Select */}
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									{t('updateBooking.newStatus')} <span className='text-red-500'>*</span>
								</label>
								<select
									value={statusToUpdate}
									onChange={(e) => {
										setStatusToUpdate(e.target.value);
										resetMessages();
									}}
									className={`w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
										statusToUpdate === getCurrentBooking()?.status
											? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30'
											: 'border-gray-300 dark:border-gray-600'
									} bg-white dark:bg-gray-700 dark:text-gray-200`}
								>
									{validStatuses.map((s) => (
										<option key={s} value={s} disabled={s === getCurrentBooking()?.status}>
											{s}{' '}
											{s === getCurrentBooking()?.status
												? ` (${t('updateBooking.statusRequiredNote')})`
												: ''}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				)}

				{/* --- Messages --- */}
				<div className='text-center'>
					{status.error && <Message message={status.error} type='error' onClose={resetMessages} />}
					{status.success && (
						<Message message={status.success} type='success' onClose={resetMessages} />
					)}
				</div>

				{/* --- Actions --- */}
				<div className='flex flex-col sm:flex-row justify-end gap-3 sm:gap-4'>
					{userBookings.length > 0 && (
						<button
							type='button'
							onClick={resetForm}
							className='px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base'
						>
							{t('updateBooking.reset')}
						</button>
					)}
					{selectedBookingId && (
						<button
							type='button'
							onClick={handleUpdate}
							disabled={isUpdateDisabled}
							className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
								isUpdateDisabled
									? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
									: 'bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400'
							}`}
						>
							{status.loadingUpdate ? t('updateBooking.updating') : t('updateBooking.update')}
						</button>
					)}
				</div>
			</form>
		</motion.div>
	);
};

export default UpdateBooking;
