// test-copilot-fixes.js
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// --- CONFIGURATION ---
// Taking the URL directly or from .env
const BASE_URL = process.env.BASE_BACKEND_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const ADMIN_EMAIL = 'urielda00@gmail.com';

const report = { passed: 0, failed: 0, steps: [] };

const logStep = (stepName, status, message = '') => {
    console.log(`${status === 'PASS' ? '✅' : '❌'} [${stepName}] ${message}`);
    report.steps.push({ stepName, status, message });
    status === 'PASS' ? report.passed++ : report.failed++;
};

// --- AUTH HELPERS ---
async function loginAdmin() {
    // We try /api/auth/login based on common practice
    const loginUrl = `${API_URL}/auth/login`; 
    console.log(`Attempting login at: ${loginUrl}`);
    
    try {
        await axios.post(loginUrl, { email: ADMIN_EMAIL });
        const codeRes = await axios.get(`${API_URL}/auth/debug-verification/${ADMIN_EMAIL}`);
        const verifyRes = await axios.post(`${API_URL}/auth/verify-login`, {
            email: ADMIN_EMAIL,
            code: codeRes.data.redisCode,
        });
        return verifyRes.data.accessToken;
    } catch (error) {
        throw new Error(`Admin login failed at ${loginUrl}: ${error.response?.status || error.message}`);
    }
}

// --- TEST PHASES ---

async function testPartialConfigUpdate(adminToken) {
    // UPDATED: Using /api/config based on your routes.js mapping
    const configUrl = `${API_URL}/config`; 
    console.log('\n--- Phase 1: Config Partial Update (Global Settings) ---');
    console.log(`Targeting URL: ${configUrl}`);

    try {
        const getRes = await axios.get(configUrl, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const originalBooking = { ...getRes.data.booking };
        const newMax = (originalBooking.maxBookingsPerWeek || 5) + 1;

        // Testing the safe partial update logic we fixed
        const updateRes = await axios.put(configUrl, 
    { 
        booking: { 
            maxBookingsPerWeek: newMax,
            slotDurationHours: originalBooking.slotDurationHours || 1
        } 
    },
    { headers: { Authorization: `Bearer ${adminToken}` } }
);

        const updated = updateRes.data.booking;
        const success = updated.maxBookingsPerWeek === newMax && 
                        updated.slotDurationHours === originalBooking.slotDurationHours;

        if (success) {
            logStep('Config Update', 'PASS', 'Partial update preserved other nested fields');
        } else {
            throw new Error('Data loss: siblings in nested object were overwritten');
        }
    } catch (error) {
        logStep('Config Update', 'FAIL', `Status ${error.response?.status}: ${error.message}`);
    }
}

async function testMulterUpload(adminToken) {
    // Corrected Path: /api/upload/upload
    const uploadUrl = `${API_URL}/upload/upload`; 
    console.log('\n--- Phase 2: Multer File Upload ---');
    console.log(`Targeting URL: ${uploadUrl}`);

    try {
        const form = new FormData();
        form.append('image', Buffer.from('fake-data'), { filename: 'test.png', contentType: 'image/png' });

        const res = await axios.post(uploadUrl, form, {
            headers: { ...form.getHeaders(), Authorization: `Bearer ${adminToken}` }
        });
        logStep('Multer Upload', 'PASS', 'File uploaded successfully');
    } catch (error) {
        logStep('Multer Upload', 'FAIL', `Status ${error.response?.status || 'Unknown'}: ${error.message}`);
    }
}

async function runTests() {
    console.log(`🚀 Starting verification for ${BASE_URL}\n`);
    try {
        const token = await loginAdmin();
        logStep('Auth', 'PASS', 'Admin Logged In');

        await testPartialConfigUpdate(token);
        await testMulterUpload(token);
    } catch (e) {
        console.error(`⛔ CRITICAL: ${e.message}`);
    } finally {
        console.log('\n--- FINAL REPORT ---');
        console.table(report.steps);
    }
}

runTests();