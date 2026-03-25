const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { i18nMiddleware } = require('../utils/i18n');
require('dotenv').config();

module.exports = (app) => {
	const allowedOrigins = process.env.CORS_ORIGINS.split(',');

	// 2. Response Time Tracking
	app.use((req, res, next) => {
		const start = Date.now();
		const originalEnd = res.end;

		res.end = function (...args) {
			if (!res.headersSent) {
				const duration = Date.now() - start;
				res.set('X-Response-Time', `${duration}ms`);
			}
			originalEnd.apply(res, args);
		};
		next();
	});

	// 3. Standard Middleware
	app.use(i18nMiddleware);
	app.use(express.json());

	// Logging Configuration: Use 'dev' only in non-production environments
	if (process.env.NODE_ENV !== 'production') {
		app.use(morgan('dev'));
	} else {
		app.use(morgan('combined'));
	}

	// 4. Security Middleware (Helmet)
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					// Allow React scripts and dev tools
					scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
					// Allow styles
					styleSrc: ["'self'", "'unsafe-inline'"],
					// Allow images (including Base64 and Cloudinary)
					imgSrc: ["'self'", 'data:', 'https:'],
					// Allow connections to local server and WebSockets
					connectSrc: [
						"'self'",
						process.env.BASE_BACKEND_URL,
						process.env.WS_URL,
						process.env.LOCAL_IP_URL,
						process.env.WS_IP,
						// need to add production URL in here,
						// or rely on 'self' if frontend/backend are on the same domain/proxy.
					],
				},
			},
			//for development: allow cross-port resources
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		})
	);

	// 5. CORS Configuration (Dynamic)
	app.use(
		cors({
			origin: (origin, callback) => {
				// Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
				if (!origin) return callback(null, true);

				if (allowedOrigins.indexOf(origin) !== -1) {
					callback(null, true);
				} else {
					// Gate the warning behind NODE_ENV to prevent log pollution in production
					if (process.env.NODE_ENV !== 'production') {
						console.warn(`Blocked by CORS: ${origin}`);
					}
					callback(new Error('Not allowed by CORS'));
				}
			},
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
			exposedHeaders: ['X-System-Health', 'X-Response-Time'],
			credentials: true,
		})
	);
};