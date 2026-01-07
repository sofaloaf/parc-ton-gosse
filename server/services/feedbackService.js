/**
 * Feedback Service
 * 
 * Business logic layer for feedback and organization suggestions management.
 * Handles feedback submission, organization suggestion approval/rejection, and status management.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './baseService.js';

export class FeedbackService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}

	/**
	 * Submit feedback
	 * @param {Object} data - Feedback data
	 * @param {Object} options - Additional options (user, userAgent)
	 * @returns {Promise<Object>} Created feedback
	 */
	async submitFeedback(data, options = {}) {
		try {
			const { user: requestingUser, userAgent = '' } = options;
			const now = new Date().toISOString();

			const feedback = {
				id: uuidv4(),
				userId: requestingUser?.id || 'anonymous',
				userAgent,
				timestamp: now,
				...data,
				status: 'pending',
				createdAt: now,
				updatedAt: now
			};

			const created = await this.store.feedback.create(feedback);
			return created;
		} catch (error) {
			throw this._handleError(error, 'Failed to submit feedback', 'FEEDBACK_SUBMIT_ERROR');
		}
	}

	/**
	 * Submit organization suggestion
	 * @param {Object} data - Organization data
	 * @param {Object} options - Additional options (user, userAgent)
	 * @returns {Promise<Object>} Created organization suggestion
	 */
	async submitOrganization(data, options = {}) {
		try {
			const { user: requestingUser, userAgent = '' } = options;
			const now = new Date().toISOString();

			const org = {
				id: uuidv4(),
				userId: requestingUser?.id || 'anonymous',
				userAgent,
				timestamp: now,
				...data,
				status: 'pending',
				reviewedBy: '',
				reviewedAt: null,
				createdAt: now,
				updatedAt: now
			};

			const created = await this.store.organizationSuggestions.create(org);
			return created;
		} catch (error) {
			throw this._handleError(error, 'Failed to submit organization', 'ORGANIZATION_SUBMIT_ERROR');
		}
	}

	/**
	 * List all feedback (admin only)
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Array>} List of feedback
	 */
	async listFeedback(options = {}) {
		try {
			if (!this.store) {
				throw {
					statusCode: 503,
					message: 'Data store not available',
					code: 'DATA_STORE_NOT_AVAILABLE'
				};
			}

			const feedbacks = await this.store.feedback.list();
			return feedbacks;
		} catch (error) {
			throw this._handleError(error, 'Failed to list feedback', 'FEEDBACK_LIST_ERROR');
		}
	}

	/**
	 * List all organization suggestions (admin only)
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Array>} List of organization suggestions
	 */
	async listOrganizations(options = {}) {
		try {
			if (!this.store) {
				throw {
					statusCode: 503,
					message: 'Data store not available',
					code: 'DATA_STORE_NOT_AVAILABLE'
				};
			}

			const orgs = await this.store.organizationSuggestions.list();
			return orgs;
		} catch (error) {
			throw this._handleError(error, 'Failed to list organization suggestions', 'ORGANIZATIONS_LIST_ERROR');
		}
	}

	/**
	 * Approve organization suggestion (admin only)
	 * @param {string} id - Organization suggestion ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated organization suggestion
	 */
	async approveOrganization(id, options = {}) {
		try {
			const { user: requestingUser } = options;
			const now = new Date().toISOString();

			const org = await this.store.organizationSuggestions.read(id);
			if (!org) {
				throw {
					statusCode: 404,
					message: 'Organization not found',
					code: 'ORGANIZATION_NOT_FOUND'
				};
			}

			const updated = {
				...org,
				status: 'approved',
				reviewedBy: requestingUser.id,
				reviewedAt: now,
				updatedAt: now
			};

			await this.store.organizationSuggestions.update(id, updated);

			// TODO: Automatically add to activities
			// This could be implemented later to automatically create an activity
			// from the approved organization suggestion

			return updated;
		} catch (error) {
			throw this._handleError(error, 'Failed to approve organization', 'ORGANIZATION_APPROVE_ERROR');
		}
	}

	/**
	 * Reject organization suggestion (admin only)
	 * @param {string} id - Organization suggestion ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated organization suggestion
	 */
	async rejectOrganization(id, options = {}) {
		try {
			const { user: requestingUser } = options;
			const now = new Date().toISOString();

			const org = await this.store.organizationSuggestions.read(id);
			if (!org) {
				throw {
					statusCode: 404,
					message: 'Organization not found',
					code: 'ORGANIZATION_NOT_FOUND'
				};
			}

			const updated = {
				...org,
				status: 'rejected',
				reviewedBy: requestingUser.id,
				reviewedAt: now,
				updatedAt: now
			};

			await this.store.organizationSuggestions.update(id, updated);
			return updated;
		} catch (error) {
			throw this._handleError(error, 'Failed to reject organization', 'ORGANIZATION_REJECT_ERROR');
		}
	}
}

