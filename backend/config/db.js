const mongoose = require('mongoose');

const connectDB = async () => {
	const maxRetries = 5;
	let retries = 0;

	while (retries < maxRetries) {
		try {
			await mongoose.connect(process.env.MONGO_URI);
			console.log('MongoDB Connected Successfully!');

			// --- TTL Indexes Setup ---
			// We keep this here to ensure indexes are created only after a successful connection
			try {
				// Booking TTL (7 Days)
				const Booking = require('../models/Booking');
				try {
					await Booking.collection.dropIndex('deletedAt_1');
				} catch (e) {}
				await Booking.collection.createIndex(
					{ deletedAt: 1 },
					{ expireAfterSeconds: 7 * 24 * 60 * 60 }
				);

				// Notification TTL (3 Days)
				const Notification = require('../models/Notification');
				try {
					await Notification.collection.dropIndex('readAt_1');
				} catch (e) {}
				await Notification.collection.createIndex(
					{ readAt: 1 },
					{ expireAfterSeconds: 3 * 24 * 60 * 60 }
				);

				// TransferRequest TTL (7 Days)
				const TransferRequest = require('../models/TransferRequest');
				try {
					await TransferRequest.collection.dropIndex('createdAt_1');
				} catch (e) {}
				await TransferRequest.collection.createIndex(
					{ createdAt: 1 },
					{ expireAfterSeconds: 7 * 24 * 60 * 60 }
				);

				// HealthCheck TTL (30 Days)
				const HealthCheck = require('../models/HealthCheck');
				try {
					await HealthCheck.collection.dropIndex('timestamp_1');
				} catch (e) {}
				await HealthCheck.collection.createIndex(
					{ timestamp: 1 },
					{ expireAfterSeconds: 30 * 24 * 60 * 60 }
				);

				console.log('All TTL indexes validated.');
			} catch (error) {
				if(process.env.NODE_ENV !== 'production') {
				console.error('Error setting up TTL indexes:', error);
				}else{
					console.error('Error setting up TTL indexes', error.message);
				}
			}

			return; // Success - exit the function
		} catch (err) {
			retries++;
			console.error(`MongoDB Connection Failed (Attempt ${retries}/${maxRetries}):`, err.message);

			if (retries === maxRetries) {
				console.error('Critical Error: Could not connect to MongoDB after multiple attempts.');
				process.exit(1);
			}

			console.log('Retrying in 5 seconds...');
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
};

module.exports = connectDB;
