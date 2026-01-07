import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { FeedbackService } from '../services/feedbackService.js';

const feedbackRouter = express.Router();

// Public feedback submission endpoint
feedbackRouter.post('/submit', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		if (!store) {
			return res.status(503).json({
				error: 'Service unavailable',
				message: 'Data store not available. Please try again in a moment.',
				code: 'DATA_STORE_NOT_AVAILABLE'
			});
		}

		const service = new FeedbackService(store);
		const created = await service.submitFeedback(req.body, {
			user: req.user,
			userAgent: req.headers['user-agent'] || ''
		});
		
		// If feedback was queued due to rate limit, return 202 (Accepted) instead of 201
		if (created._queued) {
			return res.status(202).json({
				...created,
				message: 'Feedback received and will be saved shortly'
			});
		}
		
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error submitting feedback:', {
			message: error.message,
			statusCode: error.statusCode,
			code: error.code,
			stack: error.stack
		});
		
		const statusCode = error.statusCode || 500;
		const isRateLimit = statusCode === 429 || 
			error.message?.includes('Quota exceeded') || 
			error.message?.includes('rateLimitExceeded');

		res.status(statusCode).json({
			error: 'Failed to submit feedback',
			message: isRateLimit 
				? 'Service is temporarily overloaded. Your feedback has been received and will be saved shortly.'
				: (error.message || 'An unexpected error occurred'),
			code: error.code || 'FEEDBACK_SUBMIT_ERROR'
		});
	}
});

// Public organization submission endpoint
feedbackRouter.post('/add-organization', async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new FeedbackService(store);
		const created = await service.submitOrganization(req.body, {
			user: req.user,
			userAgent: req.headers['user-agent'] || ''
		});
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error submitting organization:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to submit organization',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ORGANIZATION_SUBMIT_ERROR'
		});
	}
});

// Protected admin routes to view submissions
feedbackRouter.get('/list', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new FeedbackService(store);
		const feedbacks = await service.listFeedback({ user: req.user });
		res.json(feedbacks);
	} catch (error) {
		console.error('❌ Error fetching feedback:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch feedback',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'FEEDBACK_LIST_ERROR'
		});
	}
});

feedbackRouter.get('/organizations/list', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new FeedbackService(store);
		const orgs = await service.listOrganizations({ user: req.user });
		res.json(orgs);
	} catch (error) {
		console.error('❌ Error fetching organizations:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch organization suggestions',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ORGANIZATIONS_LIST_ERROR'
		});
	}
});

feedbackRouter.patch('/organizations/:id/approve', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new FeedbackService(store);
		const updated = await service.approveOrganization(req.params.id, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error approving organization:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to approve organization',
			message: error.message || 'Organization not found',
			code: error.code || 'ORGANIZATION_APPROVE_ERROR'
		});
	}
});

feedbackRouter.patch('/organizations/:id/reject', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new FeedbackService(store);
		const updated = await service.rejectOrganization(req.params.id, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error rejecting organization:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to reject organization',
			message: error.message || 'Organization not found',
			code: error.code || 'ORGANIZATION_REJECT_ERROR'
		});
	}
});

export { feedbackRouter };

