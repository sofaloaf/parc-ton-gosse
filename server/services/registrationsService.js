/**
 * Registrations Service
 * 
 * Business logic layer for activity registrations.
 * Handles registration CRUD operations, validation, and business rules.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './baseService.js';

export class RegistrationsService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}

	/**
	 * List registrations
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Array>} List of registrations
	 */
	async list(filters = {}, options = {}) {
		try {
			if (!this.store) {
				throw {
					statusCode: 503,
					message: 'Data store not available',
					code: 'DATA_STORE_NOT_AVAILABLE'
				};
			}

			const { user: requestingUser } = options;
			let registrations = await this.store.registrations.list();

			// Filter by user role
			if (requestingUser) {
				if (requestingUser.role === 'parent') {
					// Parents can only see their own registrations
					registrations = registrations.filter(r => r.parentId === requestingUser.id);
				} else if (requestingUser.role === 'provider') {
					// Providers can see registrations for their activities
					// This requires checking activity ownership, which may need additional logic
					// For now, providers see all registrations (can be refined later)
				}
				// Admins see all registrations
			}

			// Apply additional filters
			if (filters.activityId) {
				registrations = registrations.filter(r => r.activityId === filters.activityId);
			}

			if (filters.status) {
				registrations = registrations.filter(r => r.status === filters.status);
			}

			return registrations;
		} catch (error) {
			console.error('❌ Error listing registrations:', error.message || error);
			
			if (error.statusCode) {
				throw error;
			}

			throw {
				statusCode: 500,
				message: error.message || 'Failed to list registrations',
				originalError: error
			};
		}
	}

	/**
	 * Get a single registration by ID
	 * @param {string} id - Registration ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Registration object
	 */
	async get(id, options = {}) {
		try {
			const { user: requestingUser } = options;

			const registration = await this.store.registrations.get(id);
			
			if (!registration) {
				throw {
					statusCode: 404,
					message: 'Registration not found',
					code: 'REGISTRATION_NOT_FOUND'
				};
			}

			// Authorization check
			if (requestingUser) {
				if (requestingUser.role === 'parent' && registration.parentId !== requestingUser.id) {
					throw {
						statusCode: 403,
						message: 'Forbidden',
						code: 'FORBIDDEN'
					};
				}
			}

			return registration;
		} catch (error) {
			throw this._handleError(error, 'Failed to fetch registration', 'REGISTRATION_FETCH_ERROR');
		}
	}

	/**
	 * Create a new registration
	 * @param {Object} data - Registration data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Created registration
	 */
	async create(data, options = {}) {
		try {
			const { user: requestingUser } = options;

			// Validate registration data
			this._validateRegistration(data);

			// Ensure parentId matches authenticated user (for parents)
			if (requestingUser && requestingUser.role === 'parent') {
				data.parentId = requestingUser.id;
			}

			// Check if activity exists
			const activity = await this.store.activities.get(data.activityId);
			if (!activity) {
				throw {
					statusCode: 404,
					message: 'Activity not found',
					code: 'ACTIVITY_NOT_FOUND'
				};
			}

			const registration = {
				id: uuidv4(),
				...data,
				status: data.status || 'pending',
				waitlist: data.waitlist || false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const created = await this.store.registrations.create(registration);
			return created;
		} catch (error) {
			throw this._handleError(error, 'Failed to create registration', 'REGISTRATION_CREATE_ERROR');
		}
	}

	/**
	 * Update an existing registration
	 * @param {string} id - Registration ID
	 * @param {Object} data - Updated registration data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated registration
	 */
	async update(id, data, options = {}) {
		try {
			const { user: requestingUser } = options;

			// Validate registration data
			this._validateRegistration(data, { isUpdate: true });

			const updated = await this.store.registrations.update(id, {
				...data,
				updatedAt: new Date().toISOString()
			});
			
			if (!updated) {
				throw {
					statusCode: 404,
					message: 'Registration not found',
					code: 'REGISTRATION_NOT_FOUND'
				};
			}

			return updated;
		} catch (error) {
			throw this._handleError(error, 'Failed to update registration', 'REGISTRATION_UPDATE_ERROR');
		}
	}

	/**
	 * Delete a registration
	 * @param {string} id - Registration ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Success status
	 */
	async delete(id, options = {}) {
		try {
			const { user: requestingUser } = options;

			// Authorization check: parents can only delete their own registrations
			if (requestingUser && requestingUser.role === 'parent') {
				const registration = await this.store.registrations.get(id);
				if (registration) {
					this._checkAuthorization(requestingUser, registration.parentId, []);
				}
			}

			const ok = await this.store.registrations.remove(id);
			
			if (!ok) {
				throw {
					statusCode: 404,
					message: 'Registration not found',
					code: 'REGISTRATION_NOT_FOUND'
				};
			}

			return { ok: true };
		} catch (error) {
			throw this._handleError(error, 'Failed to delete registration', 'REGISTRATION_DELETE_ERROR');
		}
	}

	/**
	 * Validate registration data
	 * @private
	 */
	_validateRegistration(data, options = {}) {
		const { isUpdate = false } = options;

		// Basic validation
		if (!isUpdate && !data.activityId) {
			throw {
				statusCode: 400,
				message: 'Activity ID is required',
				code: 'VALIDATION_ERROR'
			};
		}

		if (!isUpdate && !data.parentId) {
			throw {
				statusCode: 400,
				message: 'Parent ID is required',
				code: 'VALIDATION_ERROR'
			};
		}

		// Status validation using base service helper
		this._validateEnum(data, 'status', ['pending', 'confirmed', 'cancelled', 'completed']);

		return true;
	}
}

