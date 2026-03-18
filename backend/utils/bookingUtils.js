const moment = require('moment-timezone');
const Booking = require('../models/Booking');
const User = require('../models/User');

const CONSTANTS = {
	STATUSES: {
		PENDING: 'Pending',
		CONFIRMED: 'Confirmed',
		CANCELED: 'Canceled',
		COMPLETED: 'Completed',
		ACTIVE: 'Active',
		MISSED: 'Missed',
	},
	ROOM_TYPES: {
		LARGE_SEMINAR: 'Large Seminar',
		SMALL_SEMINAR: 'Small Seminar',
		OPEN: 'Open',
		COMPUTER_LAB: 'Computer Lab',
		STUDY_ROOM: 'Study Room',
	},
	LIMITS: {
		MAX_WEEKLY_BOOKINGS: 4,
		CANCELLATION_WARN_THRESHOLD: 3,
		CANCELLATION_BLOCK_THRESHOLD: 5,
		BLOCK_DURATION_DAYS: 7,
		MAX_DURATION: 3,
		MIN_DURATION: 0,
	},
};

class BookingUtils {
	static getConstants() {
		return CONSTANTS;
	}

	static calculateDuration(startTime, endTime) {
		const [startHour, startMinute] = startTime.split(':').map(Number);
		const [endHour, endMinute] = endTime.split(':').map(Number);
		return (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
	}

	static validateTimeSlot(date, startTime, endTime) {
		const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
		if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
			return { valid: false, error: 'booking.errors.timeFormat' };
		}

		const [startHour] = startTime.split(':').map(Number);
		const [endHour] = endTime.split(':').map(Number);

		if (startHour < 8 || endHour > 22) {
			return { valid: false, error: 'booking.errors.outOfHours' };
		}

		// Ensure date is treated as local/timezone specific
		// Optimization: Simple string comparison for past dates works if format is YYYY-MM-DD
		const bookingDateTime = moment.tz(`${date}T${startTime}:00`, 'Asia/Jerusalem');
		const now = moment.tz('Asia/Jerusalem');

		if (bookingDateTime.isBefore(now)) {
			return { valid: false, error: 'booking.errors.pastDate' };
		}

		const thirtyMinutesFromNow = moment(now).add(30, 'minutes');
		if (bookingDateTime.isBefore(thirtyMinutesFromNow)) {
			return { valid: false, error: 'booking.errors.minAdvance' };
		}

		return { valid: true };
	}

	static async checkConflict(roomId, date, startTime, endTime, session) {
		// Overlap logic: (StartA < EndB) and (EndA > StartB)
		return await Booking.findOne({
			roomId,
			date,
			status: { $ne: CONSTANTS.STATUSES.CANCELED },
			startTime: { $lt: endTime },
			endTime: { $gt: startTime },
		}).session(session);
	}

	static async checkWeeklyLimit(userId, session) {
		const startOfWeek = moment().tz('Asia/Jerusalem').startOf('week').toDate();
		return await Booking.countDocuments({
			userId,
			createdAt: { $gte: startOfWeek },
			status: { $ne: CONSTANTS.STATUSES.CANCELED },
		}).session(session);
	}

	static async checkRoomTypeLimit(userId, roomType, session) {
		const limits = {
			[CONSTANTS.ROOM_TYPES.OPEN]: 3,
			[CONSTANTS.ROOM_TYPES.SMALL_SEMINAR]: 2,
			[CONSTANTS.ROOM_TYPES.LARGE_SEMINAR]: 1,
		};

		const limit = limits[roomType];
		if (limit === undefined) return { allowed: true };

		const startOfWeek = moment().tz('Asia/Jerusalem').startOf('week').toDate();
		const count = await Booking.countDocuments({
			userId,
			createdAt: { $gte: startOfWeek },
			status: { $ne: CONSTANTS.STATUSES.CANCELED },
			roomType: roomType,
		}).session(session);

		return { allowed: count < limit, type: roomType };
	}

	static async updateCancellationStats(userId, session) {
		const user = await User.findById(userId).session(session);
		const now = new Date();

		if (
			user.cancellationStats?.lastCancellation &&
			moment(now).diff(user.cancellationStats.lastCancellation, 'days') >
				CONSTANTS.LIMITS.BLOCK_DURATION_DAYS
		) {
			user.cancellationStats.countLast7Days = 0;
			user.cancellationStats.warnings = 0;
		}

		user.cancellationStats.countLast7Days = (user.cancellationStats.countLast7Days || 0) + 1;
		user.cancellationStats.lastCancellation = now;

		let action = null;
		let notificationData = {};

		if (user.cancellationStats.countLast7Days >= CONSTANTS.LIMITS.CANCELLATION_BLOCK_THRESHOLD) {
			user.cancellationStats.blockedUntil = moment()
				.add(CONSTANTS.LIMITS.BLOCK_DURATION_DAYS, 'days')
				.toDate();
			action = 'block';
		} else if (
			user.cancellationStats.countLast7Days >= CONSTANTS.LIMITS.CANCELLATION_WARN_THRESHOLD
		) {
			user.cancellationStats.warnings += 1;
			action = 'warn';
			notificationData.remaining =
				CONSTANTS.LIMITS.CANCELLATION_BLOCK_THRESHOLD - user.cancellationStats.countLast7Days;
		}

		await user.save({ session });
		return { action, notificationData };
	}

	static validateEmails(emails) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emails.filter((email) => !emailRegex.test(email));
	}
}

module.exports = BookingUtils;
