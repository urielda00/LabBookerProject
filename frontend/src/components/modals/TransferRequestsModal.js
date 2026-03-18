import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import BaseModal from '../common/BaseModal';
import ConfirmationModal from '../common/ConfirmationModal';
import { useBookingTransfers } from '../../hooks/useTransfers'; // Import the new hook

const TransferRequestsModal = ({ booking, onClose }) => {
	const { t } = useTranslation();

	// UI Logic State
	const [confirmAction, setConfirmAction] = useState(null); // 'accept' | 'decline' | null
	const [requestToActOn, setRequestToActOn] = useState(null);
	const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

	// Business Logic Hook
	const { requests, loading, error, acceptRequest, declineRequest } = useBookingTransfers(
		booking._id
	);

	const handleActionClick = (request, action) => {
		setRequestToActOn(request);
		setConfirmAction(action);
	};

	const handleConfirmAction = async () => {
		if (!requestToActOn || !confirmAction) return;

		const isAccept = confirmAction === 'accept';
		const result = isAccept
			? await acceptRequest(requestToActOn._id)
			: await declineRequest(requestToActOn._id);

		if (result.success) {
			setFeedbackMsg({
				type: 'success',
				text: isAccept
					? t('transferRequests.accepted', 'Request accepted successfully')
					: t('transferRequests.declined', 'Request declined successfully'),
			});
		} else {
			setFeedbackMsg({ type: 'error', text: result.message });
		}

		setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 3000);
		setConfirmAction(null);
		setRequestToActOn(null);
	};

	return (
		<>
			<BaseModal
				isOpen={true}
				onClose={onClose}
				title={`${t('transferRequests.title', 'Transfer Requests')} (${requests.length})`}
				showCloseButton={true}
				maxWidth='max-w-xl'
			>
				<div className='flex flex-col h-[60vh]'>
					{/* Status Messages */}
					{(feedbackMsg.text || error) && (
						<div
							className={`mb-4 p-3 rounded-lg text-sm ${
								feedbackMsg.type === 'error' || error
									? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
									: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
							}`}
						>
							{feedbackMsg.text || error}
						</div>
					)}

					{/* List Content */}
					<div className='flex-1 overflow-y-auto pr-2 space-y-3'>
						{loading ? (
							<div className='text-center py-8 text-gray-500 dark:text-gray-400'>
								{t('common.loading', 'Loading requests...')}
							</div>
						) : requests.length === 0 ? (
							<div className='text-center py-8 text-gray-500 dark:text-gray-400'>
								{t('transferRequests.empty', 'No pending requests')}
							</div>
						) : (
							requests.map((request) => (
								<div
									key={request._id}
									className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700'
								>
									<div className='flex flex-col sm:flex-row sm:items-center gap-2 mb-3'>
										<div className='flex items-center gap-2'>
											<div className='bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full'>
												<User className='w-4 h-4 text-blue-600 dark:text-blue-400' />
											</div>
											<span className='font-medium text-gray-900 dark:text-gray-100'>
												{request.fromUser?.username}
											</span>
										</div>
										<span className='text-sm text-gray-500 dark:text-gray-400 break-all sm:ml-auto'>
											{request.fromUser?.email}
										</span>
									</div>

									<div className='bg-white dark:bg-gray-800 p-3 rounded-md mb-4 border border-gray-100 dark:border-gray-600'>
										<p className='text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap'>
											"{request.message}"
										</p>
									</div>

									<div className='flex gap-2 justify-end'>
										<button
											onClick={() => handleActionClick(request, 'decline')}
											className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
										>
											{t('transferRequests.decline', 'Decline')}
										</button>
										<button
											onClick={() => handleActionClick(request, 'accept')}
											className='px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
										>
											{t('transferRequests.accept', 'Accept')}
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</BaseModal>

			<ConfirmationModal
				isOpen={!!confirmAction}
				onClose={() => {
					setConfirmAction(null);
					setRequestToActOn(null);
				}}
				onConfirm={handleConfirmAction}
				title={
					confirmAction === 'accept'
						? t('transferRequests.confirmAcceptTitle', 'Confirm Transfer')
						: t('transferRequests.confirmDeclineTitle', 'Decline Request')
				}
				message={
					confirmAction === 'accept'
						? t(
								'transferRequests.confirmAcceptMsg',
								"By accepting, you'll permanently transfer this booking."
						  )
						: t(
								'transferRequests.confirmDeclineMsg',
								'Are you sure you want to decline this transfer request?'
						  )
				}
				confirmText={t('common.confirm', 'Confirm')}
				cancelText={t('common.cancel', 'Cancel')}
				variant={confirmAction === 'accept' ? 'primary' : 'danger'}
			/>
		</>
	);
};

export default TransferRequestsModal;
