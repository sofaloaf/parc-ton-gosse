import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { PreordersService } from '../services/preordersService.js';

export const preordersRouter = express.Router();

// Get preorder status
preordersRouter.get('/status', requireAuth(), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new PreordersService(store);
		const status = await service.getStatus(req.user.id, { user: req.user });
		res.json(status);
	} catch (error) {
		console.error('❌ Error getting preorder status:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to get preorder status',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'PREORDER_STATUS_ERROR'
		});
	}
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
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ error: errors.array()[0].msg });
		}

		const store = req.app.get('dataStore');
		const service = new PreordersService(store);
		const result = await service.calculateAmount(req.body, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error calculating amount:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to calculate amount',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'AMOUNT_CALCULATION_ERROR'
		});
	}
});

// Create commitment to pay (replaces Stripe payment)
preordersRouter.post('/commit', requireAuth(), validateCommitment, async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ error: errors.array()[0].msg });
		}

		const store = req.app.get('dataStore');
		const service = new PreordersService(store);
		const result = await service.createCommitment(req.body, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error creating commitment:', error.message || error);
		const statusCode = error.statusCode || 500;
		
		// Don't leak error details in production
		const message = process.env.NODE_ENV === 'production' && statusCode === 500
			? 'Failed to create commitment'
			: error.message || 'Failed to create commitment';
		
		res.status(statusCode).json({
			error: 'Failed to create commitment',
			message,
			code: error.code || 'COMMITMENT_CREATE_ERROR'
		});
	}
});


// Validate promo code (public endpoint, but rate limited)
preordersRouter.post('/validate-promo', validatePromoCode, (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ error: errors.array()[0].msg });
		}

		const store = req.app.get('dataStore');
		const service = new PreordersService(store);
		const result = service.validatePromoCode(req.body.promoCode);
		
		// Always return same structure to prevent timing attacks
		res.json(result);
	} catch (error) {
		console.error('❌ Error validating promo code:', error.message || error);
		res.json({ valid: false });
	}
});

// Track preorder page view (conversion event)
preordersRouter.post('/track-page-view', requireAuth(), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new PreordersService(store);
		const result = await service.trackPageView(req.user.id, req.user.email, { user: req.user });
		res.json(result);
	} catch (error) {
		// Log error but don't fail the request if tracking fails
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to track page view:', error);
		}
		res.json({ success: false });
	}
});

