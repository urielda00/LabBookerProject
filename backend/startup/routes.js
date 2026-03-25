const rateLimit = require('express-rate-limit');

// Import Routes
const userRoutes = require('../routes/userRoutes');
const authRoutes = require('../routes/authRoutes');
const settingsRoutes = require('../routes/settingsRoutes');
const configRoutes = require('../routes/configRoutes');
const roomRoutes = require('../routes/roomsRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const bookingRoutes = require('../routes/bookingRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const notificationsRoutes = require('../routes/notificationsRoutes');
const healthRoutes = require('../routes/healthRoutes');
const issueRoutes = require('../routes/issueRoutes');
const pageRoutes = require('../routes/pageRoutes');
const contactRoutes = require('../routes/contactRoutes');
const faqRoutes = require('../routes/faqRoutes');
const messageRoutes = require('../routes/messageRoutes');

module.exports = (app) => {
	// Rate Limiters Configuration
	const authLimiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 100,
		message: 'Too many login attempts, please try again later',
	});

	const healthLimiter = rateLimit({
		windowMs: 60 * 1000,
		max: 60,
		message: 'Too many health check requests',
	});

	// Apply Rate Limiters
	app.use('/api/auth/', authLimiter);
	app.use('/api/health', healthLimiter);

	// Basic Routes
	app.get('/', (req, res) => res.send('Backend is running!'));

	// API Routes Map
	const routes = [
		{ path: '/api/user', handler: userRoutes },
		{ path: '/api/auth', handler: authRoutes },
		{ path: '/api/settings', handler: settingsRoutes }, // User Settings (Password)
		{ path: '/api/config', handler: configRoutes }, // <--- System Config (Global)
		{ path: '/api/room', handler: roomRoutes },
		{ path: '/api/book', handler: bookingRoutes },
		{ path: '/api/upload', handler: uploadRoutes },
		{ path: '/api/dashboard', handler: dashboardRoutes },
		{ path: '/api/notifications', handler: notificationsRoutes },
		{ path: '/api/health', handler: healthRoutes },
		{ path: '/api/issues', handler: issueRoutes },
		{ path: '/api/pages', handler: pageRoutes },
		{ path: '/api/contact', handler: contactRoutes },
		{ path: '/api/faq', handler: faqRoutes },
		{ path: '/api/message', handler: messageRoutes },
	];

	// Register All Routes
	routes.forEach((route) => {
		app.use(route.path, route.handler);
	});

	console.log('[ROUTE] All routes registered successfully');
};
