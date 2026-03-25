const R = require('../utils/response');

const errorHandler = (err, req, res, next) => {
	// Logging Controls
	if (process.env.NODE_ENV !== 'production') {
		// Development: All debug info can be printed
		console.error('Error Log:', err);
	} else {
		// Production: Log only sanitized error messages (message only, no stack)
		console.error('Error Log:', err.message);
	}

	let statusCode = err.statusCode || 500;
	let message = err.message || 'server.errors.internal';
	let data = {};

	// Mongoose & JWT Error Logic
	if (err.name === 'CastError' && err.kind === 'ObjectId') {
		statusCode = 404;
		message = 'resource.errors.notFound';
	}

	if (err.code === 11000) {
		statusCode = 409;
		message = 'resource.errors.duplicate';
		data = { field: Object.keys(err.keyValue) };
	}

	if (err.name === 'ValidationError') {
		statusCode = 400;
		message = 'resource.errors.validation';
		data = {
			errors: Object.values(err.errors).map((val) => val.message),
		};
	}

	if (err.name === 'JsonWebTokenError') {
		statusCode = 401;
		message = 'auth.errors.invalidToken';
	}

	if (err.name === 'TokenExpiredError') {
		statusCode = 401;
		message = 'auth.errors.tokenExpired';
	}

	if (res.headersSent) {
		return next(err);
	}

	// Response - No stack trace included
	if (R && typeof R.send === 'function') {
		return R.send(req, res, statusCode, message, {}, data);
	} else {
		return res.status(statusCode).json({
			success: false,
			message,
			data,
		});
	}
};

module.exports = errorHandler;