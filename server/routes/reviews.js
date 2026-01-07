import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ReviewsService } from '../services/reviewsService.js';

export const reviewsRouter = express.Router();

// Get all reviews
reviewsRouter.get('/', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const filters = {
			status: req.query.status || 'approved'
		};
		const reviews = await service.list(filters, { user: req.user });
		res.json(reviews);
	} catch (error) {
		console.error('❌ Error listing reviews:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to list reviews',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'REVIEWS_LIST_ERROR'
		});
	}
});

// Get reviews for a specific activity
reviewsRouter.get('/activity/:activityId', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const reviews = await service.getByActivity(req.params.activityId, { user: req.user });
		res.json(reviews);
	} catch (error) {
		console.error('❌ Error fetching activity reviews:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch activity reviews',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ACTIVITY_REVIEWS_FETCH_ERROR'
		});
	}
});

// Get average rating for an activity
reviewsRouter.get('/activity/:activityId/rating', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const rating = await service.getRating(req.params.activityId, { user: req.user });
		res.json(rating);
	} catch (error) {
		console.error('❌ Error calculating rating:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to calculate rating',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'RATING_CALCULATION_ERROR'
		});
	}
});

// Batch get ratings for multiple activities (optimized)
reviewsRouter.post('/activities/ratings', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const { activityIds } = req.body;
		
		if (!activityIds || !Array.isArray(activityIds)) {
			return res.status(400).json({ 
				error: 'activityIds array required',
				code: 'VALIDATION_ERROR'
			});
		}

		const ratingsMap = await service.getBatchRatings(activityIds, { user: req.user });
		res.json(ratingsMap);
	} catch (error) {
		console.error('❌ Error batch fetching ratings:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch ratings',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'BATCH_RATINGS_FETCH_ERROR'
		});
	}
});

// Get user's review for an activity (if exists)
reviewsRouter.get('/activity/:activityId/user', requireAuth(null), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const review = await service.getUserReview(req.params.activityId, req.user.id, { user: req.user });
		
		if (!review) {
			return res.status(404).json({ 
				error: 'Not found',
				code: 'REVIEW_NOT_FOUND'
			});
		}
		
		res.json(review);
	} catch (error) {
		console.error('❌ Error fetching user review:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch user review',
			message: error.message || 'Review not found',
			code: error.code || 'USER_REVIEW_FETCH_ERROR'
		});
	}
});

// Get single review
reviewsRouter.get('/:id', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const review = await service.get(req.params.id, { user: req.user });
		res.json(review);
	} catch (error) {
		console.error('❌ Error fetching review:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch review',
			message: error.message || 'Review not found',
			code: error.code || 'REVIEW_FETCH_ERROR'
		});
	}
});

// Create or update review (any authenticated user can rate)
reviewsRouter.post('/', requireAuth(null), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const review = await service.createOrUpdate(req.body, { user: req.user });
		
		// If it's a new review, return 201, otherwise 200
		const isNew = !req.body.existingReviewId;
		res.status(isNew ? 201 : 200).json(review);
	} catch (error) {
		console.error('❌ Error creating/updating review:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to create or update review',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'REVIEW_CREATE_ERROR'
		});
	}
});

// Moderation
reviewsRouter.put('/:id/moderate', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const updated = await service.moderate(req.params.id, req.body.status, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error moderating review:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to moderate review',
			message: error.message || 'Review not found',
			code: error.code || 'REVIEW_MODERATE_ERROR'
		});
	}
});

reviewsRouter.delete('/:id', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ReviewsService(store);
		const result = await service.delete(req.params.id, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error deleting review:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to delete review',
			message: error.message || 'Review not found',
			code: error.code || 'REVIEW_DELETE_ERROR'
		});
	}
});


