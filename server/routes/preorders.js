import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { trackConversionEvent } from '../utils/conversionTracking.js';

const PREORDER_AMOUNT = 4.99; // €4.99

export const preordersRouter = express.Router();

// Get preorder status
preordersRouter.get('/status', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	if (!user) return res.status(404).json({ error: 'User not found' });
	
	res.json({
		hasPreordered: user.hasPreordered || false,
		preorderDate: user.preorderDate || null,
		preorderId: user.preorderId || null
	});
});

// Calculate preorder amount (for display purposes)
preordersRouter.post('/calculate-amount', requireAuth(), async (req, res) => {
	const { promoCode } = req.body;
	
	// Calculate amount (apply promo code if valid)
	let amount = PREORDER_AMOUNT;
	let discountApplied = false;
	if (promoCode) {
		const validPromoCodes = {
			'LAUNCH20': 0.8, // 20% off
			'FOUNDER': 0.5,  // 50% off
			'BETA': 0.9      // 10% off
		};
		if (validPromoCodes[promoCode.toUpperCase()]) {
			amount = PREORDER_AMOUNT * validPromoCodes[promoCode.toUpperCase()];
			discountApplied = true;
		}
	}
	
	res.json({ 
		amount: Math.round(amount * 100) / 100, // Round to 2 decimals
		originalAmount: PREORDER_AMOUNT,
		discountApplied: discountApplied
	});
});

// Create commitment to pay (replaces Stripe payment)
preordersRouter.post('/commit', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const { promoCode, agreedToTerms } = req.body;
	
	// Check if user already preordered
	const user = await store.users.get(req.user.id);
	if (user?.hasPreordered) {
		return res.status(400).json({ error: 'User has already committed to pay' });
	}
	
	if (!agreedToTerms) {
		return res.status(400).json({ error: 'You must agree to the terms and conditions' });
	}
	
	// Calculate amount (apply promo code if valid)
	let amount = PREORDER_AMOUNT;
	if (promoCode) {
		const validPromoCodes = {
			'LAUNCH20': 0.8, // 20% off
			'FOUNDER': 0.5,  // 50% off
			'BETA': 0.9      // 10% off
		};
		if (validPromoCodes[promoCode.toUpperCase()]) {
			amount = PREORDER_AMOUNT * validPromoCodes[promoCode.toUpperCase()];
		}
	}
	
	try {
		const now = new Date().toISOString();
		const commitmentId = uuidv4();
		
		// Update user to mark as committed
		await store.users.update(req.user.id, {
			hasPreordered: true,
			preorderDate: now,
			preorderId: commitmentId,
			preorderAmount: Math.round(amount * 100) / 100,
			preorderStatus: 'committed', // Status: committed (not yet paid)
			preorderPromoCode: promoCode || ''
		});
		
		// Create commitment record for tracking
		try {
			await store.preorders.create({
				id: commitmentId,
				userId: req.user.id,
				userEmail: req.user.email,
				paymentIntentId: null, // No payment intent for commitments
				amount: Math.round(amount * 100) / 100,
				promoCode: promoCode || '',
				status: 'committed', // Status: committed (will be 'paid' when processed)
				createdAt: now,
				updatedAt: now
			});
		} catch (e) {
			console.error('Failed to create commitment record:', e);
		}
		
		// Track conversion event: commitment_made
		try {
			await trackConversionEvent(store, {
				userId: req.user.id,
				userEmail: req.user.email,
				eventType: 'commitment_made',
				eventData: {
					commitmentId,
					amount: Math.round(amount * 100) / 100,
					promoCode: promoCode || null
				},
				timestamp: now
			});
		} catch (e) {
			console.error('Failed to track conversion event:', e);
		}
		
		res.json({ 
			success: true,
			commitmentId: commitmentId,
			preorderDate: now,
			amount: Math.round(amount * 100) / 100
		});
	} catch (error) {
		console.error('Commitment creation error:', error);
		res.status(500).json({ error: 'Failed to create commitment' });
	}
});


// Validate promo code
preordersRouter.post('/validate-promo', (req, res) => {
	const { promoCode } = req.body;
	const validPromoCodes = {
		'LAUNCH20': { discount: 20, amount: PREORDER_AMOUNT * 0.8 },
		'FOUNDER': { discount: 50, amount: PREORDER_AMOUNT * 0.5 },
		'BETA': { discount: 10, amount: PREORDER_AMOUNT * 0.9 }
	};
	
	const code = promoCode?.toUpperCase();
	if (code && validPromoCodes[code]) {
		res.json({
			valid: true,
			discount: validPromoCodes[code].discount,
			amount: Math.round(validPromoCodes[code].amount * 100) / 100,
			originalAmount: PREORDER_AMOUNT
		});
	} else {
		res.json({ valid: false });
	}
});

// Track preorder page view (conversion event)
preordersRouter.post('/track-page-view', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const now = new Date().toISOString();
	
	try {
		await trackConversionEvent(store, {
			userId: req.user.id,
			userEmail: req.user.email,
			eventType: 'preorder_page_viewed',
			eventData: {},
			timestamp: now
		});
		res.json({ success: true });
	} catch (e) {
		console.error('Failed to track page view:', e);
		res.json({ success: false });
	}
});

