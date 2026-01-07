import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { UsersService } from '../services/usersService.js';

export const usersRouter = express.Router();

usersRouter.get('/', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const users = await service.list({ user: req.user });
		res.json(users);
	} catch (error) {
		console.error('❌ Error listing users:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to list users',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'USERS_LIST_ERROR'
		});
	}
});

usersRouter.get('/:id', requireAuth('parent'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const user = await service.get(req.params.id, { user: req.user });
		res.json(user);
	} catch (error) {
		console.error('❌ Error fetching user:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to fetch user',
			message: error.message || 'User not found',
			code: error.code || 'USER_FETCH_ERROR'
		});
	}
});

usersRouter.post('/', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const user = await service.create(req.body, { user: req.user });
		res.status(201).json(user);
	} catch (error) {
		console.error('❌ Error creating user:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to create user',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'USER_CREATE_ERROR'
		});
	}
});

usersRouter.put('/:id', requireAuth('parent'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const updated = await service.update(req.params.id, req.body, { user: req.user });
		res.json(updated);
	} catch (error) {
		console.error('❌ Error updating user:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to update user',
			message: error.message || 'User not found',
			code: error.code || 'USER_UPDATE_ERROR'
		});
	}
});

usersRouter.delete('/:id', requireAuth('admin'), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const result = await service.delete(req.params.id, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error deleting user:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to delete user',
			message: error.message || 'User not found',
			code: error.code || 'USER_DELETE_ERROR'
		});
	}
});

// Save onboarding data
usersRouter.post('/onboarding', requireAuth(), async (req, res) => {
	try {
		const store = req.app.get('dataStore');
		const service = new UsersService(store);
		const result = await service.saveOnboarding(req.user.id, req.body, { user: req.user });
		res.json(result);
	} catch (error) {
		console.error('❌ Error saving onboarding:', error.message || error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			error: 'Failed to save onboarding data',
			message: error.message || 'An unexpected error occurred',
			code: error.code || 'ONBOARDING_SAVE_ERROR'
		});
	}
});


