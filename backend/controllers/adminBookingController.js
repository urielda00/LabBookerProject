const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Room = require('../models/Room');
const notificationsController = require('../controllers/notificationsController');
const asyncHandler = require('../middleware/asyncHandler');
const R = require('../utils/response');
const BookingUtils = require('../utils/bookingUtils');
const CONSTANTS = BookingUtils.getConstants();

const {
	sendAdminApprovalRequest,
	sendBookingConfirmation,
	sendPendingConfirmation,
} = require('../utils/emailService');

// POST /booking/admin/create-by-names
const createBookingByNames = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { username, roomName, date, startTime, endTime, additionalUsers = [] } = req.body;

		if (!username || !roomName || !date || !startTime || !endTime) {
			throw { status: 400, key: 'booking.errors.missingFieldsNames' };
		}

		const user = await User.findOne({ username }).session(session);
		if (!user)
			throw { status: 404, key: 'booking.errors.userNotFoundByUsername', params: { username } };

		const room = await Room.findOne({ name: roomName }).session(session);
		if (!room)
			throw { status: 404, key: 'booking.errors.roomNotFoundByName', params: { room: roomName } };

		// Validation
		const timeValidation = BookingUtils.validateTimeSlot(date, startTime, endTime);
		if (!timeValidation.valid) throw { status: 400, key: timeValidation.error };

		const invalidEmails = BookingUtils.validateEmails(additionalUsers);
		if (invalidEmails.length > 0)
			throw { status: 400, key: 'booking.errors.invalidAdditionalEmail' };

		let additionalUserIds = [];
		if (additionalUsers.length > 0) {
			const users = await User.find({ email: { $in: additionalUsers } })
				.select('_id')
				.session(session);
			additionalUserIds = users.map((u) => u._id);
			if (additionalUserIds.length !== additionalUsers.length) {
				throw { status: 400, key: 'booking.errors.notFoundAdditionalEmail' };
			}
		}

		const duration = BookingUtils.calculateDuration(startTime, endTime);
		if (duration <= CONSTANTS.LIMITS.MIN_DURATION || duration > CONSTANTS.LIMITS.MAX_DURATION) {
			throw {
				status: 400,
				key: 'booking.errors.duration',
				params: { min: CONSTANTS.LIMITS.MIN_DURATION, max: CONSTANTS.LIMITS.MAX_DURATION },
			};
		}

		const conflictingBooking = await BookingUtils.checkConflict(
			room._id,
			date,
			startTime,
			endTime,
			session
		);
		if (conflictingBooking) {
			throw { status: 409, key: 'booking.errors.slotConflict' };
		}

		const bookingStatus =
			room.type === CONSTANTS.ROOM_TYPES.LARGE_SEMINAR
				? CONSTANTS.STATUSES.PENDING
				: CONSTANTS.STATUSES.CONFIRMED;

		const booking = new Booking({
			roomId: room._id,
			userId: user._id,
			roomType: room.type,
			date,
			startTime,
			endTime,
			additionalUsers: additionalUserIds,
			status: bookingStatus,
			createdByAdmin: req.user?._id,
		});

		await booking.save({ session });

		try {
			await notificationsController.createNotification(
				user._id,
				bookingStatus === CONSTANTS.STATUSES.PENDING
					? 'booking.notify.createdByAdminPending'
					: 'booking.notify.createdByAdminConfirmed',
				{ room: room.name, admin: req.user?.username || 'System' },
				'bookingCreatedByAdmin'
			);
			await notificationsController.createNotification(
				req.user._id,
				'booking.notify.adminCreatedBooking',
				{ user: user.username, room: room.name },
				'adminBookingCreated'
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

		return R.send(
			req,
			res,
			201,
			bookingStatus === CONSTANTS.STATUSES.PENDING
				? 'booking.success.createdPendingByAdmin'
				: 'booking.success.createdConfirmedByAdmin',
			{},
			{ booking: populatedBooking }
		);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		if (error.status && error.key)
			return R.send(req, res, error.status, error.key, error.params || {});
		return R.send(req, res, 500, 'booking.errors.createFailed');
	}
});

// PATCH /booking/:id/status/by-username (Admin)
const updateBookingStatusByUsername = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { id } = req.params;
		const { status } = req.body;
		const { username } = req.query;
		const validStatuses = Object.values(CONSTANTS.STATUSES);

		if (!validStatuses.includes(status)) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 400, 'booking.errors.invalidStatus', { validStatuses });
		}

		if (!username) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 400, 'booking.errors.missingUsernameParam');
		}

		const user = await User.findOne({ username }).session(session);
		if (!user) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 404, 'booking.errors.userNotFoundByUsername', { username });
		}

		const booking = await Booking.findOne({
			_id: id,
			$or: [{ userId: user._id }, { additionalUsers: user._id }],
		}).session(session);

		if (!booking) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 404, 'booking.errors.bookingNotFoundOrUnauthorized');
		}

		const room = await Room.findById(booking.roomId).session(session);
		if (!room) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 404, 'booking.errors.roomNotFound');
		}

		// Admin override: often skips strict stats penalties unless necessary
		if (req.user?.role !== 'admin') {
			if (['Canceled', 'Missed'].includes(status)) {
				await BookingUtils.updateCancellationStats(user._id, session);
			}
		}

		if (['Canceled', 'Missed', 'Completed'].includes(status)) {
			booking.isDeleted = true;
			booking.deletedAt = new Date();
		}

		booking.status = status;
		await booking.save({ session });

		try {
			await notificationsController.createNotification(
				req.user._id,
				'booking.notify.statusUpdatedAdmin',
				{ user: user.username, status: status },
				'bookingUpdateAdmin'
			);
			await notificationsController.createNotification(
				user._id,
				'booking.notify.statusUpdatedUser',
				{ room: room.name, status: status, admin: req.user.username },
				'bookingUpdateUser'
			);
		} catch (e) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
		}

		await session.commitTransaction();
		session.endSession();

		return R.send(
			req,
			res,
			200,
			'booking.success.statusUpdated',
			{ status, username },
			{ booking }
		);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		return R.send(req, res, 500, 'booking.errors.statusUpdateFailed');
	}
});

// DELETE /booking/:id/by-username (Admin deletion)
const deleteBookingByUsername = asyncHandler(async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { id } = req.params;
		const { username } = req.query;

		if (!username) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 400, 'booking.errors.missingUsernameParam');
		}

		const user = await User.findOne({ username }).session(session);
		if (!user) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 404, 'booking.errors.userNotFoundByUsername', { username });
		}

		const booking = await Booking.findOne({
			_id: id,
			$or: [{ userId: user._id }, { additionalUsers: user._id }],
		}).session(session);

		if (!booking) {
			await session.abortTransaction();
			session.endSession();
			return R.send(req, res, 404, 'booking.errors.bookingNotFoundForUser');
		}

		const room = await Room.findById(booking.roomId).session(session);

		// Check if active (Admin override logic can be placed here if needed)
		if (req.user?.role !== 'admin') {
			if (booking.status.toLowerCase() === 'active') {
				await session.abortTransaction();
				session.endSession();
				return R.send(req, res, 403, 'booking.errors.activeCancel');
			}
			if (booking.status !== 'Canceled') {
				await BookingUtils.updateCancellationStats(user._id, session);
			}
		}

		booking.status = 'Canceled';
		booking.isDeleted = true;
		booking.deletedAt = new Date();
		await booking.save({ session });

		try {
			await notificationsController.createNotification(
				req.user._id,
				'booking.notify.adminCanceled',
				{ user: user.username, room: room.name },
				'adminCancellation'
			);
			await notificationsController.createNotification(
				user._id,
				'booking.notify.userCanceledByAdmin',
				{ room: room.name, admin: req.user.username },
				'userCancellation'
			);
		} catch (e) {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Notification Error:', e);
			}else{
				console.error('Notification Error:', e.message);
			}
		}

		const updatedBooking = await Booking.findById(booking._id).populate(
			'roomId userId additionalUsers'
		);

		await session.commitTransaction();
		session.endSession();

		return R.send(
			req,
			res,
			200,
			'booking.success.adminCancellation',
			{ username },
			{ booking: updatedBooking }
		);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		return R.send(req, res, 500, 'booking.errors.adminCancelFailed');
	}
});

module.exports = {
	createBookingByNames,
	updateBookingStatusByUsername,
	deleteBookingByUsername,
};
