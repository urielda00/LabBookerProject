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
	console.log(`🚀 Starting Support & Content Automation Test...\n`);
	let token = '';

	try {
		// Setup Auth
		token = await getAdminToken();
		logStep('Setup', 'PASS', 'Admin token acquired');
		const authHeaders = { Authorization: `Bearer ${token}` };

		// ---------------------------------------------------------
		// 1. Health Controller
		// ---------------------------------------------------------
		console.log('\n--- Health Checks ---');
		try {
			const res = await axios.get(`${API_URL}/health/healthy`); // Based on healthRoutes
			if (res.status === 200 && res.data.status) {
				logStep('Health Check', 'PASS', `System Status: ${res.data.status}`);
			} else {
				throw new Error('Invalid health response');
			}
		} catch (e) {
			logStep('Health Check', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 2. Contact Controller (Public)
		// ---------------------------------------------------------
		console.log('\n--- Contact Form ---');
		try {
			const contactPayload = { name: 'Test Bot', email: 'bot@test.com', message: 'Hello World' };
			const res = await axios.post(`${API_URL}/contact/submit`, contactPayload);
			if (res.status === 200) logStep('Submit Contact', 'PASS', 'Form submitted successfully');
		} catch (e) {
			logStep('Submit Contact', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 3. FAQ Controller
		// ---------------------------------------------------------
		console.log('\n--- FAQ Management ---');
		try {
			// Update FAQ (Admin)
			const faqPayload = {
				sections: {
					general: [{ question: 'Test Q?', answer: 'Test A' }],
				},
			};
			await axios.put(`${API_URL}/faq`, faqPayload, { headers: authHeaders });
			logStep('Update FAQ', 'PASS', 'FAQ updated by Admin');

			// Get FAQ (Public)
			const res = await axios.get(`${API_URL}/faq`);
			if (res.data.sections.general[0].question === 'Test Q?') {
				logStep('Get FAQ', 'PASS', 'FAQ content verified');
			} else {
				throw new Error('FAQ content mismatch');
			}
		} catch (e) {
			logStep('FAQ Flow', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 4. Page Controller (CMS)
		// ---------------------------------------------------------
		console.log('\n--- Pages (CMS) ---');
		const slug = 'terms-of-service';
		try {
			// Update Page
			const pagePayload = {
				title: { en: 'Terms', he: 'תנאים' },
				content: { en: 'Content English', he: 'תוכן עברית' },
			};
			// Note: PUT creates or updates based on your controller logic (upsert)
			const updateRes = await axios.put(`${API_URL}/pages/${slug}`, pagePayload, {
				headers: authHeaders,
			});

			if (updateRes.status === 200)
				logStep('Update Page', 'PASS', `Page '${slug}' updated/created`);

			// Get Page
			const getRes = await axios.get(`${API_URL}/pages/${slug}`);
			if (getRes.data.translations.title.en === 'Terms') {
				logStep('Get Page', 'PASS', 'Page content verified');
			}
		} catch (e) {
			logStep('Page Flow', 'FAIL', e.message);
		}

		// ---------------------------------------------------------
		// 5. Issue Controller
		// ---------------------------------------------------------
		console.log('\n--- Issue Tracking ---');
		let issueId = '';
		try {
			// Create
			const issueRes = await axios.post(`${API_URL}/issues/create`, {
				issueType: 'technical',
				description: 'Auto test issue',
				email: 'test@user.com',
			});
			issueId = issueRes.data.issue._id;
			logStep('Create Issue', 'PASS', `ID: ${issueId}`);

			// Update Status
			await axios.patch(`${API_URL}/issues/update-status/${issueId}`, { status: 'in-progress' });
			logStep('Update Status', 'PASS', 'Status changed to in-progress');

			// Delete
			await axios.delete(`${API_URL}/issues/delete/${issueId}`);
			logStep('Delete Issue', 'PASS', 'Issue deleted');
		} catch (e) {
			logStep('Issue Flow', 'FAIL', e.message);
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
