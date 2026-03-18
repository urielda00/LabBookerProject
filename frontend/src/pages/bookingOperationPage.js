import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SidebarLayout } from '../components/layout/SidebarLayout';
import BookingOperations from '../components/bookingOperations';
import CreateBooking from '../components/createBooking'; // Fixed typo here
import UpdateBooking from '../components/updateBooking';
import DeleteBooking from '../components/deleteBooking';
import { useTranslation } from 'react-i18next';

const BookingPage = () => {
	const { t } = useTranslation();

	// State
	const [operation, setOperation] = useState('create');
	// Note: These states are currently passed down but logic inside children
	// often handles its own state (like deleteBooking). Kept for compatibility.
	const [bookingId, setBookingId] = useState('');
	const [bookingDetails, setBookingDetails] = useState(null);

	const handleSuccess = (message) => {
		console.log('Operation successful:', message);
		// Reset shared state if necessary
		setBookingId('');
		setBookingDetails(null);
	};

	// Render the active component based on operation state
	const renderActiveComponent = () => {
		const commonProps = {
			onSuccess: handleSuccess,
			setBookingId, // Passing setters if needed by children
			setBookingDetails,
			bookingId,
			bookingDetails,
		};

		switch (operation) {
			case 'create':
				return <CreateBooking {...commonProps} />;
			case 'update':
				return <UpdateBooking {...commonProps} />;
			case 'delete':
				return <DeleteBooking {...commonProps} />;
			default:
				return <CreateBooking {...commonProps} />;
		}
	};

	return (
		<SidebarLayout>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='min-h-screen w-full flex flex-col items-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 overflow-x-hidden dark:bg-gray-900 transition-colors duration-300'
			>
				<motion.h1
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
					className='text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8'
				>
					{t('bookingPage.title')}
				</motion.h1>

				{/* Booking Operations Toolbar */}
				<div className='w-full max-w-4xl'>
					<BookingOperations
						setOperation={setOperation}
						setBookingId={setBookingId}
						setBookingDetails={setBookingDetails}
						operation={operation}
					/>
				</div>

				{/* Dynamic Forms Area */}
				<motion.div
					key={operation} // Helps framer-motion detect changes
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ duration: 0.3 }}
					className='w-full max-w-4xl mt-4 sm:mt-6'
				>
					{renderActiveComponent()}
				</motion.div>
			</motion.div>
		</SidebarLayout>
	);
};

export default BookingPage;
