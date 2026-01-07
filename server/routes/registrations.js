import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { RegistrationsService } from '../services/registrationsService.js';

export const registrationsRouter = express.Router();

registrationsRouter.get('/', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		const filters = {
			activityId: req.query.activityId,
			status: req.query.status
		};
		const registrations = await service.list(filters, { user: req.user });
		res.json(registrations);
	} catch (error) {
		console.error('❌ Error listing registrations:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to list registrations',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'REGISTRATIONS_LIST_ERROR'
		});
	}
});

// Validation middleware for registrations
const validateRegistration = [
	body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
	body('childName').optional().trim().isLength({ max: 200 }).withMessage('Child name too long'),
	body('parentName').optional().trim().isLength({ max: 200 }).withMessage('Parent name too long'),
	body('age').optional().isInt({ min: 0, max: 18 }).withMessage('Age must be between 0 and 18'),
	body('activityId').notEmpty().withMessage('Activity ID required')
];

// Public registration endpoint (no auth required) - MUST BE BEFORE /:id
registrationsRouter.post('/public', validateRegistration, async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ error: errors.array()[0].msg });
		}

		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		
		// Sanitize input - only allow specific fields
		const regData = {
			activityId: req.body.activityId,
			childName: req.body.childName?.trim().substring(0, 200) || '',
			parentName: req.body.parentName?.trim().substring(0, 200) || '',
			email: req.body.email?.trim().toLowerCase() || '',
			age: req.body.age ? parseInt(req.body.age) : null,
			specialRequests: req.body.specialRequests?.trim().substring(0, 1000) || '',
			organizationName: req.body.organizationName?.trim().substring(0, 200) || '',
			reservedAt: new Date().toISOString()  // Timestamp when reservation button was clicked
		};

		const created = await service.create(regData, { user: null });
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error creating public registration:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to create registration',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'REGISTRATION_CREATE_ERROR'
		});
	}
});

registrationsRouter.get('/:id', requireAuth('parent'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		const registration = await service.get(req.params.id, { user: req.user });
		res.json(registration);
	} catch (error) {
		console.error('❌ Error fetching registration:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch registration',
			message: error.message || 'Registration not found',
			code: error.code || 'REGISTRATION_FETCH_ERROR'
		});
	}
});

registrationsRouter.post('/', requireAuth('parent'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		const created = await service.create(req.body, { user: req.user });
		res.status(201).json(created);
	} catch (error) {
		console.error('❌ Error creating registration:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to create registration',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'REGISTRATION_CREATE_ERROR'
		});
	}
});

registrationsRouter.put('/:id', requireAuth('provider'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		const updated = await service.update(req.params.id, req.body, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error updating registration:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to update registration',
			message: error.message || 'Registration not found',
			code: error.code || 'REGISTRATION_UPDATE_ERROR'
		});
	}
});

registrationsRouter.delete('/:id', requireAuth('parent'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new RegistrationsService(store);
		const result = await service.delete(req.params.id, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error deleting registration:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to delete registration',
			message: error.message || 'Registration not found',
			code: error.code || 'REGISTRATION_DELETE_ERROR'
		});
	}
});


