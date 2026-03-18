import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Message from './common/Error_successMessage';
import ConfirmationModal from './common/ConfirmationModal';
import { useDeleteRoom } from '../hooks/useDeleteRoom';
import { Trash2, AlertTriangle } from 'lucide-react';

const DeleteRoomForm = ({ onSuccess }) => {
	const { t } = useTranslation();
	const {
		roomsList,
		selectedRoomId,
		relatedBookings,
		status,
		handleRoomSelect,
		confirmDelete,
		clearMessages,
	} = useDeleteRoom(onSuccess);

	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleDeleteClick = () => {
		if (!selectedRoomId) return;
		setIsModalOpen(true);
	};

	const handleConfirm = async () => {
		setIsModalOpen(false);
		await confirmDelete();
	};

	const selectedRoomDetails = roomsList.find((r) => r.name === selectedRoomId);

	// Render Success Message content
	const renderSuccessContent = () => {
		if (!status.success || typeof status.success === 'string') return status.success;

		return (
			<div className='space-y-2 text-left rtl:text-right'>
				<p>{status.success.title}</p>
				<div className='text-sm bg-blue-50 p-3 rounded-md border border-blue-100'>
					<ul className='text-blue-800 space-y-1'>
						<li>
							<b>Name:</b> {status.success.details.name}
						</li>
						<li>
							<b>Type:</b> {status.success.details.type}
						</li>
						<li>
							<b>Bookings Removed:</b> {status.success.bookingsCount}
						</li>
					</ul>
				</div>
			</div>
		);
	};

	return (
		<>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className='bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8'
			>
				<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-8'>
					{t('deleteRoom.header')}
				</h2>

				<div className='space-y-6 max-w-2xl mx-auto'>
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							{t('deleteRoom.selectRoom')}
						</label>
						<select
							value={selectedRoomId}
							onChange={(e) => handleRoomSelect(e.target.value)}
							disabled={status.loadingRooms}
							className='input-field w-full'
						>
							<option value='' disabled>
								{status.loadingRooms ? 'Loading...' : t('deleteRoom.selecatRoom')}
							</option>
							{roomsList.map((room) => (
								<option key={room._id} value={room.name}>
									{room.name} ({room.type})
								</option>
							))}
						</select>
					</div>

					{/* Room Preview Card */}
					{selectedRoomDetails && (
						<div className='bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm'>
							<h3 className='font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-2'>
								{t('deleteRoom.selectedRoomDetails')}
							</h3>
							<div className='grid grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300'>
								<div>
									<span className='block text-xs uppercase text-gray-400'>Type</span>
									{selectedRoomDetails.type}
								</div>
								<div>
									<span className='block text-xs uppercase text-gray-400'>Capacity</span>
									{selectedRoomDetails.capacity}
								</div>
								<div>
									<span className='block text-xs uppercase text-gray-400'>Amenities</span>
									{selectedRoomDetails.amenities.length}
								</div>
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className='flex justify-end pt-4'>
						<button
							type='button'
							onClick={handleDeleteClick}
							disabled={!selectedRoomId || status.loading}
							className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
								!selectedRoomId
									? 'bg-gray-200 text-gray-400 cursor-not-allowed'
									: 'bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md'
							}`}
						>
							<Trash2 size={18} />
							{status.loading ? t('deleteRoom.deleting') : t('deleteRoom.delete')}
						</button>
					</div>

					{/* Messages */}
					<AnimatePresence>
						{status.error && (
							<Message message={status.error} type='error' onClose={clearMessages} />
						)}
						{status.success && (
							<Message message={renderSuccessContent()} type='success' onClose={clearMessages} />
						)}
					</AnimatePresence>
				</div>
			</motion.div>

			{/* Modal */}
			<ConfirmationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onConfirm={handleConfirm}
				title={t('deleteRoom.confirmDeleteTitle')}
				message={
					<div className='text-center'>
						<AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-3' />
						<p className='text-gray-600 dark:text-gray-300 mb-4'>
							{t('deleteRoom.confirmDeleteText')}
						</p>
						{relatedBookings.length > 0 && (
							<div className='bg-red-50 p-3 rounded text-red-700 text-sm'>
								<b>Warning:</b> There are {relatedBookings.length} active bookings for this room.
								They will be permanently deleted.
							</div>
						)}
					</div>
				}
				confirmText={t('deleteRoom.delete')}
				cancelText={t('deleteRoom.cancel')}
			/>
		</>
	);
};

export default DeleteRoomForm;
