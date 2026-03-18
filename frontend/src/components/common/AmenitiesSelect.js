import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import iconMapping from '../../utils/iconMapping'; // Adjust path as needed
import { useTranslation } from 'react-i18next';

const AmenitiesSelect = ({ selectedAmenities, onToggle }) => {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const availableAmenities = Object.keys(iconMapping);

	return (
		<div className='relative space-y-2'>
			<label className='block text-sm font-medium text-gray-700 dark:text-gray-200'>
				{t('createRoom.fields.selectAmenities')}
			</label>

			<button
				type='button'
				onClick={() => setIsOpen(!isOpen)}
				className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg flex justify-between items-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500'
			>
				<span className='text-sm'>
					{selectedAmenities.length > 0
						? t('createRoom.fields.selectedAmenities', { count: selectedAmenities.length })
						: t('createRoom.fields.selectAmenities')}
				</span>
				<ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			{isOpen && (
				<div className='absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-4'>
					<div className='relative mb-3'>
						<Search className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
						<input
							type='text'
							placeholder={t('createRoom.fields.searchAmenities')}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-200'
						/>
					</div>

					<div className='max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar'>
						{availableAmenities
							.filter((amenity) => amenity.toLowerCase().includes(searchQuery.toLowerCase()))
							.map((amenity) => (
								<label
									key={amenity}
									className='flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors'
								>
									<input
										type='checkbox'
										checked={selectedAmenities.includes(amenity)}
										onChange={() => onToggle(amenity)}
										className='w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500'
									/>
									<span className='text-gray-600 dark:text-gray-300'>{iconMapping[amenity]}</span>
									<span className='text-sm text-gray-700 dark:text-gray-200 capitalize'>
										{amenity}
									</span>
								</label>
							))}
					</div>
				</div>
			)}
		</div>
	);
};

export default AmenitiesSelect;
