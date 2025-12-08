/**
 * Sandbox Google Sheets API Routes
 * For testing and editing activities in sandbox sheet
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSandboxStore, isSandboxAvailable } from '../services/sandbox-sheets.js';
import { parseInstruction } from '../utils/instructionParser.js';
import { validateActivity, normalizeActivity } from '../utils/activityValidator.js';
import { v4 as uuidv4 } from 'uuid';

export const sandboxRouter = express.Router();

// All routes require admin authentication
sandboxRouter.use(requireAuth('admin'));

/**
 * Execute instruction (natural language or JSON)
 * POST /api/sandbox/execute
 */
sandboxRouter.post('/execute', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	const { instruction, preview = false } = req.body;
	
	if (!instruction) {
		return res.status(400).json({ error: 'Missing "instruction" field' });
	}
	
	try {
		// Parse instruction
		const parsed = parseInstruction(instruction);
		
		// Execute operation
		const result = await executeOperation(store, parsed, preview);
		
		res.json({
			success: true,
			parsed,
			preview,
			result
		});
	} catch (error) {
		console.error('Sandbox execution error:', error);
		res.status(400).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * List all activities in sandbox
 * GET /api/sandbox/activities
 */
sandboxRouter.get('/activities', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	try {
		const activities = await store.activities.list();
		res.json({
			success: true,
			count: activities.length,
			activities
		});
	} catch (error) {
		console.error('Error listing sandbox activities:', error);
		res.status(500).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * Get single activity from sandbox
 * GET /api/sandbox/activities/:id
 */
sandboxRouter.get('/activities/:id', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	try {
		const activity = await store.activities.get(req.params.id);
		if (!activity) {
			return res.status(404).json({ error: 'Activity not found' });
		}
		res.json({
			success: true,
			activity
		});
	} catch (error) {
		console.error('Error getting sandbox activity:', error);
		res.status(500).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * Create activity in sandbox
 * POST /api/sandbox/activities
 */
sandboxRouter.post('/activities', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	const activityData = req.body;
	
	// Validate
	const validation = validateActivity(activityData, false);
	if (!validation.valid) {
		return res.status(400).json({
			error: 'Validation failed',
			errors: validation.errors,
			warnings: validation.warnings
		});
	}
	
		// Normalize
		const normalized = normalizeActivity(activityData);
		if (!normalized.id) {
			normalized.id = uuidv4();
		}
	
	try {
		const created = await store.activities.create(normalized);
		res.status(201).json({
			success: true,
			activity: created,
			warnings: validation.warnings
		});
	} catch (error) {
		console.error('Error creating sandbox activity:', error);
		res.status(500).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * Update activity in sandbox
 * PUT /api/sandbox/activities/:id
 */
sandboxRouter.put('/activities/:id', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	const updates = req.body;
	
	// Validate updates
	const existing = await store.activities.get(req.params.id);
	if (!existing) {
		return res.status(404).json({ error: 'Activity not found' });
	}
	
	const updatedActivity = { ...existing, ...updates };
	const validation = validateActivity(updatedActivity, true);
	if (!validation.valid) {
		return res.status(400).json({
			error: 'Validation failed',
			errors: validation.errors,
			warnings: validation.warnings
		});
	}
	
	// Normalize
	const normalized = normalizeActivity(updates);
	normalized.updatedAt = new Date().toISOString();
	
	try {
		const updated = await store.activities.update(req.params.id, normalized);
		res.json({
			success: true,
			activity: updated,
			warnings: validation.warnings
		});
	} catch (error) {
		console.error('Error updating sandbox activity:', error);
		res.status(500).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * Delete activity from sandbox
 * DELETE /api/sandbox/activities/:id
 */
sandboxRouter.delete('/activities/:id', async (req, res) => {
	if (!isSandboxAvailable()) {
		return res.status(503).json({ 
			error: 'Sandbox not available',
			message: 'GS_SANDBOX_SHEET_ID not configured'
		});
	}
	
	const store = getSandboxStore();
	try {
		const deleted = await store.activities.remove(req.params.id);
		if (!deleted) {
			return res.status(404).json({ error: 'Activity not found' });
		}
		res.json({
			success: true,
			message: 'Activity deleted'
		});
	} catch (error) {
		console.error('Error deleting sandbox activity:', error);
		res.status(500).json({
			error: error.message,
			success: false
		});
	}
});

/**
 * Execute parsed operation
 */
async function executeOperation(store, parsed, preview = false) {
	const { action, target, updates, data } = parsed;
	
	switch (action) {
		case 'create':
			return await executeCreate(store, data, preview);
		
		case 'update':
			return await executeUpdate(store, target, updates, preview);
		
		case 'delete':
			return await executeDelete(store, target, preview);
		
		case 'bulk_create':
			return await executeBulkCreate(store, data, preview);
		
		case 'bulk_update':
			return await executeBulkUpdate(store, data, preview);
		
		case 'bulk_delete':
			return await executeBulkDelete(store, data, preview);
		
		default:
			throw new Error(`Unknown action: ${action}`);
	}
}

async function executeCreate(store, data, preview) {
	const activities = Array.isArray(data) ? data : [data];
	const results = [];
	const errors = [];
	
	for (const activityData of activities) {
		const validation = validateActivity(activityData, false);
		if (!validation.valid) {
			errors.push({
				activity: activityData,
				errors: validation.errors
			});
			continue;
		}
		
		const normalized = normalizeActivity(activityData);
		if (!normalized.id) {
			normalized.id = uuidv4();
		}
		
		if (preview) {
			results.push({
				action: 'create',
				activity: normalized,
				warnings: validation.warnings
			});
		} else {
			try {
				const created = await store.activities.create(normalized);
				results.push({
					action: 'create',
					activity: created,
					warnings: validation.warnings
				});
			} catch (error) {
				errors.push({
					activity: activityData,
					error: error.message
				});
			}
		}
	}
	
	return {
		created: results.length,
		errors: errors.length,
		results,
		errors
	};
}

async function executeUpdate(store, target, updates, preview) {
	let activities = [];
	
	// Get activities to update
	if (target.type === 'id') {
		const activity = await store.activities.get(target.value);
		if (activity) {
			activities = [activity];
		}
	} else if (target.type === 'filter') {
		const all = await store.activities.list();
		activities = all.filter(activity => matchesFilter(activity, target.condition));
	}
	
	const results = [];
	const errors = [];
	
	for (const activity of activities) {
		const updatedActivity = { ...activity, ...updates };
		const validation = validateActivity(updatedActivity, true);
		
		if (!validation.valid) {
			errors.push({
				activityId: activity.id,
				errors: validation.errors
			});
			continue;
		}
		
		const normalized = normalizeActivity(updates);
		normalized.updatedAt = new Date().toISOString();
		
		if (preview) {
			results.push({
				action: 'update',
				activityId: activity.id,
				updates: normalized,
				warnings: validation.warnings
			});
		} else {
			try {
				const updated = await store.activities.update(activity.id, normalized);
				results.push({
					action: 'update',
					activity: updated,
					warnings: validation.warnings
				});
			} catch (error) {
				errors.push({
					activityId: activity.id,
					error: error.message
				});
			}
		}
	}
	
	return {
		updated: results.length,
		errors: errors.length,
		results,
		errors
	};
}

async function executeDelete(store, target, preview) {
	let activities = [];
	
	if (target.type === 'id') {
		const activity = await store.activities.get(target.value);
		if (activity) {
			activities = [activity];
		}
	} else if (target.type === 'filter') {
		const all = await store.activities.list();
		activities = all.filter(activity => matchesFilter(activity, target.condition));
	}
	
	const results = [];
	const errors = [];
	
	for (const activity of activities) {
		if (preview) {
			results.push({
				action: 'delete',
				activityId: activity.id,
				activity: activity
			});
		} else {
			try {
				await store.activities.remove(activity.id);
				results.push({
					action: 'delete',
					activityId: activity.id
				});
			} catch (error) {
				errors.push({
					activityId: activity.id,
					error: error.message
				});
			}
		}
	}
	
	return {
		deleted: results.length,
		errors: errors.length,
		results,
		errors
	};
}

async function executeBulkCreate(store, data, preview) {
	return await executeCreate(store, data, preview);
}

async function executeBulkUpdate(store, data, preview) {
	const results = [];
	const errors = [];
	
	for (const item of data) {
		const { id, ...updates } = item;
		if (!id) {
			errors.push({ item, error: 'Missing id field' });
			continue;
		}
		
		const activity = await store.activities.get(id);
		if (!activity) {
			errors.push({ id, error: 'Activity not found' });
			continue;
		}
		
		const updatedActivity = { ...activity, ...updates };
		const validation = validateActivity(updatedActivity, true);
		
		if (!validation.valid) {
			errors.push({ id, errors: validation.errors });
			continue;
		}
		
		const normalized = normalizeActivity(updates);
		normalized.updatedAt = new Date().toISOString();
		
		if (preview) {
			results.push({ action: 'update', activityId: id, updates: normalized });
		} else {
			try {
				const updated = await store.activities.update(id, normalized);
				results.push({ action: 'update', activity: updated });
			} catch (error) {
				errors.push({ id, error: error.message });
			}
		}
	}
	
	return {
		updated: results.length,
		errors: errors.length,
		results,
		errors
	};
}

async function executeBulkDelete(store, data, preview) {
	const results = [];
	const errors = [];
	
	for (const item of data) {
		const id = typeof item === 'string' ? item : item.id;
		if (!id) {
			errors.push({ item, error: 'Missing id field' });
			continue;
		}
		
		const activity = await store.activities.get(id);
		if (!activity) {
			errors.push({ id, error: 'Activity not found' });
			continue;
		}
		
		if (preview) {
			results.push({ action: 'delete', activityId: id, activity });
		} else {
			try {
				await store.activities.remove(id);
				results.push({ action: 'delete', activityId: id });
			} catch (error) {
				errors.push({ id, error: error.message });
			}
		}
	}
	
	return {
		deleted: results.length,
		errors: errors.length,
		results,
		errors
	};
}

function matchesFilter(activity, condition) {
	if (!condition) return true;
	
	if (condition.categories) {
		const categories = Array.isArray(activity.categories) 
			? activity.categories 
			: (activity.categories || '').split(',').map(s => s.trim());
		if (!categories.some(cat => 
			cat.toLowerCase().includes(condition.categories.toLowerCase())
		)) {
			return false;
		}
	}
	
	if (condition.neighborhood) {
		if (!activity.neighborhood || 
		    !activity.neighborhood.toLowerCase().includes(condition.neighborhood.toLowerCase())) {
			return false;
		}
	}
	
	if (condition.ageMin !== undefined) {
		if (!activity.ageMin || activity.ageMin < condition.ageMin) {
			return false;
		}
	}
	
	if (condition.ageMax !== undefined) {
		if (!activity.ageMax || activity.ageMax > condition.ageMax) {
			return false;
		}
	}
	
	return true;
}

