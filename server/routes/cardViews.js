/**
 * Card Views Routes
 * Tracks card views for paywall enforcement (10 free cards)
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

export const cardViewsRouter = express.Router();

// Get current card view count (no auth required)
cardViewsRouter.get('/status', async (req, res, next) => {
	try {
		const store = req.app.get('dataStore');
		
		// Check if user is authenticated
		if (req.user) {
			const userData = await store.users.get(req.user.id);
			
			// Check if user has unlimited access
			if (userData?.hasPreordered || userData?.subscriptionActive || 
			    userData?.role === 'admin' || userData?.role === 'provider') {
				return res.json({ count: 0, unlimited: true });
			}
			
			// Get count from user record
			const count = userData?.cardViewCount || 0;
			return res.json({ count, unlimited: false });
		}

		// For anonymous users, use localStorage fallback (tracked on frontend)
		// Backend doesn't track anonymous users - frontend handles it
		res.json({ count: 0, unlimited: false });
	} catch (error) {
		next(error);
	}
});

// Track a card view (no auth required - anonymous users tracked on frontend)
cardViewsRouter.post('/track', async (req, res, next) => {
	try {
		const store = req.app.get('dataStore');
		const { activityId } = req.body;
		
		if (!activityId) {
			return res.status(400).json({ error: 'Activity ID required' });
		}

		// Check if user is authenticated
		if (req.user) {
			const userData = await store.users.get(req.user.id);
			
			// Check if user has unlimited access
			if (userData?.hasPreordered || userData?.subscriptionActive || 
			    userData?.role === 'admin' || userData?.role === 'provider') {
				return res.json({ count: 0, unlimited: true });
			}

			// Increment count for authenticated user
			const currentCount = userData?.cardViewCount || 0;
			const newCount = currentCount + 1;
			
			await store.users.update(req.user.id, { cardViewCount: newCount });
			
			return res.json({ count: newCount, unlimited: false });
		}

		// For anonymous users, frontend handles tracking in localStorage
		// Backend just acknowledges the request
		res.json({ count: 0, unlimited: false, message: 'Tracked on frontend' });
	} catch (error) {
		next(error);
	}
});

