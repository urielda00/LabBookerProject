import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Calendar, Activity, Clock, MapPin } from 'lucide-react';

// Components
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/footer';
import NextBooking from '../components/NextBooking';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/common/ConfirmationModal';

// Hooks
import { useRoomStatus } from '../hooks/useRoomStatus';
import api from '../utils/axiosConfig';

const HomePage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	// Global State
	const [userInfo, setUserInfo] = useState(null);
	const [currentTime, setCurrentTime] = useState(new Date());

	// UI State
	const [isRoomsExpanded, setIsRoomsExpanded] = useState(true);
	const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalConfig, setModalConfig] = useState({});

	// Custom Hooks
	const { roomStatuses, loading: roomsLoading } = useRoomStatus();

	// Clock Effect
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Auth & Profile Effect
	useEffect(() => {
		const checkAuthAndProfile = async () => {
			try {
				const storedUser = localStorage.getItem('user');
				const token = localStorage.getItem('token');

				if (!storedUser || !token) {
					navigate('/login');
					return;
				}

				// Initial set from local storage
				setUserInfo(JSON.parse(storedUser));

				// Background fetch for fresh profile data
				const response = await api.get('/user/profile');
				setUserInfo(response.data);
				localStorage.setItem('user', JSON.stringify(response.data));
			} catch (error) {
				console.error('Auth/Profile check failed:', error);
				if (error.response?.status === 401) navigate('/login');
			}
		};
		checkAuthAndProfile();
	}, [navigate]);

	const showToast = (type, message, options = {}) => {
		const { duration = 5000 } = options;
		setToast({ isVisible: true, type, message });
		setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), duration);
	};

	// Formatters
	const formatDate = (date) =>
		date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	const formatTime = (date) =>
		date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

	if (!userInfo) return null;

	return (
		<div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300'>
			<Navbar userInfo={userInfo} setUserInfo={setUserInfo} />

			<main className='flex-grow pt-24 pb-16 container mx-auto px-4'>
				{/* Welcome Section */}
				<section className='bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl mb-8'>
					<div className='flex items-center justify-between rtl:space-x-reverse'>
						<div className='space-y-3'>
							<div className='flex items-center space-x-3 rtl:space-x-reverse text-blue-600 dark:text-blue-400'>
								<Clock className='w-6 h-6' />
								<span className='text-sm font-medium'>{formatTime(currentTime)}</span>
								<span className='text-gray-300 dark:text-gray-600'>•</span>
								<span className='text-sm font-medium'>{formatDate(currentTime)}</span>
							</div>
							<h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
								{t('homepage.welcome', { username: userInfo.username })}
								<span className='text-blue-600 dark:text-blue-400 ml-2 rtl:ml-0 rtl:mr-2'>👋</span>
							</h1>
							<p className='text-gray-600 dark:text-gray-400 text-lg max-w-3xl'>
								{t('homepage.description')}
							</p>
						</div>
					</div>
				</section>

				{/* Room Status Section */}
				<section className='mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden'>
					<div className='p-6 border-b border-gray-100 dark:border-gray-700'>
						<div
							className='flex items-center justify-between sm:cursor-default cursor-pointer rtl:space-x-reverse'
							onClick={() => window.innerWidth < 640 && setIsRoomsExpanded(!isRoomsExpanded)}
						>
							<div className='flex items-center space-x-3 rtl:space-x-reverse'>
								<MapPin className='w-6 h-6 text-blue-600 dark:text-blue-400' />
								<h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
									{t('homepage.labRoomStatus')}
								</h2>
							</div>
							<button className='sm:hidden p-2'>
								<svg
									className={`w-6 h-6 transform transition-transform ${
										isRoomsExpanded ? 'rotate-180' : ''
									}`}
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 9l-7 7-7-7'
									/>
								</svg>
							</button>
						</div>
					</div>

					{isRoomsExpanded && (
						<div className='p-6 pt-0'>
							{roomsLoading ? (
								<div className='text-center py-4 text-gray-500'>Loading room status...</div>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
									{roomStatuses.map((room) => (
										<div
											key={room.id}
											className='relative group bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-blue-100 dark:hover:border-blue-400 mt-2'
										>
											<div className='flex items-start justify-between rtl:space-x-reverse'>
												<div className='flex-1'>
													<h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1'>
														{room.name}
													</h3>
													<div className='flex items-center space-x-2 rtl:space-x-reverse'>
														<span
															className={`inline-block w-2 h-2 rounded-full ${
																room.isActive
																	? 'bg-red-500 dark:bg-red-400'
																	: 'bg-green-400 dark:bg-green-500'
															}`}
														/>
														<p
															className={`text-sm font-medium ${
																room.isActive
																	? 'text-gray-600 dark:text-red-300'
																	: 'text-gray-500 dark:text-green-400'
															}`}
														>
															{room.isActive ? t('homepage.occupied') : t('homepage.available')}
														</p>
													</div>
												</div>
												<div
													className={`p-2 rounded-lg ${
														room.isActive
															? 'bg-red-100 dark:bg-red-500/20'
															: 'bg-green-100 dark:bg-green-900/20'
													}`}
												>
													<Activity
														className={`w-5 h-5 ${
															room.isActive
																? 'text-red-600 dark:text-red-400'
																: 'text-green-400 dark:text-green-300'
														}`}
													/>
												</div>
											</div>
											{room.isActive && (
												<div className='mt-4 pt-3 border-t border-gray-100 dark:border-gray-600'>
													<div className='flex items-center justify-between text-sm rtl:space-x-reverse'>
														<span className='text-gray-500 dark:text-gray-400'>Until</span>
														<span className='font-medium text-gray-700 dark:text-gray-200'>
															{room.currentBooking?.endTime || '...'}
														</span>
													</div>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</section>

				{/* Next Booking Section */}
				<NextBooking
					showToast={showToast}
					setIsModalOpen={setIsModalOpen}
					setModalConfig={setModalConfig}
					userInfo={userInfo}
				/>

				{/* Quick Actions Grid */}
				<div className='grid md:grid-cols-2 gap-6'>
					<ActionCard
						title={t('homepage.bookARoom')}
						desc={t('homepage.bookARoomDesc')}
						icon={BookOpen}
						onClick={() => navigate('/labrooms')}
						colorClass='blue'
					/>
					<ActionCard
						title={t('homepage.myBookings')}
						desc={t('homepage.myBookingsDesc')}
						icon={Calendar}
						onClick={() => navigate('/bookings')}
						colorClass='green'
					/>
				</div>
			</main>

			<Footer className='mt-auto' />

			<ConfirmationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				{...modalConfig}
			/>

			{toast.isVisible && (
				<div className='fixed bottom-4 right-4 z-50 rtl:right-auto rtl:left-4'>
					<Toast
						type={toast.type}
						message={toast.message}
						onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
					/>
				</div>
			)}
		</div>
	);
};

// Helper component for Cards to clean up JSX
const ActionCard = ({ title, desc, icon: Icon, onClick, colorClass }) => {
	const bgColors = {
		blue: 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 text-blue-600 dark:text-blue-400',
		green:
			'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 text-green-600 dark:text-green-400',
	};
	const bubbleColors = {
		blue: 'bg-blue-50 dark:bg-blue-900/20',
		green: 'bg-green-50 dark:bg-green-900/20',
	};

	return (
		<div
			onClick={onClick}
			className='group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden'
		>
			<div className='flex items-start space-x-6 rtl:space-x-reverse relative z-10'>
				<div className={`p-4 rounded-xl transition-colors ${bgColors[colorClass]}`}>
					<Icon className='w-8 h-8' />
				</div>
				<div>
					<h2 className='text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2'>{title}</h2>
					<p className='text-gray-600 dark:text-gray-400'>{desc}</p>
				</div>
			</div>
			<div
				className={`absolute -bottom-8 -right-8 rtl:-left-8 rtl:right-auto w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 ${bubbleColors[colorClass]}`}
			/>
		</div>
	);
};

export default HomePage;
