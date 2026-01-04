/**
 * Compliance Module
 * 
 * Handles robots.txt checking, rate limiting, and GDPR compliance
 */

import fetch from 'node-fetch';

export class ComplianceModule {
	constructor(options = {}) {
		this.robotsCache = new Map(); // domain -> robots.txt rules
		this.rateLimiter = new Map(); // domain -> { lastRequest, delay }
		this.minDelay = options.minDelay || 1000;
		this.maxDelay = options.maxDelay || 3000;
		this.userAgents = options.userAgents || [
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
		];
		this.stats = {
			robotsChecks: 0,
			robotsAllowed: 0,
			robotsDisallowed: 0,
			rateLimitDelays: 0,
			totalDelayTime: 0
		};
	}

	/**
	 * Check if URL can be crawled (robots.txt)
	 */
	async canCrawl(url) {
		try {
			const urlObj = new URL(url);
			const domain = urlObj.origin;
			
			// Get or fetch robots.txt
			let robotsRules = this.robotsCache.get(domain);
			if (!robotsRules) {
				robotsRules = await this.fetchRobotsTxt(domain);
				this.robotsCache.set(domain, robotsRules);
			}

			this.stats.robotsChecks++;

			// Check if path is allowed
			const path = urlObj.pathname;
			const isAllowed = this.checkRobotsRule(robotsRules, path);

			if (isAllowed) {
				this.stats.robotsAllowed++;
			} else {
				this.stats.robotsDisallowed++;
			}

			return isAllowed;
		} catch (error) {
			console.warn(`Robots.txt check failed for ${url}:`, error.message);
			// Default to allowing if check fails
			return true;
		}
	}

	/**
	 * Fetch and parse robots.txt
	 */
	async fetchRobotsTxt(domain) {
		try {
			const robotsUrl = `${domain}/robots.txt`;
			const response = await fetch(robotsUrl, {
				timeout: 5000,
				headers: {
					'User-Agent': this.getRandomUserAgent()
				}
			});

			if (!response.ok) {
				// No robots.txt or error - allow all
				return { allow: ['*'], disallow: [], crawlDelay: null };
			}

			const text = await response.text();
			return this.parseRobotsTxt(text);
		} catch (error) {
			// Error fetching - default to allowing
			return { allow: ['*'], disallow: [], crawlDelay: null };
		}
	}

	/**
	 * Parse robots.txt content
	 */
	parseRobotsTxt(text) {
		const rules = {
			allow: [],
			disallow: [],
			crawlDelay: null
		};

		const lines = text.split('\n');
		let currentUserAgent = '*';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const [directive, value] = trimmed.split(':').map(s => s.trim());
			if (!directive || !value) continue;

			const lowerDirective = directive.toLowerCase();

			if (lowerDirective === 'user-agent') {
				currentUserAgent = value;
			} else if (lowerDirective === 'allow' && currentUserAgent === '*') {
				rules.allow.push(value);
			} else if (lowerDirective === 'disallow' && currentUserAgent === '*') {
				rules.disallow.push(value);
			} else if (lowerDirective === 'crawl-delay' && currentUserAgent === '*') {
				rules.crawlDelay = parseInt(value) || null;
			}
		}

		// Default to allowing all if no rules
		if (rules.allow.length === 0 && rules.disallow.length === 0) {
			rules.allow.push('*');
		}

		return rules;
	}

	/**
	 * Check if path is allowed by robots.txt rules
	 */
	checkRobotsRule(rules, path) {
		// Check disallow rules first
		for (const disallow of rules.disallow) {
			if (this.matchesPattern(path, disallow)) {
				// Check if there's an allow rule that overrides
				for (const allow of rules.allow) {
					if (this.matchesPattern(path, allow)) {
						return true; // Allowed by specific rule
					}
				}
				return false; // Disallowed
			}
		}

		// Check allow rules
		for (const allow of rules.allow) {
			if (this.matchesPattern(path, allow)) {
				return true;
			}
		}

		// Default: allow if no specific rules match
		return true;
	}

	/**
	 * Check if path matches robots.txt pattern
	 */
	matchesPattern(path, pattern) {
		if (pattern === '*') return true;
		if (pattern === '/') return path === '/';

		// Convert robots.txt pattern to regex
		const regexPattern = pattern
			.replace(/\*/g, '.*')
			.replace(/\$/g, '$');
		
		const regex = new RegExp(`^${regexPattern}`);
		return regex.test(path);
	}

	/**
	 * Apply rate limiting for a URL
	 */
	async applyRateLimit(url) {
		try {
			const urlObj = new URL(url);
			const domain = urlObj.hostname;
			
			const now = Date.now();
			const limiter = this.rateLimiter.get(domain) || { lastRequest: 0, delay: this.minDelay };

			// Check robots.txt crawl delay
			const robotsRules = this.robotsCache.get(urlObj.origin);
			if (robotsRules && robotsRules.crawlDelay) {
				limiter.delay = robotsRules.crawlDelay * 1000; // Convert to milliseconds
			} else {
				// Random delay between min and max
				limiter.delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
			}

			const timeSinceLastRequest = now - limiter.lastRequest;
			if (timeSinceLastRequest < limiter.delay) {
				const waitTime = limiter.delay - timeSinceLastRequest;
				await new Promise(resolve => setTimeout(resolve, waitTime));
				this.stats.rateLimitDelays++;
				this.stats.totalDelayTime += waitTime;
			}

			limiter.lastRequest = Date.now();
			this.rateLimiter.set(domain, limiter);
		} catch (error) {
			// Invalid URL or error - apply default delay
			await new Promise(resolve => setTimeout(resolve, this.minDelay));
		}
	}

	/**
	 * Get random user agent
	 */
	getRandomUserAgent() {
		return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
	}

	/**
	 * Get compliance statistics
	 */
	getStats() {
		return {
			...this.stats,
			robotsCacheSize: this.robotsCache.size,
			rateLimiterSize: this.rateLimiter.size,
			avgDelayTime: this.stats.rateLimitDelays > 0
				? (this.stats.totalDelayTime / this.stats.rateLimitDelays).toFixed(0)
				: 0
		};
	}

	/**
	 * Clear caches
	 */
	clearCaches() {
		this.robotsCache.clear();
		this.rateLimiter.clear();
	}
}

