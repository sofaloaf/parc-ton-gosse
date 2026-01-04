/**
 * Discovery Module
 * 
 * Handles hybrid search logic combining:
 * - Google Custom Search API
 * - Direct lookups on known government/city hall sites
 * - Graph expansion from discovered entities
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export class DiscoveryModule {
	constructor(options = {}) {
		this.googleApiKey = options.googleApiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
		this.googleCx = options.googleCx || process.env.GOOGLE_CUSTOM_SEARCH_CX;
		this.visitedUrls = new Set();
		this.discoveredEntities = new Map(); // entity name -> metadata
		this.rateLimiter = new Map(); // domain -> last request time
		this.minDelay = options.minDelay || 1000;
		this.maxDelay = options.maxDelay || 3000;
	}

	/**
	 * Hybrid search combining Google Custom Search and direct lookups
	 */
	async hybridSearch(query, options = {}) {
		const results = {
			googleResults: [],
			directResults: [],
			expandedResults: []
		};

		// 1. Google Custom Search (if configured)
		if (this.googleApiKey && this.googleCx) {
			try {
				results.googleResults = await this.googleCustomSearch(query, options);
			} catch (error) {
				console.warn('Google Custom Search failed:', error.message);
			}
		}

		// 2. Direct lookups on known government sites
		results.directResults = await this.directGovernmentLookup(query, options);

		// 3. Graph expansion from discovered entities
		if (options.expandGraph !== false) {
			results.expandedResults = await this.expandGraph(results.googleResults.concat(results.directResults));
		}

		return {
			...results,
			allResults: [...results.googleResults, ...results.directResults, ...results.expandedResults]
		};
	}

	/**
	 * Google Custom Search API
	 */
	async googleCustomSearch(query, options = {}) {
		const searchQuery = this.buildSearchQuery(query, options);
		const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleCx}&q=${encodeURIComponent(searchQuery)}&num=10`;
		
		try {
			await this.applyRateLimit('googleapis.com');
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error(`Google Search API error: ${response.status}`);
			}

			const data = await response.json();
			const results = (data.items || []).map(item => ({
				url: item.link,
				title: item.title,
				snippet: item.snippet,
				source: 'google_custom_search',
				confidence: 0.7,
				discoveredAt: new Date().toISOString()
			}));

			// Track discovered entities
			results.forEach(result => {
				this.trackDiscoveredEntity(result);
			});

			return results;
		} catch (error) {
			console.error('Google Custom Search error:', error);
			return [];
		}
	}

	/**
	 * Direct lookups on known government and city hall sites
	 */
	async directGovernmentLookup(query, options = {}) {
		const results = [];
		const arrondissement = options.arrondissement;
		const postalCode = options.postalCode;

		// Paris mairie sites
		if (arrondissement && postalCode) {
			const arrNum = arrondissement.replace('er', '').replace('e', '');
			const mairieUrl = `https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`;
			
			if (!this.visitedUrls.has(mairieUrl)) {
				try {
					await this.applyRateLimit(`mairie${arrNum}.paris.fr`);
					const result = await this.fetchAndParse(mairieUrl);
					if (result) {
						results.push({
							url: mairieUrl,
							title: `Mairie ${arrondissement} - Activités`,
							snippet: result.snippet || '',
							source: 'mairie_direct',
							confidence: 0.9,
							discoveredAt: new Date().toISOString(),
							links: result.links || []
						});
						this.visitedUrls.add(mairieUrl);
					}
				} catch (error) {
					console.error(`Direct lookup failed for ${mairieUrl}:`, error.message);
				}
			}
		}

		// Other government portals (extensible)
		const governmentPortals = [
			'https://www.data.gouv.fr',
			'https://www.service-public.fr'
		];

		for (const portal of governmentPortals) {
			if (!this.visitedUrls.has(portal)) {
				try {
					await this.applyRateLimit(new URL(portal).hostname);
					// Implement portal-specific search logic
					// This is a placeholder for future expansion
				} catch (error) {
					console.error(`Portal lookup failed for ${portal}:`, error.message);
				}
			}
		}

		return results;
	}

	/**
	 * Expand search graph using discovered entity names and domains
	 */
	async expandGraph(initialResults) {
		const expandedResults = [];
		const entityNames = new Set();
		const domains = new Set();

		// Extract entity names and domains from initial results
		initialResults.forEach(result => {
			if (result.title) {
				// Simple heuristic: extract potential organization names
				const words = result.title.split(/\s+/).filter(w => w.length > 3);
				words.forEach(w => entityNames.add(w));
			}
			
			try {
				const url = new URL(result.url);
				domains.add(url.hostname);
			} catch (e) {
				// Invalid URL, skip
			}
		});

		// Search for each discovered entity
		for (const entityName of Array.from(entityNames).slice(0, 5)) { // Limit to 5 to avoid explosion
			if (this.discoveredEntities.has(entityName)) continue;

			try {
				const searchResults = await this.hybridSearch(entityName, { expandGraph: false });
				expandedResults.push(...searchResults.allResults);
				this.discoveredEntities.set(entityName, {
					discoveredAt: new Date().toISOString(),
					sources: searchResults.allResults.map(r => r.url)
				});
			} catch (error) {
				console.error(`Graph expansion failed for ${entityName}:`, error.message);
			}
		}

		return expandedResults;
	}

	/**
	 * Build optimized search query
	 */
	buildSearchQuery(baseQuery, options = {}) {
		const terms = [baseQuery];
		
		if (options.arrondissement) {
			terms.push(`arrondissement ${options.arrondissement}`);
		}
		
		if (options.entityType) {
			terms.push(options.entityType); // e.g., "association", "club", "nonprofit"
		}
		
		terms.push('activités enfants Paris');
		
		return terms.join(' ');
	}

	/**
	 * Fetch and parse a URL
	 */
	async fetchAndParse(url) {
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': this.getRandomUserAgent(),
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
				},
				timeout: 20000
			});

			if (!response.ok) return null;

			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;

			// Extract links
			const links = Array.from(document.querySelectorAll('a[href]'))
				.map(a => {
					const href = a.getAttribute('href');
					try {
						return new URL(href, url).href;
					} catch {
						return null;
					}
				})
				.filter(Boolean);

			return {
				snippet: document.querySelector('meta[name="description"]')?.content || 
				         document.querySelector('p')?.textContent?.substring(0, 200) || '',
				links
			};
		} catch (error) {
			console.error(`Failed to fetch ${url}:`, error.message);
			return null;
		}
	}

	/**
	 * Apply rate limiting per domain
	 */
	async applyRateLimit(domain) {
		const lastRequest = this.rateLimiter.get(domain) || 0;
		const now = Date.now();
		const timeSinceLastRequest = now - lastRequest;
		const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);

		if (timeSinceLastRequest < delay) {
			await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastRequest));
		}

		this.rateLimiter.set(domain, Date.now());
	}

	/**
	 * Get random user agent to prevent blocking
	 */
	getRandomUserAgent() {
		const userAgents = [
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
		];
		return userAgents[Math.floor(Math.random() * userAgents.length)];
	}

	/**
	 * Track discovered entity
	 */
	trackDiscoveredEntity(result) {
		// Extract potential entity name from title
		const title = result.title || '';
		const words = title.split(/\s+/).filter(w => w.length > 3);
		
		if (words.length > 0) {
			const entityName = words[0]; // Simple heuristic
			if (!this.discoveredEntities.has(entityName)) {
				this.discoveredEntities.set(entityName, {
					discoveredAt: new Date().toISOString(),
					sources: [result.url],
					confidence: result.confidence || 0.5
				});
			}
		}
	}

	/**
	 * Check if URL has been visited
	 */
	hasVisited(url) {
		return this.visitedUrls.has(url);
	}

	/**
	 * Mark URL as visited
	 */
	markVisited(url) {
		this.visitedUrls.add(url);
	}

	/**
	 * Get discovery statistics
	 */
	getStats() {
		return {
			visitedUrls: this.visitedUrls.size,
			discoveredEntities: this.discoveredEntities.size,
			rateLimiterEntries: this.rateLimiter.size
		};
	}
}

