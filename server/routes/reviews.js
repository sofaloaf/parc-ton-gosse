import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

export const reviewsRouter = express.Router();

// Get all reviews
reviewsRouter.get('/', async (req, res) => {
	const store = req.app.get('dataStore');
	res.json(await store.reviews.list());
});

// Get reviews for a specific activity
reviewsRouter.get('/activity/:activityId', async (req, res) => {
	const store = req.app.get('dataStore');
	const allReviews = await store.reviews.list();
	const activityReviews = allReviews.filter(r => r.activityId === req.params.activityId && (r.status === 'approved' || !r.status));
	res.json(activityReviews);
});

// Get average rating for an activity
reviewsRouter.get('/activity/:activityId/rating', async (req, res) => {
	const store = req.app.get('dataStore');
	const allReviews = await store.reviews.list();
	const activityReviews = allReviews.filter(r => 
		r.activityId === req.params.activityId && 
		(r.status === 'approved' || !r.status) &&
		r.rating != null
	);
	
	if (activityReviews.length === 0) {
		return res.json({ average: 0, count: 0 });
	}
	
	const sum = activityReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
	const average = sum / activityReviews.length;
	
	res.json({ 
		average: Math.round(average * 10) / 10, // Round to 1 decimal
		count: activityReviews.length 
	});
});

// Batch get ratings for multiple activities (optimized)
reviewsRouter.post('/activities/ratings', async (req, res) => {
	const store = req.app.get('dataStore');
	const { activityIds } = req.body;
	
	if (!activityIds || !Array.isArray(activityIds)) {
		return res.status(400).json({ error: 'activityIds array required' });
	}
	
	// Limit to prevent abuse
	const idsToFetch = activityIds.slice(0, 50);
	
	try {
		const allReviews = await store.reviews.list();
		const approvedReviews = allReviews.filter(r => 
			(r.status === 'approved' || !r.status) &&
			r.rating != null
		);
		
		const ratingsMap = {};
		
		idsToFetch.forEach(activityId => {
			const activityReviews = approvedReviews.filter(r => r.activityId === activityId);
			
			if (activityReviews.length === 0) {
				ratingsMap[activityId] = { average: 0, count: 0 };
			} else {
				const sum = activityReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
				const average = sum / activityReviews.length;
				ratingsMap[activityId] = {
					average: Math.round(average * 10) / 10,
					count: activityReviews.length
				};
			}
		});
		
		res.json(ratingsMap);
	} catch (error) {
		console.error('Failed to batch fetch ratings:', error);
		res.status(500).json({ error: 'Failed to fetch ratings' });
	}
});

// Get user's review for an activity (if exists)
reviewsRouter.get('/activity/:activityId/user', requireAuth(null), async (req, res) => {
	const store = req.app.get('dataStore');
	const allReviews = await store.reviews.list();
	const userReview = allReviews.find(r => 
		r.activityId === req.params.activityId && 
		(r.parentId === req.user.id || r.userId === req.user.id)
	);
	
	if (!userReview) {
		return res.status(404).json({ error: 'Not found' });
	}
	
	res.json(userReview);
});

// Get single review
reviewsRouter.get('/:id', async (req, res) => {
	const store = req.app.get('dataStore');
	const item = await store.reviews.get(req.params.id);
	if (!item) return res.status(404).json({ error: 'Not found' });
	res.json(item);
});

// Create or update review (any authenticated user can rate)
reviewsRouter.post('/', requireAuth(null), async (req, res) => {
	const store = req.app.get('dataStore');
	const { activityId, rating, comment } = req.body;
	
	if (!activityId || !rating) {
		return res.status(400).json({ error: 'activityId and rating are required' });
	}
	
	if (rating < 1 || rating > 5) {
		return res.status(400).json({ error: 'Rating must be between 1 and 5' });
	}
	
	// Check if user already reviewed this activity
	const allReviews = await store.reviews.list();
	const existingReview = allReviews.find(r => 
		r.activityId === activityId && 
		(r.parentId === req.user.id || r.userId === req.user.id)
	);
	
	const now = new Date().toISOString();
	
	if (existingReview) {
		// Update existing review
		const updated = await store.reviews.update(existingReview.id, {
			rating: Number(rating),
			comment: comment || existingReview.comment || '',
			updatedAt: now
		});
		res.json(updated);
	} else {
		// Create new review
		const review = {
			id: uuidv4(),
			activityId,
			parentId: req.user.id,
			userId: req.user.id,
			rating: Number(rating),
			comment: comment || '',
			status: 'approved', // Auto-approve ratings (can be moderated later if needed)
			createdAt: now,
			updatedAt: now
		};
		const created = await store.reviews.create(review);
		res.status(201).json(created);
	}
});

// Moderation
reviewsRouter.put('/:id/moderate', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const updated = await store.reviews.update(req.params.id, { status: req.body.status, updatedAt: new Date().toISOString() });
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

reviewsRouter.delete('/:id', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const ok = await store.reviews.remove(req.params.id);
	if (!ok) return res.status(404).json({ error: 'Not found' });
	res.json({ ok: true });
});


