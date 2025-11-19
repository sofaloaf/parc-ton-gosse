import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create SMTP transporter if SMTP config is provided
let smtpTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
	smtpTransporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: process.env.SMTP_PORT === '465',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS
		}
	});
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@parctongosse.com';
const FROM_NAME = process.env.FROM_NAME || 'Parc Ton Gosse';

/**
 * Send email using SendGrid or SMTP
 */
export async function sendEmail({ to, subject, html, text }) {
	// If neither SendGrid nor SMTP is configured, log and return stub
	if (!process.env.SENDGRID_API_KEY && !smtpTransporter) {
		console.log('[Email stub]', { to, subject });
		if (process.env.NODE_ENV === 'development') {
			console.log('Email content:', html || text);
		}
		return { ok: true, stub: true };
	}

	try {
		// Try SendGrid first
		if (process.env.SENDGRID_API_KEY) {
			await sgMail.send({
				to,
				from: { email: FROM_EMAIL, name: FROM_NAME },
				subject,
				html,
				text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
			});
			console.log(`✅ Email sent via SendGrid to ${to}`);
			return { ok: true, provider: 'sendgrid' };
		}

		// Fallback to SMTP
		if (smtpTransporter) {
			await smtpTransporter.sendMail({
				from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
				to,
				subject,
				html,
				text: text || html.replace(/<[^>]*>/g, '')
			});
			console.log(`✅ Email sent via SMTP to ${to}`);
			return { ok: true, provider: 'smtp' };
		}
	} catch (error) {
		console.error('❌ Failed to send email:', error.message);
		throw error;
	}
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS({ to, message }) {
	if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
		console.log('[SMS stub]', { to, message });
		return { ok: true, stub: true };
	}
	
	// TODO: Implement Twilio SMS
	// const twilio = require('twilio');
	// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
	// await client.messages.create({ to, from: process.env.TWILIO_PHONE, body: message });
	
	throw new Error('SMS provider not fully implemented');
}
