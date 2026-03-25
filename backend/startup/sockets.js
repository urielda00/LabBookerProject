module.exports = (io) => {
	io.on('connection', (socket) => {
		// Log connection only in development to reduce log noise in production
		if (process.env.NODE_ENV !== 'production') {
			console.log('A user connected:', socket.id);
		}

		socket.on('error', (err) => {
			if (process.env.NODE_ENV !== 'production') {
				// Full debug info in dev
				console.warn(`Socket ${socket.id} error:`, err);
			} else {
				// Sanitized message in production
				console.warn(`Socket ${socket.id} error:`, err.code || err.message);
			}
		});

		socket.emit('welcome', { message: 'Welcome to the server!' });

		socket.on('disconnect', () => {
			// Log disconnection only in development
			if (process.env.NODE_ENV !== 'production') {
				console.log('A user disconnected:', socket.id);
			}
		});
	});
};