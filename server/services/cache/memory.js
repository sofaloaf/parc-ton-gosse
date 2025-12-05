/**
 * In-Memory Cache Implementation
 * Simple, fast cache for single-instance deployments
 * For multi-instance, use Redis cache instead
 */

export function createMemoryCache({ defaultTTL = 300000, maxSize = 1000 } = {}) {
	const cache = new Map();
	const stats = {
		hits: 0,
		misses: 0,
		sets: 0,
		deletes: 0,
		evictions: 0
	};

	// Cleanup expired entries every minute
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		let cleaned = 0;
		
		for (const [key, entry] of cache.entries()) {
			if (entry.expiresAt && entry.expiresAt < now) {
				cache.delete(key);
				cleaned++;
			}
		}
		
		if (cleaned > 0 && process.env.NODE_ENV === 'development') {
			console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
		}
	}, 60000); // Every minute

	// Evict oldest entries if cache is too large
	function evictIfNeeded() {
		if (cache.size <= maxSize) return;
		
		// Sort by access time and remove oldest
		const entries = Array.from(cache.entries())
			.map(([key, entry]) => ({ key, lastAccess: entry.lastAccess || 0 }))
			.sort((a, b) => a.lastAccess - b.lastAccess);
		
		const toEvict = cache.size - maxSize;
		for (let i = 0; i < toEvict; i++) {
			cache.delete(entries[i].key);
			stats.evictions++;
		}
		
		if (process.env.NODE_ENV === 'development') {
			console.log(`🗑️  Cache eviction: removed ${toEvict} oldest entries`);
		}
	}

	return {
		/**
		 * Get value from cache
		 */
		get(key) {
			const entry = cache.get(key);
			
			if (!entry) {
				stats.misses++;
				return null;
			}
			
			// Check if expired
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				cache.delete(key);
				stats.misses++;
				return null;
			}
			
			// Update access time
			entry.lastAccess = Date.now();
			stats.hits++;
			
			return entry.value;
		},

		/**
		 * Set value in cache
		 */
		set(key, value, ttl = defaultTTL) {
			const expiresAt = ttl ? Date.now() + ttl : null;
			
			cache.set(key, {
				value,
				expiresAt,
				lastAccess: Date.now(),
				createdAt: Date.now()
			});
			
			stats.sets++;
			evictIfNeeded();
		},

		/**
		 * Delete value from cache
		 */
		delete(key) {
			const deleted = cache.delete(key);
			if (deleted) {
				stats.deletes++;
			}
			return deleted;
		},

		/**
		 * Delete all keys matching pattern
		 */
		deletePattern(pattern) {
			const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
			let deleted = 0;
			
			for (const key of cache.keys()) {
				if (regex.test(key)) {
					cache.delete(key);
					deleted++;
				}
			}
			
			if (deleted > 0) {
				stats.deletes += deleted;
			}
			
			return deleted;
		},

		/**
		 * Clear all cache
		 */
		clear() {
			const size = cache.size;
			cache.clear();
			stats.deletes += size;
			return size;
		},

		/**
		 * Get cache statistics
		 */
		getStats() {
			const hitRate = stats.hits + stats.misses > 0
				? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
				: 0;
			
			return {
				...stats,
				size: cache.size,
				maxSize,
				hitRate: `${hitRate}%`,
				missRate: `${(100 - parseFloat(hitRate)).toFixed(2)}%`
			};
		},

		/**
		 * Get cache size
		 */
		size() {
			return cache.size;
		},

		/**
		 * Cleanup (call on shutdown)
		 */
		destroy() {
			clearInterval(cleanupInterval);
			cache.clear();
		}
	};
}

