import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
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

// Validation middleware for preorder endpoints
const validatePromoCode = [
	body('promoCode').optional().trim().isLength({ min: 0, max: 50 }).withMessage('Promo code must be 50 characters or less')
];

const validateCommitment = [
	body('promoCode').optional().trim().isLength({ min: 0, max: 50 }).withMessage('Promo code must be 50 characters or less'),
	body('agreedToTerms').isBoolean().withMessage('agreedToTerms must be a boolean').custom((value) => {
		if (value !== true) {
			throw new Error('You must agree to the terms and conditions');
		}
		return true;
	})
];

// Calculate preorder amount (for display purposes)
preordersRouter.post('/calculate-amount', requireAuth(), validatePromoCode, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: errors.array()[0].msg });
	}

	const { promoCode } = req.body;
	
	// Sanitize and validate promo code
	const sanitizedPromoCode = promoCode ? String(promoCode).trim().toUpperCase().substring(0, 50) : null;
	
	// Calculate amount (apply promo code if valid)
	let amount = PREORDER_AMOUNT;
	let discountApplied = false;
	if (sanitizedPromoCode) {
		const validPromoCodes = {
			'LAUNCH20': 0.8, // 20% off
			'FOUNDER': 0.5,  // 50% off
			'BETA': 0.9      // 10% off
		};
		if (validPromoCodes[sanitizedPromoCode]) {
			amount = PREORDER_AMOUNT * validPromoCodes[sanitizedPromoCode];
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
preordersRouter.post('/commit', requireAuth(), validateCommitment, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: errors.array()[0].msg });
	}

	const store = req.app.get('dataStore');
	const { promoCode, agreedToTerms, plan, amount: requestedAmount } = req.body;
	
	// Check if user already preordered
	const user = await store.users.get(req.user.id);
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}
	
	if (user.hasPreordered) {
		return res.status(400).json({ error: 'You have already committed to pay' });
	}
	
	// Sanitize and validate promo code
	const sanitizedPromoCode = promoCode ? String(promoCode).trim().toUpperCase().substring(0, 50) : null;
	
	// Calculate amount - use requested amount if provided (from selected plan), otherwise use default
	let amount = requestedAmount ? parseFloat(requestedAmount) : PREORDER_AMOUNT;
	
	// Validate plan
	const validPlans = ['monthly', '6months', 'yearly'];
	const selectedPlan = plan && validPlans.includes(plan) ? plan : 'monthly';
	
	// Apply promo code discount if valid (only if using default amount)
	if (!requestedAmount && sanitizedPromoCode) {
		const validPromoCodes = {
			'LAUNCH20': 0.8, // 20% off
			'FOUNDER': 0.5,  // 50% off
			'BETA': 0.9      // 10% off
		};
		if (validPromoCodes[sanitizedPromoCode]) {
			amount = PREORDER_AMOUNT * validPromoCodes[sanitizedPromoCode];
		}
	}
	
	// Ensure amount is valid
	if (isNaN(amount) || amount <= 0) {
		amount = PREORDER_AMOUNT; // Fallback to default
	}
	
	try {
		const now = new Date().toISOString();
		const commitmentId = uuidv4();
		
		// Update user to mark as committed and clear session limit
		await store.users.update(req.user.id, {
			hasPreordered: true,
			preorderDate: now,
			preorderId: commitmentId,
			preorderAmount: Math.round(amount * 100) / 100,
			preorderPlan: selectedPlan, // Save selected plan
			preorderStatus: 'committed', // Status: committed (not yet paid)
			preorderPromoCode: sanitizedPromoCode || '',
			subscriptionActive: true, // Mark subscription as active
			sessionStartTime: null // Clear session timer - unlimited access granted
		});
		
		// Create commitment record for tracking in Google Sheets
		try {
			const preorderRecord = {
				id: commitmentId,
				userId: req.user.id,
				userEmail: req.user.email,
				userName: user.profile?.name || user.email,
				plan: selectedPlan,
				amount: Math.round(amount * 100) / 100,
				currency: 'EUR',
				promoCode: sanitizedPromoCode || '',
				paymentIntentId: null, // No payment intent for commitments
				status: 'committed', // Status: committed (will be 'paid' when processed)
				createdAt: now,
				updatedAt: now
			};
			
			console.log('Creating preorder record:', preorderRecord);
			await store.preorders.create(preorderRecord);
			console.log('✅ Preorder record created successfully');
		} catch (e) {
			// Log error but don't fail the commitment if tracking fails
			console.error('❌ Failed to create commitment record in Google Sheets:', e);
			console.error('Error details:', {
				message: e.message,
				stack: e.stack,
				commitmentId,
				userId: req.user.id
			});
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
					promoCode: sanitizedPromoCode || null
				},
				timestamp: now
			});
		} catch (e) {
			// Log error but don't fail the commitment if tracking fails
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to track conversion event:', e);
			}
		}
		
		res.json({ 
			success: true,
			commitmentId: commitmentId,
			preorderDate: now,
			amount: Math.round(amount * 100) / 100
		});
	} catch (error) {
		// Don't leak error details in production
		if (process.env.NODE_ENV === 'development') {
			console.error('Commitment creation error:', error);
		}
		res.status(500).json({ error: 'Failed to create commitment' });
	}
});


// Validate promo code (public endpoint, but rate limited)
preordersRouter.post('/validate-promo', validatePromoCode, (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: errors.array()[0].msg });
	}

	const { promoCode } = req.body;
	
	// Sanitize input
	const sanitizedCode = promoCode ? String(promoCode).trim().toUpperCase().substring(0, 50) : null;
	
	const validPromoCodes = {
		'LAUNCH20': { discount: 20, amount: PREORDER_AMOUNT * 0.8 },
		'FOUNDER': { discount: 50, amount: PREORDER_AMOUNT * 0.5 },
		'BETA': { discount: 10, amount: PREORDER_AMOUNT * 0.9 }
	};
	
	if (sanitizedCode && validPromoCodes[sanitizedCode]) {
		res.json({
			valid: true,
			discount: validPromoCodes[sanitizedCode].discount,
			amount: Math.round(validPromoCodes[sanitizedCode].amount * 100) / 100,
			originalAmount: PREORDER_AMOUNT
		});
	} else {
		// Always return same structure to prevent timing attacks
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
		// Log error but don't fail the request if tracking fails
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to track page view:', e);
		}
		res.json({ success: false });
	}
});

