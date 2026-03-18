import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import AppRouter from './AppRouter'; // Import the separated router
import ChatBox from './components/ChatBox';

/**
 * AppLayout
 * Handles global layout logic that needs access to the Router context (like useLocation),
 * such as the global ChatBox visibility.
 */
const AppLayout = () => {
	const location = useLocation();
	const [user, setUser] = useState(null);

	// Sync user state from localStorage on route changes
	useEffect(() => {
		try {
			const userData = localStorage.getItem('user');
			setUser(userData ? JSON.parse(userData) : null);
		} catch (e) {
			console.error('Failed to parse user data', e);
			setUser(null);
		}
	}, [location]);

	return (
		// Replaced inline style with Tailwind class for consistency
		<div className='relative'>
			<AppRouter />
			{/* Global ChatBox rendered on top of routes if user is logged in */}
			{user && <ChatBox user={user} />}
		</div>
	);
};

// root component:
function App() {
	return (
		<ThemeProvider>
			<Router>
				<AppLayout />
			</Router>
		</ThemeProvider>
	);
}

export default App;
