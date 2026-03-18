import { motion } from 'framer-motion';

/**
 * OperationsToolbar
 * A generic component for switching between CRUD modes (Create, Update, Delete).
 * * @param {Array} actions - Array of objects: { id: string, label: string, icon: Component }
 * @param {string} activeAction - The ID of the currently active action
 * @param {function} onActionChange - Callback when an action is clicked
 */
const OperationsToolbar = ({ actions, activeAction, onActionChange }) => {
	const buttonVariants = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		hover: { scale: 1.02 },
		tap: { scale: 0.98 },
	};

	return (
		<motion.div
			initial='initial'
			animate='animate'
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.6, ease: 'easeInOut' }}
			className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8'
		>
			{actions.map(({ id, label, icon: Icon }) => {
				const isActive = activeAction === id;

				return (
					<motion.button
						key={id}
						variants={buttonVariants}
						whileHover='hover'
						whileTap='tap'
						onClick={() => onActionChange(id)}
						className={`
              min-h-[64px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center 
              p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 
              border font-semibold group
              ${
								isActive
									? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-600 ring-2 ring-blue-500 dark:ring-blue-600'
									: 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600'
							}
            `}
					>
						<div className='flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3'>
							{Icon && (
								<Icon
									className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${
										isActive
											? 'text-blue-500 dark:text-blue-400'
											: 'text-gray-400 dark:text-gray-500 group-hover:text-blue-400'
									}`}
								/>
							)}
							<span className='text-xs sm:text-sm md:text-base text-center sm:text-left'>
								{label}
							</span>
						</div>
					</motion.button>
				);
			})}
		</motion.div>
	);
};

export default OperationsToolbar;
