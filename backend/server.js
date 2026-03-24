require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Custom Modules
const connectDB = require('./config/db');
const seedRootUser = require('./startup/seed');
const errorHandler = require('./middleware/errorHandler');
require('./utils/cron');

// Startup Modules
const setupMiddleware = require('./startup/middleware');
const setupRoutes = require('./startup/routes');
const setupSockets = require('./startup/sockets');

// 1. Initialization
const app = express();
const server = http.createServer(app);

// 2. Database
connectDB().then(() => {
  // 3. Seed Root User
  seedRootUser();
});

// 3. Socket.IO Configuration
const io = socketIo(server, {
	cors: {
		origin: process.env.ORIGIN_ADDRESS,
		credentials: true,
		methods: ['GET', 'POST'],
	},
	path: '/ws',
	transports: ['websocket', 'polling'],
});
app.set('io', io); // Make io accessible in controllers

// 4. Setup Application Components
setupMiddleware(app); // Load CORS, Helmet, Logging, etc.
setupRoutes(app); // Register all API routes
setupSockets(io); // Initialize Socket.IO logic

// 5. Global Error Handler (Must be last)
app.use(errorHandler);

// 6. Graceful Shutdown
process.on('SIGINT', async () => {
	console.log('\nReceived SIGINT. Closing server...');
	await mongoose.connection.close();
	server.close(() => {
		console.log('Server shut down gracefully.');
		process.exit(0);
	});
});

// 7. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
