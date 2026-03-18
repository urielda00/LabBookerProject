import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Message from './common/Error_successMessage';
import AmenitiesSelect from './common/AmenitiesSelect';
import { useUpdateRoom } from '../hooks/useUpdateRoom';

const UpdateRoomForm = ({ roomId, roomDetails, setRoomId, setRoomDetails, onSuccess }) => {
	const { t } = useTranslation();
	const {
		roomsList,
		formData,
		selectedAmenities,
		showForm,
		status,
		handleRoomFetch,
		handleInputChange,
		handleImageChange,
		handleAmenityToggle,
		submitUpdate,
		clearMessages,
	} = useUpdateRoom(roomId, setRoomId, roomDetails, setRoomDetails, onSuccess);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className='bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 transition-colors'
		>
			<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6'>
				{t('updateRoom.title')}
			</h2>

			{/* Room Selection */}
			<div className='mb-8 p-4 bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600'>
				<div className='flex flex-col sm:flex-row gap-4 items-end'>
					<div className='flex-grow w-full'>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
							{t('updateRoom.selectSection.label')}
						</label>
						<select
							value={roomId}
							onChange={(e) => setRoomId(e.target.value)}
							className='input-field w-full'
						>
							<option value='' disabled>
								{t('updateRoom.selectSection.placeholder')}
							</option>
							{roomsList.map((room) => (
								<option key={room._id} value={room.name}>
									{room.name}
								</option>
							))}
						</select>
					</div>
					<button
						type='button'
						onClick={handleRoomFetch}
						disabled={!roomId || status.fetchingRoom}
						className='w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors'
					>
						{status.fetchingRoom ? t('common.loading') : t('updateRoom.selectSection.fetchBtn')}
					</button>
				</div>
			</div>

			{/* Error/Success Messages (Global) */}
			<div className='text-center mb-4'>
				{status.error && !showForm && (
					<Message message={status.error} type='error' onClose={clearMessages} />
				)}
				{status.success && !showForm && (
					<Message message={status.success} type='success' onClose={clearMessages} />
				)}
			</div>

			{/* Edit Form */}
			{showForm && (
				<motion.form
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					onSubmit={submitUpdate}
					className='space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6'
				>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div>
							<label className='label'>{t('updateRoom.fields.name')}</label>
							<input
								type='text'
								name='name'
								value={formData.name}
								onChange={handleInputChange}
								className='input-field'
							/>
						</div>
						<div>
							<label className='label'>{t('updateRoom.fields.type')}</label>
							<select
								name='type'
								value={formData.type}
								onChange={handleInputChange}
								className='input-field'
							>
								<option value='Open'>Open</option>
								<option value='Small Seminar'>Small Seminar</option>
								<option value='Large Seminar'>Large Seminar</option>
							</select>
						</div>
						<div>
							<label className='label'>{t('updateRoom.fields.capacity')}</label>
							<input
								type='number'
								name='capacity'
								value={formData.capacity}
								onChange={handleInputChange}
								className='input-field'
							/>
						</div>
						<div>
							<label className='label'>{t('updateRoom.sections.upload')}</label>
							<input type='file' onChange={handleImageChange} className='file-input w-full' />
						</div>
					</div>

					<div>
						<label className='label'>{t('updateRoom.fields.description')}</label>
						<textarea
							name='description'
							value={formData.description}
							onChange={handleInputChange}
							className='input-field w-full'
							rows='3'
						/>
					</div>

					<AmenitiesSelect selectedAmenities={selectedAmenities} onToggle={handleAmenityToggle} />

					<div className='text-center'>
						{status.error && (
							<Message message={status.error} type='error' onClose={clearMessages} />
						)}
						{status.success && (
							<Message message={status.success} type='success' onClose={clearMessages} />
						)}
					</div>

					<div className='flex justify-end'>
						<button
							type='submit'
							disabled={status.loading}
							className='px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-colors'
						>
							{status.loading ? t('common.saving') : t('updateRoom.buttons.submit')}
						</button>
					</div>
				</motion.form>
			)}
		</motion.div>
	);
};

export default UpdateRoomForm;
