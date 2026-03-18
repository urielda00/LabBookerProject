import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SidebarLayout } from '../components/layout/SidebarLayout';
import RoomOperations from '../components/roomOperations';
import CreateRoomForm from '../components/createRoomForm';
import UpdateRoomForm from '../components/updateRoomForm';
import DeleteRoomForm from '../components/deleteRoomForm';

const RoomPage = () => {
	const { t } = useTranslation();
	const [operation, setOperation] = useState('create');

	// State needed specifically for the Update flow to persist selection across re-renders if needed,
	// though strictly speaking, the UpdateForm could manage this internally if we didn't want to reset on tab switch.
	// We keep it here to compatible with the passed props pattern.
	const [roomId, setRoomId] = useState('');
	const [roomDetails, setRoomDetails] = useState(null);

	const handleOperationChange = (newOp) => {
		setOperation(newOp);
		// Reset state when switching tabs to ensure a clean slate
		setRoomId('');
		setRoomDetails(null);
	};

	const handleSuccess = (msg) => {
		// Optional: Could trigger a global toast here
		// Resetting IDs after success
		if (operation !== 'create') {
			setRoomId('');
			setRoomDetails(null);
		}
	};

	return (
		<SidebarLayout>
			<div className='min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-8 flex flex-col items-center transition-colors'>
				<motion.h1
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className='text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white mb-8'
				>
					{t('roomPage.header')}
				</motion.h1>

				<div className='w-full max-w-5xl space-y-6'>
					{/* Operations Toolbar */}
					<RoomOperations
						operation={operation}
						setOperation={handleOperationChange}
						setRoomId={setRoomId}
						setRoomDetails={setRoomDetails}
					/>

					{/* Content Area */}
					<AnimatePresence mode='wait'>
						<motion.div
							key={operation}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
						>
							{operation === 'create' && <CreateRoomForm onSuccess={handleSuccess} />}

							{operation === 'update' && (
								<UpdateRoomForm
									roomId={roomId}
									setRoomId={setRoomId}
									roomDetails={roomDetails}
									setRoomDetails={setRoomDetails}
									onSuccess={handleSuccess}
								/>
							)}

							{operation === 'delete' && <DeleteRoomForm onSuccess={handleSuccess} />}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</SidebarLayout>
	);
};

export default RoomPage;
