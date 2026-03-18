// npm install axios form-data
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- CONFIGURATION ---
const API_URL = `${process.env.BASE_BACKEND_URL}/api`;
const ADMIN_USER = { email: 'admin@example.com' };

// Dynamic User
const TIMESTAMP = Date.now();
const TEST_USER = {
	username: `sysUser_${TIMESTAMP}`,
	name: 'System Test User',
	email: `sys_${TIMESTAMP}@test.com`,
	password: 'password123',
};
const TEST_IMAGE_PATH = path.join(__dirname, 'temp-system-test.jpg');

// --- REPORT ---
const report = { passed: 0, failed: 0, steps: [] };

const logStep = (stepName, status, message = '') => {
	const symbol = status === 'PASS' ? '✅' : '❌';
	const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';
	console.log(`${color}${symbol} [${stepName}]${reset} ${message}`);
	report.steps.push({ stepName, status, message });
	if (status === 'PASS') report.passed++;
	else report.failed++;
};

// Create Dummy Image
const createDummyImage = () => {
	const buffer = Buffer.from(
		'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
		'base64'
	);
	fs.writeFileSync(TEST_IMAGE_PATH, buffer);
};

// --- AUTH HELPERS ---
async function getLoginToken(email) {
	// 1. Login Request
	await axios.post(`${API_URL}/auth/login`, { email });
	// 2. Get Code
	const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${email}`);
	const code = codeRes.data.redisCode;
	if (!code) throw new Error('No verification code found');
	// 3. Verify
	const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, { email, code });
	return verifyRes.data.accessToken;
}

async function registerUser(user) {
	await axios.post(`${API_URL}/auth/signup`, user);
	const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${user.email}`);
	await axios.post(`${API_URL}/auth/verify-signup`, {
		email: user.email,
		code: codeRes.data.redisCode,
	});
}

// --- MAIN TEST ---
async function runTests() {
	console.log(`🚀 Starting System & Settings Automation Test...\n`);
	createDummyImage();

	let adminToken = '';
	let userToken = '';

	try {
		// ---------------------------------------------------------
		// 1. Health Controller
		// ---------------------------------------------------------
		console.log('\n--- Health Checks ---');
		try {
			// Check public health endpoint
			const res = await axios.get(`${API_URL}/health/healthy`);
			if (res.status === 200 && res.data.status) {
				logStep('Health Check', 'PASS', `System Status: ${res.data.status}`);
			} else {
				throw new Error('Invalid health response');
			}
		} catch (e) {
			logStep('Health Check', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 2. Admin Config Flow
		// ---------------------------------------------------------
		console.log('\n--- Config Controller Tests (Admin) ---');
		try {
			adminToken = await getLoginToken(ADMIN_USER.email);
			logStep('Admin Login', 'PASS', 'Token received');

			// Update Config
			const newConfig = {
				booking: { maxBookingsPerWeek: 5, slotDurationHours: 2 },
			};

			// FIX: Using the correct '/api/config' route
			const updateRes = await axios.put(`${API_URL}/config`, newConfig, {
				headers: { Authorization: `Bearer ${adminToken}` },
			});

			if (updateRes.data.booking.maxBookingsPerWeek === 5) {
				logStep('Update Config', 'PASS', 'Configuration updated successfully');
			} else {
				throw new Error('Config value did not persist');
			}

			// Get Config (Verification)
			const getRes = await axios.get(`${API_URL}/config`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			});
			if (getRes.status === 200 && getRes.data.booking.maxBookingsPerWeek === 5) {
				logStep('Get Config', 'PASS', 'Configuration fetched and verified');
			} else {
				throw new Error('Config verification failed');
			}
		} catch (e) {
			logStep('Config Flow', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 3. User Settings Flow (Forgot Password)
		// ---------------------------------------------------------
		console.log('\n--- Settings Controller Tests (User) ---');
		try {
			await registerUser(TEST_USER);
			userToken = await getLoginToken(TEST_USER.email);
			logStep('User Setup', 'PASS', 'User registered and logged in');

			// 1. Forgot Password Request
			await axios.post(`${API_URL}/settings/forgot-password`, { email: TEST_USER.email });
			logStep('Forgot Password', 'PASS', 'Code requested');

			// 2. Get the code for reset
			const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${TEST_USER.email}`);
			const resetCode = codeRes.data.redisCode;
			if (!resetCode) throw new Error('Could not get reset code');

			// 3. Validate Code
			await axios.post(`${API_URL}/settings/validate-code`, {
				email: TEST_USER.email,
				code: resetCode,
			});
			logStep('Validate Code', 'PASS', 'Code validated');

			// 4. Reset Password
			const newPassword = 'newPassword456';
			await axios.put(`${API_URL}/settings/reset-password`, {
				email: TEST_USER.email,
				newPassword: newPassword,
				confirmNewPassword: newPassword,
			});
			logStep('Reset Password', 'PASS', 'Password reset');
		} catch (e) {
			logStep('Settings Flow', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 4. Upload Controller (Direct Test)
		// ---------------------------------------------------------
		console.log('\n--- Upload Controller Tests ---');
		try {
			const form = new FormData();
			form.append('image', fs.createReadStream(TEST_IMAGE_PATH));

			const res = await axios.post(`${API_URL}/upload/upload`, form, {
				headers: { ...form.getHeaders() },
			});

			if (res.status === 200 && res.data.url) {
				logStep('Direct Upload', 'PASS', 'File uploaded successfully');
			} else {
				throw new Error('Upload failed or no URL returned');
			}
		} catch (e) {
			logStep('Direct Upload', 'FAIL', e.message);
		}
	} catch (criticalError) {
		console.error(`\n⛔ CRITICAL ERROR: ${criticalError.message}`);
	} finally {
		if (fs.existsSync(TEST_IMAGE_PATH)) fs.unlinkSync(TEST_IMAGE_PATH);
		console.log('\n========================================');
		console.log(`PASSED: ${report.passed}  |  FAILED: ${report.failed}`);
		console.log('========================================');
	}
}

runTests();
