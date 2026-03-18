import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * PrivateRoute Component
 * Protects routes from unauthorized access based on authentication status and roles.
 * * @param {React.ReactNode} children - The component to render if access is granted
 * @param {Array<string>} allowedRoles - Optional list of roles allowed to access this route
 */
const PrivateRoute = ({ children, allowedRoles }) => {
	const location = useLocation();

	// 1. Retrieve auth data
	const token = localStorage.getItem('token');
	const userData = localStorage.getItem('user');
	const user = userData ? JSON.parse(userData) : null;

	// 2. Check Authentication (User must be logged in)
	if (!token || !user) {
		// Redirect to login, but save the location they tried to access
		return <Navigate to='/login' state={{ from: location }} replace />;
	}

	// 3. Check Authorization (User must have the required role)
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		// User is logged in but doesn't have permission -> Redirect to home or unauthorized page
		return <Navigate to='/homepage' replace />;
	}

	// 4. Render the protected content
	return children;
};

export default PrivateRoute;
