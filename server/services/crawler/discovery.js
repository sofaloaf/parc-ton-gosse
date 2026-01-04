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

		// 1.5. Comprehensive activity-specific searches for the arrondissement
		if (options.arrondissement) {
			// Activity keywords in French and English
			const activityKeywords = [
				// French
				'club', 'clubs', 'activité', 'activités', 'association', 'associations',
				'sport', 'sports', 'théâtre', 'théâtres', 'danse', 'danses',
				'arts martiaux', 'art martial', 'musique', 'musiques',
				'extracurriculaire', 'extracurriculaires',
				// English
				'organization', 'organizations', 'activity', 'activities',
				'theater', 'theatre', 'dance', 'dancing', 'martial arts',
				'music', 'extracurricular',
				// Additional relevant terms
				'loisir', 'loisirs', 'atelier', 'ateliers', 'cours', 'cercle',
				'école', 'écoles', 'académie', 'académies', 'centre', 'centres'
			];

			// Build comprehensive search queries
			const specificQueries = [];
			
			// Base queries with arrondissement
			for (const keyword of activityKeywords.slice(0, 15)) { // Limit to avoid too many API calls
				specificQueries.push(`${keyword} enfants ${options.arrondissement} Paris`);
				specificQueries.push(`${keyword} enfants Paris ${options.arrondissement}`);
			}

			// Specific targeted searches
			specificQueries.push(`"cercle escrime" ${options.arrondissement} Paris`);
			specificQueries.push(`associations ${options.arrondissement} arrondissement Paris`);
			specificQueries.push(`clubs sport ${options.arrondissement} Paris`);
			specificQueries.push(`activités enfants ${options.arrondissement} arrondissement`);

			// Limit to 20 queries to avoid rate limiting
			for (const specificQuery of specificQueries.slice(0, 20)) {
				try {
					if (this.googleApiKey && this.googleCx) {
						const specificResults = await this.googleCustomSearch(specificQuery, { ...options, expandGraph: false });
						
						// Filter out newsletter and non-activity results
						const filteredResults = specificResults.filter(result => {
							const title = (result.title || '').toLowerCase();
							const snippet = (result.snippet || '').toLowerCase();
							const url = (result.url || '').toLowerCase();
							
							// Exclude newsletter results
							if (title.includes('newsletter') || 
							    title.includes('lettre d\'information') ||
							    snippet.includes('newsletter') ||
							    snippet.includes('lettre d\'information') ||
							    url.includes('newsletter') ||
							    title.includes('abonnement') && title.includes('newsletter')) {
								return false;
							}
							
							// Exclude generic Paris city hall pages
							if (title.includes('mairie de paris') && !title.includes('activité') && !title.includes('association')) {
								return false;
							}
							
							// Must contain activity-related keywords
							const activityIndicators = [
								'activité', 'activités', 'club', 'clubs', 'association', 'associations',
								'sport', 'théâtre', 'danse', 'musique', 'arts martiaux',
								'loisir', 'atelier', 'cours', 'cercle', 'enfant', 'enfants'
							];
							
							const hasActivityKeyword = activityIndicators.some(keyword => 
								title.includes(keyword) || snippet.includes(keyword) || url.includes(keyword)
							);
							
							return hasActivityKeyword;
						});
						
						results.googleResults.push(...filteredResults);
						console.log(`  🔍 Search "${specificQuery}": ${filteredResults.length} filtered results (${specificResults.length} total)`);
					}
				} catch (error) {
					console.warn(`Specific search failed for "${specificQuery}":`, error.message);
				}
			}
		}

		// 2. Direct lookups on known government sites
		results.directResults = await this.directGovernmentLookup(query, options);

		// 3. Graph expansion from discovered entities
		if (options.expandGraph !== false) {
			results.expandedResults = await this.expandGraph(results.googleResults.concat(results.directResults));
		}

		// Aggregate all results - prioritize direct results (mairie pages) first
		results.allResults = [
			...results.directResults, // Mairie pages first (proven to work)
			...results.googleResults,
			...results.expandedResults
		];

		console.log(`  📊 Discovery summary: ${results.directResults.length} direct, ${results.googleResults.length} Google, ${results.expandedResults.length} expanded, ${results.allResults.length} total`);

		return results;
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
	 * Uses the proven approach from the existing arrondissement crawler
	 */
	async directGovernmentLookup(query, options = {}) {
		const results = [];
		const arrondissement = options.arrondissement;
		const postalCode = options.postalCode;

		// Paris mairie sites - use the same approach as the working crawler
		if (arrondissement && postalCode) {
			const arrNum = arrondissement.replace('er', '').replace('e', '');
			const mairieUrl = `https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`;
			
			if (!this.visitedUrls.has(mairieUrl)) {
				try {
					await this.applyRateLimit(`mairie${arrNum}.paris.fr`);
					const result = await this.fetchAndParseMairiePage(mairieUrl, arrondissement);
					if (result) {
						// Add the main mairie page
						results.push({
							url: mairieUrl,
							title: `Mairie ${arrondissement} - Activités`,
							snippet: result.snippet || '',
							source: 'mairie_direct',
							confidence: 0.9,
							discoveredAt: new Date().toISOString(),
							links: result.links || []
						});
						
						// Also add individual activity links from the mairie page
						// These are more likely to contain organization information
						if (result.links && result.links.length > 0) {
							console.log(`  📎 Found ${result.links.length} links on mairie page`);
							const activityLinks = result.links
								.filter(link => {
									const url = link.toLowerCase();
									return url.includes('activite') || url.includes('activites') || 
									       url.includes('association') || url.includes('club') ||
									       url.includes('cercle') || url.includes('sport') ||
									       url.includes('loisir') || url.includes('enfant');
								})
								.slice(0, 100); // Increase to 100 links for mairie pages
							
							console.log(`  ✅ Processing ${activityLinks.length} activity links from mairie page`);
							for (const link of activityLinks) {
								if (!this.visitedUrls.has(link)) {
									results.push({
										url: link,
										title: `Activity from Mairie ${arrondissement}`,
										snippet: '',
										source: 'mairie_activity',
										confidence: 0.85,
										discoveredAt: new Date().toISOString()
									});
								}
							}
						} else {
							console.log(`  ⚠️  No links found on mairie page`);
						}
						
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
	 * Build optimized search query with activity-specific keywords
	 */
	buildSearchQuery(baseQuery, options = {}) {
		const terms = [baseQuery];
		
		// Add more specific terms for better results
		if (options.arrondissement) {
			terms.push(`${options.arrondissement} arrondissement`);
		}
		
		// Activity keywords (prioritize most relevant)
		const activityTerms = [
			'activité', 'activités', 'club', 'clubs', 'association', 'associations',
			'sport', 'sports', 'théâtre', 'danse', 'musique', 'arts martiaux',
			'loisir', 'loisirs', 'atelier', 'ateliers', 'cours', 'cercle'
		];
		
		if (options.entityType) {
			terms.push(options.entityType);
		} else {
			// Add top activity keywords
			terms.push(...activityTerms.slice(0, 5));
		}
		
		// Always include "enfants" and "Paris" for relevance
		terms.push('enfants', 'Paris');
		
		// Exclude newsletter and generic terms
		const excludeTerms = ['newsletter', 'lettre d\'information', 'abonnement'];
		terms.push(...excludeTerms.map(term => `-${term}`)); // Google search exclusion syntax
		
		return terms.join(' ');
	}

	/**
	 * Fetch and parse a mairie page using proven selectors from existing crawler
	 */
	async fetchAndParseMairiePage(url, arrondissement) {
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

			// Use the same proven selectors from the working arrondissement crawler
			const activitySelectors = [
				'a[href*="/activites/"]',
				'a[href*="/activite/"]',
				'a[href*="activites"]',
				'a[href*="activite"]',
				'article a',
				'.result-item a',
				'.activity-item a',
				'.search-result a',
				'[class*="result"] a',
				'[class*="activity"] a',
				'[class*="activite"] a',
				'.card a',
				'.item a',
				'li a[href*="activite"]'
			];

			const links = new Set();
			const baseUrl = `https://mairie${arrondissement.replace('er', '').replace('e', '')}.paris.fr`;

			// Extract links using proven selectors
			for (const selector of activitySelectors) {
				try {
					const elements = document.querySelectorAll(selector);
					for (const link of elements) {
						const href = link.getAttribute('href');
						if (!href) continue;

						const isActivityLink = href.includes('activite') || 
						                     href.includes('activites') ||
						                     link.textContent?.toLowerCase().includes('activité') ||
						                     link.textContent?.toLowerCase().includes('activite');

						if (isActivityLink) {
							let fullUrl = href;
							if (href.startsWith('/')) {
								fullUrl = `${baseUrl}${href}`;
							} else if (!href.startsWith('http')) {
								fullUrl = `${baseUrl}/${href}`;
							}
							if (fullUrl.startsWith('http')) {
								links.add(fullUrl);
							}
						}
					}
				} catch (e) {
					// Skip selector errors
				}
			}

			// Also search for URLs in page text (like the working crawler)
			const activityUrlPattern = /https?:\/\/mairie\d+\.paris\.fr\/[^"'\s<>]*activit[^"'\s<>]*/gi;
			const urlMatches = html.match(activityUrlPattern);
			if (urlMatches) {
				urlMatches.forEach(url => links.add(url));
			}

			// Parse JSON-LD structured data
			const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
			for (const script of jsonLdScripts) {
				try {
					const jsonLd = JSON.parse(script.textContent);
					const extractUrls = (obj) => {
						if (typeof obj !== 'object' || obj === null) return;
						if (Array.isArray(obj)) {
							obj.forEach(extractUrls);
						} else {
							for (const [key, value] of Object.entries(obj)) {
								if (key === 'url' && typeof value === 'string' && value.includes('activite')) {
									links.add(value);
								} else if (typeof value === 'object') {
									extractUrls(value);
								}
							}
						}
					};
					extractUrls(jsonLd);
				} catch (e) {
					// Invalid JSON-LD, skip
				}
			}

			return {
				snippet: document.querySelector('meta[name="description"]')?.content || 
				         document.querySelector('p')?.textContent?.substring(0, 200) || '',
				links: Array.from(links)
			};
		} catch (error) {
			console.error(`Failed to fetch mairie page ${url}:`, error.message);
			return null;
		}
	}

	/**
	 * Fetch and parse a URL (generic)
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

			// Extract links - be more aggressive in finding activity/organization links
			const allLinks = Array.from(document.querySelectorAll('a[href]'));
			const links = [];
			const linkSet = new Set(); // Avoid duplicates

			for (const a of allLinks) {
				const href = a.getAttribute('href');
				if (!href) continue;

				try {
					const fullUrl = new URL(href, url).href;
					
					// Skip if already seen
					if (linkSet.has(fullUrl)) continue;
					
					// Skip social media and common non-organization links
					if (fullUrl.includes('facebook.com') || 
					    fullUrl.includes('instagram.com') || 
					    fullUrl.includes('twitter.com') ||
					    fullUrl.includes('youtube.com') ||
					    fullUrl.includes('linkedin.com') ||
					    fullUrl.includes('mailto:') ||
					    fullUrl.includes('tel:') ||
					    fullUrl.includes('#') ||
					    fullUrl.includes('javascript:')) {
						continue;
					}

					// Prioritize links that look like activity/organization pages
					const urlLower = fullUrl.toLowerCase();
					const linkText = a.textContent?.trim().toLowerCase() || '';
					
					const isActivityLink = urlLower.includes('activite') || 
					                      urlLower.includes('activites') ||
					                      urlLower.includes('association') ||
					                      urlLower.includes('club') ||
					                      urlLower.includes('cercle') ||
					                      urlLower.includes('sport') ||
					                      linkText.includes('activité') ||
					                      linkText.includes('association') ||
					                      linkText.includes('club') ||
					                      linkText.includes('cercle');

					if (isActivityLink || !urlLower.includes('mairie')) {
						links.push(fullUrl);
						linkSet.add(fullUrl);
					}
				} catch {
					// Invalid URL, skip
				}
			}

			return {
				snippet: document.querySelector('meta[name="description"]')?.content || 
				         document.querySelector('p')?.textContent?.substring(0, 200) || '',
				links: links.slice(0, 50) // Limit to 50 links
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

