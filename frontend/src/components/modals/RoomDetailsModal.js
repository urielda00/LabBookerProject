import React from 'react';
import BaseModal from '../common/BaseModal';
import iconMapping from '../../utils/iconMapping';
import { useTranslation } from 'react-i18next';

const RoomDetailsModal = ({ isOpen, onClose, room, onRulesClick }) => {
	const { t } = useTranslation();

	if (!room) return null;

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={room.name}
			showCloseButton={true}
			maxWidth='max-w-2xl'
		>
			<div className='space-y-6'>
				{/* Description */}
				<div>
					<h4 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2'>
						{t('roomDetails.description', 'Description')}
					</h4>
					<p className='text-gray-600 dark:text-gray-300 text-sm leading-relaxed'>
						{room.description || t('roomDetails.noDescription', 'No description available.')}
					</p>
				</div>

				{/* Amenities */}
				<div>
					<h4 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3'>
						{t('roomDetails.amenities', 'Room Amenities')}
					</h4>
					{room.amenities && room.amenities.length > 0 ? (
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
							{room.amenities.map((item, index) => {
								const name = item.name || item;
								const iconName = item.icon || name;
								const IconComponent = iconMapping[iconName];

								return (
									<div
										key={index}
										className='flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 hover:bg-gray-100 transition-colors'
									>
										<div className='text-blue-600 dark:text-blue-400'>
											{IconComponent && React.cloneElement(IconComponent, { className: 'w-5 h-5' })}
										</div>
										<span className='text-sm font-medium text-gray-700 dark:text-gray-200 capitalize'>
											{name}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<div className='text-center py-4 bg-gray-50 border border-dashed rounded-lg text-gray-500 italic'>
							{t('roomDetails.noAmenities', 'No amenities listed.')}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700'>
					<button
						onClick={onRulesClick}
						className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm'
					>
						{t('roomDetails.guidelines', 'View Guidelines')}
					</button>
				</div>
			</div>
		</BaseModal>
	);
};

export default RoomDetailsModal;
