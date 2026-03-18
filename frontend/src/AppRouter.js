import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import i18n from './i18n';

// --- Components ---
import PrivateRoute from './components/auth/PrivateRoute';

// --- Lazy Load Pages ---
// Public
const LandingPage = lazy(() => import('./pages/landingPage'));
const LoginPage = lazy(() => import('./pages/login'));
const SignUpPage = lazy(() => import('./pages/signUp'));
const ForgotPassword = lazy(() => import('./pages/forgotPassword'));
const ChangePasswordPage = lazy(() => import('./pages/changePassword'));
const ResetPasswordPage = lazy(() => import('./pages/resetPassword'));
const FAQ = lazy(() => import('./pages/faq'));
const AboutPage = lazy(() => import('./pages/about'));
const ContactPage = lazy(() => import('./pages/contact'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const IssueReport = lazy(() => import('./pages/IssueReport'));

// Protected / User
const HomePage = lazy(() => import('./pages/homePage'));
const LabRooms = lazy(() => import('./pages/LabRooms'));
const RoomGuidelines = lazy(() => import('./pages/roomGuidelines'));
const AccountSettingsPage = lazy(() => import('./pages/accountSettings'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));

// Admin / Manager
const Dashboard = lazy(() => import('./pages/dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RoomOperationPage = lazy(() => import('./pages/roomOperationPage'));
const BookingOperationPage = lazy(() => import('./pages/bookingOperationPage'));
const StatusHistoryPage = lazy(() => import('./components/admin/StatusHistoryPage'));
const AllIssues = lazy(() => import('./pages/AllIssues'));
const ConfigManagement = lazy(() => import('./pages/ConfigManagement'));

/**
 * Loading Component
 * Displayed while the lazy chunk is being downloaded
 */
const LoadingFallback = () => (
	<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
		Loading...
	</div>
);

/**
 * PageTransition
 * Wraps page content to provide smooth fade/slide animations.
 */
const PageTransition = ({ children }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ type: 'tween', duration: 0.3 }}
			style={{ position: 'absolute', width: '100%' }}
		>
			{children}
		</motion.div>
	);
};

const AppRouter = () => {
	const location = useLocation();

	// Handle RTL/LTR direction based on current language
	useEffect(() => {
		const currentLang = i18n.language;
		const direction = currentLang === 'he' ? 'rtl' : 'ltr';
		document.documentElement.setAttribute('dir', direction);
		document.documentElement.setAttribute('lang', currentLang);
	}, [location.pathname]);

	return (
		// Suspense wraps the routes to handle the lazy loading state
		<Suspense fallback={<LoadingFallback />}>
			<AnimatePresence mode='wait'>
				<Routes location={location} key={location.pathname}>
					{/* --- Public Routes --- */}
					<Route
						path='/'
						element={
							<PageTransition>
								<LandingPage />
							</PageTransition>
						}
					/>
					<Route
						path='/login'
						element={
							<PageTransition>
								<LoginPage />
							</PageTransition>
						}
					/>
					<Route
						path='/signup'
						element={
							<PageTransition>
								<SignUpPage />
							</PageTransition>
						}
					/>
					<Route
						path='/forgotpassword'
						element={
							<PageTransition>
								<ForgotPassword />
							</PageTransition>
						}
					/>
					<Route
						path='/change-password'
						element={
							<PageTransition>
								<ChangePasswordPage />
							</PageTransition>
						}
					/>
					<Route
						path='/resetpassword'
						element={
							<PageTransition>
								<ResetPasswordPage />
							</PageTransition>
						}
					/>

					{/* Public Content Pages */}
					<Route
						path='/faq'
						element={
							<PageTransition>
								<FAQ />
							</PageTransition>
						}
					/>
					<Route
						path='/about'
						element={
							<PageTransition>
								<AboutPage />
							</PageTransition>
						}
					/>
					<Route
						path='/contact'
						element={
							<PageTransition>
								<ContactPage />
							</PageTransition>
						}
					/>
					<Route
						path='/roomguidelines'
						element={
							<PageTransition>
								<RoomGuidelines />
							</PageTransition>
						}
					/>
					<Route
						path='/termsofservice'
						element={
							<PageTransition>
								<TermsOfService />
							</PageTransition>
						}
					/>
					<Route
						path='/privacypolicy'
						element={
							<PageTransition>
								<PrivacyPolicy />
							</PageTransition>
						}
					/>
					<Route
						path='/issuereport'
						element={
							<PageTransition>
								<IssueReport />
							</PageTransition>
						}
					/>

					{/* --- Protected User Routes --- */}
					<Route
						path='/homepage'
						element={
							<PrivateRoute>
								<PageTransition>
									<HomePage />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/labrooms'
						element={
							<PrivateRoute>
								<PageTransition>
									<LabRooms />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/bookings'
						element={
							<PrivateRoute>
								<PageTransition>
									<MyBookingsPage />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/accountsettings'
						element={
							<PrivateRoute>
								<PageTransition>
									<AccountSettingsPage />
								</PageTransition>
							</PrivateRoute>
						}
					/>

					{/* --- Protected Admin/Manager Routes --- */}
					<Route
						path='/dashboard'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<Dashboard />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/roomOperationpage'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<RoomOperationPage />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/bookingOperationpage'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<BookingOperationPage />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/UserManagement'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<UserManagement />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/status-page'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<StatusHistoryPage />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/configmanagement'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<ConfigManagement />
								</PageTransition>
							</PrivateRoute>
						}
					/>
					<Route
						path='/issue-report'
						element={
							<PrivateRoute allowedRoles={['admin', 'manager']}>
								<PageTransition>
									<AllIssues />
								</PageTransition>
							</PrivateRoute>
						}
					/>
				</Routes>
			</AnimatePresence>
		</Suspense>
	);
};

export default AppRouter;
