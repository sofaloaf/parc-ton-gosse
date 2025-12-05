/**
 * Test Email Endpoint
 * Allows testing SendGrid email functionality
 */

import express from 'express';
import { sendEmail } from '../services/notifications/index.js';
import { welcomeEmail } from '../services/notifications/templates.js';
import { requireAuth } from '../middleware/auth.js';

export const testEmailRouter = express.Router();

// Test email endpoint (admin only for security)
testEmailRouter.post('/send-test', requireAuth('admin'), async (req, res) => {
	try {
		const { to, type = 'welcome' } = req.body;
		
		if (!to) {
			return res.status(400).json({ error: 'Email address (to) is required' });
		}
		
		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(to)) {
			return res.status(400).json({ error: 'Invalid email address format' });
		}
		
		let emailContent;
		
		switch (type) {
			case 'welcome':
				emailContent = welcomeEmail({
					name: 'Test User',
					email: to,
					verificationToken: 'test-token-12345',
					locale: 'en'
				});
				break;
			default:
				return res.status(400).json({ error: 'Invalid email type. Use: welcome' });
		}
		
		// Send email
		const result = await sendEmail({
			to,
			subject: emailContent.subject,
			html: emailContent.html
		});
		
		res.json({
			success: true,
			message: 'Test email sent successfully',
			result,
			sentTo: to,
			type
		});
	} catch (error) {
		console.error('Test email error:', error);
		res.status(500).json({
			error: 'Failed to send test email',
			message: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

// Check SendGrid configuration status
testEmailRouter.get('/status', requireAuth('admin'), (req, res) => {
	const hasSendGrid = !!process.env.SENDGRID_API_KEY;
	const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
	const fromEmail = process.env.FROM_EMAIL || 'noreply@parctongosse.com';
	const fromName = process.env.FROM_NAME || 'Parc Ton Gosse';
	const frontendUrl = process.env.FRONTEND_URL || 'Not set';
	
	res.json({
		sendGrid: {
			configured: hasSendGrid,
			apiKeySet: hasSendGrid,
			apiKeyPreview: hasSendGrid 
				? `${process.env.SENDGRID_API_KEY.substring(0, 10)}...` 
				: 'Not set'
		},
		smtp: {
			configured: hasSMTP,
			host: process.env.SMTP_HOST || 'Not set',
			user: process.env.SMTP_USER || 'Not set'
		},
		emailSettings: {
			fromEmail,
			fromName,
			frontendUrl
		},
		status: hasSendGrid || hasSMTP ? 'configured' : 'not_configured',
		provider: hasSendGrid ? 'sendgrid' : (hasSMTP ? 'smtp' : 'none')
	});
});

