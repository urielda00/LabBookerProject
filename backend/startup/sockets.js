module.exports = (io) => {
	io.on('connection', (socket) => {
		console.log('A user connected:', socket.id);

		socket.on('error', (err) => {
			console.warn(`Socket ${socket.id} error:`, err.code || err.message);
		});

		socket.emit('welcome', { message: 'Welcome to the server!' });

		socket.on('disconnect', () => {
			console.log('A user disconnected:', socket.id);
		});
	});
};
