const User = require('../models/User');
const Booking = require('../models/Booking');
const moment = require('moment');
const asyncHandler = require('../middleware/asyncHandler'); //

// --- Helper Functions (Internal) ---

const calculateGrowth = (current, previous) => {
	if (previous === 0) return current === 0 ? 0 : 100;
	return (((current - previous) / previous) * 100).toFixed(1);
};

// Returns growth stats safely (returns 0s on error instead of throwing)
const getGrowthStats = async () => {
	try {
		const currentMonthStart = moment().startOf('month');
		const prevMonthStart = moment().subtract(1, 'month').startOf('month');

		// Fetch counts in parallel
		const [currentUsers, previousUsers, currentBookings, previousBookings] = await Promise.all([
			User.countDocuments({
				createdAt: { $gte: currentMonthStart.toDate(), $lt: moment().endOf('month').toDate() },
			}),
			User.countDocuments({
				createdAt: {
					$gte: prevMonthStart.toDate(),
					$lt: moment(prevMonthStart).endOf('month').toDate(),
				},
			}),
			Booking.countDocuments({
				createdAt: { $gte: currentMonthStart.toDate(), $lt: moment().endOf('month').toDate() },
				status: { $ne: 'Canceled' },
			}),
			Booking.countDocuments({
				createdAt: {
					$gte: prevMonthStart.toDate(),
					$lt: moment(prevMonthStart).endOf('month').toDate(),
				},
				status: { $ne: 'Canceled' },
			}),
		]);

		return {
			userGrowth: calculateGrowth(currentUsers, previousUsers),
			bookingGrowth: calculateGrowth(currentBookings, previousBookings),
			currentMonth: currentMonthStart.format('MMMM YYYY'),
			previousMonth: prevMonthStart.format('MMMM YYYY'),
		};
	} catch (error) {
		console.error('Growth stats calculation error:', error);
		// Return default values so the dashboard still loads partial data
		return {
			userGrowth: 0,
			bookingGrowth: 0,
			error: 'Failed to calculate growth statistics',
		};
	}
};

// Shared logic to fetch core dashboard data
const fetchDashboardData = async () => {
	const [totalUsers, recentUsers, usersByRole, growthStats] = await Promise.all([
		User.countDocuments(),
		User.find()
			.select('username email name profilePicture role createdAt')
			.sort({ createdAt: -1 })
			.limit(5),
		User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
		getGrowthStats(),
	]);

	return {
		totalUsers,
		recentUsers,
		usersByRole,
		growthStats,
		lastUpdated: new Date(),
	};
};

// --- Main Controller Handler ---

const getDashboardStats = asyncHandler(async (req, res) => {
	const { role } = req.user;
	let stats;
	let message;

	// Currently Admin and Manager share the same data logic,
	// but we keep the structure ready for future divergence.
	if (role === 'admin') {
		stats = await fetchDashboardData();
		message = 'Admin dashboard stats retrieved successfully';
	} else if (role === 'manager') {
		stats = await fetchDashboardData();
		message = 'Manager dashboard stats retrieved successfully';
	} else {
		// Fallback security check (though middleware should catch this)
		return res.status(403).json({
			success: false,
			message: "You don't have permission to access the dashboard",
		});
	}

	res.status(200).json({
		success: true,
		message,
		stats,
	});
});

module.exports = {
	getDashboardStats,
};
