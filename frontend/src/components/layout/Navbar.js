import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaLaptopCode } from 'react-icons/fa';
import { Menu, X, LogOut, Bell, Trash2 } from 'lucide-react';
import { MdOutlineMarkChatRead } from 'react-icons/md';
import { LuDelete } from 'react-icons/lu';
import { BsCheckAll } from 'react-icons/bs';

import LanguageSwitcher from '../common/LanguageSwitcher';
import { useNavbar } from '../../hooks/useNavbar';

const Navbar = ({ userInfo, setUserInfo, enableTransparentOnScroll = false }) => {
	const { t } = useTranslation();

	const {
		state,
		isMobile,
		navBgClass,
		notifications,
		unreadCount,
		location,
		navLinks,
		profileMenuItems,
		handleLogout,
		handleNotificationClick,
		handleProfileClick,
		toggleMobileMenu,
		closeDropdowns,
		setState,
		clearAllNotifications,
		markNotificationAsRead,
		deleteNotification,
		markAllAsRead,
	} = useNavbar(userInfo, setUserInfo, enableTransparentOnScroll);

	// Helper for hover effects
	const handleHoverEffect = (key) => setState((prev) => ({ ...prev, activeHover: key }));
	const clearHoverEffect = () => setState((prev) => ({ ...prev, activeHover: null }));

	// --- Render Helpers ---

	const renderNavLink = (link, index) => {
		const isActive = location.pathname === link.path;
		const linkClassName = `
			group relative flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300
			${isActive ? 'bg-blue-500/20 text-blue-500' : 'text-gray-300 hover:text-white'}
			overflow-hidden
		`;

		const hoverEffectClassName = `
			absolute inset-0 z-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 
			transform -translate-x-full group-hover:translate-x-0
		`;

		const linkContent = (
			<div className='relative z-10 flex items-center space-x-2'>
				{link.icon}
				<span className='transition-all duration-300 group-hover:tracking-wider'>{link.label}</span>
			</div>
		);

		if (link.external) {
			return (
				<a
					key={index}
					href={link.href}
					target='_blank'
					rel='noopener noreferrer'
					className={linkClassName}
					onMouseEnter={() => handleHoverEffect(index)}
					onMouseLeave={clearHoverEffect}
				>
					<div className={hoverEffectClassName}></div>
					{linkContent}
				</a>
			);
		}

		return (
			<Link
				key={index}
				to={link.path}
				className={linkClassName}
				onMouseEnter={() => handleHoverEffect(index)}
				onMouseLeave={clearHoverEffect}
			>
				<div className={hoverEffectClassName}></div>
				{linkContent}
			</Link>
		);
	};

	// --- Sub-Components (Memoized) ---

	const ProfileDropdown = useMemo(() => {
		if (!state.profileDropdownOpen || !userInfo) return null;

		return (
			<div
				id='profile-dropdown'
				className={`absolute bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50 ${
					isMobile ? 'w-72 left-1/2 -translate-x-[90%]' : 'w-72 right-0'
				}`}
				style={{ maxHeight: isMobile ? '80vh' : 'auto' }}
				onMouseEnter={() => setState((prev) => ({ ...prev, profileDropdownOpen: true }))}
				onMouseLeave={() => setState((prev) => ({ ...prev, profileDropdownOpen: false }))}
			>
				{/* Profile Header */}
				<div className='p-4 bg-gray-800 border-b border-gray-700'>
					<div className='flex items-center space-x-3'>
						<div className='w-12 h-12 rounded-full flex items-center justify-center border-2 border-white p-0.5 hover:border-blue-500 transition-colors'>
							<div className='w-full h-full rounded-full overflow-hidden'>
								{userInfo.profilePicture ? (
									<img
										src={userInfo.profilePicture}
										alt='Profile'
										className='w-full h-full object-cover'
									/>
								) : (
									<div className='w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold text-xl'>
										{userInfo.username.charAt(0).toUpperCase()}
									</div>
								)}
							</div>
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-semibold text-white truncate'>{userInfo.username}</p>
							<p className='text-xs text-gray-400 truncate'>{userInfo.email}</p>
						</div>
					</div>
				</div>

				{/* Menu Items */}
				<div className='py-2'>
					{profileMenuItems.map((item, index) => (
						<Link
							key={index}
							to={item.path}
							onClick={closeDropdowns}
							className='flex items-center px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 transition-all group'
						>
							<span className='p-1.5 rounded-lg bg-gray-800 transition-colors group-hover:bg-blue-500/20'>
								{item.icon}
							</span>
							<span className='ml-3 text-sm font-medium'>{item.label}</span>
						</Link>
					))}
					<div className='px-4 py-3 border-t border-gray-700/50'>
						<LanguageSwitcher />
					</div>
				</div>

				{/* Logout Button */}
				<button
					onClick={handleLogout}
					className='w-full flex items-center px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-t border-gray-700 transition-all group'
				>
					<span className='p-1.5 rounded-lg bg-red-500/10 transition-colors group-hover:bg-red-500/20'>
						<LogOut className='w-5 h-5' />
					</span>
					<span className='ml-3 text-sm font-medium'>{t('nav.logout')}</span>
				</button>
			</div>
		);
	}, [
		state.profileDropdownOpen,
		userInfo,
		profileMenuItems,
		handleLogout,
		isMobile,
		t,
		closeDropdowns,
		setState,
	]);

	const NotificationDropdown = useMemo(() => {
		if (!state.notificationDropdownOpen || !userInfo) return null;

		const unreadCountLocal = notifications.filter((notif) => !notif.isRead).length;

		// Local Time Component
		const TimeDisplay = ({ date }) => {
			const notificationDate = new Date(date);
			const now = new Date();
			const isToday = now.toDateString() === notificationDate.toDateString();
			const isYesterday =
				new Date(now.setDate(now.getDate() - 1)).toDateString() === notificationDate.toDateString();

			const timeString = notificationDate.toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			});
			const dateString = notificationDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});

			return (
				<span className='text-xs text-gray-400'>
					{isToday
						? `${timeString} · ${t('nav.today')}`
						: isYesterday
						? `${timeString} · ${t('nav.yesterday')}`
						: dateString}
				</span>
			);
		};

		return (
			<div
				id='notification-dropdown'
				className={`absolute bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50 ${
					isMobile ? 'w-80 left-1/2 -translate-x-[70%] mt-4' : 'w-80 right-0 mt-2'
				}`}
				style={{ maxHeight: isMobile ? '80vh' : 'auto' }}
			>
				{/* Header */}
				<div className='px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-800'>
					<div className='flex items-center space-x-2'>
						<Bell className='w-5 h-5 text-blue-400 transition-transform duration-300 hover:scale-110 hover:rotate-12' />
						<span className='text-sm font-semibold text-white'>{t('nav.notifications')}</span>
						<span className='px-2 py-0.5 rounded-full bg-gray-700/50 text-xs text-gray-300 backdrop-blur-sm'>
							{unreadCountLocal}
						</span>
					</div>
					{notifications.length > 0 && (
						<div className='flex space-x-3'>
							<button
								onClick={clearAllNotifications}
								className='flex items-center group text-gray-300 hover:text-white transition-all duration-200 relative'
								aria-label={t('nav.clearAllNotifications')}
							>
								<div className='relative p-1 rounded-md hover:bg-gray-700/50'>
									<Trash2 className='w-5 h-5 transition-transform duration-300 group-hover:scale-110' />
								</div>
							</button>
							<button
								onClick={markAllAsRead}
								className='flex items-center group text-gray-300 hover:text-white transition-all duration-200 relative'
								aria-label={t('nav.markAllAsRead')}
							>
								<div className='relative p-1 rounded-md hover:bg-gray-700/50'>
									<BsCheckAll className='w-5 h-5 transition-transform duration-300 group-hover:scale-110' />
								</div>
							</button>
						</div>
					)}
				</div>

				{/* Notifications List */}
				<div className='max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-gray-800 scrollbar-thumb-rounded-full'>
					{notifications.length > 0 ? (
						notifications.map((notif) => (
							<div
								key={notif.id}
								className={`group relative flex items-center px-4 py-3 border-b border-gray-700 ${
									notif.isRead ? 'bg-gray-700/40' : 'bg-gray-800 hover:bg-gray-700/30'
								} transition-all duration-200 hover:translate-x-1 hover:shadow-lg`}
							>
								{!notif.isRead && (
									<div className='absolute left-0 top-0 h-full w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								)}
								<div className='flex-1 pr-2 min-w-0'>
									<div className='flex items-start space-x-2'>
										{!notif.isRead && (
											<div className='w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0' />
										)}
										<div className='flex-1 min-w-0'>
											<p className={`text-sm ${notif.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
												{notif.message}
											</p>
											<TimeDisplay date={notif.createdAt} />
										</div>
									</div>
								</div>
								<div className='flex space-x-2 pl-2'>
									{!notif.isRead && (
										<button
											onClick={() => markNotificationAsRead(notif.id)}
											className='p-1.5 text-green-400 hover:bg-gray-600/50 rounded-md transition-transform duration-200 hover:scale-110'
											title={t('nav.markAsRead')}
										>
											<MdOutlineMarkChatRead className='w-5 h-5' />
										</button>
									)}
									<button
										onClick={() => deleteNotification(notif.id)}
										className='p-1.5 text-red-400 hover:bg-gray-600/50 rounded-md transition-transform duration-200 hover:scale-110'
										title={t('nav.delete')}
									>
										<LuDelete className='w-5 h-5' />
									</button>
								</div>
							</div>
						))
					) : (
						<div className='px-4 py-8 text-center'>
							<div className='relative inline-block mb-3'>
								<Bell className='w-12 h-12 text-gray-600 mx-auto transition-transform duration-500 hover:rotate-12 hover:text-blue-400' />
							</div>
							<p className='text-gray-300 text-sm font-medium mb-1'>{t('nav.allCaughtUp')}</p>
							<p className='text-gray-500 text-xs'>{t('nav.noNewNotifications')}</p>
						</div>
					)}
				</div>
			</div>
		);
	}, [
		state.notificationDropdownOpen,
		notifications,
		isMobile,
		userInfo,
		t,
		clearAllNotifications,
		markAllAsRead,
		markNotificationAsRead,
		deleteNotification,
	]);

	// --- Main Render ---

	return (
		<nav
			dir='ltr'
			className={`fixed top-0 left-0 right-0 z-50 text-white transition-colors duration-300 ${navBgClass}`}
		>
			<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
				{/* Mobile Menu Trigger & Logo */}
				<div className='flex items-center gap-4'>
					<button
						onClick={toggleMobileMenu}
						className='md:hidden text-white hover:text-blue-500 transition-colors hover:scale-110 focus:outline-none'
					>
						{state.mobileMenuOpen ? <X /> : <Menu />}
					</button>
					<Link
						to='/'
						className='text-2xl font-bold text-blue-500 tracking-wider relative group hover:text-blue-400 transition-all'
					>
						<span className='relative z-10 flex items-center gap-2'>
							<FaLaptopCode className='w-5 h-5' />
							LabBooker
						</span>
						<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left'></div>
					</Link>
				</div>

				{/* Desktop Navigation & User Actions */}
				<div className='flex items-center space-x-6'>
					<div className='hidden md:flex items-center space-x-2'>
						{navLinks.map((link, index) => renderNavLink(link, index))}
					</div>

					{userInfo ? (
						<>
							{/* Notifications Trigger */}
							<div className='relative'>
								<button
									id='notification-trigger'
									onClick={handleNotificationClick}
									className='text-gray-300 hover:text-white hover:scale-110 transition-all focus:outline-none relative'
								>
									<Bell className='w-6 h-6' />
									{unreadCount > 0 && (
										<span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1'>
											{unreadCount}
										</span>
									)}
								</button>
								{NotificationDropdown}
							</div>

							{/* Profile Trigger */}
							<div className='relative'>
								<button
									id='profile-trigger'
									onClick={handleProfileClick}
									className='focus:outline-none'
								>
									<div className='w-12 h-12 flex items-center justify-center rounded-full border-2 border-white p-0.5 hover:border-blue-500 transition-all transform hover:scale-105'>
										<div className='w-full h-full rounded-full overflow-hidden'>
											{userInfo.profilePicture ? (
												<img
													src={userInfo.profilePicture}
													alt='Profile'
													className='w-full h-full object-cover'
												/>
											) : (
												<div className='w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold'>
													{userInfo.username.charAt(0).toUpperCase()}
												</div>
											)}
										</div>
									</div>
								</button>
								{ProfileDropdown}
							</div>
						</>
					) : (
						<Link
							to='/login'
							className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all hover:shadow-lg hover:-translate-y-1'
						>
							{t('nav.login')}
						</Link>
					)}
				</div>
			</div>

			{/* Mobile Menu Panel */}
			{state.mobileMenuOpen && (
				<div className='md:hidden bg-gray-900 z-40'>
					<div className='flex flex-col p-4 space-y-2'>
						{navLinks.map((link, index) => renderNavLink(link, index))}
					</div>
				</div>
			)}
		</nav>
	);
};

export default React.memo(Navbar);
