/**
 * Reviews Service
 * 
 * Business logic layer for reviews and ratings management.
 * Handles review CRUD, rating calculations, filtering, and moderation.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './baseService.js';

export class ReviewsService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}

	/**
	 * List all reviews
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Array>} List of reviews
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

			let reviews = await this.store.reviews.list();

			// Filter by activity if specified
			if (filters.activityId) {
				reviews = reviews.filter(r => r.activityId === filters.activityId);
			}

			// Filter by status (default: only show approved)
			const statusFilter = filters.status || 'approved';
			if (statusFilter !== 'all') {
				reviews = reviews.filter(r => 
					statusFilter === 'approved' 
						? (r.status === 'approved' || !r.status)
						: r.status === statusFilter
				);
			}

			return reviews;
		} catch (error) {
			throw this._handleError(error, 'Failed to list reviews', 'REVIEWS_LIST_ERROR');
		}
	}

	/**
	 * Get reviews for a specific activity
	 * @param {string} activityId - Activity ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Array>} List of approved reviews for the activity
	 */
	async getByActivity(activityId, options = {}) {
		try {
			const reviews = await this.list({ activityId, status: 'approved' }, options);
			return reviews;
		} catch (error) {
			throw this._handleError(error, 'Failed to fetch activity reviews', 'ACTIVITY_REVIEWS_FETCH_ERROR');
		}
	}

	/**
	 * Get average rating for an activity
	 * @param {string} activityId - Activity ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Rating statistics {average, count}
	 */
	async getRating(activityId, options = {}) {
		try {
			const reviews = await this.getByActivity(activityId, options);
			const ratedReviews = reviews.filter(r => r.rating != null);

			if (ratedReviews.length === 0) {
				return { average: 0, count: 0 };
			}

			const sum = ratedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
			const average = sum / ratedReviews.length;

			return {
				average: Math.round(average * 10) / 10, // Round to 1 decimal
				count: ratedReviews.length
			};
		} catch (error) {
			throw this._handleError(error, 'Failed to calculate rating', 'RATING_CALCULATION_ERROR');
		}
	}

	/**
	 * Batch get ratings for multiple activities
	 * @param {Array<string>} activityIds - Array of activity IDs
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Map of activityId -> {average, count}
	 */
	async getBatchRatings(activityIds, options = {}) {
		try {
			if (!Array.isArray(activityIds)) {
				throw {
					statusCode: 400,
					message: 'activityIds must be an array',
					code: 'VALIDATION_ERROR'
				};
			}

			// Limit to prevent abuse
			const idsToFetch = activityIds.slice(0, 50);
			
			const allReviews = await this.list({ status: 'approved' }, options);
			const ratedReviews = allReviews.filter(r => r.rating != null);

			const ratingsMap = {};

			idsToFetch.forEach(activityId => {
				const activityReviews = ratedReviews.filter(r => r.activityId === activityId);

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

			return ratingsMap;
		} catch (error) {
			throw this._handleError(error, 'Failed to batch fetch ratings', 'BATCH_RATINGS_FETCH_ERROR');
		}
	}

	/**
	 * Get user's review for an activity
	 * @param {string} activityId - Activity ID
	 * @param {string} userId - User ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object|null>} User's review or null
	 */
	async getUserReview(activityId, userId, options = {}) {
		try {
			const allReviews = await this.list({ activityId }, options);
			const userReview = allReviews.find(r => 
				r.parentId === userId || r.userId === userId
			);

			return userReview || null;
		} catch (error) {
			throw this._handleError(error, 'Failed to fetch user review', 'USER_REVIEW_FETCH_ERROR');
		}
	}

	/**
	 * Get a single review by ID
	 * @param {string} id - Review ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Review object
	 */
	async get(id, options = {}) {
		try {
			const review = await this.store.reviews.get(id);
			
			if (!review) {
				throw {
					statusCode: 404,
					message: 'Review not found',
					code: 'REVIEW_NOT_FOUND'
				};
			}

			return review;
		} catch (error) {
			throw this._handleError(error, 'Failed to fetch review', 'REVIEW_FETCH_ERROR');
		}
	}

	/**
	 * Create or update a review
	 * @param {Object} data - Review data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Created or updated review
	 */
	async createOrUpdate(data, options = {}) {
		try {
			const { user: requestingUser } = options;
			const { activityId, rating, comment } = data;

			// Validate required fields
			this._validateRequired({ activityId, rating }, ['activityId', 'rating']);

			// Validate rating range
			const ratingNum = Number(rating);
			if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
				throw {
					statusCode: 400,
					message: 'Rating must be between 1 and 5',
					code: 'VALIDATION_ERROR'
				};
			}

			// Check if user already reviewed this activity
			const existingReview = await this.getUserReview(activityId, requestingUser.id, options);

			const now = new Date().toISOString();

			if (existingReview) {
				// Update existing review
				const updated = await this.store.reviews.update(existingReview.id, {
					rating: ratingNum,
					comment: this._sanitizeString(comment || existingReview.comment || '', 1000),
					updatedAt: now
				});
				return updated;
			} else {
				// Create new review
				const review = {
					id: uuidv4(),
					activityId,
					parentId: requestingUser.id,
					userId: requestingUser.id,
					rating: ratingNum,
					comment: this._sanitizeString(comment || '', 1000),
					status: 'approved', // Auto-approve ratings (can be moderated later if needed)
					createdAt: now,
					updatedAt: now
				};

				const created = await this.store.reviews.create(review);
				return created;
			}
		} catch (error) {
			throw this._handleError(error, 'Failed to create or update review', 'REVIEW_CREATE_ERROR');
		}
	}

	/**
	 * Moderate a review (admin only)
	 * @param {string} id - Review ID
	 * @param {string} status - New status ('approved', 'rejected', 'pending')
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated review
	 */
	async moderate(id, status, options = {}) {
		try {
			// Validate status
			this._validateEnum({ status }, 'status', ['approved', 'rejected', 'pending']);

			const updated = await this.store.reviews.update(id, {
				status,
				updatedAt: new Date().toISOString()
			});

			if (!updated) {
				throw {
					statusCode: 404,
					message: 'Review not found',
					code: 'REVIEW_NOT_FOUND'
				};
			}

			return updated;
		} catch (error) {
			throw this._handleError(error, 'Failed to moderate review', 'REVIEW_MODERATE_ERROR');
		}
	}

	/**
	 * Delete a review (admin only)
	 * @param {string} id - Review ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Success status
	 */
	async delete(id, options = {}) {
		try {
			const ok = await this.store.reviews.remove(id);
			
			if (!ok) {
				throw {
					statusCode: 404,
					message: 'Review not found',
					code: 'REVIEW_NOT_FOUND'
				};
			}

			return { ok: true };
		} catch (error) {
			throw this._handleError(error, 'Failed to delete review', 'REVIEW_DELETE_ERROR');
		}
	}
}

