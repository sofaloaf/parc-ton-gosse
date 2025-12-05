import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getCache, cacheKeys, invalidateActivities } from '../services/cache/index.js';

export const activitiesRouter = express.Router();

// List with filters: category, ageRange, date, price, neighborhood, q
// No time limits - card view counter handles paywall (10 free cards)
// Now with caching and pagination support
activitiesRouter.get('/', async (req, res) => {
	const startTime = Date.now();
	try {
		const store = req.app.get('dataStore');
		if (!store) {
			console.error('❌ Data store not initialized');
			return res.status(503).json({ 
				error: 'Data store not available',
				message: 'The data store is still initializing. Please try again in a moment.',
				code: 'DATA_STORE_NOT_READY'
			});
		}
		
		const { 
			category, minAge, maxAge, startDate, endDate, minPrice, maxPrice, 
			neighborhood, q, limit, offset 
		} = req.query;
		
		// Parse pagination params
		const limitNum = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20; // Max 100 per page
		const offsetNum = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;
		
		// Build filter object for cache key
		const filters = {
			category, minAge, maxAge, startDate, endDate, 
			minPrice, maxPrice, neighborhood, q
		};
		
		// Check cache first
		const cache = getCache();
		const cacheKey = cacheKeys.activities.list(filters);
		const cached = cache.get(cacheKey);
		
		let all;
		if (cached) {
			console.log('✅ Cache hit for activities list');
			all = cached;
		} else {
			console.log('📥 Cache miss - fetching activities from data store...');
			
			// Add timeout protection
			const timeoutMs = 30000; // 30 seconds
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Data store operation timed out')), timeoutMs)
			);
			
			const dataPromise = store.activities.list();
			all = await Promise.race([dataPromise, timeoutPromise]);
			console.log(`✅ Retrieved ${all.length} activities from data store`);
			
			// Cache for 5 minutes (300000ms)
			cache.set(cacheKey, all, 300000);
		}
	
		// Filter out pending activities (only show approved ones to regular users)
		// Admin users can see all activities
		// Activities without approvalStatus are treated as approved (backward compatibility)
		const isAdmin = req.user?.role === 'admin';
		const approvedActivities = isAdmin 
			? all 
			: all.filter(a => !a.approvalStatus || (a.approvalStatus !== 'pending' && a.approvalStatus !== 'rejected'));
	
		// Apply filters
		const filtered = approvedActivities.filter((a) => {
			let ok = true;
			if (category) ok = ok && a.categories?.includes(category);
			// Age filtering: activity age range overlaps with user's desired age range
			if (minAge || maxAge) {
				const actMinAge = a.ageMin ?? 0;
				const actMaxAge = a.ageMax ?? 999;
				const userMinAge = minAge ? Number(minAge) : 0;
				const userMaxAge = maxAge ? Number(maxAge) : 999;
				// Ranges overlap if: actMinAge <= userMaxAge && actMaxAge >= userMinAge
				ok = ok && actMinAge <= userMaxAge && actMaxAge >= userMinAge;
			}
			if (neighborhood) ok = ok && a.neighborhood === neighborhood;
			if (minPrice) ok = ok && (a.price?.amount ?? 0) >= Number(minPrice);
			if (maxPrice) ok = ok && (a.price?.amount ?? 0) <= Number(maxPrice);
			if (startDate) ok = ok && a.schedule?.some((s) => new Date(s.date) >= new Date(startDate));
			if (endDate) ok = ok && a.schedule?.some((s) => new Date(s.date) <= new Date(endDate));
			if (q) {
				const str = `${a.title?.en || ''} ${a.title?.fr || ''} ${a.description?.en || ''} ${a.description?.fr || ''}`.toLowerCase();
				ok = ok && str.includes(String(q).toLowerCase());
			}
			return ok;
		});
		
		// Apply pagination
		const total = filtered.length;
		const paginated = filtered.slice(offsetNum, offsetNum + limitNum);
		const hasMore = offsetNum + limitNum < total;
		
		const duration = Date.now() - startTime;
		console.log(`✅ Returning ${paginated.length} activities (${total} total, ${duration}ms)`);
		
		// Return paginated response
		res.json({
			data: paginated,
			pagination: {
				limit: limitNum,
				offset: offsetNum,
				total,
				hasMore,
				page: Math.floor(offsetNum / limitNum) + 1,
				totalPages: Math.ceil(total / limitNum)
			},
			// Include metadata
			_meta: {
				cached: !!cached,
				duration: `${duration}ms`
			}
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error('❌ Error in /api/activities:', error.message);
		console.error('Stack:', error.stack);
		
		// Sanitize error message for production
		const isProduction = process.env.NODE_ENV === 'production';
		const errorMessage = isProduction 
			? 'Failed to fetch activities. Please try again later.'
			: error.message;
		
		// Determine appropriate status code
		let statusCode = 500;
		if (error.message.includes('timeout')) {
			statusCode = 504; // Gateway Timeout
		} else if (error.message.includes('not available') || error.message.includes('not initialized')) {
			statusCode = 503; // Service Unavailable
		}
		
		res.status(statusCode).json({ 
			error: 'Failed to fetch activities',
			message: errorMessage,
			code: 'ACTIVITIES_FETCH_ERROR',
			timestamp: new Date().toISOString(),
			duration: `${duration}ms`
		});
	}
});

activitiesRouter.get('/:id', async (req, res) => {
	const startTime = Date.now();
	try {
		const store = req.app.get('dataStore');
		const cache = getCache();
		const cacheKey = cacheKeys.activities.item(req.params.id);
		
		// Check cache first
		let act = cache.get(cacheKey);
		
		if (!act) {
			act = await store.activities.get(req.params.id);
			if (act) {
				// Cache for 10 minutes (600000ms)
				cache.set(cacheKey, act, 600000);
			}
		} else {
			console.log('✅ Cache hit for activity:', req.params.id);
		}
		
		if (!act) return res.status(404).json({ error: 'Not found' });
		
		const duration = Date.now() - startTime;
		res.json({
			...act,
			_meta: {
				cached: !!cache.get(cacheKey),
				duration: `${duration}ms`
			}
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error('❌ Error fetching activity:', error.message);
		res.status(500).json({ 
			error: 'Failed to fetch activity',
			message: error.message,
			duration: `${duration}ms`
		});
	}
});

// Provider or admin create
activitiesRouter.post('/', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const cache = getCache();
		const now = new Date().toISOString();
		const activity = { id: uuidv4(), ...req.body, createdAt: now, updatedAt: now };
		const created = await store.activities.create(activity);
		
		// Invalidate cache
		invalidateActivities(cache);
		
		// Cache the new activity
		cache.set(cacheKeys.activities.item(created.id), created, 600000);
		
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error creating activity:', error.message);
		res.status(500).json({ error: 'Failed to create activity', message: error.message });
	}
});

activitiesRouter.put('/:id', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const cache = getCache();
		const updated = await store.activities.update(req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
		if (!updated) return res.status(404).json({ error: 'Not found' });
		
		// Invalidate cache
		invalidateActivities(cache);
		
		// Update cached activity
		cache.set(cacheKeys.activities.item(updated.id), updated, 600000);
		
		res.json(updated);
	} catch (error) {
		console.error('❌ Error updating activity:', error.message);
		res.status(500).json({ error: 'Failed to update activity', message: error.message });
	}
});

activitiesRouter.delete('/:id', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const cache = getCache();
		const ok = await store.activities.remove(req.params.id);
		if (!ok) return res.status(404).json({ error: 'Not found' });
		
		// Invalidate cache
		invalidateActivities(cache);
		cache.delete(cacheKeys.activities.item(req.params.id));
		
		res.json({ ok: true });
	} catch (error) {
		console.error('❌ Error deleting activity:', error.message);
		res.status(500).json({ error: 'Failed to delete activity', message: error.message });
	}
});


