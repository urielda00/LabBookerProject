import BaseModal from '../common/BaseModal';
import Message from '../common/Error_successMessage';
import { useTranslation } from 'react-i18next';

const VerificationModal = ({
	isOpen,
	email,
	code,
	error,
	onCodeChange,
	onConfirm,
	onClose,
	onCancelEmailChange,
}) => {
	const { t } = useTranslation();

	// Handle cleanup when closing/cancelling
	const handleCancel = () => {
		onCancelEmailChange();
		onCodeChange('');
		onClose();
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={t('verificationModal.title')}
			showCloseButton={true}
		>
			<div className='flex flex-col items-center'>
				<p className='text-center text-gray-600 dark:text-gray-300 mb-6'>
					{t('verificationModal.instruction')}
					<span className='block font-medium text-gray-800 dark:text-white mt-1'>{email}</span>
				</p>

				<input
					type='text'
					value={code}
					onChange={(e) => onCodeChange(e.target.value)}
					maxLength={6}
					className='w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all'
					placeholder='000000'
				/>

				{error && (
					<div className='w-full mt-4'>
						<Message message={error} type='error' onClose={() => onCodeChange('')} />
					</div>
				)}

				<div className='mt-8 flex flex-col sm:flex-row gap-3 w-full'>
					<button
						type='button'
						onClick={handleCancel}
						className='flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium'
					>
						{t('verificationModal.cancel')}
					</button>
					<button
						type='button'
						onClick={onConfirm}
						className='flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium'
					>
						{t('verificationModal.verify')}
					</button>
				</div>
			</div>
		</BaseModal>
	);
};

export default VerificationModal;
