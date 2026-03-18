import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Ban, Clock, AlertTriangle } from 'lucide-react';

const BlockUserModal = ({ isOpen, onClose, user, onConfirm }) => {
	const [selectedBlockDuration, setSelectedBlockDuration] = useState('24');
	const [customDuration, setCustomDuration] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		if (isOpen) {
			setSelectedBlockDuration('24');
			setCustomDuration('');
			setError('');
		}
	}, [isOpen]);

	const handleSubmit = (e) => {
		e.preventDefault();
		const duration =
			selectedBlockDuration === 'custom'
				? parseInt(customDuration, 10)
				: parseInt(selectedBlockDuration, 10);

		if (!duration || duration <= 0) {
			setError('Please enter a valid duration (minimum 1 hour)');
			return;
		}

		onConfirm(duration);
		onClose();
	};

	const DurationOption = ({ value, label, time }) => (
		<label className='flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg cursor-pointer transition-colors border border-gray-200 dark:border-gray-600'>
			<input
				type='radio'
				name='blockDuration'
				value={value}
				checked={selectedBlockDuration === value}
				onChange={(e) => {
					setSelectedBlockDuration(e.target.value);
					setError('');
				}}
				className='h-4 w-4 text-red-500 border-gray-300 focus:ring-red-500 dark:border-gray-500'
			/>
			<div className='flex-1'>
				<p className='font-medium text-gray-900 dark:text-gray-200'>{time}</p>
				<p className='text-sm text-gray-500 dark:text-gray-400'>{label}</p>
			</div>
			<Clock size={18} className='text-gray-400 dark:text-gray-500' />
		</label>
	);

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				<div className='flex items-center gap-3'>
					<div className='bg-red-100 dark:bg-red-900/30 p-2 rounded-lg'>
						<Ban size={20} className='text-red-600 dark:text-red-400' />
					</div>
					<span>Block {user?.name || user?.username}</span>
				</div>
			}
		>
			<form onSubmit={handleSubmit} className='space-y-6'>
				<p className='text-gray-600 dark:text-gray-400 text-sm'>
					Select duration for blocking this user account. During this period, the user will not be
					able to{' '}
					<span className='text-red-600/80 dark:text-red-400 font-medium'>Book Any Room</span>.
				</p>

				<div className='space-y-3 max-h-[60vh] overflow-y-auto pr-1'>
					<DurationOption value='24' label='24 Hours' time='1 Day' />
					<DurationOption value='72' label='72 Hours' time='3 Days' />
					<DurationOption value='168' label='168 Hours' time='7 Days' />
					<DurationOption value='720' label='720 Hours' time='30 Days' />

					<div className='border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3'>
						<label className='flex items-center gap-3'>
							<input
								type='radio'
								name='blockDuration'
								value='custom'
								checked={selectedBlockDuration === 'custom'}
								onChange={(e) => {
									setSelectedBlockDuration(e.target.value);
									setError('');
								}}
								className='h-4 w-4 text-red-500 border-gray-300 focus:ring-red-500 dark:border-gray-500'
							/>
							<span className='font-medium text-gray-900 dark:text-gray-200'>Custom Duration</span>
						</label>

						<div className='flex flex-col sm:flex-row gap-3 pl-7'>
							<input
								type='number'
								min='1'
								value={customDuration}
								onChange={(e) => {
									setCustomDuration(e.target.value);
									setError('');
								}}
								disabled={selectedBlockDuration !== 'custom'}
								className='w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 disabled:opacity-50 text-sm bg-white dark:bg-gray-700 dark:text-gray-200'
								placeholder='Enter hours'
							/>
							<span className='text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap sm:self-center'>
								Hours
							</span>
						</div>
					</div>

					{error && (
						<div className='flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mt-3'>
							<AlertTriangle size={16} />
							<span className='text-sm'>{error}</span>
						</div>
					)}
				</div>

				<div className='flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700'>
					<button
						type='button'
						onClick={onClose}
						className='px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors font-medium'
					>
						Cancel
					</button>
					<button
						type='submit'
						className='px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors shadow-sm font-medium'
					>
						Confirm Block
					</button>
				</div>
			</form>
		</BaseModal>
	);
};

export default BlockUserModal;
