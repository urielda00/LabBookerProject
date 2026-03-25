const Room = require('../models/Room');
const R = require('../utils/response');
const Booking = require('../models/Booking');

const bookingMiddleware = {
	// Middleware to find booking by ID parameter
	// Appends booking to req.bookingResource
	loadBooking: async (req, res, next) => {
		try {
			const { id } = req.params;
			const booking = await Booking.findById(id)
				.populate('roomId', 'name type capacity description')
				.populate('userId', 'username email')
				.populate('additionalUsers', 'username email');

			if (!booking) {
				return R.send(req, res, 404, 'booking.errors.notFound');
			}
			req.bookingResource = booking;
			next();
		} catch (error) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('loadBooking Error:', error);
			}else{
				console.error('loadBooking Error:', error.message);
			}
			return R.send(req, res, 500, 'booking.errors.fetchFailed');
		}
	},

	// Middleware to find room by ID in body or params
	// Appends room to req.roomResource
	loadRoom: async (req, res, next) => {
		try {
			const roomId = req.body.roomId || req.params.roomId;
			if (!roomId) {
				// If no ID is present, just skip (might be optional for some routes)
				return next();
			}

			const room = await Room.findById(roomId);
			if (!room) {
				return R.send(req, res, 404, 'booking.errors.roomNotFound');
			}
			req.roomResource = room;
			next();
		} catch (error) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('loadRoom Error:', error);
			}else{
				console.error('loadRoom Error:', error.message);
			}
			return R.send(req, res, 500, 'booking.errors.fetchFailed');
		}
	},
};

module.exports = bookingMiddleware;
