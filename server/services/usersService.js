/**
 * Users Service
 * 
 * Business logic layer for user management.
 * Handles user CRUD operations, authorization checks, and data sanitization.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './baseService.js';

export class UsersService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}

	/**
	 * List all users (admin only)
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Array>} List of users
	 */
	async list(options = {}) {
		try {
			if (!this.store) {
				throw {
					statusCode: 503,
					message: 'Data store not available',
					code: 'DATA_STORE_NOT_AVAILABLE'
				};
			}

			const users = await this.store.users.list();
			return users;
		} catch (error) {
			console.error('❌ Error listing users:', error.message || error);
			
			if (error.statusCode) {
				throw error;
			}

			throw {
				statusCode: 500,
				message: error.message || 'Failed to list users',
				originalError: error
			};
		}
	}

	/**
	 * Get a single user by ID
	 * @param {string} id - User ID
	 * @param {Object} options - Additional options (user, includeSensitive)
	 * @returns {Promise<Object>} User object (sanitized)
	 */
	async get(id, options = {}) {
		try {
			const { user: requestingUser, includeSensitive = false } = options;

			// Authorization check: users can only view their own data unless admin
			if (requestingUser && requestingUser.role !== 'admin' && requestingUser.id !== id) {
				throw {
					statusCode: 403,
					message: 'Forbidden',
					code: 'FORBIDDEN'
				};
			}

			const user = await this.store.users.get(id);
			
			if (!user) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			// Sanitize user data (remove sensitive fields unless admin)
			const sanitized = this._sanitizeUser(user, {
				isAdmin: requestingUser?.role === 'admin',
				includeSensitive
			});

			return sanitized;
		} catch (error) {
			throw this._handleError(error, 'Failed to fetch user', 'USER_FETCH_ERROR');
		}
	}

	/**
	 * Create a new user
	 * @param {Object} data - User data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Created user (sanitized)
	 */
	async create(data, options = {}) {
		try {
			// Validate user data
			this._validateUser(data);

			const user = {
				id: uuidv4(),
				...data,
				createdAt: new Date().toISOString()
			};

			const created = await this.store.users.create(user);

			// Return sanitized user
			return this._sanitizeUser(created, {
				isAdmin: options.user?.role === 'admin',
				includeSensitive: false
			});
		} catch (error) {
			throw this._handleError(error, 'Failed to create user', 'USER_CREATE_ERROR');
		}
	}

	/**
	 * Update an existing user
	 * @param {string} id - User ID
	 * @param {Object} data - Updated user data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated user (sanitized)
	 */
	async update(id, data, options = {}) {
		try {
			const { user: requestingUser } = options;

			// Authorization check: users can only update their own data unless admin
			this._checkAuthorization(requestingUser, id, ['admin']);

			// Validate user data
			this._validateUser(data, { isUpdate: true });

			const updated = await this.store.users.update(id, data);
			
			if (!updated) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			// Return sanitized user
			return this._sanitizeUser(updated, {
				isAdmin: requestingUser?.role === 'admin',
				includeSensitive: false
			});
		} catch (error) {
			throw this._handleError(error, 'Failed to update user', 'USER_UPDATE_ERROR');
		}
	}

	/**
	 * Delete a user
	 * @param {string} id - User ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Success status
	 */
	async delete(id, options = {}) {
		try {
			const ok = await this.store.users.remove(id);
			
			if (!ok) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			return { ok: true };
		} catch (error) {
			throw this._handleError(error, 'Failed to delete user', 'USER_DELETE_ERROR');
		}
	}

	/**
	 * Save onboarding data
	 * @param {string} userId - User ID
	 * @param {Object} data - Onboarding data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Success status
	 */
	async saveOnboarding(userId, data, options = {}) {
		try {
			const { user: requestingUser } = options;

			// Authorization check: users can only update their own onboarding data
			this._checkAuthorization(requestingUser, userId, []);

			const user = await this.store.users.get(userId);
			
			if (!user) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			const { childAge, interests, location, newsletter, onboardingCompleted } = data;

			await this.store.users.update(userId, {
				profile: {
					...user.profile,
					childAge,
					interests: interests || [],
					location,
					newsletter: newsletter !== false,
					onboardingCompleted: onboardingCompleted !== false
				}
			});

			return { success: true };
		} catch (error) {
			throw this._handleError(error, 'Failed to save onboarding data', 'ONBOARDING_SAVE_ERROR');
		}
	}

	/**
	 * Sanitize user data (remove sensitive fields)
	 * @private
	 */
	_sanitizeUser(user, options = {}) {
		const { isAdmin = false, includeSensitive = false } = options;

		// Always include basic fields
		const sanitized = {
			id: user.id,
			email: user.email,
			role: user.role,
			profile: user.profile
		};

		// Only include sensitive fields for admins or if explicitly requested
		if (isAdmin || includeSensitive) {
			sanitized.createdAt = user.createdAt;
			sanitized.updatedAt = user.updatedAt;
			// Note: password is never included, even for admins
		}

		return sanitized;
	}

	/**
	 * Validate user data
	 * @private
	 */
	_validateUser(data, options = {}) {
		const { isUpdate = false } = options;

		// Basic validation
		if (!isUpdate && !data.email) {
			throw {
				statusCode: 400,
				message: 'Email is required',
				code: 'VALIDATION_ERROR'
			};
		}

		// Email format validation
		if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
			throw {
				statusCode: 400,
				message: 'Invalid email format',
				code: 'VALIDATION_ERROR'
			};
		}

		// Role validation using base service helper
		this._validateEnum(data, 'role', ['parent', 'provider', 'admin']);

		return true;
	}
}

