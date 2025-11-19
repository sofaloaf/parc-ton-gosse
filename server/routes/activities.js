import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { checkSessionLimit } from '../middleware/sessionLimit.js';

export const activitiesRouter = express.Router();

// List with filters: category, ageRange, date, price, neighborhood, q
// Allows anonymous access for 5 minutes, then requires authentication
// Authenticated users get 20 minutes before requiring commitment
activitiesRouter.get('/', async (req, res, next) => {
	// Check if user is authenticated
	if (req.user) {
		// Authenticated user - check session limit (20 minutes)
		return checkSessionLimit(req, res, next);
	}
	// Anonymous user - allow access (AccessGate handles 5-minute limit on frontend)
	// No backend enforcement needed for anonymous browsing
	next();
}, async (req, res) => {
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
		
		const { category, minAge, maxAge, startDate, endDate, minPrice, maxPrice, neighborhood, q } = req.query;
		console.log('📥 Fetching activities from data store...');
		
		// Add timeout protection
		const timeoutMs = 30000; // 30 seconds
		const timeoutPromise = new Promise((_, reject) => 
			setTimeout(() => reject(new Error('Data store operation timed out')), timeoutMs)
		);
		
		const dataPromise = store.activities.list();
		const all = await Promise.race([dataPromise, timeoutPromise]);
		console.log(`✅ Retrieved ${all.length} activities from data store`);
	const results = all.filter((a) => {
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
	console.log(`✅ Returning ${results.length} filtered activities`);
	res.json(results);
	} catch (error) {
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
			timestamp: new Date().toISOString()
		});
	}
});

activitiesRouter.get('/:id', async (req, res, next) => {
	// Check if user is authenticated
	if (req.user) {
		// Authenticated user - check session limit (20 minutes)
		return checkSessionLimit(req, res, next);
	}
	// Anonymous users can also view individual activities (AccessGate handles limit)
	next();
}, async (req, res) => {
	const store = req.app.get('dataStore');
	const act = await store.activities.get(req.params.id);
	if (!act) return res.status(404).json({ error: 'Not found' });
	res.json(act);
});

// Provider or admin create
activitiesRouter.post('/', requireAuth('provider'), async (req, res) => {
	const store = req.app.get('dataStore');
	const now = new Date().toISOString();
	const activity = { id: uuidv4(), ...req.body, createdAt: now, updatedAt: now };
	const created = await store.activities.create(activity);
	res.status(201).json(created);
});

activitiesRouter.put('/:id', requireAuth('provider'), async (req, res) => {
	const store = req.app.get('dataStore');
	const updated = await store.activities.update(req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

activitiesRouter.delete('/:id', requireAuth('provider'), async (req, res) => {
	const store = req.app.get('dataStore');
	const ok = await store.activities.remove(req.params.id);
	if (!ok) return res.status(404).json({ error: 'Not found' });
	res.json({ ok: true });
});


