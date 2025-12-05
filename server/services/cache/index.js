/**
 * Cache Service
 * Provides a unified caching interface with in-memory and Redis support
 */

import { createMemoryCache } from './memory.js';

let cacheInstance = null;

/**
 * Get or create cache instance
 */
export function getCache() {
	if (!cacheInstance) {
		// For now, use memory cache
		// In the future, can switch to Redis for distributed caching
		const useRedis = process.env.REDIS_URL && process.env.CACHE_BACKEND === 'redis';
		
		if (useRedis) {
			// TODO: Implement Redis cache
			// cacheInstance = createRedisCache(process.env.REDIS_URL);
			console.log('⚠️  Redis cache not yet implemented, using memory cache');
		}
		
		cacheInstance = createMemoryCache({
			defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10), // 5 minutes default
			maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10) // Max 1000 items
		});
		
		console.log('✅ Cache initialized:', {
			backend: useRedis ? 'redis' : 'memory',
			defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10) / 1000 + 's',
			maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10)
		});
	}
	
	return cacheInstance;
}

/**
 * Cache key generators
 */
export const cacheKeys = {
	activities: {
		list: (filters = {}) => {
			// Create hash from filters for cache key
			const filterStr = JSON.stringify(filters);
			const hash = Buffer.from(filterStr).toString('base64').slice(0, 16);
			return `activities:list:${hash}`;
		},
		item: (id) => `activities:${id}`,
		all: () => 'activities:list:all'
	},
	users: {
		item: (id) => `users:${id}`,
		byEmail: (email) => `users:email:${email}`,
		all: () => 'users:list:all'
	},
	registrations: {
		list: (filters = {}) => {
			const filterStr = JSON.stringify(filters);
			const hash = Buffer.from(filterStr).toString('base64').slice(0, 16);
			return `registrations:list:${hash}`;
		},
		item: (id) => `registrations:${id}`
	},
	reviews: {
		list: (filters = {}) => {
			const filterStr = JSON.stringify(filters);
			const hash = Buffer.from(filterStr).toString('base64').slice(0, 16);
			return `reviews:list:${hash}`;
		},
		item: (id) => `reviews:${id}`
	},
	metrics: {
		dashboard: () => 'metrics:dashboard',
		summary: () => 'metrics:summary'
	}
};

/**
 * Cache invalidation helpers
 */
export function invalidateActivities(cache) {
	cache.deletePattern('activities:*');
}

export function invalidateUser(cache, userId) {
	cache.delete(cacheKeys.users.item(userId));
	cache.delete(cacheKeys.users.all());
}

export function invalidateMetrics(cache) {
	cache.deletePattern('metrics:*');
}

