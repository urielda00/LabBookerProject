const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const authenticate = require('../middleware/authMiddleware'); //
const roleMiddleware = require('../middleware/roleMiddleware'); //

router.get(
	'/stats',
	authenticate.requireAuth,
	roleMiddleware.checkRole(['admin', 'manager']),
	getDashboardStats
);

module.exports = router;
