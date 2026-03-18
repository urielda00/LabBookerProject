const R = require('../utils/response');

const errorHandler = (err, req, res, next) => {
	console.error('Error Log:', err);

	let statusCode = err.statusCode || 500;
	let message = err.message || 'server.errors.internal';
	let data = {};

	// Mongoose: Bad ObjectId
	if (err.name === 'CastError' && err.kind === 'ObjectId') {
		statusCode = 404;
		message = 'resource.errors.notFound';
	}

	// Mongoose: Duplicate Key (e.g.: email already exists)
	if (err.code === 11000) {
		statusCode = 409;
		message = 'resource.errors.duplicate';
		data = { field: Object.keys(err.keyValue) };
	}

	// Mongoose: Validation Error
	if (err.name === 'ValidationError') {
		statusCode = 400;
		message = 'resource.errors.validation';
		data = {
			errors: Object.values(err.errors).map((val) => val.message),
		};
	}

	// JWT Errors
	if (err.name === 'JsonWebTokenError') {
		statusCode = 401;
		message = 'auth.errors.invalidToken';
	}

	if (err.name === 'TokenExpiredError') {
		statusCode = 401;
		message = 'auth.errors.tokenExpired';
	}

	// If headers are already sent, delegate to default express handler
	if (res.headersSent) {
		return next(err);
	}

	// Use R utility if available, otherwise fallback to json
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
