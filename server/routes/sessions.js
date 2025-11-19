import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const sessionsRouter = express.Router();

/**
 * POST /api/sessions/start
 * Track session start time for 5-minute free browsing limit
 */
sessionsRouter.post('/start', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}

	// Admin and provider have unlimited access
	if (user.role === 'admin' || user.role === 'provider') {
		return res.json({ 
			unlimited: true,
			message: 'Unlimited access granted'
		});
	}

	// Users who have committed to pay have unlimited access
	if (user.hasPreordered) {
		return res.json({ 
			unlimited: true,
			message: 'Unlimited access granted'
		});
	}

	// Check if session already started
	const now = new Date().toISOString();
	let sessionStartTime = user.sessionStartTime;

	// If no session start time, create one
	if (!sessionStartTime) {
		sessionStartTime = now;
		await store.users.update(req.user.id, { sessionStartTime: now });
	}

	// Calculate time remaining (20 minutes = 1200000 ms for authenticated users)
	const AUTHENTICATED_BROWSING_TIME = 20 * 60 * 1000;
	const start = new Date(sessionStartTime);
	const elapsed = new Date() - start;
	const remaining = Math.max(0, AUTHENTICATED_BROWSING_TIME - elapsed);

	res.json({
		sessionStartTime,
		timeRemaining: remaining,
		expired: remaining <= 0
	});
});

/**
 * GET /api/sessions/status
 * Get current session status and time remaining
 */
sessionsRouter.get('/status', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}

	// Admin and provider have unlimited access
	if (user.role === 'admin' || user.role === 'provider') {
		return res.json({ 
			unlimited: true,
			timeRemaining: null
		});
	}

	// Users who have committed to pay have unlimited access
	if (user.hasPreordered) {
		return res.json({ 
			unlimited: true,
			timeRemaining: null
		});
	}

	// Check session time (20 minutes for authenticated users)
	const AUTHENTICATED_BROWSING_TIME = 20 * 60 * 1000;
	let sessionStartTime = user.sessionStartTime;

	if (!sessionStartTime) {
		// No session started yet, return full time (20 minutes)
		return res.json({
			sessionStartTime: null,
			timeRemaining: AUTHENTICATED_BROWSING_TIME,
			expired: false
		});
	}

	const start = new Date(sessionStartTime);
	const now = new Date();
	const elapsed = now - start;
	const remaining = Math.max(0, AUTHENTICATED_BROWSING_TIME - elapsed);

	res.json({
		sessionStartTime,
		timeRemaining: remaining,
		expired: remaining <= 0
	});
});

