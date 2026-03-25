const sgMail = require('@sendgrid/mail');
const redisClient = require('../config/redisClient');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Internal helper for exponential backoff delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends an email with retry logic (Exponential Backoff)
 * Supports transient errors (429, 5xx)
 */
const sendWithRetry = async (msg, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await sgMail.send(msg);
            return true;
        } catch (error) {
            lastError = error;
            const statusCode = error.response?.code || 0;
            const isTransient = statusCode === 429 || (statusCode >= 500 && statusCode < 600);
            
            if (!isTransient || attempt === maxRetries) break;

            const waitTime = Math.pow(2, attempt - 1) * 1000;
            console.warn(`[Email Retry] Attempt ${attempt} failed for ${msg.to}. Retrying in ${waitTime}ms...`);
            await delay(waitTime);
        }
    }
    throw lastError;
};

/**
 * Base function to send emails via SendGrid using Retry Logic
 */
const sendEmail = async (to, subject, html) => {
    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        html,
    };

    try {
        await sendWithRetry(msg);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Email Success] Sent to: ${to}`);
        }
    } catch (error) {
        console.error(`[Email Fatal] Failed to send to ${to}:`, error.response?.body || error.message);
        throw new Error('Error sending email');
    }
};

/**
 * Helper to sanitize user input in HTML to prevent XSS
 */
const sanitizeHTML = (str) => {
    return String(str).replace(
        /[&<>"'`=\/]/g,
        (s) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
            "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;',
        }[s])
    );
};

/**
 * Generates OTP, stores in Redis, and sends email
 */
const sendOTP = async (email, type) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:${type}:${email}`;
    await redisClient.set(key, otp, 'EX', 300);

    const actionNames = {
        login: 'Logging in',
        signup: 'Creating your account',
        emailChange: 'Changing your email address'
    };

    const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Verification Code</h2>
            <p>You requested a code for <strong>${actionNames[type]}</strong>.</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #007bff; border-radius: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p style="font-size: 14px; color: #555;">This code is valid for 5 minutes.</p>
        </div>
    `;

    await sendEmail(email, `Your Verification Code: ${otp}`, html);
};

/**
 * Verifies OTP from Redis
 */
const verifyOTP = async (email, code, type) => {
    const key = `otp:${type}:${email.toLowerCase()}`;
    const storedCode = await redisClient.get(key);
    if (storedCode && storedCode === String(code)) {
        await redisClient.del(key);
        return true;
    }
    return false;
};

// --- Transactional Templates ---

const sendContactEmail = async (name, email, message) => {
    const supportHtml = `<h2>New Contact</h2><p>From: ${sanitizeHTML(name)} (${sanitizeHTML(email)})</p><p>${sanitizeHTML(message)}</p>`;
    const userHtml = `<h2>Hi ${sanitizeHTML(name)},</h2><p>We've received your message and will get back to you soon.</p>`;
    
    await sendEmail(process.env.SUPPORT_EMAIL, `New Contact: ${sanitizeHTML(name)}`, supportHtml);
    await sendEmail(email, "We've Received Your Message", userHtml);
};

const sendBookingConfirmation = async (userEmail, userName, bookingDetails) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h1>Booking Confirmed 🎉</h1>
            <p>Hi ${sanitizeHTML(userName)}, your booking for ${sanitizeHTML(bookingDetails.roomName)} is confirmed.</p>
            <p>Time: ${sanitizeHTML(bookingDetails.startTime)} - ${sanitizeHTML(bookingDetails.endTime)}</p>
        </div>
    `;
    await sendEmail(userEmail, 'Booking Confirmed 🎉', html);
};

const sendPendingConfirmation = async (userEmail, userName, bookingDetails) => {
    const html = `<h1>Booking Pending Review ⏳</h1><p>Hi ${sanitizeHTML(userName)}, we're reviewing your request.</p>`;
    await sendEmail(userEmail, 'Booking Pending Review ⏳', html);
};

const sendAdminApprovalRequest = async (bookingDetails, userDetails) => {
    const html = `<h2>Action Required</h2><p>User: ${sanitizeHTML(userDetails.email)} requested ${sanitizeHTML(bookingDetails.roomName)}</p>`;
    await sendEmail(process.env.SUPPORT_EMAIL, 'Action Required: New Approval Request', html);
};

const sendRegistrationResult = async (email, userName, approved) => {
    const subject = approved ? 'Account Approved ✅' : 'Account Update';
    const html = `<h1>Hello ${sanitizeHTML(userName)},</h1><p>Your request has been <strong>${approved ? 'Approved' : 'Rejected'}</strong>.</p>`;
    await sendEmail(email, subject, html);
};

module.exports = {
    sendOTP,
    verifyOTP,
    sendEmail,
    sendContactEmail,
    sendBookingConfirmation,
    sendPendingConfirmation,
    sendAdminApprovalRequest,
    sendRegistrationResult,
};