// npm install axios
const axios = require('axios');
require('dotenv').config();

// --- CONFIGURATION ---
const API_URL = `${process.env.BASE_BACKEND_URL}/api`;
const ADMIN_USER = { email: 'admin@example.com' };

// --- REPORT CONTAINER ---
const report = { passed: 0, failed: 0, steps: [] };

// --- HELPERS ---
const logStep = (stepName, status, message = '') => {
	const symbol = status === 'PASS' ? '✅' : '❌';
	const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';
	console.log(`${color}${symbol} [${stepName}]${reset} ${message}`);
	report.steps.push({ stepName, status, message });
	if (status === 'PASS') report.passed++;
	else report.failed++;
};

async function getAdminToken() {
	try {
		await axios.post(`${API_URL}/auth/login`, { email: ADMIN_USER.email });
		const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${ADMIN_USER.email}`);
		const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, {
			email: ADMIN_USER.email,
			code: codeRes.data.redisCode,
		});
		return verifyRes.data.accessToken;
	} catch (error) {
		throw new Error(`Auth Failed: ${error.message}`);
	}
}

// --- MAIN TEST ---
async function runTests() {
	console.log(`🚀 Starting Communication & Dashboard Test...\n`);
	let token = '';

	try {
		token = await getAdminToken();
		const authHeaders = { Authorization: `Bearer ${token}` };
		logStep('Setup', 'PASS', 'Admin token acquired');

		// ---------------------------------------------------------
		// 1. Dashboard Controller
		// ---------------------------------------------------------
		console.log('\n--- Dashboard Stats ---');
		try {
			const res = await axios.get(`${API_URL}/dashboard/stats`, { headers: authHeaders });
			if (res.data.success && res.data.stats) {
				const s = res.data.stats;
				logStep(
					'Get Stats',
					'PASS',
					`Users: ${s.totalUsers}, Growth: ${s.growthStats?.userGrowth}%`
				);
			} else {
				throw new Error('Invalid dashboard response structure');
			}
		} catch (e) {
			logStep('Dashboard', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 2. Message Controller (Chat)
		// ---------------------------------------------------------
		console.log('\n--- Messaging (Chat) ---');
		try {
			// Update Settings
			await axios.post(`${API_URL}/message/settings`, { enabled: true }, { headers: authHeaders });
			logStep('Chat Settings', 'PASS', 'Chat enabled by admin');

			// Send Message
			const msgRes = await axios.post(
				`${API_URL}/message/send`,
				{
					content: 'Automated Test Message',
					channel: 'general',
				},
				{ headers: authHeaders }
			);

			if (msgRes.status === 201) logStep('Send Message', 'PASS', 'Message sent');

			// Get Messages
			const getRes = await axios.get(`${API_URL}/message?channel=general&limit=5`, {
				headers: authHeaders,
			});
			if (getRes.data.messages && getRes.data.messages.length > 0) {
				logStep('Get Messages', 'PASS', `Retrieved ${getRes.data.messages.length} messages`);
			}

			// Mark Read
			await axios.post(
				`${API_URL}/message/mark-read`,
				{ channel: 'general' },
				{ headers: authHeaders }
			);
			logStep('Mark Read', 'PASS', 'Channel marked as read');
		} catch (e) {
			logStep('Messaging', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 3. Notifications Controller
		// ---------------------------------------------------------
		console.log('\n--- Notifications ---');
		try {
			// 1. Fetch
			const res = await axios.get(`${API_URL}/notifications`, { headers: authHeaders });
			const notifs = res.data;
			logStep('Fetch Notifs', 'PASS', `Found ${notifs.length} notifications`);

			if (notifs.length > 0) {
				const targetId = notifs[0].id; // Use 'id' from mapped DTO in controller

				// 2. Mark Single Read
				await axios.put(`${API_URL}/notifications/${targetId}/read`, {}, { headers: authHeaders });
				logStep('Mark One Read', 'PASS', `Notification ${targetId} marked read`);

				// 3. Mark All Read
				await axios.put(`${API_URL}/notifications/read-all`, {}, { headers: authHeaders });
				logStep('Mark All Read', 'PASS', 'Batch update successful');

				// 4. Delete One
				await axios.delete(`${API_URL}/notifications/${targetId}`, { headers: authHeaders });
				logStep('Delete One', 'PASS', 'Single notification deleted');
			}

			// 5. Clear All (Cleanup)
			await axios.delete(`${API_URL}/notifications/clear-all`, { headers: authHeaders });
			logStep('Clear All', 'PASS', 'All notifications cleared');
		} catch (e) {
			logStep('Notifications', 'FAIL', e.message);
		}
	} catch (criticalError) {
		console.error(`\n⛔ CRITICAL ERROR: ${criticalError.message}`);
	} finally {
		console.log('\n========================================');
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
