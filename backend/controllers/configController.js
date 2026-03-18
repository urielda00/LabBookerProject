const { body } = require('express-validator');
const Config = require('../models/Config');
const asyncHandler = require('../middleware/asyncHandler');

// --- Validators ---

const validateConfigUpdate = [
	// Booking Settings
	body('booking.openDaysBefore')
		.optional()
		.isInt({ min: 0 })
		.withMessage('Open days before must be a positive integer'),
	body('booking.slotDurationHours')
		.optional()
		.isInt({ min: 1, max: 24 })
		.withMessage('Slot duration must be between 1 and 24 hours'),
	body('booking.maxBookingsPerWeek')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Max bookings per week must be at least 1'),
	body('booking.minBookingTimeBeforeHours')
		.optional()
		.isInt({ min: 0 })
		.withMessage('Min booking time before must be positive'),

	// Cancellation Settings
	body('cancellation.minCancellationTimeBeforeMinutes')
		.optional()
		.isInt({ min: 0 })
		.withMessage('Min cancellation time must be positive'),

	// Penalty Settings
	body('penalty.maxMissedBookingsPerMonth')
		.optional()
		.isInt({ min: 0 })
		.withMessage('Max missed bookings must be positive'),
	body('penalty.blockDurationWeeks')
		.optional()
		.isInt({ min: 0 })
		.withMessage('Block duration must be positive'),
];

// Controller Methods

// GET /api/settings/config
// Fetches the global configuration. Creates a default one if missing.
const getConfig = asyncHandler(async (req, res) => {
	let config = await Config.findOne();

	if (!config) {
		// Create default config if DB is empty (Self-healing)
		config = new Config();
		await config.save();
	}

	res.status(200).json(config);
});

// PUT /api/settings/config
// Updates the global configuration.
const updateConfig = asyncHandler(async (req, res) => {
	let config = await Config.findOne();

	if (!config) {
		config = new Config(req.body);
	} else {
        ['booking', 'cancellation', 'penalty'].forEach(section => {
            if (req.body[section]) {
                Object.entries(req.body[section]).forEach(([key, value]) => {
                    config.set(`${section}.${key}`, value);
                });
            }
        });
    }

	await config.save();
	res.status(200).json(config);
});

module.exports = {
	getConfig,
	updateConfig,
	validateConfigUpdate,
};
