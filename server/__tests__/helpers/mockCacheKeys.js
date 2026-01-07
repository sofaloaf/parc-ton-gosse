/**
 * Mock Cache Keys
 * 
 * Provides mock implementations of cache key generators
 */

export const mockCacheKeys = {
	activities: {
		list: (filters = {}) => `activities:list:${JSON.stringify(filters)}`,
		item: (id) => `activities:item:${id}`
	}
};

