import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import BaseModal from '../common/BaseModal';
import { useCreateTransferRequest } from '../../hooks/useTransfers'; // Import the new hook

const TransferRequestModal = ({ booking, onClose, fetchWeeklyBookings }) => {
	const { t } = useTranslation();
	const [message, setMessage] = useState('');
	const [showSuccess, setShowSuccess] = useState(false);

	// Use the hook
	const { submitRequest, loading, error } = useCreateTransferRequest();

	const handleSubmit = async (e) => {
		e.preventDefault();

		const result = await submitRequest(booking._id, message);

		if (result.success) {
			setShowSuccess(true);
			setTimeout(() => {
				onClose();
				if (fetchWeeklyBookings) fetchWeeklyBookings();
			}, 1500);
		}
	};

	return (
		<BaseModal
			isOpen={true}
			onClose={onClose}
			title={t('transferRequest.title', 'Request Transfer')}
			showCloseButton={true}
		>
			<form onSubmit={handleSubmit} className='space-y-4'>
				{showSuccess ? (
					<div className='text-center py-6'>
						<CheckCircle2 className='w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4 animate-bounce' />
						<p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
							{t('transferRequest.success', 'Request sent successfully!')}
						</p>
					</div>
				) : (
					<>
						<div>
							<label className='block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300'>
								{t('transferRequest.messageLabel', 'Message to')} {booking.userId?.username}
							</label>
							<textarea
								required
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								className='w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
								placeholder={t(
									'transferRequest.placeholder',
									'Explain why you need this booking...'
								)}
								rows='4'
							/>
						</div>

						{error && (
							<div className='p-3 bg-red-100 text-red-700 rounded-lg dark:bg-red-900/30 dark:text-red-300 text-sm'>
								{error}
							</div>
						)}

						<div className='flex flex-col sm:flex-row gap-3 justify-end pt-2'>
							<button
								type='button'
								onClick={onClose}
								className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
								disabled={loading}
							>
								{t('common.cancel', 'Cancel')}
							</button>
							<button
								type='submit'
								className='px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50'
								disabled={loading}
							>
								{loading
									? t('common.sending', 'Sending...')
									: t('transferRequest.send', 'Send Request')}
							</button>
						</div>
					</>
				)}
			</form>
		</BaseModal>
	);
};

export default TransferRequestModal;
