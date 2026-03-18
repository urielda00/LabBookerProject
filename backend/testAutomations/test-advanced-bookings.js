// npm install axios
const axios = require('axios');
require('dotenv').config();

// --- CONFIGURATION ---
const API_URL = `${process.env.BASE_BACKEND_URL}/api`;
const ADMIN_EMAIL = 'admin@example.com';

// Dynamic users for this test run
const TIMESTAMP = Date.now();
const USER_A = {
	username: `userA_${TIMESTAMP}`,
	name: 'User A',
	email: `usera_${TIMESTAMP}@test.com`,
};
const USER_B = {
	username: `userB_${TIMESTAMP}`,
	name: 'User B',
	email: `userb_${TIMESTAMP}@test.com`,
};

// --- REPORT CONTAINER ---
const report = {
	passed: 0,
	failed: 0,
	steps: [],
};

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

const getTomorrowDate = () => {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return d.toISOString().split('T')[0];
};

// --- AUTH HELPERS ---
async function registerAndLogin(userProfile) {
	try {
		// 1. Signup
		await axios.post(`${API_URL}/auth/signup`, userProfile);

		// 2. Get Code
		const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${userProfile.email}`);
		const code = codeRes.data.redisCode;
		if (!code) throw new Error('No debug code found for signup');

		// 3. Verify Signup
		const verifyRes = await axios.post(`${API_URL}/auth/verify-signup`, {
			email: userProfile.email,
			code: code,
		});

		return {
			token: verifyRes.data.accessToken,
			id: verifyRes.data.user.id || verifyRes.data.user._id,
		};
	} catch (error) {
		throw new Error(
			`Registration failed for ${userProfile.username}: ${
				error.response?.data?.message || error.message
			}`
		);
	}
}

async function loginAdmin() {
	try {
		await axios.post(`${API_URL}/auth/login`, { email: ADMIN_EMAIL });
		const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${ADMIN_EMAIL}`);
		const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, {
			email: ADMIN_EMAIL,
			code: codeRes.data.redisCode,
		});
		return verifyRes.data.accessToken;
	} catch (error) {
		throw new Error(`Admin login failed: ${error.message}`);
	}
}

// --- MAIN TEST ---
async function runTests() {
	console.log(`🚀 Starting Advanced Booking Automation (Admin & Transfers)...\n`);

	let adminToken = '';
	let tokenA = '';
	let idA = '';
	let tokenB = '';
	let idB = '';
	let targetRoomName = '';

	try {
		// PREP: Register Users
		try {
			adminToken = await loginAdmin();
			logStep('Setup', 'PASS', 'Admin Logged In');

			const dataA = await registerAndLogin(USER_A);
			tokenA = dataA.token;
			idA = dataA.id;
			logStep('Setup', 'PASS', `Registered User A: ${USER_A.username}`);

			const dataB = await registerAndLogin(USER_B);
			tokenB = dataB.token;
			idB = dataB.id;
			logStep('Setup', 'PASS', `Registered User B: ${USER_B.username}`);

			const roomRes = await axios.get(`${API_URL}/room/rooms`);
			if (roomRes.data.length === 0) throw new Error('No rooms in system');
			targetRoomName = roomRes.data[0].name;
			logStep('Setup', 'PASS', `Target Room: ${targetRoomName}`);
		} catch (e) {
			logStep('Setup', 'FAIL', e.message);
			throw e;
		}

		// =========================================================
		// PHASE 1: ADMIN BOOKING CONTROL
		// =========================================================
		console.log('\n--- Phase 1: Admin Booking Operations ---');
		let adminBookingId = '';

		// 1. Create Booking By Names (Admin)
		try {
			const payload = {
				username: USER_A.username,
				roomName: targetRoomName,
				date: getTomorrowDate(),
				startTime: '08:00',
				endTime: '09:00',
			};
			// FIX: Ensure correct path /book/ not /booking/
			const res = await axios.post(`${API_URL}/book/booking/create-by-names`, payload, {
				headers: { Authorization: `Bearer ${adminToken}` },
			});
			adminBookingId = res.data.booking._id;
			logStep('Admin Create', 'PASS', `Booking created for ${USER_A.username}`);
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Admin Create', 'FAIL', msg);
		}

		// 2. Update Status By Username (Admin)
		if (adminBookingId) {
			try {
				// FIX: Path /book/
				const res = await axios.patch(
					`${API_URL}/book/booking/${adminBookingId}/status/by-username?username=${USER_A.username}`,
					{ status: 'Missed' },
					{ headers: { Authorization: `Bearer ${adminToken}` } }
				);
				if (res.data.booking.status === 'Missed') {
					logStep('Admin Update Status', 'PASS', 'Status changed to Missed');
				} else {
					throw new Error('Status mismatch');
				}
			} catch (error) {
				logStep('Admin Update Status', 'FAIL', error.message);
			}

			// 3. Delete By Username (Admin)
			try {
				// FIX: Path /book/
				await axios.delete(
					`${API_URL}/book/booking/${adminBookingId}/by-username?username=${USER_A.username}`,
					{ headers: { Authorization: `Bearer ${adminToken}` } }
				);
				logStep('Admin Delete', 'PASS', 'Booking deleted by username');
			} catch (error) {
				logStep('Admin Delete', 'FAIL', error.message);
			}
		}

		// =========================================================
		// PHASE 2: TRANSFER REQUESTS
		// =========================================================
		console.log('\n--- Phase 2: Booking Transfer Flow (User A -> User B) ---');
		let transferBookingId = '';
		let transferRequestId = '';

		// 1. User A Creates a Booking
		try {
			const roomRes = await axios.get(`${API_URL}/room/rooms/${targetRoomName}`);
			const roomId = roomRes.data._id;

			const res = await axios.post(
				`${API_URL}/book/booking`,
				{
					roomId: roomId,
					userId: idA,
					date: getTomorrowDate(),
					startTime: '12:00',
					endTime: '13:00',
				},
				{ headers: { Authorization: `Bearer ${tokenA}` } }
			);

			transferBookingId = res.data.booking._id;
			logStep('User A Booking', 'PASS', 'Created booking for transfer');
		} catch (error) {
			logStep('User A Booking', 'FAIL', error.message);
			throw new Error('Cannot continue transfer test');
		}

		// 2. User A Initiates Transfer
		try {
			const res = await axios.post(
				`${API_URL}/book/${transferBookingId}/transfer-request`,
				{
					message: 'Take my slot please',
				},
				{ headers: { Authorization: `Bearer ${tokenA}` } }
			);

			transferRequestId = res.data.request._id;
			logStep('Initiate Transfer', 'PASS', `Request ID: ${transferRequestId}`);
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Initiate Transfer', 'FAIL', msg);
		}

		// 3. Verify Request is Pending
		try {
			const res = await axios.get(`${API_URL}/book/${transferBookingId}/transfer-requests`, {
				headers: { Authorization: `Bearer ${tokenA}` },
			});
			const found = res.data.requests.find((r) => r._id === transferRequestId);
			if (found && found.status === 'pending') {
				logStep('Verify Request', 'PASS', 'Transfer request visible and pending');
			} else {
				throw new Error('Request not found or not pending');
			}
		} catch (error) {
			logStep('Verify Request', 'FAIL', error.message);
		}

		// 4. User B Accepts Transfer
		try {
			const res = await axios.patch(
				`${API_URL}/book/transfer-requests/${transferRequestId}/accept`,
				{},
				{
					headers: { Authorization: `Bearer ${tokenB}` },
				}
			);

			// Check ownership
			if (res.data.booking.userId === idB) {
				logStep('Accept Transfer', 'PASS', 'Booking ownership transferred to User B');
			} else {
				throw new Error('Ownership did not change in response');
			}
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Accept Transfer', 'FAIL', msg);
		}

		// 5. Cleanup
		if (transferBookingId) {
			try {
				await axios.delete(`${API_URL}/book/booking/${transferBookingId}`, {
					headers: { Authorization: `Bearer ${tokenB}` },
				});
				logStep('Cleanup', 'PASS', 'Transferred booking deleted');
			} catch (e) {}
		}
	} catch (criticalError) {
		console.error(`\n⛔ CRITICAL ERROR: ${criticalError.message}`);
	} finally {
		console.log('\n========================================');
		console.log('         TEST REPORT SUMMARY            ');
		console.table(report.steps);
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
