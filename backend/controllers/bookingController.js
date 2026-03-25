const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { body, query, param } = require('express-validator');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Room = require('../models/Room');
const TransferRequest = require('../models/TransferRequest');
const BookingUtils = require('../utils/bookingUtils');
const notificationsController = require('../controllers/notificationsController');
const asyncHandler = require('../middleware/asyncHandler');
const {
	sendAdminApprovalRequest,
	sendBookingConfirmation,
	sendPendingConfirmation,
} = require('../utils/emailService');

const CONSTANTS = BookingUtils.getConstants();

// --- Validators ---

const validateBookingId = [param('id').isMongoId().withMessage('Invalid Booking ID')];

const validateCreateBooking = [
	body('roomId').isMongoId().withMessage('Valid Room ID is required'),
	body('userId').isMongoId().withMessage('Valid User ID is required'),
	body('date')
		.matches(/^\d{4}-\d{2}-\d{2}$/)
		.withMessage('Date must be in YYYY-MM-DD format'),
	body('startTime')
		.matches(/^\d{2}:\d{2}$/)
		.withMessage('Start time must be HH:MM'),
	body('endTime')
		.matches(/^\d{2}:\d{2}$/)
		.withMessage('End time must be HH:MM'),
	// Additional validation logic remains in the controller due to complexity (business logic)
];

const validateUpdateStatus = [
	param('id').isMongoId().withMessage('Invalid Booking ID'),
	body('status').isIn(Object.values(CONSTANTS.STATUSES)).withMessage('Invalid status value'),
];

const validateTransferRequest = [
	param('id').isMongoId().withMessage('Invalid Booking ID'),
	body('message').optional().isString().trim(),
];

// --- Controller Methods ---

// GET /booking/:id
const getBookingById = asyncHandler(async (req, res) => {
	// Booking is already loaded by the bookingMiddleware
	res.status(200).json({
		message: 'booking.success.single',
		booking: req.bookingResource,
	});
});

// GET /bookings
const getBookings = asyncHandler(async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;
	const query = {};

	if (req.query.status) query.status = req.query.status;
	if (req.query.roomId) query.roomId = req.query.roomId;
	if (req.query.userId) query.userId = req.query.userId;
	if (req.query.startDate && req.query.endDate) {
		query.date = {
			$gte: new Date(req.query.startDate),
			$lte: new Date(req.query.endDate),
		};
	}

	const bookings = await Booking.find(query)
		.populate('roomId', 'name type capacity description')
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.skip(skip)
		.limit(limit)
		.sort({ createdAt: -1 });

	const total = await Booking.countDocuments(query);

	res.status(200).json({
		message: 'booking.success.list',
		bookings,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(total / limit),
			totalBookings: total,
		},
	});
});

// POST /booking
const createBooking = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { roomId, userId, date, startTime, endTime, additionalUsers = [] } = req.body;

		// 1. Validation: Time, Past Date, Business Hours
		const timeValidation = BookingUtils.validateTimeSlot(date, startTime, endTime);
		if (!timeValidation.valid) {
			const error = new Error(timeValidation.error);
			error.statusCode = 400;
			throw error;
		}

		// 2. Fetch User and check Block status
		const user = await User.findById(userId).session(session);
		if (!user) {
			const error = new Error('booking.errors.userNotFound');
			error.statusCode = 404;
			throw error;
		}

		if (user.cancellationStats?.blockedUntil && user.cancellationStats.blockedUntil > new Date()) {
			await session.abortTransaction();
			session.endSession();
			return res.status(403).json({
				message: 'booking.errors.blocked',
				date: user.cancellationStats.blockedUntil.toLocaleDateString(),
			});
		}

		// 3. Check for existing upcoming bookings
		const timezone = process.env.TIMEZONE || 'Asia/Jerusalem';
		const today = moment().tz(timezone).format('YYYY-MM-DD');
		const currentTime = moment().tz(timezone).format('HH:mm');

		const existingUpcoming = await Booking.findOne({
			userId: userId,
			status: {
				$nin: [
					CONSTANTS.STATUSES.CANCELED,
					CONSTANTS.STATUSES.COMPLETED,
					CONSTANTS.STATUSES.MISSED,
				],
			},
			$or: [{ date: { $gt: today } }, { date: today, endTime: { $gt: currentTime } }],
		}).session(session);

		if (existingUpcoming) {
			const error = new Error('booking.errors.hasUpcoming');
			error.statusCode = 400;
			throw error;
		}

		// 4. Check Limits (Weekly & Room Type)
		const weeklyCount = await BookingUtils.checkWeeklyLimit(userId, session);
		if (weeklyCount >= CONSTANTS.LIMITS.MAX_WEEKLY_BOOKINGS) {
			const error = new Error('booking.errors.weeklyLimit');
			error.statusCode = 400;
			throw error;
		}

		const room = await Room.findById(roomId).session(session);
		if (!room) {
			const error = new Error('booking.errors.roomNotFound');
			error.statusCode = 404;
			throw error;
		}

		const roomLimitCheck = await BookingUtils.checkRoomTypeLimit(userId, room.type, session);
		if (!roomLimitCheck.allowed) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				message: 'booking.errors.roomTypeLimit',
				type: req.t ? req.t(`roomTypes.${room.type}`) : room.type,
			});
		}

		// 5. Additional Users Validation
		const invalidEmails = BookingUtils.validateEmails(additionalUsers);
		if (invalidEmails.length > 0) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				message: 'booking.errors.invalidEmail',
				invalidEmails,
			});
		}

		let additionalUserIds = [];
		if (additionalUsers.length > 0) {
			const users = await User.find({ email: { $in: additionalUsers } })
				.select('_id')
				.session(session);
			additionalUserIds = users.map((u) => u._id);

			if (additionalUserIds.length !== additionalUsers.length) {
				const foundEmails = users.map((u) => u.email);
				const missingEmails = additionalUsers.filter((e) => !foundEmails.includes(e));
				await session.abortTransaction();
				session.endSession();
				return res.status(400).json({
					message: 'booking.errors.notFoundAdditionalEmail',
					missingEmails,
				});
			}
		}

		// 6. Duration Check
		const duration = BookingUtils.calculateDuration(startTime, endTime);
		if (duration <= CONSTANTS.LIMITS.MIN_DURATION || duration > CONSTANTS.LIMITS.MAX_DURATION) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				message: 'booking.errors.duration',
				min: CONSTANTS.LIMITS.MIN_DURATION,
				max: CONSTANTS.LIMITS.MAX_DURATION,
			});
		}

		// 7. Conflict Check
		const conflictingBooking = await BookingUtils.checkConflict(
			roomId,
			date,
			startTime,
			endTime,
			session
		);
		if (conflictingBooking) {
			const error = new Error('booking.errors.slotTaken');
			error.statusCode = 400;
			throw error;
		}

		// 8. Create Booking
		const bookingStatus =
			room.type === CONSTANTS.ROOM_TYPES.LARGE_SEMINAR
				? CONSTANTS.STATUSES.PENDING
				: CONSTANTS.STATUSES.CONFIRMED;

		const booking = new Booking({
			roomId,
			userId,
			date,
			startTime,
			endTime,
			additionalUsers: additionalUserIds,
			status: bookingStatus,
			roomType: room.type,
		});

		await booking.save({ session });

		// 9. Notifications & Email (Safe)
		const bookingDetails = { roomName: room.name, date, startTime, endTime, id: booking._id };

		try {
			if (room.type === CONSTANTS.ROOM_TYPES.LARGE_SEMINAR) {
				await sendPendingConfirmation(user.email, user.username, bookingDetails);
				await sendAdminApprovalRequest(bookingDetails, { name: user.username, email: user.email });
			} else {
				await sendBookingConfirmation(user.email, user.username, bookingDetails);
			}
		} catch (emailError) {
			console.warn('Email sending failed, but booking was created:', emailError.message);
		}

		const notifyKey =
			room.type === CONSTANTS.ROOM_TYPES.LARGE_SEMINAR
				? 'booking.notify.createdLarge'
				: room.type === CONSTANTS.ROOM_TYPES.OPEN ||
				  room.type === CONSTANTS.ROOM_TYPES.SMALL_SEMINAR
				? 'booking.notify.createdOpen'
				: 'booking.notify.createdGeneric';

		try {
			await notificationsController.createNotification(
				user._id,
				notifyKey,
				{ room: room.name },
				'bookingCreation'
			);
		} catch (e) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
		}

		const populatedBooking = await Booking.findById(booking._id)
			.populate('roomId', 'name type capacity description')
			.populate('userId', 'username email')
			.populate('additionalUsers', 'username email')
			.session(session);

		await session.commitTransaction();
		session.endSession();

		res.status(201).json({
			message:
				bookingStatus === CONSTANTS.STATUSES.PENDING
					? 'booking.success.pendingApproval'
					: 'booking.success.created',
			booking: populatedBooking,
			weeklyBookingsRemaining: CONSTANTS.LIMITS.MAX_WEEKLY_BOOKINGS - (weeklyCount + 1),
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if(process.env.NODE_ENV !== 'production') {
			console.error('createBooking - Error:', error);
		}else{
			console.error('createBooking - Error:', error.message);
		}
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// DELETE /booking/:id
const deleteBooking = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const booking = await Booking.findById(req.params.id).session(session);
		if (!booking) {
			const error = new Error('booking.errors.notFound');
			error.statusCode = 404;
			throw error;
		}

		const room = await Room.findById(booking.roomId).session(session);
		const user = await User.findById(booking.userId).session(session);

		if (!user || !room) {
			const error = new Error('booking.errors.resourceNotFound');
			error.statusCode = 404;
			throw error;
		}

		// Authorization
		if (req.user && booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
			const error = new Error('booking.errors.notAuthorized');
			error.statusCode = 403;
			throw error;
		}

		if (booking.status.toLowerCase() === 'active') {
			const error = new Error('booking.errors.activeCannotCancel');
			error.statusCode = 403;
			throw error;
		}

		if (booking.status !== 'Canceled') {
			const statsResult = await BookingUtils.updateCancellationStats(booking.userId, session);

			// Handle cancellation warnings/blocks
			if (statsResult.action === 'block') {
				await notificationsController.createNotification(
					user._id,
					'booking.notify.blocked',
					{},
					'accountBlocked'
				);
			} else if (statsResult.action === 'warn') {
				await notificationsController.createNotification(
					user._id,
					'booking.notify.cancellationWarning',
					statsResult.notificationData,
					'cancellationWarning'
				);
			}
		}

		booking.status = 'Canceled';
		booking.isDeleted = true;
		booking.deletedAt = new Date();
		await booking.save({ session });

		try {
			await notificationsController.createNotification(
				booking.userId,
				'booking.notify.deleted',
				{ room: room.name },
				'bookingDeletion'
			);
		} catch (e) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
		}

		const updatedBooking = await Booking.findById(booking._id)
			.populate('roomId', 'name type capacity description')
			.populate('userId', 'username email')
			.populate('additionalUsers', 'username email');

		await session.commitTransaction();
		session.endSession();

		res.status(200).json({
			message: 'booking.success.deleted',
			booking: updatedBooking,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if(process.env.NODE_ENV !== 'production') {
			console.error('deleteBooking Error:', error);
		}else{
			console.error('deleteBooking Error:', error.message);
		}
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// GET /bookings/by-room/:roomName
const getAllBookingsByRoomName = asyncHandler(async (req, res) => {
	const { roomName } = req.params;
	const room = await Room.findOne({ name: roomName }).select('_id');
	if (!room) {
		const error = new Error('booking.errors.roomNotFoundByName');
		error.statusCode = 404;
		throw error;
	}
	const bookings = await Booking.find({ roomId: room._id })
		.populate('roomId', 'name type capacity description')
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.sort({ date: -1, startTime: -1 });

	res.status(200).json({
		message: 'booking.success.list',
		bookings,
		count: bookings.length,
	});
});

// GET /my-bookings
const getMyBooking = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;

	const bookings = await Booking.find({
		$or: [{ userId }, { additionalUsers: userId }],
	})
		.populate('roomId', 'name type capacity')
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.sort({ date: -1, startTime: -1 })
		.skip(skip)
		.limit(limit);

	const total = await Booking.countDocuments({
		$or: [{ userId }, { additionalUsers: userId }],
	});

	res.status(200).json({
		message: 'booking.success.list',
		bookings,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(total / limit),
			totalBookings: total,
		},
	});
});

// PATCH /booking/:id/status
const updateBookingStatus = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { id } = req.params;
		const { status } = req.body;

		const booking = await Booking.findById(id).session(session);
		if (!booking) {
			const error = new Error('booking.errors.notFound');
			error.statusCode = 404;
			throw error;
		}

		const room = await Room.findById(booking.roomId).session(session);
		if (!room) {
			const error = new Error('booking.errors.roomNotFound');
			error.statusCode = 404;
			throw error;
		}

		if (['Canceled', 'Missed'].includes(status)) {
			await BookingUtils.updateCancellationStats(booking.userId, session);
		}

		if (['Canceled', 'Missed', 'Completed'].includes(status)) {
			booking.isDeleted = true;
			booking.deletedAt = new Date();
		}

		booking.status = status;
		await booking.save({ session });

		// Notification
		let notificationKey;
		const notifyParams = { room: room.name };

		switch (status) {
			case 'Missed':
				notificationKey = 'booking.notify.missed';
				break;
			case 'Completed':
				notificationKey = 'booking.notify.completed';
				break;
			case 'Canceled':
				notificationKey = 'booking.notify.canceled';
				break;
			default:
				notificationKey = 'booking.notify.statusUpdate';
		}

		try {
			if (notificationKey) {
				await notificationsController.createNotification(
					booking.userId,
					notificationKey,
					notifyParams,
					`booking${status}`
				);
			}
		} catch (e) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
		}

		await session.commitTransaction();
		session.endSession();

		res.status(200).json({
			message: 'booking.success.statusUpdated',
			status,
			booking,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// GET /bookings/count
const getBookingCounts = asyncHandler(async (req, res) => {
	const query = {};
	if (req.query.roomId) query.roomId = req.query.roomId;
	if (req.query.userId) query.userId = req.query.userId;

	const [total, pending, confirmed, canceled, missed] = await Promise.all([
		Booking.countDocuments(query),
		Booking.countDocuments({ ...query, status: CONSTANTS.STATUSES.PENDING }),
		Booking.countDocuments({ ...query, status: CONSTANTS.STATUSES.CONFIRMED }),
		Booking.countDocuments({ ...query, status: CONSTANTS.STATUSES.CANCELED }),
		Booking.countDocuments({ ...query, status: CONSTANTS.STATUSES.MISSED }),
	]);

	res.status(200).json({
		message: 'booking.success.countsFetched',
		counts: { total, pending, confirmed, canceled, missed },
	});
});

// GET /bookings/upcoming/:username
const getUserUpcomingBookings = asyncHandler(async (req, res) => {
	const { username } = req.params;
	const user = await User.findOne({ username }).select('_id');
	if (!user) {
		const error = new Error('booking.errors.userNotFoundByUsername');
		error.statusCode = 404;
		throw error;
	}

	const now = new Date();
	const todayStr = now.toISOString().slice(0, 10);

	let allPotentiallyUpcoming = await Booking.find({
		$or: [{ userId: user._id }, { additionalUsers: user._id }],
		date: { $gte: todayStr },
		status: { $ne: CONSTANTS.STATUSES.CANCELED },
	})
		.populate('roomId', 'name type capacity description')
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.sort({ date: 1, startTime: 1 });

	const finalUpcoming = allPotentiallyUpcoming.filter((booking) => {
		if (booking.date > todayStr) return true;
		if (booking.date === todayStr) {
			const [endH, endM] = booking.endTime.split(':').map(Number);
			const bookingEnd = new Date();
			bookingEnd.setHours(endH, endM, 0, 0);
			return bookingEnd > now;
		}
		return false;
	});

	res.status(200).json({
		message: 'booking.success.upcomingFetched',
		bookings: finalUpcoming,
	});
});

// GET /bookings/all-by-username/:username
const getAllBookingsByUsername = asyncHandler(async (req, res) => {
	const { username } = req.params;
	const user = await User.findOne({ username }).select('_id');
	if (!user) {
		const error = new Error('booking.errors.userNotFoundByUsername');
		error.statusCode = 404;
		throw error;
	}
	const allBookings = await Booking.find({
		$or: [{ userId: user._id }, { additionalUsers: user._id }],
	})
		.populate('roomId', 'name type capacity description')
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.sort({ date: -1, startTime: -1 });

	res.status(200).json({
		message: 'booking.success.allUserBookings',
		bookings: allBookings,
	});
});

// GET /bookings/next-upcoming
const getNextUpcomingBooking = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const todayStr = new Date().toISOString().slice(0, 10);

	const nextBooking = await Booking.findOne({
		$or: [{ userId }, { additionalUsers: userId }],
		status: {
			$nin: [CONSTANTS.STATUSES.CANCELED, CONSTANTS.STATUSES.COMPLETED, CONSTANTS.STATUSES.MISSED],
		},
		date: { $gte: todayStr },
	})
		.sort({ date: 1, startTime: 1 })
		.populate('roomId', 'name type capacity description')
		.populate('userId', 'username email');

	res.status(200).json({
		message: nextBooking ? 'booking.success.nextUpcomingFound' : 'booking.success.noUpcoming',
		booking: nextBooking,
	});
});

// POST /booking/:id/check-in
const checkInToBooking = asyncHandler(async (req, res) => {
	const bookingId = req.params.id;
	const userId = req.user.id;

	const booking = await Booking.findById(bookingId)
		.populate('roomId', 'name')
		.populate('userId', 'username email');

	if (!booking) {
		const error = new Error('booking.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	const isAuthorized =
		booking.userId._id.toString() === userId || booking.additionalUsers.includes(userId);

	if (!isAuthorized) {
		const error = new Error('booking.errors.unauthorizedCheckIn');
		error.statusCode = 403;
		throw error;
	}

	const now = new Date();
	const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);

	if (now > bookingEnd) {
		const error = new Error('booking.errors.bookingEnded');
		error.statusCode = 400;
		throw error;
	}

	const bookingStart = new Date(`${booking.date}T${booking.startTime}:00`);
	const fifteenMinutesBefore = new Date(bookingStart.getTime() - 15 * 60000);

	if (now < fifteenMinutesBefore) {
		const error = new Error('booking.errors.checkInTooEarly');
		error.statusCode = 400;
		throw error;
	}

	booking.status = CONSTANTS.STATUSES.ACTIVE;
	booking.checkedIn = true;
	booking.checkedInAt = now;
	await booking.save();

	try {
		await notificationsController.createNotification(
			booking.userId._id,
			'booking.notify.checkedIn',
			{ room: booking.roomId.name },
			'bookingCheckIn'
		);
	} catch (e) {
		if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
	}

	res.status(200).json({
		message: 'booking.success.checkedIn',
		booking,
	});
});

// POST /bookings/update-past
const updatePastBookings = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const now = new Date();
		const bookingsToUpdate = await Booking.find({
			status: {
				$nin: [
					CONSTANTS.STATUSES.CANCELED,
					CONSTANTS.STATUSES.COMPLETED,
					CONSTANTS.STATUSES.MISSED,
				],
			},
			date: { $lte: now.toISOString().split('T')[0] },
		}).session(session);

		let updatedCount = 0;
		for (const booking of bookingsToUpdate) {
			const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);
			if (bookingEnd < now) {
				if (booking.checkedIn) {
					booking.status = CONSTANTS.STATUSES.COMPLETED;
				} else {
					booking.status = CONSTANTS.STATUSES.MISSED;
					await BookingUtils.updateCancellationStats(booking.userId, session);
				}
				booking.isDeleted = true;
				booking.deletedAt = new Date();
				await booking.save({ session });
				updatedCount++;
			}
		}

		await session.commitTransaction();
		session.endSession();
		res.status(200).json({
			message: 'booking.success.pastUpdated',
			count: updatedCount,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		const err = new Error('booking.errors.pastUpdateFailed');
		err.statusCode = 500;
		throw err;
	}
});

// CRON TASK (Utility function, not express middleware)
const updatePastBookingsCron = async () => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const timezone = process.env.TIMEZONE || 'Asia/Jerusalem';
		const now = moment().tz(timezone);

		const bookingsToUpdate = await Booking.find({
			status: { $nin: ['Canceled', 'Completed', 'Missed'] },
			$expr: {
				$lte: [
					{
						$dateFromString: {
							dateString: { $concat: ['$date', 'T', '$endTime', ':00'] },
							timezone: timezone,
						},
					},
					now.toDate(),
				],
			},
		})
			.populate('roomId', 'name')
			.populate('userId', 'email')
			.session(session);

		let updatedCount = 0;
		for (const booking of bookingsToUpdate) {
			if (now.isAfter(moment.tz(`${booking.date}T${booking.endTime}:00`, timezone))) {
				let newStatus = booking.checkedIn ? 'Completed' : 'Missed';

				if (newStatus === 'Missed') {
					await BookingUtils.updateCancellationStats(booking.userId._id, session);
				}

				booking.status = newStatus;
				booking.isDeleted = true;
				booking.deletedAt = new Date();
				await booking.save({ session });

				// Notification
				try {
					await notificationsController.createNotification(
						booking.userId._id,
						'booking.notify.statusAutoUpdate',
						{ room: booking.roomId.name, status: newStatus },
						`booking${newStatus}`
					);
				} catch (e) {}

				updatedCount++;
			}
		}

		await session.commitTransaction();
		session.endSession();
		return { success: true, updatedCount };
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if(process.env.NODE_ENV !== 'production') {
			console.error('Cron Error', error);
		}	else{
			console.error('Cron Error', error.message);
		}
		return { success: false, error: error.message };
	}
};

// GET /bookings/weekly
const getWeeklyBookings = asyncHandler(async (req, res) => {
	const timezone = process.env.TIMEZONE || 'Asia/Jerusalem';
	const now = moment().tz(timezone);
	const todayStr = now.format('YYYY-MM-DD');
	const currentTime = now.format('HH:mm');

	const query = {
		$and: [
			{
				$or: [{ date: { $gt: todayStr } }, { date: todayStr, endTime: { $gt: currentTime } }],
			},
			{
				status: {
					$in: [
						CONSTANTS.STATUSES.PENDING,
						CONSTANTS.STATUSES.CONFIRMED,
						CONSTANTS.STATUSES.ACTIVE,
					],
				},
			},
		],
	};

	if (req.query.roomId) {
		query.$and.push({ roomId: new mongoose.Types.ObjectId(req.query.roomId) });
	}

	const bookings = await Booking.find(query)
		.populate('userId', 'username email')
		.populate('additionalUsers', 'username email')
		.populate('roomId', 'name type capacity')
		.populate({
			path: 'transferRequests',
			match: { status: 'pending' },
			populate: [
				{ path: 'fromUser', select: 'username email' },
				{ path: 'toUser', select: 'username email' },
			],
		})
		.sort({ date: 1, startTime: 1 });

	res.status(200).json({
		message: 'booking.success.weeklyFetched',
		bookings,
		dateRange: { start: todayStr },
	});
});

// GET /booking/:id/transfer-requests
const getTransferRequests = asyncHandler(async (req, res) => {
	const requests = await TransferRequest.find({
		booking: req.params.id,
		status: 'pending',
	})
		.populate('fromUser', 'username email')
		.populate('toUser', 'username email');

	res.status(200).json({
		message: 'booking.success.transferRequestsFetched',
		requests,
	});
});

// POST /booking/:id/transfer
const createTransferRequest = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const booking = await Booking.findById(req.params.id).populate('roomId').session(session);
		if (!booking) {
			const error = new Error('booking.errors.notFound');
			error.statusCode = 404;
			throw error;
		}

		if (['Pending', 'Active'].includes(booking.status)) {
			const error = new Error('booking.errors.transferInvalidStatus');
			error.statusCode = 400;
			throw error;
		}

		const user = await User.findById(req.user.id).session(session);

		if (user.cancellationStats?.blockedUntil && user.cancellationStats.blockedUntil > new Date()) {
			await session.abortTransaction();
			session.endSession();
			return res.status(403).json({
				message: 'booking.errors.blocked',
				date: user.cancellationStats.blockedUntil.toLocaleDateString(),
			});
		}

		const weeklyCount = await BookingUtils.checkWeeklyLimit(req.user.id, session);
		if (weeklyCount >= CONSTANTS.LIMITS.MAX_WEEKLY_BOOKINGS) {
			const error = new Error('booking.errors.weeklyLimit');
			error.statusCode = 400;
			throw error;
		}

		const request = new TransferRequest({
			booking: req.params.id,
			fromUser: req.user.id,
			toUser: booking.userId,
			message: req.body.message,
			expiresAt: booking.deletedAt || new Date(Date.now() + 604800000),
		});

		await request.save({ session });
		await Booking.findByIdAndUpdate(
			req.params.id,
			{ $push: { transferRequests: request._id } },
			{ session }
		);

		try {
			await notificationsController.createNotification(
				booking.userId,
				'booking.notify.transferRequestReceived',
				{ room: booking.roomId.name },
				'transferRequest'
			);
		} catch (e) {}

		await session.commitTransaction();
		session.endSession();
		res.status(201).json({
			message: 'booking.success.transferCreated',
			request,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// POST /transfer/:id/accept
const acceptTransferRequest = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const request = await TransferRequest.findById(req.params.id)
			.populate('fromUser', 'username')
			.populate('toUser', 'username')
			.populate({ path: 'booking', populate: { path: 'roomId', select: 'name' } })
			.session(session);

		if (!request) {
			const error = new Error('booking.errors.transferNotFound');
			error.statusCode = 404;
			throw error;
		}

		// *** FIX: Changed fromUser._id to toUser._id to correctly transfer ownership ***
		const booking = await Booking.findByIdAndUpdate(
			request.booking._id,
			{ userId: req.user._id },
			{ new: true, session }
		);
		request.status = 'accepted';
		await request.save({ session });

		try {
			await notificationsController.createNotification(
				request.fromUser._id,
				'booking.notify.transferAccepted',
				{ room: request.booking.roomId.name },
				'transferAccepted'
			);
			await notificationsController.createNotification(
				request.toUser._id,
				'booking.notify.transferCompleted',
				{ room: request.booking.roomId.name, user: request.fromUser.username },
				'bookingTransferred'
			);
		} catch (e) {}

		await session.commitTransaction();
		session.endSession();
		res.status(200).json({
			message: 'booking.success.transferAccepted',
			booking,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// POST /transfer/:id/decline
const declineTransferRequest = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const request = await TransferRequest.findByIdAndUpdate(
			req.params.id,
			{ status: 'declined' },
			{ new: true, session }
		).populate('fromUser toUser', 'username');

		if (!request) {
			const error = new Error('booking.errors.transferNotFound');
			error.statusCode = 404;
			throw error;
		}

		try {
			await notificationsController.createNotification(
				request.fromUser._id,
				'booking.notify.transferDeclined',
				{ user: request.toUser.username },
				'transferDeclined'
			);
		} catch (e) {}

		await session.commitTransaction();
		session.endSession();
		res.status(200).json({
			message: 'booking.success.transferDeclined',
			request,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if (!error.statusCode) error.statusCode = 500;
		throw error;
	}
});

// GET /transfer/:id/check-declined
const checkDeclinedRequest = asyncHandler(async (req, res) => {
	const request = await TransferRequest.findOne({
		booking: req.params.id,
		fromUser: req.query.userId,
		status: 'declined',
	});
	res.status(200).json({ exists: !!request });
});

module.exports = {
	getBookingById,
	getBookings,
	createBooking,
	deleteBooking,
	getAllBookingsByRoomName,
	getMyBooking,
	updateBookingStatus,
	getBookingCounts,
	getUserUpcomingBookings,
	getAllBookingsByUsername,
	getNextUpcomingBooking,
	checkInToBooking,
	updatePastBookings,
	updatePastBookingsCron,
	getWeeklyBookings,
	getTransferRequests,
	createTransferRequest,
	acceptTransferRequest,
	declineTransferRequest,
	checkDeclinedRequest,
	// Validators
	validateCreateBooking,
	validateBookingId,
	validateUpdateStatus,
	validateTransferRequest,
};
