/**
 * Cache Management Routes
 * Provides endpoints for monitoring and managing cache
 */

import express from 'express';
import { getCache } from '../services/cache/index.js';
import { requireAuth } from '../middleware/auth.js';

export const cacheRouter = express.Router();

// Get cache statistics (admin only)
cacheRouter.get('/stats', requireAuth('admin'), (req, res) => {
	try {
		const cache = getCache();
		const stats = cache.getStats();
		
		res.json({
			...stats,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error fetching cache stats:', error);
		res.status(500).json({ error: 'Failed to fetch cache stats', message: error.message });
	}
});

// Clear cache (admin only)
cacheRouter.post('/clear', requireAuth('admin'), (req, res) => {
	try {
		const cache = getCache();
		const cleared = cache.clear();
		
		res.json({
			message: 'Cache cleared successfully',
			itemsCleared: cleared,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error clearing cache:', error);
		res.status(500).json({ error: 'Failed to clear cache', message: error.message });
	}
});

// Get cache size (admin only)
cacheRouter.get('/size', requireAuth('admin'), (req, res) => {
	try {
		const cache = getCache();
		const size = cache.size();
		
		res.json({
			size,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error fetching cache size:', error);
		res.status(500).json({ error: 'Failed to fetch cache size', message: error.message });
	}
});

