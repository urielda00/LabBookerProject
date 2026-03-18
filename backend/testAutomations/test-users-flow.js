/*
require: 
admin@example.com  - as admin in system
student@example.com - as user in system
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
const TEST_IMAGE_PATH = path.join(__dirname, 'temp-profile-pic.jpg');

// Users
const REGULAR_USER = { email: 'student@example.com' };
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

const createDummyImage = () => {
	const buffer = Buffer.from(
		'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
		'base64'
	);
	fs.writeFileSync(TEST_IMAGE_PATH, buffer);
};

// Helper to login and get token
async function loginAndGetToken(email, roleName) {
	try {
		// 1. Send Code
		await axios.post(`${API_URL}/auth/login`, { email });

		// 2. Get Debug Code
		const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${email}`);
		const code = codeRes.data.redisCode;
		if (!code) throw new Error(`Could not get debug code for ${roleName}`);

		// 3. Verify
		const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, { email, code });
		return {
			token: verifyRes.data.accessToken,
			id: verifyRes.data.user.id || verifyRes.data.user._id,
		};
	} catch (error) {
		throw new Error(`Login failed for ${roleName}: ${error.message}`);
	}
}

// --- MAIN TEST FUNCTION ---
async function runTests() {
	console.log(`🚀 Starting Users Flow Automation Test...\n`);
	createDummyImage();

	let studentToken = '';
	let studentId = '';
	let adminToken = '';

	try {
		// =========================================================
		// PHASE 1: REGULAR USER ACTIONS (Profile)
		// =========================================================
		console.log('--- Phase 1: Regular User Actions ---');

		// 1. Login Student
		try {
			const data = await loginAndGetToken(REGULAR_USER.email, 'Student');
			studentToken = data.token;
			studentId = data.id;
			logStep('Student Login', 'PASS', `ID: ${studentId}`);
		} catch (e) {
			logStep('Student Login', 'FAIL', e.message);
			throw e; // Stop if login fails
		}

		// 2. Update Profile (Name + Image)
		try {
			const form = new FormData();
			form.append('name', 'Automated Student Name');
			form.append('image', fs.createReadStream(TEST_IMAGE_PATH));

			const headers = {
				Authorization: `Bearer ${studentToken}`,
				...form.getHeaders(),
			};

			const res = await axios.put(`${API_URL}/user/profile`, form, { headers });

			if (res.status === 200 && res.data.user.name === 'Automated Student Name') {
				logStep('Update Profile', 'PASS', 'Name and Image updated successfully');
			} else {
				throw new Error('Update response invalid');
			}
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Update Profile', 'FAIL', msg);
		}

		// 3. Get Profile (Verify)
		try {
			const res = await axios.get(`${API_URL}/user/profile`, {
				headers: { Authorization: `Bearer ${studentToken}` },
			});
			if (res.data.profilePicture) {
				logStep('Get Profile', 'PASS', 'Profile picture exists');
			} else {
				logStep('Get Profile', 'FAIL', 'Profile picture missing after upload');
			}
		} catch (error) {
			logStep('Get Profile', 'FAIL', error.message);
		}

		// =========================================================
		// PHASE 2: ADMIN ACTIONS (Management)
		// =========================================================
		console.log('\n--- Phase 2: Admin Actions ---');

		// 4. Login Admin
		try {
			const data = await loginAndGetToken(ADMIN_USER.email, 'Admin');
			adminToken = data.token;
			logStep('Admin Login', 'PASS', 'Admin authenticated');
		} catch (e) {
			logStep('Admin Login', 'FAIL', e.message);
			throw e;
		}

		// 5. Fetch All Users
		try {
			const res = await axios.get(`${API_URL}/user/admin/users?limit=5`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			});
			if (res.data.docs && res.data.docs.length > 0) {
				logStep('Fetch All Users', 'PASS', `Retrieved ${res.data.docs.length} users`);
			} else {
				throw new Error('No users returned');
			}
		} catch (error) {
			logStep('Fetch All Users', 'FAIL', error.message);
		}

		// 6. Block Student User
		try {
			const res = await axios.patch(
				`${API_URL}/user/admin/users/${studentId}/block`,
				{ blockDuration: 24 }, // Block for 24 hours
				{ headers: { Authorization: `Bearer ${adminToken}` } }
			);
			if (res.status === 200) {
				logStep('Block User', 'PASS', `User ${studentId} blocked for 24h`);
			} else {
				throw new Error('Block failed');
			}
		} catch (error) {
			const msg = error.response?.data?.message || error.message;
			logStep('Block User', 'FAIL', msg);
		}

		// 7. Unblock Student User (Cleanup)
		try {
			const res = await axios.patch(
				`${API_URL}/user/admin/users/${studentId}/unblock`,
				{},
				{ headers: { Authorization: `Bearer ${adminToken}` } }
			);
			if (res.status === 200) {
				logStep('Unblock User', 'PASS', `User ${studentId} unblocked`);
			} else {
				throw new Error('Unblock failed');
			}
		} catch (error) {
			logStep('Unblock User', 'FAIL', error.message);
		}
	} catch (criticalError) {
		console.error(`\n⛔ CRITICAL ERROR: ${criticalError.message}`);
	} finally {
		if (fs.existsSync(TEST_IMAGE_PATH)) {
			fs.unlinkSync(TEST_IMAGE_PATH);
		}

		console.log('\n========================================');
		console.log('         TEST REPORT SUMMARY            ');
		console.table(report.steps);
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
