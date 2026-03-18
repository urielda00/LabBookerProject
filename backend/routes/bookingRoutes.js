const express = require('express');
const router = express.Router();

// Controllers
const bookingController = require('../controllers/bookingController');
const adminBookingController = require('../controllers/adminBookingController');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const bookingMiddleware = require('../middleware/bookingMiddleware');
const validateRequest = require('../middleware/validateRequest');

// --- User Booking Lists & Info ---

// Get next upcoming booking
router.get('/booking/next', authMiddleware.requireAuth, bookingController.getNextUpcomingBooking);

// Get my bookings
router.get('/my-bookings', authMiddleware.requireAuth, bookingController.getMyBooking);

// Get bookings stats
router.get('/bookings/count', bookingController.getBookingCounts);

// Get weekly overview
router.get('/weekly', bookingController.getWeeklyBookings);

// Get general list (with filters)
router.get('/bookings', bookingController.getBookings);

// Get upcoming by username
router.get('/bookings/upcoming/:username', bookingController.getUserUpcomingBookings);

// Get all by username
router.get('/bookings/all-by-username/:username', bookingController.getAllBookingsByUsername);

// Get by room name
router.get('/bookings/by-room/:roomName', bookingController.getAllBookingsByRoomName);

// --- Operations ---

// Create Booking
router.post(
	'/booking',
	bookingController.validateCreateBooking,
	validateRequest,
	bookingController.createBooking
);

// Get Single Booking (with Middleware)
router.get('/booking/:id', bookingMiddleware.loadBooking, bookingController.getBookingById);

// Delete Booking
router.delete(
	'/booking/:id',
	bookingController.validateBookingId,
	validateRequest,
	bookingController.deleteBooking
);

// Check-in
router.post(
	'/booking/:id/check-in',
	authMiddleware.requireAuth,
	bookingController.validateBookingId,
	validateRequest,
	bookingController.checkInToBooking
);

// Update Status
router.patch(
	'/booking/:id/status',
	authMiddleware.requireAuth,
	bookingController.validateUpdateStatus,
	validateRequest,
	bookingController.updateBookingStatus
);

// --- Admin Operations ---

router.post(
	'/booking/create-by-names',
	authMiddleware.requireAuth,
	adminBookingController.createBookingByNames
);

router.patch(
	'/booking/:id/status/by-username',
	authMiddleware.requireAuth,
	adminBookingController.updateBookingStatusByUsername
);

router.delete(
	'/booking/:id/by-username',
	authMiddleware.requireAuth,
	adminBookingController.deleteBookingByUsername
);

// --- System/Maintenance ---

router.get(
	'/booking/update-past',
	authMiddleware.requireAuth,
	bookingController.updatePastBookings
);

// --- Transfer Requests ---

router.get(
	'/:id/transfer-requests',
	authMiddleware.requireAuth,
	bookingController.validateBookingId,
	validateRequest,
	bookingController.getTransferRequests
);

router.post(
	'/:id/transfer-request',
	authMiddleware.requireAuth,
	bookingController.validateTransferRequest,
	validateRequest,
	bookingController.createTransferRequest
);

router.patch(
	'/transfer-requests/:id/accept',
	authMiddleware.requireAuth,
	bookingController.acceptTransferRequest
);

router.patch(
	'/transfer-requests/:id/decline',
	authMiddleware.requireAuth,
	bookingController.declineTransferRequest
);

router.get(
	'/:id/has-declined-request',
	authMiddleware.requireAuth,
	bookingController.checkDeclinedRequest
);

module.exports = router;
