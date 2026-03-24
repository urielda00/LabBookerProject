import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, LayoutDashboard } from 'lucide-react';
import { RiUserSettingsLine } from 'react-icons/ri';
import { useNotifications } from './useNotifications';
import api from '../utils/axiosConfig';

/**
 * Custom hook containing all logic for the Navbar component.
 * Manages UI state (dropdowns, mobile menu), navigation links, and integrates notifications.
 */
export const useNavbar = (userInfo, setUserInfo, enableTransparentOnScroll) => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();

	// Integrate notification logic
	const {
		notifications,
		clearAllNotifications,
		markNotificationAsRead,
		deleteNotification,
		fetchNotifications,
		unreadCount,
	} = useNotifications();

	// Local UI state
	const [state, setState] = useState({
		mobileMenuOpen: false,
		profileDropdownOpen: false,
		notificationDropdownOpen: false,
		activeHover: null,
	});

	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobile, setIsMobile] = useState(window.innerWidth < 460);

	// --- Effects ---

	// Handle scroll effect for transparent navbar
	useEffect(() => {
		if (!enableTransparentOnScroll) return;
		const handleScroll = () => setIsScrolled(window.scrollY > 10);
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [enableTransparentOnScroll]);

	// Handle window resize for mobile detection
	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 460);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fetch notifications on mount if user is authenticated
	useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			fetchNotifications();
		}
	}, [fetchNotifications]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			const profileDropdown = document.getElementById('profile-dropdown');
			const notificationDropdown = document.getElementById('notification-dropdown');
			const profileTrigger = document.getElementById('profile-trigger');
			const notificationTrigger = document.getElementById('notification-trigger');

			if (
				profileDropdown &&
				profileTrigger &&
				!profileDropdown.contains(event.target) &&
				!profileTrigger.contains(event.target)
			) {
				setState((prev) => ({ ...prev, profileDropdownOpen: false }));
			}
			if (
				notificationDropdown &&
				notificationTrigger &&
				!notificationDropdown.contains(event.target) &&
				!notificationTrigger.contains(event.target)
			) {
				setState((prev) => ({ ...prev, notificationDropdownOpen: false }));
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// --- Handlers ---

	const handleLogout = useCallback(() => {
		localStorage.removeItem('user');
		localStorage.removeItem('token');
		setUserInfo(null);
		navigate('/login');
	}, [navigate, setUserInfo]);

	const handleNotificationClick = useCallback(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			navigate('/login');
			return;
		}
		setState((prev) => ({
			...prev,
			notificationDropdownOpen: !prev.notificationDropdownOpen,
			profileDropdownOpen: false,
		}));
	}, [navigate]);

	const handleProfileClick = useCallback(() => {
		setState((prev) => ({
			...prev,
			profileDropdownOpen: !prev.profileDropdownOpen,
			notificationDropdownOpen: false,
		}));
	}, []);

	const toggleMobileMenu = useCallback(() => {
		setState((prev) => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }));
	}, []);

	const closeDropdowns = useCallback(() => {
		setState((prev) => ({
			...prev,
			profileDropdownOpen: false,
			notificationDropdownOpen: false,
		}));
	}, []);

	const markAllAsRead = async () => {
		try {
			await api.put('/notifications/read-all');
			fetchNotifications();
		} catch (error) {
			console.error('Failed to mark all as read:', error);
		}
	};

	// --- Computed Data ---

	const navBgClass = useMemo(
		() =>
			!enableTransparentOnScroll ? 'bg-gray-900' : isScrolled ? 'bg-gray-900' : 'bg-transparent',
		[enableTransparentOnScroll, isScrolled]
	);

	const profileMenuItems = useMemo(() => {
		const items = [
			{
				label: t('nav.profileSettings'),
				path: '/accountSettings',
				icon: <RiUserSettingsLine className='w-5 h-5' />,
			},
		];

		if (['admin', 'manager', 'root'].includes(userInfo?.role)) {
			items.push({
				label: t('nav.dashboard'),
				path: '/dashboard',
				icon: <LayoutDashboard className='w-5 h-5' />,
			});
		}
		return items;
	}, [userInfo, t]);

	const navLinks = useMemo(
		() => [
			{
				label: t('nav.home'),
				path: '/homepage',
				icon: <Home className='w-5 h-5 transition-transform group-hover:scale-110' />,
			},
			{
				label: t('nav.labRooms'),
				path: '/labrooms',
				icon: <BookOpen className='w-5 h-5 transition-transform group-hover:scale-110' />,
			},
			{
				label: t('nav.collegeWebsite'),
				href: 'https://www.jce.ac.il/',
				external: true,
			},
		],
		[t]
	);

	return {
		state,
		setState,
		isMobile,
		navBgClass,
		notifications,
		unreadCount,
		userInfo,
		location,
		navLinks,
		profileMenuItems,
		handleLogout,
		handleNotificationClick,
		handleProfileClick,
		toggleMobileMenu,
		closeDropdowns,
		clearAllNotifications,
		markNotificationAsRead,
		deleteNotification,
		markAllAsRead,
	};
};
