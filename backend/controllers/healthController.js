const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const redisClient = require('../utils/redisClient');
const HealthCheck = require('../models/HealthCheck');
const asyncHandler = require('../middleware/asyncHandler');

// --- Helpers ---

const checkDatabase = async () => {
	const start = Date.now();
	try {
		const [pingResult] = await Promise.all([
			mongoose.connection.db.admin().ping(),
			// Validate query capability
			mongoose.connection.db.collection('healthchecks').findOne(),
		]);
		return {
			status: pingResult?.ok === 1 ? 'operational' : 'degraded',
			latency: Date.now() - start,
		};
	} catch (error) {
		return { status: 'outage', error: error.message, latency: Date.now() - start };
	}
};

const checkRedis = async () => {
	const start = Date.now();
	try {
		const { success, latency, error } = await redisClient.ping();
		return success ? { status: 'operational', latency } : { status: 'outage', error, latency };
	} catch (error) {
		return { status: 'outage', error: error.message, latency: Date.now() - start };
	}
};

const checkCloudinary = async () => {
	const start = Date.now();
	try {
		await cloudinary.api.ping();
		return { status: 'operational', latency: Date.now() - start };
	} catch (error) {
		return { status: 'outage', error: error.message, latency: Date.now() - start };
	}
};

const getSystemHealthInternal = async () => {
	try {
		const [dbStatus, redisStatus, cloudinaryStatus] = await Promise.all([
			checkDatabase(),
			checkRedis(),
			checkCloudinary(),
		]);

		const services = {
			database: dbStatus,
			redis: redisStatus,
			cloudinary: cloudinaryStatus,
		};

		const serviceValues = Object.values(services);
		const operationalCount = serviceValues.filter((s) => s.status === 'operational').length;

		let status = 'outage';
		if (operationalCount === serviceValues.length) status = 'operational';
		else if (operationalCount > 0) status = 'degraded';

		return {
			status,
			services,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: 'outage',
			services: {},
			timestamp: new Date().toISOString(),
			error: error.message,
		};
	}
};

const calculateDailyBreakdown = (checks) => {
	const dailyData = {};
	checks.forEach((check) => {
		const date = check.timestamp.toISOString().split('T')[0];
		dailyData[date] = dailyData[date] || { operational: 0, total: 0 };
		dailyData[date].total++;
		if (check.status === 'operational') dailyData[date].operational++;
	});

	return Object.entries(dailyData).map(([date, data]) => ({
		date,
		uptime: data.total > 0 ? ((data.operational / data.total) * 100).toFixed(2) : 0,
	}));
};

// --- Controller Methods ---

const getSystemHealth = asyncHandler(async (req, res) => {
	const healthData = await getSystemHealthInternal();

	// If critical DB failure, return 503 but keep JSON format
	if (healthData.status === 'outage' && !healthData.services.database) {
		return res.status(503).json(healthData);
	}

	res.json({
		...healthData,
		uptime: process.uptime(),
		version: process.env.npm_package_version,
	});
});

const getHistoricalStatus = asyncHandler(async (req, res) => {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const historicalData = await HealthCheck.find({
		timestamp: { $gte: thirtyDaysAgo },
	}).sort({ timestamp: -1 });

	const totalChecks = historicalData.length;
	const operationalChecks = historicalData.filter((c) => c.status === 'operational').length;
	const incidents = historicalData.filter((c) => c.status !== 'operational');

	res.json({
		uptime30d:
			totalChecks > 0 ? `${((operationalChecks / totalChecks) * 100).toFixed(2)}%` : 'No data',
		lastIncident: incidents.length > 0 ? incidents[incidents.length - 1].timestamp : null,
		incidentsLastMonth: incidents.length,
		dailyBreakdown: calculateDailyBreakdown(historicalData),
		history: historicalData,
	});
});

// Internal task (No req/res)
const logStatus = async () => {
	try {
		const { status, services, timestamp } = await getSystemHealthInternal();
		await HealthCheck.create({ status, services, timestamp });
		console.log(`[HEALTH] Status logged: ${status}`);
	} catch (error) {
		console.error('[HEALTH] Failed to log status:', error);
	}
};

module.exports = {
	getSystemHealth,
	getHistoricalStatus,
	logStatus,
};
