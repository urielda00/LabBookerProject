import React from 'react';
import BaseModal from './BaseModal'; // Make sure path is correct
import { useTranslation } from 'react-i18next';

/**
 * ConfirmationModal
 * A generic modal for "Are you sure?" actions.
 * * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onConfirm - Function to run when user confirms
 * @param {string} title
 * @param {React.ReactNode} message - The body content
 * @param {string} confirmText
 * @param {string} cancelText
 * @param {string} variant - 'danger' (red) or 'primary' (blue)
 */
const ConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText,
	cancelText,
	variant = 'danger', // default to red for destructive actions
}) => {
	const { t } = useTranslation();

	const isDanger = variant === 'danger';

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			showCloseButton={false} // Clean look for confirmation dialogs
		>
			<div className='space-y-4'>
				{/* Content Area */}
				<div className='text-gray-600 dark:text-gray-300'>{message}</div>

				{/* Action Buttons */}
				<div className='flex justify-end gap-3 mt-6'>
					<button
						onClick={onClose}
						className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors'
					>
						{cancelText || t('common.cancel', 'Cancel')}
					</button>

					<button
						onClick={() => {
							onConfirm();
							onClose();
						}}
						className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
							isDanger
								? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
								: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
						}`}
					>
						{confirmText || t('common.confirm', 'Confirm')}
					</button>
				</div>
			</div>
		</BaseModal>
	);
};

export default ConfirmationModal;
