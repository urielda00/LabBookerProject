import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast Component
 * Displays a temporary floating notification.
 * * @param {string} type - 'success' | 'error' | 'info'
 * @param {string} message - The text to display
 * @param {function} onClose - Function to dismiss the toast
 * @param {number} duration - Auto-close duration in ms (default: 5000)
 */
const Toast = ({ type = 'info', message, onClose, duration = 5000 }) => {
	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(onClose, duration);
			return () => clearTimeout(timer);
		}
	}, [onClose, duration]);

	// Styles configuration
	const styles = {
		success: {
			bg: 'bg-green-100 dark:bg-green-900/30',
			border: 'border-green-500',
			text: 'text-green-800 dark:text-green-200',
			icon: <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />,
		},
		error: {
			bg: 'bg-red-100 dark:bg-red-900/30',
			border: 'border-red-500',
			text: 'text-red-800 dark:text-red-200',
			icon: <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />,
		},
		info: {
			bg: 'bg-blue-100 dark:bg-blue-900/30',
			border: 'border-blue-500',
			text: 'text-blue-800 dark:text-blue-200',
			icon: <Info className='w-5 h-5 text-blue-600 dark:text-blue-400' />,
		},
	};

	const currentStyle = styles[type] || styles.info;

	return (
		<div
			className={`
        fixed bottom-5 right-5 z-[9999] 
        flex items-start space-x-3 p-4 rounded shadow-lg border-l-4 
        transition-all duration-300 animate-slideIn
        ${currentStyle.bg} ${currentStyle.border}
      `}
			role='alert'
		>
			<div className='flex-shrink-0 mt-0.5'>{currentStyle.icon}</div>
			<div className={`flex-1 text-sm font-medium ${currentStyle.text}`}>{message}</div>
			<button
				onClick={onClose}
				className={`ml-4 inline-flex flex-shrink-0 ${currentStyle.text} hover:opacity-75 focus:outline-none`}
			>
				<X className='w-4 h-4' />
			</button>
		</div>
	);
};

export default Toast;
