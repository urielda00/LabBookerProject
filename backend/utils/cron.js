const cron = require('node-cron');
const mongoose = require('mongoose');
const bookingController = require('../controllers/bookingController');
const healthController = require('../controllers/healthController');
const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const moment = require('moment-timezone');

// Configure with your timezone
const TIMEZONE = 'Asia/Jerusalem';

// Helper to check DB connection
const isDbConnected = () => {
	if (mongoose.connection.readyState === 1) {
		return true;
	}
	// Optional: Uncomment next line if you want to see logs when jobs are skipped
	// console.log('[CRON] Skipping job - DB not connected');
	return false;
};

// 1. Update Past Bookings - Run at the start of every minute
cron.schedule(
	'0 * * * * *',
	async () => {
		if (!isDbConnected()) return;

		try {
			const startTime = moment().tz(TIMEZONE);
			console.log(`\n--- Starting cron job at ${startTime.format('YYYY-MM-DD HH:mm:ss')} ---`);

			const result = await bookingController.updatePastBookingsCron();

			const endTime = moment().tz(TIMEZONE);
			const duration = endTime.diff(startTime, 'seconds');

			console.log(`Result: ${result.message}`);
			console.log(`--- Completed in ${duration} seconds ---\n`);
		} catch (error) {
			console.error('Cron job failed:', error);
			console.log('--- Cron job failed ---\n');
		}
	},
	{
		scheduled: true,
		timezone: TIMEZONE,
	}
);

// 2. Cancellation Stats Reset - Run daily at midnight
cron.schedule(
	'0 0 * * *',
	async () => {
		if (!isDbConnected()) return;

		const startTime = moment().tz(TIMEZONE);
		console.log(
			`\n[CRON] Starting cancellation stats reset at ${startTime.format('YYYY-MM-DD HH:mm:ss')}`
		);

		const session = await mongoose.startSession();
		try {
			await session.withTransaction(async () => {
				const sevenDaysAgo = moment().subtract(7, 'days').toDate();

				const result = await User.updateMany(
					{
						'cancellationStats.lastCancellation': { $lt: sevenDaysAgo },
					},
					{
						$set: {
							'cancellationStats.countLast7Days': 0,
							'cancellationStats.warnings': 0,
						},
					}
				).session(session);

				console.log(`[CRON] Reset cancellation stats for ${result.modifiedCount} users`);
			});
		} catch (error) {
			console.error('[CRON] Cancellation stats reset failed:', error);
		} finally {
			session.endSession();
		}

		const duration = moment().tz(TIMEZONE).diff(startTime, 'seconds');
		console.log(`[CRON] Cancellation stats reset completed in ${duration}s`);
	},
	{
		scheduled: true,
		timezone: TIMEZONE,
	}
);

// 3. Health Check Logging - Run every hour
cron.schedule(
	'0 * * * *',
	async () => {
		if (!isDbConnected()) return;

		const startTime = moment().tz(TIMEZONE);
		console.log(`\n[CRON] Starting health check at ${startTime.format('YYYY-MM-DD HH:mm:ss')}`);

		try {
			await healthController.logStatus();
			const duration = moment().tz(TIMEZONE).diff(startTime, 'seconds');
			console.log(`[CRON] Health check logged in ${duration}s`);
		} catch (error) {
			console.error('[CRON] Health check logging failed:', error);
		}
	},
	{
		scheduled: true,
		timezone: TIMEZONE,
	}
);

// 4. Transfer Requests Cleanup Logic
async function cleanupTransferRequests() {
	// Guard clause for manual calls as well
	if (!isDbConnected()) return;

	const startTime = moment().tz(TIMEZONE);
	console.log(
		`\n[CRON] Starting transfer request cleanup at ${startTime.format('YYYY-MM-DD HH:mm:ss')}`
	);

	try {
		// Find orphaned transfer requests (requests for bookings that no longer exist)
		const orphanedRequests = await TransferRequest.aggregate([
			{
				$lookup: {
					from: 'bookings',
					localField: 'booking',
					foreignField: '_id',
					as: 'bookingExists',
				},
			},
			{
				$match: {
					bookingExists: { $size: 0 }, // Bookings that don't exist
				},
			},
		]);

		// Delete orphaned requests
		if (orphanedRequests.length > 0) {
			const orphanedRequestIds = orphanedRequests.map((req) => req._id);
			const deleteResult = await TransferRequest.deleteMany({
				_id: { $in: orphanedRequestIds },
			});
			console.log(`Deleted ${deleteResult.deletedCount} orphaned transfer requests`);
		}

		// Remove old transfer requests (older than 7 days)
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const oldRequestsResult = await TransferRequest.deleteMany({
			createdAt: { $lt: sevenDaysAgo },
		});

		console.log(`Deleted ${oldRequestsResult.deletedCount} old transfer requests`);

		const duration = moment().tz(TIMEZONE).diff(startTime, 'seconds');
		console.log(`[CRON] Transfer request cleanup completed in ${duration}s`);
	} catch (error) {
		console.error('[CRON] Transfer request cleanup failed:', error);
	}
}

// Schedule Cleanup - Runs daily at midnight (00:00)
cron.schedule(
	'0 0 * * *',
	async () => {
		if (!isDbConnected()) return;
		await cleanupTransferRequests();
	},
	{
		scheduled: true,
		timezone: TIMEZONE,
	}
);

// Run cleanup once on startup if DB is connected, or wait for connection
if (mongoose.connection.readyState === 1) {
	cleanupTransferRequests();
} else {
	mongoose.connection.once('open', cleanupTransferRequests);
}

console.log(`Cron job scheduler started for timezone: ${TIMEZONE}`);

module.exports = {
	cleanupTransferRequests,
};
