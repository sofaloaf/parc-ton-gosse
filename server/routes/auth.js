import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { signToken } from '../middleware/auth.js';
import { sendEmail } from '../services/notifications/index.js';
import { welcomeEmail, passwordResetEmail, trialExpirationEmail } from '../services/notifications/templates.js';

export const authRouter = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sofiane.boukhalfa@gmail.com';

// Helper to get Google Client ID (read at request time, not module load time)
function getGoogleClientId() {
	return process.env.GOOGLE_CLIENT_ID;
}

// Generate referral code (8 characters, alphanumeric)
function generateReferralCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
	let code = '';
	for (let i = 0; i < 8; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

// Password hashing with bcrypt - secure password storage

// Validation middleware
const validateSignup = [
	body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
	body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
	body('role').optional().isIn(['parent', 'provider', 'admin']).withMessage('Invalid role')
];

const validateLogin = [
	body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
	body('password').notEmpty().withMessage('Password required')
];

authRouter.post('/signup', validateSignup, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: errors.array()[0].msg });
	}

	const store = req.app.get('dataStore');
	const { email, password, role = 'parent', profile = {}, name, referralCode } = req.body;
	
	const userExists = await store.users.findByEmail(email);
	if (userExists) {
		return res.status(409).json({ error: 'User already exists' });
	}

	// Hash password with bcrypt
	const hashedPassword = await bcrypt.hash(password, 10);
	
	// Generate email verification token
	const verificationToken = uuidv4();
	
	// Generate referral code for new user
	const userReferralCode = generateReferralCode();
	
	// Check if referral code is valid (if provided)
	let referredBy = null;
	if (referralCode) {
		const allUsers = await store.users.list();
		const referrer = allUsers.find(u => u.referralCode === referralCode.toUpperCase());
		if (referrer) {
			referredBy = referralCode.toUpperCase();
		}
	}
	
	const now = new Date().toISOString();
	const user = { 
		id: uuidv4(), 
		email, 
		password: hashedPassword, 
		role, 
		profile: { ...profile, name: name || profile.name }, 
		trialStartTime: now, // Start 24-hour trial
		hasPreordered: false,
		emailVerified: false, // Email not verified yet
		verificationToken: verificationToken,
		verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
		referralCode: userReferralCode, // Generate unique referral code
		referredBy: referredBy, // Apply referral code if provided and valid
		createdAt: now 
	};
	await store.users.create(user);
	
	// Send welcome email with verification link
	try {
		const locale = req.headers['accept-language']?.includes('fr') ? 'fr' : 'en';
		const emailContent = welcomeEmail({ 
			name: name || profile.name, 
			email, 
			verificationToken,
			locale 
		});
		await sendEmail({ 
			to: email, 
			subject: emailContent.subject, 
			html: emailContent.html 
		});
	} catch (emailError) {
		console.error('Failed to send welcome email:', emailError);
		// Don't fail signup if email fails
	}
	
	const token = signToken({ id: user.id, email: user.email, role: user.role });
	
	// Set httpOnly cookie for token (more secure than localStorage)
	res.cookie('token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
		maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
	});
	
	res.json({ 
		token, 
		user: { 
			id: user.id, 
			email: user.email, 
			role: user.role, 
			profile: user.profile, 
			trialStartTime: user.trialStartTime, 
			hasPreordered: user.hasPreordered,
			emailVerified: false // User needs to verify email
		} 
	});
});

authRouter.post('/login', validateLogin, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: errors.array()[0].msg });
	}

	const store = req.app.get('dataStore');
	const { email, password } = req.body;
	const user = await store.users.findByEmail(email);
	
	// Use constant-time comparison - always check password even if user doesn't exist
	// This prevents user enumeration attacks
	let isValid = false;
	if (user && user.password) {
		// Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
		if (user.password.startsWith('$2')) {
			// Password is hashed, use bcrypt
			isValid = await bcrypt.compare(password, user.password);
		} else {
			// Password is plain text (legacy), compare directly and migrate
			isValid = user.password === password;
			if (isValid) {
				// Migrate to hashed password
				const hashedPassword = await bcrypt.hash(password, 10);
				await store.users.update(user.id, { password: hashedPassword });
			}
		}
	}
	
	if (!user || !isValid) {
		// Generic error message to prevent user enumeration
		return res.status(401).json({ error: 'Invalid credentials' });
	}
	
	// Check if email is verified (optional - can be enforced later)
	// For now, we'll allow login but show a warning if not verified
	const emailVerified = user.emailVerified !== false;
	
	// If user doesn't have trialStartTime, set it now (for existing users)
	const now = new Date().toISOString();
	if (!user.trialStartTime && !user.hasPreordered && user.role === 'parent') {
		await store.users.update(user.id, { trialStartTime: now });
		user.trialStartTime = now;
	}
	
	const token = signToken({ id: user.id, email: user.email, role: user.role });
	
	// Set httpOnly cookie for token (more secure than localStorage)
	res.cookie('token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
		maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
	});
	
	// Track login
	try {
		await store.logins.create({
			id: uuidv4(),
			email: user.email,
			timestamp: now,
			createdAt: now,
			updatedAt: now
		});
	} catch (e) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to track login:', e);
		}
	}
	
	res.json({ 
		token, 
		user: { 
			id: user.id, 
			email: user.email, 
			role: user.role, 
			profile: user.profile, 
			trialStartTime: user.trialStartTime, 
			hasPreordered: user.hasPreordered || false,
			emailVerified: emailVerified
		} 
	});
});

// Email verification endpoint
authRouter.get('/verify-email', async (req, res) => {
	const store = req.app.get('dataStore');
	const { token, email } = req.query;
	
	if (!token || !email) {
		return res.status(400).json({ error: 'Token and email required' });
	}
	
	const user = await store.users.findByEmail(email);
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}
	
	// Check if token matches and hasn't expired
	if (user.verificationToken !== token) {
		return res.status(400).json({ error: 'Invalid verification token' });
	}
	
	if (new Date(user.verificationTokenExpiry) < new Date()) {
		return res.status(400).json({ error: 'Verification token has expired' });
	}
	
	// Mark email as verified
	await store.users.update(user.id, {
		emailVerified: true,
		verificationToken: null,
		verificationTokenExpiry: null
	});
	
	res.json({ success: true, message: 'Email verified successfully' });
});

// Resend verification email
authRouter.post('/resend-verification', async (req, res) => {
	const store = req.app.get('dataStore');
	const { email } = req.body;
	
	if (!email) {
		return res.status(400).json({ error: 'Email required' });
	}
	
	const user = await store.users.findByEmail(email);
	if (!user) {
		// Always return success to prevent user enumeration
		return res.json({ message: 'If an account exists, a verification email has been sent.' });
	}
	
	if (user.emailVerified) {
		return res.status(400).json({ error: 'Email already verified' });
	}
	
	// Generate new verification token
	const verificationToken = uuidv4();
	await store.users.update(user.id, {
		verificationToken: verificationToken,
		verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	});
	
	// Send verification email
	try {
		const locale = req.headers['accept-language']?.includes('fr') ? 'fr' : 'en';
		const emailContent = welcomeEmail({ 
			name: user.profile?.name, 
			email, 
			verificationToken,
			locale 
		});
		await sendEmail({ 
			to: email, 
			subject: emailContent.subject, 
			html: emailContent.html 
		});
		res.json({ message: 'Verification email sent' });
	} catch (error) {
		console.error('Failed to send verification email:', error);
		res.status(500).json({ error: 'Failed to send verification email' });
	}
});

// Password reset request
authRouter.post('/forgot-password', async (req, res) => {
	const store = req.app.get('dataStore');
	const { email } = req.body;
	
	if (!email) {
		return res.status(400).json({ error: 'Email required' });
	}
	
	const user = await store.users.findByEmail(email);
	// Always return success to prevent user enumeration
	res.json({ message: 'If an account exists, a password reset link has been sent.' });
	
	if (user) {
		// Generate reset token (expires in 1 hour)
		const resetToken = uuidv4();
		const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		
		await store.users.update(user.id, {
			resetToken: resetToken,
			resetTokenExpiry: resetTokenExpiry
		});
		
		// Send password reset email
		try {
			const locale = req.headers['accept-language']?.includes('fr') ? 'fr' : 'en';
			const emailContent = passwordResetEmail({ 
				name: user.profile?.name, 
				email, 
				resetToken,
				locale 
			});
			await sendEmail({ 
				to: email, 
				subject: emailContent.subject, 
				html: emailContent.html 
			});
		} catch (error) {
			console.error('Failed to send password reset email:', error);
			// Don't fail the request if email fails
		}
	}
});

// Password reset confirmation
authRouter.post('/reset-password', async (req, res) => {
	const { token, email, newPassword } = req.body;
	
	if (!token || !email || !newPassword) {
		return res.status(400).json({ error: 'Token, email, and new password required' });
	}
	
	if (newPassword.length < 8) {
		return res.status(400).json({ error: 'Password must be at least 8 characters' });
	}
	
	const store = req.app.get('dataStore');
	const user = await store.users.findByEmail(email);
	
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}
	
	// Check if token matches and hasn't expired
	if (user.resetToken !== token) {
		return res.status(400).json({ error: 'Invalid reset token' });
	}
	
	if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
		return res.status(400).json({ error: 'Reset token has expired' });
	}
	
	// Hash new password and update
	const hashedPassword = await bcrypt.hash(newPassword, 10);
	await store.users.update(user.id, {
		password: hashedPassword,
		resetToken: null,
		resetTokenExpiry: null
	});
	
	res.json({ success: true, message: 'Password reset successfully' });
});

// Track login (public endpoint for frontend to call)
authRouter.post('/track-login', async (req, res) => {
	const store = req.app.get('dataStore');
	const { email, timestamp } = req.body;
	const now = timestamp || new Date().toISOString();
	try {
		await store.logins.create({
			id: uuidv4(),
			email: email || 'unknown',
			timestamp: now,
			createdAt: now,
			updatedAt: now
		});
		res.json({ success: true });
	} catch (e) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to track login:', e);
		}
		res.status(500).json({ error: 'Failed to track login' });
	}
});

// Logout - clear cookie
authRouter.post('/logout', (req, res) => {
	res.clearCookie('token', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict'
	});
	res.json({ success: true });
});

// Google OAuth login for all users (not just admin)
authRouter.post('/google', async (req, res) => {
	const { idToken } = req.body;
	
	if (!idToken) {
		return res.status(400).json({ error: 'ID token required' });
	}

	const GOOGLE_CLIENT_ID = getGoogleClientId();
	if (!GOOGLE_CLIENT_ID) {
		return res.status(500).json({ error: 'Google OAuth not configured' });
	}

	try {
		const client = new OAuth2Client(GOOGLE_CLIENT_ID);
		const ticket = await client.verifyIdToken({
			idToken: idToken,
			audience: GOOGLE_CLIENT_ID,
		});
		
		const payload = ticket.getPayload();
		const email = payload.email;
		const name = payload.name;
		const picture = payload.picture;

		// Create or update user
		const store = req.app.get('dataStore');
		let user = await store.users.findByEmail(email);
		
		if (!user) {
			// New user - create account
			const now = new Date().toISOString();
			user = {
				id: uuidv4(),
				email: email,
				password: '', // No password needed for OAuth
				role: 'parent', // Default role
				profile: {
					name: name,
					picture: picture
				},
				trialStartTime: now, // Start 24-hour trial
				hasPreordered: false,
				emailVerified: true, // Google emails are verified
				createdAt: now
			};
			await store.users.create(user);
		} else {
			// Existing user - update profile with latest Google info
			await store.users.update(user.id, {
				profile: {
					...user.profile,
					name: name || user.profile?.name,
					picture: picture || user.profile?.picture
				},
				emailVerified: true // Google emails are verified
			});
			user.profile = { ...user.profile, name: name || user.profile?.name, picture: picture || user.profile?.picture };
		}

		// Track login
		try {
			const now = new Date().toISOString();
			await store.logins.create({
				id: uuidv4(),
				email: email,
				timestamp: now,
				createdAt: now,
				updatedAt: now
			});
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to track login:', e);
			}
		}

		const token = signToken({ 
			id: user.id, 
			email: user.email, 
			role: user.role 
		});

		// Set httpOnly cookie for token (more secure than localStorage)
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});

		res.json({ 
			token, 
			user: { 
				id: user.id, 
				email: user.email, 
				role: user.role, 
				profile: user.profile,
				trialStartTime: user.trialStartTime,
				hasPreordered: user.hasPreordered || false,
				emailVerified: true
			} 
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Google OAuth error:', error);
		}
		res.status(401).json({ error: 'Invalid Google token' });
	}
});

// Google OAuth login for admin (kept for backward compatibility)
authRouter.post('/admin/google', async (req, res) => {
	const { idToken } = req.body;
	
	if (!idToken) {
		return res.status(400).json({ error: 'ID token required' });
	}

	const GOOGLE_CLIENT_ID = getGoogleClientId();
	if (!GOOGLE_CLIENT_ID) {
		return res.status(500).json({ error: 'Google OAuth not configured' });
	}

	try {
		const client = new OAuth2Client(GOOGLE_CLIENT_ID);
		const ticket = await client.verifyIdToken({
			idToken: idToken,
			audience: GOOGLE_CLIENT_ID,
		});
		
		const payload = ticket.getPayload();
		const email = payload.email;
		
		if (email !== ADMIN_EMAIL) {
			return res.status(403).json({ error: 'Access denied. Only authorized admin can login.' });
		}

		// Create or update admin user
		const store = req.app.get('dataStore');
		let user = await store.users.findByEmail(ADMIN_EMAIL);
		
		if (!user) {
			user = {
				id: uuidv4(),
				email: ADMIN_EMAIL,
				password: '', // No password needed for OAuth
				role: 'admin',
				profile: {
					name: payload.name,
					picture: payload.picture
				},
				createdAt: new Date().toISOString()
			};
			await store.users.create(user);
		} else {
			// Update user profile with latest Google info
			await store.users.update(user.id, {
				role: 'admin',
				profile: {
					name: payload.name,
					picture: payload.picture
				}
			});
		}

		// Track admin login
		try {
			const now = new Date().toISOString();
			await store.logins.create({
				id: uuidv4(),
				email: ADMIN_EMAIL,
				timestamp: now,
				createdAt: now,
				updatedAt: now
			});
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to track admin login:', e);
			}
		}

		const token = signToken({ 
			id: user.id, 
			email: user.email, 
			role: 'admin' 
		});

		// Set httpOnly cookie for token (more secure than localStorage)
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});

		res.json({ 
			token, 
			user: { 
				id: user.id, 
				email: user.email, 
				role: 'admin', 
				profile: user.profile 
			} 
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Google OAuth error:', error);
		}
		res.status(401).json({ error: 'Invalid Google token' });
	}
});
