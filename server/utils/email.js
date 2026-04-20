const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error('Email error:', err.message);
    return { success: false, error: err.message };
  }
};

const emailTemplates = {
  accountCreated: (name, studentId, password, loginUrl) => ({
    subject: 'Your InternConnect Account is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a365d;">Welcome to InternConnect, ${name}!</h2>
        <p>Your placement portal account has been created. Here are your login credentials:</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0;">
          <p><strong>Student ID:</strong> ${studentId}</p>
          <p><strong>Temporary Password:</strong> <code style="background:#edf2f7;padding:2px 6px;border-radius:3px;">${password}</code></p>
          <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        </div>
        <p style="color:#e53e3e;"><strong>⚠ You must change your password on first login.</strong></p>
        <p>If you have any questions, contact the placement cell.</p>
      </div>
    `
  }),

  statusUpdate: (name, company, role, status) => ({
    subject: `Application Update: ${company} — ${role}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a365d;">Application Status Update</h2>
        <p>Hi ${name},</p>
        <p>Your application for <strong>${role}</strong> at <strong>${company}</strong> has been updated.</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0;text-align:center;">
          <span style="font-size:20px;font-weight:bold;color:${status === 'shortlisted' ? '#38a169' : status === 'rejected' ? '#e53e3e' : '#3182ce'};">
            ${status.toUpperCase()}
          </span>
        </div>
        <p>Log in to InternConnect to view details and next steps.</p>
      </div>
    `
  }),

  newOpportunity: (name, company, role, deadline) => ({
    subject: `New Opportunity: ${role} at ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a365d;">New Placement Opportunity</h2>
        <p>Hi ${name},</p>
        <p>A new opportunity matching your profile has been posted:</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0;">
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Application Deadline:</strong> ${deadline ? new Date(deadline).toLocaleDateString() : 'Open'}</p>
        </div>
        <p>Log in to InternConnect to apply now.</p>
      </div>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
