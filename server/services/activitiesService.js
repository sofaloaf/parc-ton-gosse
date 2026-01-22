/**
 * Activities Service
 * 
 * Business logic layer for activities management.
 * Handles filtering, pagination, validation, and caching.
 */

import { v4 as uuidv4 } from 'uuid';
import { getCache, cacheKeys, invalidateActivities } from '../services/cache/index.js';
import { BaseService } from './baseService.js';

export class ActivitiesService extends BaseService {
	constructor(dataStore, cache = null) {
		super(dataStore);
		this.cache = cache || getCache();
	}

	/**
	 * List activities with filtering and pagination
	 * @param {Object} filters - Filter criteria
	 * @param {Object} pagination - Pagination options
	 * @param {Object} options - Additional options (user, forceRefresh)
	 * @returns {Promise<Object>} Paginated activities with metadata
	 */
	async list(filters = {}, pagination = {}, options = {}) {
		const startTime = Date.now();
		
		try {
			if (!this.store) {
				throw new Error('Data store not available');
			}

			const {
				category, minAge, maxAge, startDate, endDate,
				minPrice, maxPrice, neighborhood, q
			} = filters;

			const {
				limit: limitParam,
				offset: offsetParam
			} = pagination;

			// Parse pagination params
			// If no limit specified, return all activities (no pagination)
			// If limit specified, cap at 2000 to prevent excessive memory usage
			const limitNum = limitParam ? Math.min(parseInt(limitParam, 10) || 2000, 2000) : null;
			const offsetNum = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

			// Build filter object for cache key
			const filterKey = {
				category, minAge, maxAge, startDate, endDate,
				minPrice, maxPrice, neighborhood, q
			};

			// Check cache first
			const cacheKey = cacheKeys.activities.list(filterKey);
			const forceRefresh = options.forceRefresh === true;
			const cached = forceRefresh ? null : this.cache.get(cacheKey);

			let all;
			if (cached) {
				console.log('✅ Cache hit for activities list');
				all = cached;
			} else {
				console.log('📥 Cache miss - fetching activities from data store...');

				try {
					// Add timeout protection
					const timeoutMs = 30000; // 30 seconds
					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Data store operation timed out')), timeoutMs)
					);

					const dataPromise = this.store.activities.list();
					all = await Promise.race([dataPromise, timeoutPromise]);
					console.log(`✅ Retrieved ${all.length} activities from data store`);

					// Debug: Check title format for first few activities
					if (all.length > 0 && process.env.NODE_ENV === 'development') {
						const sample = all.slice(0, 3);
						sample.forEach((a, idx) => {
							console.log(`📋 Activity ${idx + 1}:`, {
								id: a.id,
								title: a.title,
								titleType: typeof a.title,
								title_en: a.title_en,
								title_fr: a.title_fr,
								name: a.name
							});
						});
					}

					// Cache for 5 minutes (300000ms)
					this.cache.set(cacheKey, all, 300000);
				} catch (error) {
					// Log detailed error information
					console.error('❌ Error fetching activities from data store:', {
						message: error.message,
						code: error.code,
						statusCode: error.statusCode,
						status: error.status,
						stack: error.stack?.substring(0, 500),
						dataStoreType: this.store?.constructor?.name || 'unknown'
					});
					
					// Handle rate limit errors gracefully
					const isRateLimit = error.statusCode === 429 || 
						error.status === 429 ||
						error.code === 429 ||
						error.message?.includes('Quota exceeded') || 
						error.message?.includes('rateLimitExceeded') ||
						error.originalError?.status === 429 ||
						error.originalError?.code === 429;

					if (isRateLimit) {
						console.warn('⚠️  Rate limit hit for activities list - checking for stale cache');
						
						// Try to get any cached activities list as fallback
						// Check for unfiltered list cache
						const fallbackCacheKey = cacheKeys.activities.list({});
						const fallbackCache = this.cache.get(fallbackCacheKey);
						
						if (fallbackCache && Array.isArray(fallbackCache) && fallbackCache.length > 0) {
							console.log(`✅ Using stale cache with ${fallbackCache.length} activities as fallback`);
							all = fallbackCache;
							// Update the current cache key with stale data
							this.cache.set(cacheKey, all, 300000);
						} else {
							// No cache available - return empty array with warning
							console.warn('⚠️  No cache available during rate limit - returning empty array');
							all = [];
						}
					} else {
						// Re-throw non-rate-limit errors
						throw error;
					}
				}
			}

			// Filter out pending activities (only show approved ones to regular users)
			const isAdmin = options.user?.role === 'admin';
			const approvedActivities = isAdmin
				? all
				: all.filter(a => !a.approvalStatus || (a.approvalStatus !== 'pending' && a.approvalStatus !== 'rejected'));

			// Apply filters
			const filtered = this._applyFilters(approvedActivities, filters);

			// Apply pagination (only if limit is specified)
			const total = filtered.length;
			let paginated;
			let hasMore = false;
			if (limitNum !== null) {
				paginated = filtered.slice(offsetNum, offsetNum + limitNum);
				hasMore = offsetNum + limitNum < total;
			} else {
				// No limit - return all filtered activities
				paginated = filtered.slice(offsetNum);
				hasMore = false;
			}

			const duration = Date.now() - startTime;
			console.log(`✅ Returning ${paginated.length} activities (${total} total, ${duration}ms)`);

			// Return paginated response
			const responseData = Array.isArray(paginated) ? paginated : [];
			if (!Array.isArray(paginated)) {
				console.warn('⚠️  Paginated data is not an array, converting to empty array');
			}

			return {
				data: responseData,
				pagination: {
					limit: limitNum,
					offset: offsetNum,
					total,
					hasMore,
					page: limitNum ? Math.floor(offsetNum / limitNum) + 1 : 1,
					totalPages: limitNum ? Math.ceil(total / limitNum) : 1
				},
				_meta: {
					cached: !!cached,
					duration: `${duration}ms`
				}
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			console.error('❌ Error in ActivitiesService.list:', error.message);
			console.error('Stack:', error.stack);

			// Determine appropriate status code
			let statusCode = 500;
			if (error.message.includes('timeout')) {
				statusCode = 504; // Gateway Timeout
			} else if (error.message.includes('not available') || error.message.includes('not initialized')) {
				statusCode = 503; // Service Unavailable
			}

			const isProduction = process.env.NODE_ENV === 'production';
			const errorMessage = isProduction
				? 'Failed to fetch activities. Please try again later.'
				: error.message;

			throw {
				statusCode,
				message: errorMessage,
				code: 'ACTIVITIES_FETCH_ERROR',
				timestamp: new Date().toISOString(),
				duration: `${duration}ms`,
				originalError: error
			};
		}
	}

	/**
	 * Get a single activity by ID
	 * @param {string} id - Activity ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Activity object with metadata
	 */
	async get(id, options = {}) {
		const startTime = Date.now();
		
		try {
			const cacheKey = cacheKeys.activities.item(id);

			// Check cache first
			let activity = this.cache.get(cacheKey);

			if (!activity) {
				try {
					activity = await this.store.activities.get(id);
					if (activity) {
						// Cache for 10 minutes (600000ms)
						this.cache.set(cacheKey, activity, 600000);
					}
				} catch (storeError) {
					// Handle rate limit errors gracefully
					const isRateLimit = storeError.statusCode === 429 || 
						storeError.status === 429 ||
						storeError.code === 429 ||
						storeError.message?.includes('Quota exceeded') || 
						storeError.message?.includes('rateLimitExceeded') ||
						storeError.originalError?.status === 429 ||
						storeError.originalError?.code === 429;

					if (isRateLimit) {
						console.warn('⚠️  Rate limit hit for activity fetch - checking cache for fallback');
						
						// Try to get from list cache as fallback
						const listCacheKey = cacheKeys.activities.list({});
						const cachedList = this.cache.get(listCacheKey);
						
						if (cachedList && Array.isArray(cachedList)) {
							const cachedActivity = cachedList.find(a => a.id === id);
							if (cachedActivity) {
								console.log('✅ Found activity in list cache as fallback');
								// Cache this individual item too
								this.cache.set(cacheKey, cachedActivity, 600000);
								activity = cachedActivity;
							}
						}
						
						// If still no activity, throw a user-friendly rate limit error
						if (!activity) {
							throw {
								statusCode: 503,
								message: 'Service temporarily unavailable due to high demand. Please try again in a moment.',
								code: 'SERVICE_UNAVAILABLE',
								retryAfter: 60 // Suggest retry after 60 seconds
							};
						}
					} else {
						// Re-throw non-rate-limit errors
						throw storeError;
					}
				}
			} else {
				console.log('✅ Cache hit for activity:', id);
			}

			if (!activity) {
				throw {
					statusCode: 404,
					message: 'Activity not found',
					code: 'ACTIVITY_NOT_FOUND'
				};
			}

			const duration = Date.now() - startTime;
			return {
				...activity,
				_meta: {
					cached: !!this.cache.get(cacheKey),
					duration: `${duration}ms`
				}
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const handledError = this._handleError(error, 'Failed to fetch activity', 'ACTIVITY_FETCH_ERROR');
			handledError.duration = `${duration}ms`;
			throw handledError;
		}
	}

	/**
	 * Create a new activity
	 * @param {Object} data - Activity data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Created activity
	 */
	async create(data, options = {}) {
		try {
			const now = new Date().toISOString();
			const activity = {
				id: uuidv4(),
				...data,
				createdAt: now,
				updatedAt: now
			};

			// Validate activity data
			this._validateActivity(activity);

			const created = await this.store.activities.create(activity);

			// Invalidate cache
			invalidateActivities(this.cache);

			// Cache the new activity
			this.cache.set(cacheKeys.activities.item(created.id), created, 600000);

			return created;
		} catch (error) {
			throw this._handleError(error, 'Failed to create activity', 'ACTIVITY_CREATE_ERROR');
		}
	}

	/**
	 * Update an existing activity
	 * @param {string} id - Activity ID
	 * @param {Object} data - Updated activity data
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Updated activity
	 */
	async update(id, data, options = {}) {
		try {
			// Validate activity data
			this._validateActivity(data, { isUpdate: true });

			const updated = await this.store.activities.update(id, {
				...data,
				updatedAt: new Date().toISOString()
			});

			if (!updated) {
				throw {
					statusCode: 404,
					message: 'Activity not found',
					code: 'ACTIVITY_NOT_FOUND'
				};
			}

			// Invalidate cache
			invalidateActivities(this.cache);

			// Update cached activity
			this.cache.set(cacheKeys.activities.item(updated.id), updated, 600000);

			return updated;
		} catch (error) {
			throw this._handleError(error, 'Failed to update activity', 'ACTIVITY_UPDATE_ERROR');
		}
	}

	/**
	 * Delete an activity
	 * @param {string} id - Activity ID
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<boolean>} Success status
	 */
	async delete(id, options = {}) {
		try {
			const ok = await this.store.activities.remove(id);
			
			if (!ok) {
				throw {
					statusCode: 404,
					message: 'Activity not found',
					code: 'ACTIVITY_NOT_FOUND'
				};
			}

			// Invalidate cache
			invalidateActivities(this.cache);
			this.cache.delete(cacheKeys.activities.item(id));

			return { ok: true };
		} catch (error) {
			throw this._handleError(error, 'Failed to delete activity', 'ACTIVITY_DELETE_ERROR');
		}
	}

	/**
	 * Apply filters to activities array
	 * @private
	 */
	_applyFilters(activities, filters) {
		const {
			category, minAge, maxAge, startDate, endDate,
			minPrice, maxPrice, neighborhood, q
		} = filters;

		return activities.filter((a) => {
			let ok = true;
			
			if (category) {
				ok = ok && a.categories?.includes(category);
			}
			
			// Age filtering: activity age range overlaps with user's desired age range
			if (minAge !== undefined && minAge !== null && minAge !== '' || 
			    maxAge !== undefined && maxAge !== null && maxAge !== '') {
				const actMinAge = a.ageMin !== undefined && a.ageMin !== null ? Number(a.ageMin) : 0;
				const actMaxAge = a.ageMax !== undefined && a.ageMax !== null ? Number(a.ageMax) : 999;
				const userMinAge = minAge !== undefined && minAge !== null && minAge !== '' ? Number(minAge) : 0;
				const userMaxAge = maxAge !== undefined && maxAge !== null && maxAge !== '' ? Number(maxAge) : 999;
				
				// Validate numbers
				if (!isNaN(actMinAge) && !isNaN(actMaxAge) && !isNaN(userMinAge) && !isNaN(userMaxAge)) {
					// Ranges overlap if: actMinAge <= userMaxAge && actMaxAge >= userMinAge
					// Also check if activity's age range contains the user's desired age
					const rangesOverlap = actMinAge <= userMaxAge && actMaxAge >= userMinAge;
					ok = ok && rangesOverlap;
				}
			}
			
			if (neighborhood) {
				ok = ok && a.neighborhood === neighborhood;
			}
			
			if (minPrice) {
				ok = ok && (a.price?.amount ?? 0) >= Number(minPrice);
			}
			
			if (maxPrice) {
				ok = ok && (a.price?.amount ?? 0) <= Number(maxPrice);
			}
			
			if (startDate) {
				ok = ok && a.schedule?.some((s) => new Date(s.date) >= new Date(startDate));
			}
			
			if (endDate) {
				ok = ok && a.schedule?.some((s) => new Date(s.date) <= new Date(endDate));
			}
			
			if (q) {
				const searchTerm = String(q).toLowerCase().trim();
				if (!searchTerm) return ok; // Empty search, skip
				
				// Build comprehensive search text from multiple fields
				const searchFields = [
					a.title?.en || '',
					a.title?.fr || '',
					a.description?.en || '',
					a.description?.fr || '',
					a.organizationName || '',
					a.categories?.join(' ') || '',
					a.activityType || '',
					a.neighborhood || ''
				].join(' ').toLowerCase();
				
				// Tokenize search term (split by spaces) for better matching
				const searchTokens = searchTerm.split(/\s+/).filter(t => t.length > 0);
				
				// Match if ALL tokens are found (AND logic) - more precise
				// Or if the full phrase is found (for exact matches)
				const allTokensMatch = searchTokens.every(token => searchFields.includes(token));
				const exactMatch = searchFields.includes(searchTerm);
				
				ok = ok && (allTokensMatch || exactMatch);
			}
			
			return ok;
		});
	}

	/**
	 * Validate activity data
	 * @private
	 */
	_validateActivity(data, options = {}) {
		const { isUpdate = false } = options;

		// Basic validation
		if (!isUpdate && !data.title) {
			throw {
				statusCode: 400,
				message: 'Title is required',
				code: 'VALIDATION_ERROR'
			};
		}

		// Age validation
		if (data.ageMin !== undefined && data.ageMax !== undefined) {
			if (data.ageMin > data.ageMax) {
				throw {
					statusCode: 400,
					message: 'Minimum age cannot be greater than maximum age',
					code: 'VALIDATION_ERROR'
				};
			}
		}

		// Price validation
		if (data.price?.amount !== undefined && data.price.amount < 0) {
			throw {
				statusCode: 400,
				message: 'Price cannot be negative',
				code: 'VALIDATION_ERROR'
			};
		}

		return true;
	}
}

