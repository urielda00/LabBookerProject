import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * BaseModal Component
 * A reusable modal wrapper that handles animations, backdrop, and closing logic.
 * * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Function to close the modal
 * @param {string} title - Optional title for the header
 * @param {React.ReactNode} children - The content of the modal
 * @param {boolean} showCloseButton - Whether to show the top-right X button
 * @param {string} maxWidth - Tailwind class for width (default: max-w-md)
 */
const BaseModal = ({
	isOpen,
	onClose,
	title,
	children,
	showCloseButton = true,
	maxWidth = 'max-w-md',
}) => {
	// Close on Escape key press
	useEffect(() => {
		const handleEsc = (e) => {
			if (e.key === 'Escape') onClose();
		};
		if (isOpen) window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen, onClose]);

	return (
		<AnimatePresence>
			{isOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto'>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className='fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm'
					/>

					{/* Modal Content */}
					<motion.div
						initial={{ scale: 0.95, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: 20 }}
						transition={{ duration: 0.2 }}
						className={`relative w-full ${maxWidth} bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden z-10`}
					>
						{/* Header */}
						{(title || showCloseButton) && (
							<div className='flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700'>
								{title && (
									<h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
										{title}
									</h3>
								)}
								{showCloseButton && (
									<button
										onClick={onClose}
										className='p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors'
									>
										<X className='w-5 h-5' />
									</button>
								)}
							</div>
						)}

						{/* Body */}
						<div className='p-6'>{children}</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default BaseModal;
