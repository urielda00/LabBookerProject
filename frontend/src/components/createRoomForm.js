import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Message from './common/Error_successMessage';
import AmenitiesSelect from './common/AmenitiesSelect';
import { useCreateRoom } from '../hooks/useCreateRoom';

const CreateRoomForm = ({ onSuccess }) => {
	const { t } = useTranslation();
	const {
		formData,
		selectedAmenities,
		status,
		handleInputChange,
		handleImageChange,
		handleAmenityToggle,
		submitRoom,
		clearMessages,
	} = useCreateRoom(onSuccess);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className='bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 transition-colors'
		>
			<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-8'>
				{t('createRoom.title')}
			</h2>

			<form onSubmit={submitRoom} className='space-y-6'>
				{/* Basic Info */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
							{t('createRoom.fields.name')} *
						</label>
						<input
							type='text'
							name='name'
							value={formData.name}
							onChange={handleInputChange}
							className='input-field' // Assume you have a global class or use full tailwind classes
							placeholder={t('createRoom.fields.namePlaceHolder')}
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
							{t('createRoom.fields.type')} *
						</label>
						<select
							name='type'
							value={formData.type}
							onChange={handleInputChange}
							className='input-field'
							required
						>
							<option value='' disabled>
								{t('createRoom.fields.selectType')}
							</option>
							<option value='Open'>{t('createRoom.fields.types.open')}</option>
							<option value='Small Seminar'>{t('createRoom.fields.types.small')}</option>
							<option value='Large Seminar'>{t('createRoom.fields.types.large')}</option>
						</select>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
							{t('createRoom.fields.capacity')} *
						</label>
						<input
							type='number'
							name='capacity'
							value={formData.capacity}
							onChange={handleInputChange}
							className='input-field'
							min='1'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
							{t('createRoom.sections.upload')}
						</label>
						<input
							type='file'
							onChange={handleImageChange}
							accept='image/*'
							className='file-input block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
						/>
					</div>
				</div>

				{/* Description */}
				<div>
					<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
						{t('createRoom.fields.description')}
					</label>
					<textarea
						name='description'
						value={formData.description}
						onChange={handleInputChange}
						rows='3'
						className='input-field w-full'
					/>
				</div>

				{/* Amenities - Reusable Component */}
				<AmenitiesSelect selectedAmenities={selectedAmenities} onToggle={handleAmenityToggle} />

				{/* Feedback Messages */}
				<div className='flex flex-col items-center gap-2'>
					{status.error && <Message message={status.error} type='error' onClose={clearMessages} />}
					{status.success && (
						<Message message={status.success} type='success' onClose={clearMessages} />
					)}
				</div>

				{/* Submit */}
				<div className='flex justify-end pt-4'>
					<button
						type='submit'
						disabled={status.loading}
						className={`btn-primary px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md ${
							status.loading ? 'opacity-50 cursor-not-allowed' : ''
						}`}
					>
						{status.loading ? t('createRoom.buttons.submitting') : t('createRoom.buttons.submit')}
					</button>
				</div>
			</form>
		</motion.div>
	);
};

export default CreateRoomForm;
