const nodemailer = require("nodemailer");
const User = require("../models/User");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// const transporter = nodemailer.createTransport({
//   host: "localhost",
//   port: 1025,
//   ignoreTLS: true,
// });


const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      html,
    });
    console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error("Error sending email");
  }
};

const sendVerificationEmail = async (email, code) => {
  try {
    const subject ="🔑 Verify Your Email Address";
    const html = `
      <html>
        <head>
          <style>
            @media (prefers-color-scheme: dark) {
              .email-container {
                background-color: #1e293b !important;
              }
              .email-header {
                background: #ffffff !important; /* White background in dark mode */
              }
              .company-logo {
                color: #1e293b !important; /* Dark text for white background */
              }
              .greeting, .verification-code {
                color: #f8fafc !important;
              }
              .message, .verification-note, .footer-text {
                color: #94a3b8 !important;
              }
              .verification-code-container {
                background: #334155 !important;
                border-color: #475569 !important;
              }
              .email-footer {
                background-color: #1e293b !important;
                border-color: #475569 !important;
              }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
          <div class="email-container" style="max-width: 580px; margin: 24px auto; border-radius: 16px; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
            
            <!-- Header with white background in dark mode -->
            <div class="email-header" style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 36px 0; text-align: center;">
              <div class="company-logo" style="font-size: 28px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px;">
                LabBooker
              </div>
            </div>
            
            <!-- Body -->
            <div class="email-body" style="padding: 48px 40px; color: #2d3748;">
              <h1 class="greeting" style="font-size: 26px; font-weight: 700; margin: 0 0 28px 0; color: #1a202c;">
                Verify your email address
              </h1>
              
              <p class="message" style="font-size: 16px; line-height: 1.7; margin: 0 0 32px 0; color: #4a5568;">
                Thanks for getting started with LabBooker! To complete your registration, 
                please enter the following verification code:
              </p>
              
              <div class="verification-code-container" style="background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 36px; border: 1px solid #e2e8f0;">
                <p class="verification-code" style="font-family: 'Monaco', 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #2d3748; letter-spacing: 6px; margin: 0;">
                  ${code}
                </p>
                <p class="verification-note" style="font-size: 14px; color: #718096; margin-top: 16px; font-weight: 500;">
                  This code will expire in 5 minutes
                </p>
              </div>
              
              <p class="message" style="font-size: 16px; line-height: 1.7; margin: 0 0 32px 0; color: #4a5568;">
                If you didn't request this code, you can safely ignore this email. Someone might have 
                typed your email address by mistake.
              </p>
              
              <div class="help-text" style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-radius: 12px; font-size: 14px; color: #718096; border: 1px solid #edf2f7;">
                Need help? Contact our support team at 
                <span class="highlight" style="color: #4299e1; font-weight: 500; text-decoration: none;">
                  support@labbooker.com
                </span>
              </div>
              
              <div class="divider" style="height: 1px; background: linear-gradient(to right, transparent, #e2e8f0, transparent); margin: 36px 0;"></div>
              
              <p class="message" style="font-size: 14px; color: #718096;">
                This is an automated message, please do not reply to this email.
              </p>
            </div>
            
            <!-- Footer -->
            <div class="email-footer" style="padding: 28px 40px; background-color: #f8fafc; text-align: center; border-top: 1px solid #edf2f7;">
              <p class="footer-text" style="font-size: 13px; color: #718096; margin: 0; line-height: 1.6;">
                © ${new Date().getFullYear()} LabBooker. All rights reserved.
              </p>
              <p class="footer-text" style="font-size: 13px; color: #718096; margin: 0; line-height: 1.6;">
                Azrieli college, Jerusalem, Israel
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail(email, subject, html);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

const sendContactEmail = async (name, email, message) => {
  try {
    // Email to support
    const supportEmailTemplate = `
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <style>
            @media (prefers-color-scheme: dark) {
              .email-container { background-color: #1e293b !important; }
              .content-card { background: #334155 !important; border-color: #475569 !important; }
              .footer { background-color: #1e293b !important; }
              * { color: #f8fafc !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', Arial, sans-serif;">
          <div class="email-container" style="max-width: 580px; margin: 24px auto; border-radius: 16px; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 36px 40px; border-radius: 16px 16px 0 0;">
              <div style="font-size: 24px; font-weight: 700; color: #ffffff;">New Contact Submission</div>
            </div>

            <!-- Body -->
            <div style="padding: 40px;">
              <div style="margin-bottom: 32px;">
                <div style="font-size: 16px; color: #4a5568; margin-bottom: 8px;">
                  <strong>From:</strong> ${sanitizeHTML(name)}
                </div>
                <div style="font-size: 16px; color: #4a5568; margin-bottom: 8px;">
                  <strong>Email:</strong> ${sanitizeHTML(email)}
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                <div style="font-size: 14px; color: #718096; margin-bottom: 12px;">Message:</div>
                <div style="background: white; padding: 16px; border-radius: 6px; color: #2d3748; border: 1px solid #e2e8f0;">
                  ${sanitizeHTML(message)}
                </div>
              </div>

              <div style="font-size: 14px; color: #718096;">
                <div style="margin-bottom: 8px;">Received at: ${new Date().toLocaleString()}</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer" style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #edf2f7;">
              <div style="font-size: 12px; color: #718096;">
                © ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'YourCompany'}. All rights reserved.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Confirmation email to user
    const confirmationTemplate = `
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <style>
            @media (prefers-color-scheme: dark) {
              .email-container { background-color: #1e293b !important; }
              .content-card { background: #334155 !important; border-color: #475569 !important; }
              .footer { background-color: #1e293b !important; }
              * { color: #f8fafc !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', Arial, sans-serif;">
          <div class="email-container" style="max-width: 580px; margin: 24px auto; border-radius: 16px; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 36px 40px; border-radius: 16px 16px 0 0;">
              <div style="font-size: 24px; font-weight: 700; color: #ffffff;">Message Received</div>
            </div>

            <!-- Body -->
            <div style="padding: 40px;">
              <div style="margin-bottom: 32px;">
                <h2 style="font-size: 20px; color: #1a202c; margin: 0 0 24px 0;">Thank you, ${sanitizeHTML(name)}</h2>
                <div style="font-size: 16px; color: #4a5568; margin-bottom: 24px;">
                  We've received your message and will respond within 24-48 hours.
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                <div style="font-size: 14px; color: #718096; margin-bottom: 12px;">Your message:</div>
                <div style="background: white; padding: 16px; border-radius: 6px; color: #2d3748; border: 1px solid #e2e8f0;">
                  ${sanitizeHTML(message)}
                </div>
              </div>

              <div style="font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <div style="margin-bottom: 8px;">Need urgent assistance?</div>
                <div>
                  Contact us directly at 
                  <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #4299e1; text-decoration: none;">${process.env.SUPPORT_EMAIL}</a>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer" style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #edf2f7;">
              <div style="font-size: 12px; color: #718096;">
                ${process.env.COMPANY_ADDRESS || 'Azrieli College, Jerusalem, Israel'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails
    await sendEmail(
      process.env.SUPPORT_EMAIL,
      `New Contact Submission: ${sanitizeHTML(name)}`,
      supportEmailTemplate
    );

    await sendEmail(
      email,
      "We've Received Your Message",
      confirmationTemplate
    );

  } catch (error) {
    console.error("Error sending contact email:", error);
    throw new Error("Failed to process contact request");
  }
};

// Helper functions (implement these separately)
const sanitizeHTML = (str) => {
  return String(str).replace(/[&<>"'`=\/]/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  })[s]);
};

const sendBookingConfirmation = async (userEmail, userName, bookingDetails) => {
  const subject = `Booking Confirmed 🎉 • ${process.env.COMPANY_NAME || 'LabBooker'}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width">
        <meta name="color-scheme" content="light dark">
        <style>
          @media (prefers-color-scheme: dark) {
            .email-container { background-color: #1e293b !important; }
            .content-card { background-color: #334155 !important; border-color: #475569 !important; }
            * { color: #f8fafc !important; }
            a { color: #7dd3fc !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: 'Inter', system-ui, sans-serif;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <div style="padding: 36px; background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);">
            <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${process.env.COMPANY_NAME || 'LabBooker'}</div>
          </div>
          
          <div style="padding: 36px;">
            <h1 style="font-size: 20px; color: #1a202c; margin: 0 0 24px 0;">Hi ${sanitizeHTML(userName)},</h1>
            
            <div class="content-card" style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h2 style="font-size: 18px; color: #1a202c; margin: 0 0 16px 0;">Booking Confirmed</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #4a5568; width: 100px;">Room:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.roomName)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Date:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.date)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Time:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.startTime)} - ${sanitizeHTML(bookingDetails.endTime)}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.CLIENT_URL}/my-bookings" 
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; 
                        border-radius: 6px; text-decoration: none; font-weight: 500;">
                View Bookings
              </a>
            </div>
          </div>
          
          <div style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 12px; color: #718096; line-height: 1.5;">
              <p style="margin: 4px 0;">${process.env.COMPANY_ADDRESS || 'Azrieli College Inc., Jerusalem, Israel'}</p>
              <p style="margin: 4px 0;">Need help? <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">Contact support</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(userEmail, subject, html);
};

const sendPendingConfirmation = async (userEmail, userName, bookingDetails) => {
  const subject = `Booking Pending Review ⏳ • ${process.env.COMPANY_NAME || 'LabBooker'}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width">
        <meta name="color-scheme" content="light dark">
        <style>
          @media (prefers-color-scheme: dark) {
            .email-container { background-color: #1e293b !important; }
            .content-card { background-color: #334155 !important; border-color: #475569 !important; }
            * { color: #f8fafc !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: 'Inter', system-ui, sans-serif;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <div style="padding: 36px; background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);">
            <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${process.env.COMPANY_NAME || 'LabBooker'}</div>
          </div>
          
          <div style="padding: 36px;">
            <h1 style="font-size: 20px; color: #1a202c; margin: 0 0 24px 0;">Hi ${sanitizeHTML(userName)},</h1>
            
            <div class="content-card" style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h2 style="font-size: 18px; color: #1a202c; margin: 0 0 16px 0;">Pending Request Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #4a5568; width: 100px;">Room:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.roomName)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Date:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.date)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Time:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.startTime)} - ${sanitizeHTML(bookingDetails.endTime)}</td></tr>
              </table>
            </div>

            <div style="color: #4a5568; margin-bottom: 32px;">
              <p style="margin: 0 0 16px 0;">We're reviewing your request for the <strong>${sanitizeHTML(bookingDetails.roomName)}</strong> and will notify you once approved.</p>
              <p style="margin: 0;">Average approval time: 1-2 business days</p>
            </div>
          </div>
          
          <div style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 12px; color: #718096; line-height: 1.5;">
              <p style="margin: 4px 0;">${process.env.COMPANY_ADDRESS || 'Azrieli College Inc., Jerusalem, Israel'}</p>
              <p style="margin: 4px 0;">Questions? <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">Reply to this email</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(userEmail, subject, html);
};

const sendAdminApprovalRequest = async (bookingDetails, userDetails) => {
  const subject = `Action Required: Large Seminar Room Request • ${process.env.COMPANY_NAME || 'LabBooker'}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width">
        <meta name="color-scheme" content="light dark">
        <style>
          @media (prefers-color-scheme: dark) {
            .email-container { background-color: #1e293b !important; }
            .alert-badge { background-color: #7f1d1d !important; }
            .content-card { background-color: #334155 !important; border-color: #475569 !important; }
            * { color: #f8fafc !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: 'Inter', system-ui, sans-serif;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <div style="padding: 24px; background-color: #dc2626; text-align: center;">
            <div class="alert-badge" style="display: inline-block; background-color: #b91c1c; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: 500;">
              Action Required
            </div>
          </div>
          
          <div style="padding: 36px;">
            <h1 style="font-size: 20px; color: #1a202c; margin: 0 0 24px 0;">Large Seminar Room Request</h1>
            
            <div class="content-card" style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h2 style="font-size: 18px; color: #1a202c; margin: 0 0 16px 0;">Request Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #4a5568; width: 100px;">User:</td><td style="padding: 8px 0;">${sanitizeHTML(userDetails.name)} (${sanitizeHTML(userDetails.email)})</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Room:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.roomName)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Date:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.date)}</td></tr>
                <tr><td style="padding: 8px 0; color: #4a5568;">Time:</td><td style="padding: 8px 0;">${sanitizeHTML(bookingDetails.startTime)} - ${sanitizeHTML(bookingDetails.endTime)}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.CLIENT_URL}/admin/bookings/${bookingDetails.id}" 
                 style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; 
                        border-radius: 6px; text-decoration: none; font-weight: 500;">
                Review Request
              </a>
            </div>

            <div style="font-size: 14px; color: #4a5568; border-top: 1px solid #e2e8f0; padding-top: 24px;">
              <p style="margin: 0 0 8px 0;">Additional Info:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Requested at: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(process.env.SUPPORT_EMAIL, subject, html);
};

module.exports = { sendVerificationEmail, sendContactEmail, sendAdminApprovalRequest, sendBookingConfirmation, sendPendingConfirmation, sendEmail };
