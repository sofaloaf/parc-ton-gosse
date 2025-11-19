import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

export const referralsRouter = express.Router();

// Generate or get user's referral code
referralsRouter.get('/code', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}

	// Generate referral code if doesn't exist
	let referralCode = user.referralCode;
	if (!referralCode) {
		// Generate a unique code (8 characters, alphanumeric)
		referralCode = generateReferralCode();
		
		// Make sure it's unique
		let isUnique = false;
		let attempts = 0;
		while (!isUnique && attempts < 10) {
			const existing = await store.users.list();
			const codeExists = existing.some(u => u.referralCode === referralCode);
			if (!codeExists) {
				isUnique = true;
			} else {
				referralCode = generateReferralCode();
				attempts++;
			}
		}
		
		await store.users.update(req.user.id, { referralCode });
	}

	res.json({ referralCode });
});

// Get referral stats
referralsRouter.get('/stats', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	
	if (!user || !user.referralCode) {
		return res.json({ 
			referralCode: null,
			totalReferrals: 0,
			successfulReferrals: 0,
			totalRewards: 0
		});
	}

	// Get all users referred by this user
	const allUsers = await store.users.list();
	const referrals = allUsers.filter(u => u.referredBy === user.referralCode);
	const successfulReferrals = referrals.filter(u => u.hasPreordered || u.trialStartTime);

	res.json({
		referralCode: user.referralCode,
		totalReferrals: referrals.length,
		successfulReferrals: successfulReferrals.length,
		totalRewards: user.referralRewards || 0
	});
});

// Apply referral code during signup
referralsRouter.post('/apply', async (req, res) => {
	const store = req.app.get('dataStore');
	const { code, userId } = req.body;
	
	if (!code || !userId) {
		return res.status(400).json({ error: 'Code and user ID required' });
	}

	// Find user who owns this referral code
	const allUsers = await store.users.list();
	const referrer = allUsers.find(u => u.referralCode === code.toUpperCase());
	
	if (!referrer) {
		return res.status(400).json({ error: 'Invalid referral code' });
	}

	// Check if user already has a referrer
	const user = await store.users.get(userId);
	if (user && user.referredBy) {
		return res.status(400).json({ error: 'Referral code already applied' });
	}

	// Apply referral code
	await store.users.update(userId, { referredBy: code.toUpperCase() });

	// Track referral
	try {
		await store.referrals?.create({
			id: uuidv4(),
			referrerId: referrer.id,
			referredUserId: userId,
			referralCode: code.toUpperCase(),
			status: 'pending',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
	} catch (e) {
		console.error('Failed to track referral:', e);
	}

	res.json({ success: true, message: 'Referral code applied' });
});

// Generate referral code (8 characters, alphanumeric)
function generateReferralCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
	let code = '';
	for (let i = 0; i < 8; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

