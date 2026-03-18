import React from 'react';
import Message from './common/Error_successMessage';
import CustomDatepicker from '../utils/CustomDatepicker';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useCreateBooking } from '../hooks/useCreateBooking';

const CreateBookingByNamesForm = ({ onSuccess }) => {
	const { t } = useTranslation();

	const {
		formData,
		colleagueEmail,
		roomConfig,
		availabilityData,
		status,
		setColleagueEmail,
		setStatusMsg,
		updateField,
		fetchRoomDetails,
		addColleague,
		removeColleague,
		fetchAvailability,
		handleDateSelected,
		handleSlotSelect,
		submitBooking,
	} = useCreateBooking(onSuccess);

	// --- Helper for disabled state logic ---
	const isSubmitDisabled =
		status.isSubmitting ||
		(roomConfig.type !== 'Open' && formData.colleagues.length !== roomConfig.requiredUsers);

	// --- Helper for rendering time slots ---
	const renderTimeSlot = (slot, index) => {
		const isSelected = formData.startTime === slot.startTime && formData.endTime === slot.endTime;
		let slotStatus = 'Available';

		if (slot.status !== 'Available') slotStatus = 'Booked';
		else if (slot.isPast) slotStatus = 'Past';

		// Unavailable Slot (Booked or Past)
		if (slotStatus !== 'Available') {
			const statusColor =
				slotStatus === 'Booked'
					? 'text-red-500 dark:text-red-400'
					: 'text-gray-500 dark:text-gray-400';
			return (
				<div
					key={index}
					className='relative px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center text-xs sm:text-sm'
				>
					<span className='line-through'>
						{slot.startTime} - {slot.endTime}
					</span>
					<div className='absolute bottom-0 right-1 sm:right-2'>
						<span className={`text-[8px] sm:text-[10px] uppercase font-semibold ${statusColor}`}>
							{slotStatus}
						</span>
					</div>
				</div>
			);
		}

		// Available Slot
		return (
			<button
				key={index}
				onClick={() => handleSlotSelect(slot)}
				type='button'
				className={`px-3 py-2 sm:px-4 sm:py-3 border rounded-lg transition text-xs sm:text-sm ${
					isSelected
						? 'bg-blue-500 dark:bg-blue-600 text-white border-blue-500'
						: 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600'
				}`}
			>
				{slot.startTime} - {slot.endTime}
			</button>
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300'
		>
			<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8'>
				{t('createBookingByNames.title')}
			</h2>

			<form onSubmit={submitBooking} className='space-y-6 sm:space-y-8 md:space-y-10'>
				{/* --- Section 1: Basic Details --- */}
				<div className='space-y-4 sm:space-y-6'>
					<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2'>
						{t('createBookingByNames.sectionDetails')}
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'>
						{/* Room Name Input */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
								{t('createBookingByNames.roomNameLabel')} <span className='text-red-500'>*</span>
							</label>
							<div className='flex flex-col sm:flex-row gap-2'>
								<input
									type='text'
									name='roomName'
									value={formData.roomName}
									onChange={(e) => updateField('roomName', e.target.value)}
									className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
									placeholder='e.g. Large Seminar Room A'
								/>
								<button
									type='button'
									onClick={fetchRoomDetails}
									className='px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 text-sm sm:text-base whitespace-nowrap'
								>
									{t('createBookingByNames.fetchDetails')}
								</button>
							</div>
						</div>

						{/* Username Input */}
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
								{t('createBookingByNames.usernameLabel')} <span className='text-red-500'>*</span>
							</label>
							<input
								type='text'
								name='username'
								value={formData.username}
								onChange={(e) => updateField('username', e.target.value)}
								className='w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200'
								placeholder='e.g. jdoe'
							/>
						</div>
					</div>
				</div>

				{/* --- Section 2: Additional Users --- */}
				{roomConfig.type && (
					<div className='space-y-4'>
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
								{roomConfig.type === 'Open' ? (
									t('createBookingByNames.additionalNotAllowed')
								) : (
									<div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2'>
										<span>
											{t('createBookingByNames.addUserLabel')}{' '}
											<span className='text-red-500'>*</span>
										</span>
										<span className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
											(Exactly {roomConfig.requiredUsers} user
											{roomConfig.requiredUsers > 1 ? 's' : ''} {t('createBookingByNames.required')}
											)
										</span>
									</div>
								)}
							</label>

							{roomConfig.type !== 'Open' && (
								<div className='space-y-3'>
									<div className='flex flex-col sm:flex-row gap-2'>
										<input
											type='email'
											value={colleagueEmail}
											onChange={(e) => {
												setColleagueEmail(e.target.value);
												setStatusMsg('error', '');
											}}
											className={`w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base
                                            ${
																							formData.colleagues.length ===
																							roomConfig.requiredUsers
																								? 'border-blue-500 dark:border-blue-600'
																								: 'border-gray-300 dark:border-gray-600'
																						}
                                            bg-white dark:bg-gray-700 dark:text-gray-200`}
											placeholder='Enter user email'
											disabled={formData.colleagues.length >= roomConfig.requiredUsers}
										/>
										<button
											type='button'
											onClick={addColleague}
											disabled={
												!colleagueEmail.trim() ||
												formData.colleagues.length >= roomConfig.requiredUsers
											}
											className={`px-4 py-2 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap
                                            ${
																							!colleagueEmail.trim() ||
																							formData.colleagues.length >= roomConfig.requiredUsers
																								? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
																								: 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 focus:ring-2 focus:ring-blue-400'
																						}`}
										>
											{t('createBookingByNames.addUserBtn')}
										</button>
									</div>

									<p
										className={`text-xs sm:text-sm ${
											formData.colleagues.length === roomConfig.requiredUsers
												? 'text-blue-600 dark:text-blue-400'
												: 'text-red-600 dark:text-red-400'
										}`}
									>
										{formData.colleagues.length}/{roomConfig.requiredUsers} user
										{roomConfig.requiredUsers > 1 ? 's' : ''} added
									</p>

									{formData.colleagues.length > 0 && (
										<div className='mt-2'>
											<p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
												Added emails:
											</p>
											<div className='flex flex-wrap gap-2'>
												{formData.colleagues.map((email, index) => (
													<span
														key={index}
														className='inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
													>
														{email}
														<button
															type='button'
															onClick={() => removeColleague(email)}
															className='ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 focus:outline-none'
														>
															<FaTimes size={12} />
														</button>
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				)}

				{/* --- Section 3: Availability --- */}
				<div className='space-y-4 sm:space-y-6'>
					<h3 className='text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2'>
						{t('createBookingByNames.checkAvailability')}
					</h3>
					<button
						type='button'
						onClick={fetchAvailability}
						disabled={status.loadingAvailability || !roomConfig.type}
						className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
							status.loadingAvailability || !roomConfig.type
								? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
								: 'bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400'
						}`}
					>
						{status.loadingAvailability
							? 'Loading...'
							: t('createBookingByNames.fetchAvailability')}
					</button>

					{availabilityData.availableDates.length > 0 && (
						<div className='space-y-4'>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
								{t('createBookingByNames.selectDate')} <span className='text-red-500'>*</span>
							</label>
							<div className='max-w-full overflow-x-auto'>
								<CustomDatepicker
									onDateChange={handleDateSelected}
									availableDates={availabilityData.availableDates}
									theme='blue'
									className='dark:bg-gray-700'
								/>
							</div>
						</div>
					)}

					{/* Time Slots Grid */}
					{formData.date && (
						<div className='space-y-4'>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
								{t('createBookingByNames.selectTimeSlot')} <span className='text-red-500'>*</span>
							</label>
							{availabilityData.displaySlots.length > 0 ? (
								<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4'>
									{availabilityData.displaySlots.map((slot, index) => renderTimeSlot(slot, index))}
								</div>
							) : (
								<div className='text-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg'>
									<p className='text-red-500 dark:text-red-400 text-sm'>
										{t('createBookingByNames.noAvailableSlots', { date: formData.date })}
									</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* --- Messages & Submit --- */}
				<div className='text-center'>
					{status.error && (
						<Message
							message={status.error}
							type='error'
							onClose={() => setStatusMsg('error', '')}
							className='dark:bg-red-900/20 dark:text-red-300'
						/>
					)}
					{status.success && (
						<Message
							message={status.success}
							type='success'
							onClose={() => setStatusMsg('success', '')}
							className='dark:bg-blue-900/20 dark:text-blue-300'
						/>
					)}
				</div>

				<div className='flex justify-end'>
					<button
						type='submit'
						disabled={isSubmitDisabled}
						className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
							isSubmitDisabled
								? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
								: 'bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400'
						}`}
					>
						{status.isSubmitting
							? t('createBookingByNames.submitCreating')
							: roomConfig.type !== 'Open' &&
							  formData.colleagues.length !== roomConfig.requiredUsers
							? t('createBookingByNames.addMoreUsers', {
									count: roomConfig.requiredUsers - formData.colleagues.length,
							  })
							: t('createBookingByNames.createBooking')}
					</button>
				</div>
			</form>
		</motion.div>
	);
};

export default CreateBookingByNamesForm;
