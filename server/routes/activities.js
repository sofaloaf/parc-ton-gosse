import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ActivitiesService } from '../services/activitiesService.js';

export const activitiesRouter = express.Router();

// List with filters: category, ageRange, date, price, neighborhood, q
// No time limits - card view counter handles paywall (10 free cards)
// Now with caching and pagination support
activitiesRouter.get('/', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		if (!store) {
			return res.status(503).json({ 
				error: 'Data store not available',
				message: 'The data store is still initializing. Please try again in a moment.',
				code: 'DATA_STORE_NOT_READY'
			});
		}

		const service = new ActivitiesService(store);
		const { 
			category, minAge, maxAge, startDate, endDate, minPrice, maxPrice, 
			neighborhood, q, limit, offset 
		} = req.query;

		const filters = {
			category, minAge, maxAge, startDate, endDate,
			minPrice, maxPrice, neighborhood, q
		};

		const pagination = { limit, offset };
		const options = {
			user: req.user,
			forceRefresh: req.query.refresh === 'true'
		};

		const result = await service.list(filters, pagination, options);
		res.json(result);
	} catch (error) {
		console.error('❌ Error in /api/activities:', error.message || error);
		
		const statusCode = error.statusCode || 500;
		const errorResponse = {
			error: 'Failed to fetch activities',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ACTIVITIES_FETCH_ERROR',
			timestamp: new Date().toISOString()
		};

		if (error.duration) {
			errorResponse.duration = error.duration;
		}

		res.status(statusCode).json(errorResponse);
	}
});

activitiesRouter.get('/:id', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ActivitiesService(store);
		const result = await service.get(req.params.id);
		res.json(result);
	} catch (error) {
		console.error('❌ Error fetching activity:', error.message || error);
		
		const statusCode = error.statusCode || 500;
		const errorResponse = {
			error: 'Failed to fetch activity',
			message: error.message || 'Activity not found',
			code: error.code || 'ACTIVITY_FETCH_ERROR'
		};

		if (error.duration) {
			errorResponse.duration = error.duration;
		}

		res.status(statusCode).json(errorResponse);
	}
});

// Provider or admin create
activitiesRouter.post('/', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ActivitiesService(store);
		const created = await service.create(req.body, { user: req.user });
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error creating activity:', error.message || error);
		
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to create activity',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ACTIVITY_CREATE_ERROR'
		});
	}
});

activitiesRouter.put('/:id', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ActivitiesService(store);
		const updated = await service.update(req.params.id, req.body, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error updating activity:', error.message || error);
		
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to update activity',
			message: error.message || 'Activity not found',
			code: error.code || 'ACTIVITY_UPDATE_ERROR'
		});
	}
});

activitiesRouter.delete('/:id', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new ActivitiesService(store);
		const result = await service.delete(req.params.id, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error deleting activity:', error.message || error);
		
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to delete activity',
			message: error.message || 'Activity not found',
			code: error.code || 'ACTIVITY_DELETE_ERROR'
		});
	}
});


