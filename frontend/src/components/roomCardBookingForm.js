import React from 'react';
import Message from './common/Error_successMessage';
import CustomDatepicker from '../utils/CustomDatepicker';
import { useTranslation } from 'react-i18next';
import { useRoomCardBooking } from '../hooks/useRoomCardBooking';

const RoomCardBookingForm = ({ room, activeRoom, userInfo, handleStartBooking }) => {
	const { t } = useTranslation();

	const {
		formData,
		availabilityData,
		status,
		handleInputChange,
		handleDateSelected,
		handleSlotSelect,
		formatTime,
		handleProceedBooking,
		closeModal,
		setStatus,
	} = useRoomCardBooking(room, activeRoom, userInfo, handleStartBooking);

	if (activeRoom !== room._id) return null;

	return (
		<div className='fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 flex items-center justify-center z-50 animate-fadeIn'>
			<div className='relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto transition-colors duration-300'>
				{/* Header */}
				<div className='flex justify-between items-center border-b dark:border-gray-700 pb-3 sm:pb-4 mb-4 sm:mb-6'>
					<h2 className='text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100'>
						{t('roomBooking.bookingTitle')} {room.name}
					</h2>
					<button
						className='text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 text-2xl sm:text-3xl transition-colors'
						onClick={closeModal}
					>
						&times;
					</button>
				</div>

				{/* Body */}
				<div className='space-y-4 sm:space-y-6'>
					{/* Colleagues Section */}
					{room.type !== 'Open' && (
						<div className='space-y-4'>
							{formData.colleagues.map((colleague, index) => (
								<div key={`colleague_${index}`} className='flex flex-col'>
									<label className='text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-1'>
										{t('roomBooking.colleagueEmail')} {index + 1} {t('roomBooking.email')}
									</label>
									<input
										type='email'
										name={`colleague_${index}`}
										value={colleague}
										onChange={handleInputChange}
										className='p-2 sm:p-3 text-sm sm:text-base border dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-gray-700 dark:text-gray-200'
										required
										placeholder='e.g., colleague@example.com'
									/>
								</div>
							))}
						</div>
					)}

					{/* Date Selection */}
					<div>
						<label className='block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium'>
							{t('roomBooking.selectDate')}
						</label>
						<CustomDatepicker
							onDateChange={handleDateSelected}
							availableDates={availabilityData.availableDates}
							placeholder={t('roomBooking.chooseDatePlaceholder')}
							className='text-sm sm:text-base'
						/>
					</div>

					{/* Time Slots */}
					<div>
						<label className='block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium'>
							{t('roomBooking.selectTimeSlot')}
						</label>
						{formData.date ? (
							availabilityData.displaySlots.length > 0 ? (
								<div className='grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4'>
									{availabilityData.displaySlots.map((slot, index) => {
										const isSelected =
											formData.startTime === slot.startTime && formData.endTime === slot.endTime;
										const isAvailable = slot.status === 'Available' && !slot.isPast;

										// Styling Logic
										let baseClass =
											'relative px-4 py-3 border rounded-md flex items-center justify-center transition dark:border-gray-600 text-sm sm:text-base ';
										if (isSelected)
											baseClass +=
												'bg-blue-700 dark:bg-blue-600 text-white border-blue-600 hover:bg-blue-700 ';
										else if (isAvailable)
											baseClass +=
												'text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer ';
										else
											baseClass +=
												'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed ';

										return (
											<button
												key={index}
												onClick={() => handleSlotSelect(slot)}
												className={baseClass}
												disabled={!isAvailable}
											>
												<span className={!isAvailable ? 'line-through' : ''}>
													{formatTime(slot.startTime)} - {formatTime(slot.endTime, true)}
												</span>
												{!isAvailable && (
													<div className='absolute bottom-0 right-2'>
														<span className='text-[8px] xs:text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400'>
															{slot.isPast ? 'Past' : 'Booked'}
														</span>
													</div>
												)}
											</button>
										);
									})}
								</div>
							) : (
								<p className='text-red-500 dark:text-red-400 text-sm sm:text-base'>
									{t('roomBooking.noTimeSlots')}
								</p>
							)
						) : (
							<p className='text-gray-500 dark:text-gray-400 text-sm sm:text-base'>
								{t('roomBooking.selectDateFirst')}
							</p>
						)}
					</div>

					{/* Status Messages */}
					{(status.error || status.success) && (
						<div className='my-4 text-center'>
							{status.error && (
								<Message
									message={status.error}
									type='error'
									onClose={() => setStatus((prev) => ({ ...prev, error: '' }))}
								/>
							)}
							{status.success && (
								<Message
									message={status.success}
									type='success'
									onClose={() => setStatus((prev) => ({ ...prev, success: '' }))}
								/>
							)}
						</div>
					)}

					{/* Action Button */}
					<button
						onClick={handleProceedBooking}
						disabled={status.isSubmitting}
						className={`w-full py-2 sm:py-3 text-base sm:text-lg bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
							status.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
						}`}
					>
						{status.isSubmitting
							? t('roomBooking.bookingInProgress')
							: t('roomBooking.proceedButton')}
					</button>
				</div>
			</div>
		</div>
	);
};

export default RoomCardBookingForm;
