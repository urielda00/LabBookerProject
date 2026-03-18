/*
require: 
student@example.com - as user in system
// npm install axios  // before using this automation
*/

const axios = require('axios');
require('dotenv').config();

// --- CONFIGURATION ---
const BASE_URL = `${process.env.BASE_BACKEND_URL}/api`;
const TEST_USER = { email: 'student@example.com' }; // Using student account to ensure fresh state
const HEADERS = { 'Content-Type': 'application/json' };

// Optional: Set a manual ID if auto-detection fails
const MANUAL_ROOM_ID = '';

// --- REPORT CONTAINER ---
const report = {
	passed: 0,
	failed: 0,
	steps: [],
};

// --- HELPERS ---
const logStep = (stepName, status, message = '') => {
	const symbol = status === 'PASS' ? '✅' : '❌';
	console.log(`${symbol} [${stepName}] ${message}`);
	report.steps.push({ stepName, status, message });
	if (status === 'PASS') report.passed++;
	else report.failed++;
};

const getTomorrowDate = () => {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return tomorrow.toISOString().split('T')[0];
};

async function runTests() {
	console.log(`🚀 Starting End-to-End Automation Test (User: ${TEST_USER.email})...\n`);
	let token = '';
	let userId = '';
	let roomId = '';
	let bookingId = '';

	try {
		// --- STEP 1: Login Request ---
		try {
			await axios.post(`${BASE_URL}/auth/login`, { email: TEST_USER.email });
			logStep('Login Request', 'PASS', 'Verification code sent');
		} catch (error) {
			logStep('Login Request', 'FAIL', error.message);
			throw new Error('Stopping: Login failed');
		}

		// --- STEP 2: Fetch Verification Code ---
		let verificationCode = '';
		try {
			const res = await axios.get(`${BASE_URL}/auth/debug-verification/${TEST_USER.email}`);
			verificationCode = res.data.redisCode;
			if (!verificationCode) throw new Error('No code received');
			logStep('Get Debug Code', 'PASS', `Code: ${verificationCode}`);
		} catch (error) {
			logStep('Get Debug Code', 'FAIL', error.message);
			throw new Error('Stopping: No code');
		}

		// --- STEP 3: Verify & Get Token ---
		try {
			const res = await axios.post(`${BASE_URL}/auth/verify-login`, {
				email: TEST_USER.email,
				code: verificationCode,
			});
			token = res.data.accessToken;
			userId = res.data.user?.id || res.data.user?._id;

			HEADERS['Authorization'] = `Bearer ${token}`;
			logStep('Verify Login', 'PASS', `Authenticated as User ID: ${userId}`);
		} catch (error) {
			logStep('Verify Login', 'FAIL', error.message);
			throw new Error('Stopping: Auth failed');
		}

		// --- STEP 3.5: CLEANUP OLD BOOKINGS ---
		try {
			const res = await axios.get(`${BASE_URL}/book/my-bookings`, { headers: HEADERS });
			const myBookings = res.data.bookings || res.data.result?.bookings || [];

			const activeBookings = myBookings.filter((b) =>
				['Pending', 'Confirmed', 'Active'].includes(b.status)
			);

			if (activeBookings.length > 0) {
				console.log(`   🧹 Found ${activeBookings.length} existing bookings. Cleaning up...`);

				for (const b of activeBookings) {
					if (b.status === 'Active') {
						// Complete active bookings instead of deleting to avoid 403 errors
						console.log(`      Completing Active booking ${b._id}...`);
						await axios.patch(
							`${BASE_URL}/book/booking/${b._id}/status`,
							{ status: 'Completed' },
							{ headers: HEADERS }
						);
					} else {
						console.log(`      Deleting booking ${b._id}...`);
						await axios.delete(`${BASE_URL}/book/booking/${b._id}`, { headers: HEADERS });
					}
				}
				logStep('Cleanup Old Bookings', 'PASS', `Processed ${activeBookings.length} old bookings`);
			} else {
				logStep('Cleanup Old Bookings', 'PASS', 'No conflicting bookings found');
			}
		} catch (error) {
			logStep('Cleanup Old Bookings', 'FAIL', `Warning: Cleanup failed - ${error.message}`);
		}

		// --- STEP 4: Fetch Room ID ---
		try {
			if (MANUAL_ROOM_ID) {
				roomId = MANUAL_ROOM_ID;
				logStep('Fetch Room', 'PASS', `Using Manual ID: ${roomId}`);
			} else {
				try {
					const res = await axios.get(`${BASE_URL}/room`, { headers: HEADERS });
					// Handle various response structures
					const rooms = Array.isArray(res.data)
						? res.data
						: res.data.rooms || res.data.result?.rooms;

					if (Array.isArray(rooms) && rooms.length > 0) {
						// Prefer rooms that are not 'Large Seminar' to avoid approval workflow limits
						const validRoom = rooms.find((r) => r.type !== 'Large Seminar') || rooms[0];
						roomId = validRoom._id;
						logStep(
							'Fetch Room',
							'PASS',
							`Auto-detected Room: ${validRoom.name} (${validRoom.type})`
						);
					} else {
						throw new Error('No rooms found in API response');
					}
				} catch (apiError) {
					console.log('   (Direct room fetch failed, trying weekly view fallback...)');
					const resWeekly = await axios.get(`${BASE_URL}/book/weekly`, { headers: HEADERS });
					const bookings = resWeekly.data.bookings || resWeekly.data.result?.bookings;

					if (bookings && bookings.length > 0) {
						roomId = bookings[0].roomId._id || bookings[0].roomId;
						logStep('Fetch Room', 'PASS', `Found room via existing booking: ${roomId}`);
					} else {
						throw new Error('Could not auto-detect room. Please set MANUAL_ROOM_ID.');
					}
				}
			}
		} catch (error) {
			logStep('Fetch Room', 'FAIL', error.message);
			throw new Error('Stopping: No Room ID available');
		}

		// --- STEP 5: Create Booking ---
		try {
			const payload = {
				roomId: roomId,
				userId: userId,
				date: getTomorrowDate(),
				startTime: '10:00',
				endTime: '11:00',
				additionalUsers: [],
			};

			const res = await axios.post(`${BASE_URL}/book/booking`, payload, { headers: HEADERS });

			// Check multiple locations for the booking object
			const createdBooking = res.data.booking || res.data.result?.booking;
			if (!createdBooking) throw new Error('Booking created but response structure is unexpected');

			bookingId = createdBooking._id;
			logStep('Create Booking', 'PASS', `Created Booking ID: ${bookingId}`);
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			const key = error.response?.data?.key || '';
			logStep('Create Booking', 'FAIL', `${msg} (${key})`);
			throw new Error('Stopping: Creation failed');
		}

		// --- STEP 6: Verify in My Bookings ---
		try {
			const res = await axios.get(`${BASE_URL}/book/my-bookings`, { headers: HEADERS });
			const myBookings = res.data.bookings || res.data.result?.bookings || [];
			const found = myBookings.find((b) => b._id === bookingId);
			if (found) {
				logStep('Check My Bookings', 'PASS', 'Booking appears in list');
			} else {
				throw new Error('Booking ID not found in user list');
			}
		} catch (error) {
			logStep('Check My Bookings', 'FAIL', error.message);
		}

		// --- STEP 7: Check-in (Expect Failure - Too Early) ---
		try {
			await axios.post(`${BASE_URL}/book/booking/${bookingId}/check-in`, {}, { headers: HEADERS });
			logStep('Check-in Logic', 'FAIL', 'Check-in succeeded but should have failed (Too Early)');
		} catch (error) {
			if (error.response && error.response.status === 400) {
				logStep(
					'Check-in Logic',
					'PASS',
					`Correctly rejected: ${error.response.data.message || error.response.data.key}`
				);
			} else {
				logStep('Check-in Logic', 'FAIL', `Unexpected error code: ${error.response?.status}`);
			}
		}

		// --- STEP 8: Cleanup (Delete) ---
		try {
			await axios.delete(`${BASE_URL}/book/booking/${bookingId}`, { headers: HEADERS });
			logStep('Delete Booking', 'PASS', 'Cleaned up successfully');
		} catch (error) {
			logStep('Delete Booking', 'FAIL', error.message);
		}
	} catch (criticalError) {
		console.error(`\n⛔ ${criticalError.message}`);
	} finally {
		console.log('\n========================================');
		console.log('         TEST REPORT SUMMARY            ');
		console.table(report.steps);
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
