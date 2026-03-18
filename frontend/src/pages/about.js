import React from 'react';
import { motion } from 'framer-motion';
import LabImage from '../assets/labImage.jpg';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AboutPage = () => {
	const navigate = useNavigate();

	return (
		<motion.section
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.8 }}
			className='min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center relative px-6 sm:px-8 md:px-12 py-24'
		>
			{/* Back Button */}
			<motion.div
				initial={{ x: -50, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={{ duration: 0.5 }}
				className='absolute top-6 left-4 sm:left-6'
			>
				<button
					onClick={() => navigate(-1)}
					className='inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors shadow-sm border border-gray-200 dark:border-gray-600'
				>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back
				</button>
			</motion.div>

			<div className='max-w-7xl mx-auto'>
				<div className='grid lg:grid-cols-2 gap-12 items-center'>
					{/* Text Content */}
					<motion.div
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5 }}
						className='space-y-8'
					>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.2 }}
						>
							<h2 className='text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight'>
								Simplifying Lab Room Management
								<br />
								<span className='bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent'>
									for Engineering Students
								</span>
							</h2>
						</motion.div>

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className='space-y-6'
						>
							<p className='text-lg text-gray-600 dark:text-gray-300 leading-relaxed'>
								Our platform revolutionizes lab room management for Software Engineering students,
								offering seamless booking for study sessions and collaborative projects. We ensure
								equitable resource access while optimizing lab utilization through intelligent
								scheduling.
							</p>
							<p className='text-lg text-gray-600 dark:text-gray-300 leading-relaxed'>
								From instant reservations to real-time availability tracking, our system empowers
								academic communities with transparent resource management, fostering innovation and
								academic excellence through cutting-edge technology.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.6 }}
							className='flex gap-4 flex-wrap'
						>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => navigate('/labrooms')}
								className='px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all'
							>
								Start Booking Now
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => navigate('/homepage')}
								className='px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all'
							>
								Back to Home
							</motion.button>
						</motion.div>
					</motion.div>

					{/* Image Section */}
					<motion.div
						initial={{ opacity: 0, x: 50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5 }}
						className='relative'
					>
						<img
							src={LabImage}
							alt='Modern Lab Environment'
							className='rounded-2xl shadow-2xl border-4 border-white dark:border-gray-700 w-full h-auto max-h-[600px] object-cover dark:brightness-90'
						/>
						<div className='absolute inset-0 bg-gradient-to-t from-gray-900/30 to-transparent rounded-2xl' />
					</motion.div>
				</div>
			</div>
		</motion.section>
	);
};

export default AboutPage;
