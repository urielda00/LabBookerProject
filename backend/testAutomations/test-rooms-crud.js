/*
require: 
admin@example.com  - as admin in system
cloudinary valid API  - here we don't have one valid.
//npm install axios form-data
// npm install axios form-data
 */
require('dotenv').config();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const API_URL = `${process.env.BASE_BACKEND_URL}/api`;
const BASE_ROOM_URL = `${API_URL}/room`;
const TEST_IMAGE_PATH = path.join(__dirname, 'temp-test-image.jpg');

// Admin credentials (required for Room operations)
const ADMIN_USER = { email: 'admin@example.com' };

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

// Create a dummy image for testing
const createDummyImage = () => {
	const buffer = Buffer.from(
		'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
		'base64'
	);
	fs.writeFileSync(TEST_IMAGE_PATH, buffer);
};

// --- MAIN TEST FUNCTION ---
async function runTests() {
	console.log(`🚀 Starting Admin Rooms Automation Test (User: ${ADMIN_USER.email})...\n`);

	// Setup
	createDummyImage();
	const timestamp = Date.now();
	const roomName = `AutoTest_Room_${timestamp}`;

	let createdRoomId = '';
	let authToken = ''; // We will store the Bearer token here

	try {
		// =========================================================
		// PHASE 1: AUTHENTICATION (Login as Admin)
		// =========================================================
		try {
			// 1. Request Login
			await axios.post(`${API_URL}/auth/login`, { email: ADMIN_USER.email });
			logStep('Auth: Login Request', 'PASS', 'Verification code sent');

			// 2. Get Verification Code (Debug Route)
			const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${ADMIN_USER.email}`);
			const verificationCode = codeRes.data.redisCode;
			if (!verificationCode) throw new Error('Could not retrieve debug code');

			// 3. Verify & Get Token
			const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, {
				email: ADMIN_USER.email,
				code: verificationCode,
			});

			authToken = verifyRes.data.accessToken;
			const userRole = verifyRes.data.user.role;

			if (userRole !== 'admin') {
				throw new Error(`User is '${userRole}', but 'admin' is required for these tests.`);
			}

			logStep('Auth: Verify & Token', 'PASS', `Logged in as Admin. Token received.`);
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Authentication', 'FAIL', msg);
			throw new Error('Stopping: Authentication failed');
		}

		// Prepare headers helper
		const getAuthHeaders = () => ({
			Authorization: `Bearer ${authToken}`,
		});

		// =========================================================
		// PHASE 2: ROOM CRUD OPERATIONS
		// =========================================================

		// ---------------------------------------------------------
		// STEP 1: Create Room (POST /rooms)
		// ---------------------------------------------------------
		try {
			const form = new FormData();
			form.append('name', roomName);
			form.append('type', 'Meeting Room');
			form.append('capacity', '10');
			form.append('description', 'Automated test room description');
			form.append(
				'amenities',
				JSON.stringify([
					{ name: 'Wifi', icon: 'wifi' },
					{ name: 'Projector', icon: 'tv' },
				])
			);
			form.append('image', fs.createReadStream(TEST_IMAGE_PATH));

			// Merge Auth headers with FormData headers
			const headers = {
				...getAuthHeaders(),
				...form.getHeaders(),
			};

			const res = await axios.post(`${BASE_ROOM_URL}/rooms`, form, { headers });

			if (res.status === 201 && res.data.room) {
				createdRoomId = res.data.room._id;
				logStep('Create Room', 'PASS', `Created ID: ${createdRoomId} | Name: ${roomName}`);
			} else {
				throw new Error('Status was not 201 or missing room data');
			}
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Create Room', 'FAIL', msg);
			throw new Error('Stopping: Creation failed');
		}

		// ---------------------------------------------------------
		// STEP 2: Get All Rooms (GET /rooms)
		// ---------------------------------------------------------
		try {
			// Even public routes might need auth or we just test access
			const res = await axios.get(`${BASE_ROOM_URL}/rooms`, { headers: getAuthHeaders() });
			const rooms = res.data;
			const found = rooms.find((r) => r._id === createdRoomId);

			if (found) {
				logStep('Get All Rooms', 'PASS', `Found the new room in the list`);
			} else {
				throw new Error('New room not found in the list');
			}
		} catch (error) {
			logStep('Get All Rooms', 'FAIL', error.message);
		}

		// ---------------------------------------------------------
		// STEP 3: Get Room By Name (GET /rooms/:name)
		// ---------------------------------------------------------
		try {
			const res = await axios.get(`${BASE_ROOM_URL}/rooms/${roomName}`, {
				headers: getAuthHeaders(),
			});
			if (res.data.name === roomName && res.data.amenities.length === 2) {
				logStep('Get By Name', 'PASS', `Details fetched correctly`);
			} else {
				throw new Error('Details mismatch');
			}
		} catch (error) {
			logStep('Get By Name', 'FAIL', error.message);
		}

		// ---------------------------------------------------------
		// STEP 4: Update Room (PUT /rooms/:name)
		// ---------------------------------------------------------
		try {
			const updateForm = new FormData();
			updateForm.append('originalName', roomName);
			updateForm.append('capacity', '50');
			updateForm.append('description', 'Updated via Automation');

			const headers = {
				...getAuthHeaders(),
				...updateForm.getHeaders(),
			};

			const res = await axios.put(`${BASE_ROOM_URL}/rooms/${roomName}`, updateForm, { headers });

			if (res.status === 200 && res.data.room.capacity === 50) {
				logStep('Update Room', 'PASS', `Capacity updated to 50`);
			} else {
				throw new Error('Update failed or capacity not changed');
			}
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Update Room', 'FAIL', msg);
		}

		// ---------------------------------------------------------
		// STEP 5: Check Availability Logic (GET /monthly-availability)
		// ---------------------------------------------------------
		try {
			const res = await axios.get(`${BASE_ROOM_URL}/rooms/${createdRoomId}/monthly-availability`, {
				headers: getAuthHeaders(),
			});
			const availability = res.data.availability;

			if (Array.isArray(availability) && availability.length === 7) {
				const hasWeekend = availability.some((day) => {
					const d = new Date(day.date);
					return d.getDay() === 5 || d.getDay() === 6;
				});

				if (!hasWeekend) {
					logStep('Check Logic', 'PASS', `7 Days returned, Weekends excluded correctly`);
				} else {
					logStep('Check Logic', 'FAIL', `Found Friday/Saturday in availability slots!`);
				}
			} else {
				throw new Error('Invalid availability structure');
			}
		} catch (error) {
			logStep('Check Logic', 'FAIL', error.message);
		}

		// ---------------------------------------------------------
		// STEP 6: Negative Test (Invalid Input)
		// ---------------------------------------------------------
		try {
			const badForm = new FormData();
			badForm.append('type', 'Just Type');

			const headers = {
				...getAuthHeaders(),
				...badForm.getHeaders(),
			};

			await axios.post(`${BASE_ROOM_URL}/rooms`, badForm, { headers });
			logStep('Negative Test', 'FAIL', 'Server accepted invalid data (Expected 400)');
		} catch (error) {
			if (error.response && error.response.status === 400) {
				logStep(
					'Negative Test',
					'PASS',
					`Server rejected invalid data correctly (${error.response.status})`
				);
			} else {
				logStep('Negative Test', 'FAIL', `Unexpected status code: ${error.response?.status}`);
			}
		}

		// ---------------------------------------------------------
		// STEP 7: Delete Room (DELETE /rooms/:name)
		// ---------------------------------------------------------
		try {
			const res = await axios.delete(`${BASE_ROOM_URL}/rooms/${roomName}`, {
				headers: getAuthHeaders(),
			});
			if (res.status === 200) {
				logStep('Delete Room', 'PASS', `Room deleted successfully`);
			} else {
				throw new Error('Delete returned non-200 status');
			}
		} catch (error) {
			logStep('Delete Room', 'FAIL', error.message);
		}

		// Verify Deletion (Double Check)
		try {
			await axios.get(`${BASE_ROOM_URL}/rooms/${roomName}`, { headers: getAuthHeaders() });
			logStep('Verify Deletion', 'FAIL', 'Room still exists after delete!');
		} catch (error) {
			if (error.response && error.response.status === 404) {
				logStep('Verify Deletion', 'PASS', 'Room confirmed gone (404)');
			}
		}
	} catch (criticalError) {
		console.error(`\n⛔ CRITICAL ERROR: ${criticalError.message}`);
	} finally {
		// Cleanup Local File
		if (fs.existsSync(TEST_IMAGE_PATH)) {
			fs.unlinkSync(TEST_IMAGE_PATH);
		}

		// Summary
		console.log('\n========================================');
		console.log('         TEST REPORT SUMMARY            ');
		console.table(report.steps);
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
