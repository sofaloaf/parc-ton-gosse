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
	 * Hybrid search - PRIORITIZE general web search first, then direct lookups
	 */
	async hybridSearch(query, options = {}) {
		const results = {
			googleResults: [],
			directResults: [],
			expandedResults: []
		};

		// STEP 1: Comprehensive web searches FIRST (exhaust full keyword list)
		console.log('🌐 Step 1: Starting comprehensive web searches...');
		
		if (options.arrondissement && this.googleApiKey && this.googleCx) {
			const activityKeywords = this.getActivityKeywords();
			const arrondissement = options.arrondissement;
			const city = 'Paris';
			
			// Build queries using template: [city] + [arrondissement] + [kids/enfant] + [activities with OR]
			const specificQueries = [];
			
			// Group activities into chunks to create multiple targeted queries
			const chunkSize = 20; // 20 activities per query
			for (let i = 0; i < activityKeywords.length; i += chunkSize) {
				const activityChunk = activityKeywords.slice(i, i + chunkSize);
				const activityQuery = activityChunk.join(' OR ');
				
				// Build query: Paris [arrondissement] arrondissement enfants kids (activity1 OR activity2 OR ...)
				const query = `${city} ${arrondissement} arrondissement enfants kids (${activityQuery}) -newsletter -"lettre d'information"`;
				specificQueries.push(query);
			}
			
			// Also add specific targeted searches for high-value activities
			const highValueActivities = [
				'football OR soccer', 'basketball OR basket', 'tennis', 'natation OR swimming',
				'danse OR dance', 'théâtre OR theater', 'musique OR music',
				'judo', 'karate OR karaté', 'escrime OR fencing',
				'gymnastique OR gymnastics', 'escalade OR climbing',
				'dessin OR drawing', 'peinture OR painting', 'codage OR coding'
			];
			
			for (const activityGroup of highValueActivities) {
				const query = `${city} ${arrondissement} arrondissement enfants kids (${activityGroup}) -newsletter`;
				specificQueries.push(query);
			}
			
			// Execute ALL web searches first (limit to 20 to avoid rate limiting, but process all)
			console.log(`  📋 Executing ${specificQueries.length} web search queries...`);
			// Limit to 10 queries to avoid Railway timeout (Railway has ~60s timeout)
			for (let i = 0; i < Math.min(specificQueries.length, 10); i++) {
				const specificQuery = specificQueries[i];
				try {
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
						    (title.includes('abonnement') && title.includes('newsletter'))) {
							return false;
						}
						
						// Exclude generic Paris city hall pages without activity content
						if (title.includes('mairie de paris') && 
						    !title.includes('activité') && 
						    !title.includes('association') &&
						    !title.includes('club') &&
						    !snippet.includes('activité') &&
						    !snippet.includes('association')) {
							return false;
						}
						
						// Must contain activity-related keywords
						const activityIndicators = [
							'activité', 'activités', 'activity', 'activities',
							'club', 'clubs', 'association', 'associations',
							'sport', 'sports', 'théâtre', 'theater', 'theatre',
							'danse', 'dance', 'musique', 'music', 'arts martiaux', 'martial arts',
							'loisir', 'loisirs', 'atelier', 'workshop', 'cours', 'cercle',
							'enfant', 'enfants', 'kids', 'children'
						];
						
						const hasActivityKeyword = activityIndicators.some(keyword => 
							title.includes(keyword) || snippet.includes(keyword) || url.includes(keyword)
						);
						
						return hasActivityKeyword;
					});
					
					results.googleResults.push(...filteredResults);
					console.log(`  🔍 [${i + 1}/${Math.min(specificQueries.length, 20)}] Search: ${filteredResults.length} results`);
					
					// Rate limiting between searches
					await new Promise(resolve => setTimeout(resolve, this.minDelay));
				} catch (error) {
					console.warn(`  ⚠️  Search ${i + 1} failed:`, error.message);
				}
			}
			
			console.log(`✅ Web searches complete: ${results.googleResults.length} total results`);
		}

		// STEP 2: Direct lookups on city hall websites (ONLY AFTER web searches are exhausted)
		console.log('🏛️  Step 2: Starting city hall direct lookups...');
		results.directResults = await this.directGovernmentLookup(query, options);
		console.log(`✅ City hall lookups complete: ${results.directResults.length} results`);

		// STEP 3: Graph expansion from discovered entities (optional)
		if (options.expandGraph !== false && results.googleResults.length > 0) {
			console.log('🔗 Step 3: Expanding graph from discovered entities...');
			results.expandedResults = await this.expandGraph(results.googleResults);
			console.log(`✅ Graph expansion complete: ${results.expandedResults.length} results`);
		}

		// Aggregate all results - PRIORITIZE web search results first
		results.allResults = [
			...results.googleResults, // Web search results FIRST
			...results.directResults, // City hall pages second
			...results.expandedResults // Expanded results last
		];

		console.log(`  📊 Discovery summary: ${results.googleResults.length} web search, ${results.directResults.length} city hall, ${results.expandedResults.length} expanded, ${results.allResults.length} total`);

		return results;
	}

	/**
	 * Fetch with timeout helper
	 */
	async fetchWithTimeout(url, options = {}) {
		const timeout = options.timeout || 30000; // 30 second default timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			if (error.name === 'AbortError') {
				throw new Error(`Request timeout after ${timeout}ms`);
			}
			throw error;
		}
	}

	/**
	 * Google Custom Search API with timeout and retry logic
	 */
	async googleCustomSearch(query, options = {}) {
		const searchQuery = this.buildSearchQuery(query, options);
		const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleCx}&q=${encodeURIComponent(searchQuery)}&num=10`;
		
		const maxRetries = 3;
		let lastError = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await this.applyRateLimit('googleapis.com');
				
				const response = await this.fetchWithTimeout(url, {
					timeout: 30000, // 30 second timeout
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
					}
				});
				
				if (!response.ok) {
					// Check for rate limiting
					if (response.status === 429) {
						const retryAfter = response.headers.get('Retry-After') || 60;
						console.warn(`⚠️  Google API rate limit hit. Waiting ${retryAfter} seconds...`);
						await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
						continue; // Retry
					}
					throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
				}

				const data = await response.json();
				
				// Check for API errors in response
				if (data.error) {
					throw new Error(`Google Search API error: ${data.error.message || JSON.stringify(data.error)}`);
				}

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
				lastError = error;
				const isNetworkError = error.message.includes('timeout') || 
				                      error.message.includes('NetworkError') ||
				                      error.message.includes('fetch failed') ||
				                      error.message.includes('ECONNRESET') ||
				                      error.message.includes('ETIMEDOUT');
				
				if (attempt < maxRetries && isNetworkError) {
					const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
					console.warn(`⚠️  Google Search attempt ${attempt} failed (${error.message}), retrying in ${backoffDelay}ms...`);
					await new Promise(resolve => setTimeout(resolve, backoffDelay));
					continue;
				}
				
				// Last attempt or non-retryable error
				console.error(`Google Custom Search error (attempt ${attempt}/${maxRetries}):`, error.message);
				if (attempt === maxRetries) {
					break; // Return empty array after all retries
				}
			}
		}

		// Return empty array on all failures
		return [];
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
	 * Build optimized search query using template: [city] + [kids/enfant] + [activities with OR]
	 */
	buildSearchQuery(baseQuery, options = {}) {
		const arrondissement = options.arrondissement || '';
		const city = 'Paris';
		
		// Comprehensive activity keywords in French and English
		const activityKeywords = this.getActivityKeywords();
		
		// Build query using template: [city] + [arrondissement] + [kids/enfant] + [activities with OR]
		const queryParts = [];
		
		// City and location
		queryParts.push(city);
		if (arrondissement) {
			queryParts.push(`${arrondissement} arrondissement`);
		}
		
		// Kids/children keywords
		queryParts.push('enfants', 'kids', 'children');
		
		// Activities with OR operators (limit to avoid query too long)
		// Use top 30 most relevant activities
		const topActivities = activityKeywords.slice(0, 30);
		const activityQuery = topActivities.join(' OR ');
		queryParts.push(`(${activityQuery})`);
		
		// Exclude newsletter and generic terms
		const excludeTerms = ['-newsletter', '-"lettre d\'information"', '-abonnement', '-"Les newsletters"'];
		queryParts.push(...excludeTerms);
		
		return queryParts.join(' ');
	}

	/**
	 * Get comprehensive list of activity keywords in French and English
	 */
	getActivityKeywords() {
		return [
			// Core activity terms
			'activité', 'activités', 'activities', 'activity',
			'club', 'clubs', 'association', 'associations',
			'sport', 'sports', 'loisir', 'loisirs', 'leisure',
			'cours', 'atelier', 'ateliers', 'workshop', 'workshops',
			
			// Team Ball Sports
			'football', 'soccer', 'basketball', 'basket-ball', 'basket',
			'volleyball', 'volley-ball', 'handball', 'rugby',
			'baseball', 'cricket', 'ultimate frisbee', 'ultimate',
			
			// Combat & Martial Arts
			'boxe', 'boxing', 'judo', 'karate', 'karaté',
			'taekwondo', 'tae kwon do', 'kickboxing', 'kick-boxing',
			'jujitsu', 'jiu-jitsu', 'mma', 'arts martiaux', 'martial arts',
			'escrime', 'fencing', 'aïkido', 'aikido', 'kendo',
			'kung fu', 'wrestling', 'lutte',
			
			// Water Sports
			'natation', 'swimming', 'plongée', 'diving',
			'water polo', 'water-polo', 'kayak', 'kayaking',
			'canoë', 'canoe', 'canoeing', 'aviron', 'rowing',
			'surf', 'surfing', 'paddle', 'paddleboarding',
			
			// Racquet & Precision Sports
			'tennis', 'tennis de table', 'ping pong', 'table tennis',
			'badminton', 'squash', 'racquetball',
			
			// Athletics & Endurance
			'athlétisme', 'athletics', 'course', 'running',
			'marathon', 'triathlon', 'duathlon', 'biathlon',
			'orientation', 'orienteering',
			
			// Winter & Snow Sports
			'ski', 'skiing', 'snowboard', 'snowboarding',
			'hockey sur glace', 'ice hockey', 'patinage', 'skating',
			'patinage artistique', 'figure skating', 'patinage de vitesse', 'speed skating',
			'curling',
			
			// Cycling & Wheel Sports
			'cyclisme', 'cycling', 'vélo', 'bike', 'biking',
			'vtt', 'mountain bike', 'bmx', 'cyclocross',
			'roller', 'roller skating', 'patin à roulettes',
			
			// Gymnastics & Acrobatics
			'gymnastique', 'gymnastics', 'gymnastique artistique', 'artistic gymnastics',
			'gymnastique rythmique', 'rhythmic gymnastics',
			'trampoline', 'trampolining', 'parkour', 'freerunning',
			'cheerleading', 'acrobatie', 'acrobatics',
			
			// Mind & Board Games
			'échecs', 'chess', 'go', 'bridge',
			'esport', 'esports', 'gaming', 'jeux vidéo',
			'rubik\'s cube', 'speedcubing',
			
			// Creative & Niche Activities
			'dessin', 'drawing', 'peinture', 'painting',
			'manga', 'bande dessinée', 'comics',
			'codage', 'coding', 'programmation', 'programming',
			'théâtre', 'theater', 'theatre', 'drama',
			'danse', 'dance', 'ballet', 'hip-hop', 'hip hop',
			'salsa', 'photographie', 'photography',
			'écriture', 'writing', 'poésie', 'poetry',
			'musique', 'music', 'chorale', 'choir', 'orchestre', 'orchestra',
			'guitare', 'guitar', 'piano', 'violon', 'violin',
			'cosplay', 'modélisme', 'model building',
			
			// Extreme & Adventure
			'escalade', 'climbing', 'grimpe', 'bouldering',
			'alpinisme', 'mountaineering', 'parapente', 'paragliding',
			
			// Equestrian & Animal Sports
			'équitation', 'horseback riding', 'équitation', 'equestrian',
			'saut d\'obstacles', 'show jumping', 'dressage',
			'agility', 'agility canine',
			
			// Shooting & Archery
			'tir à l\'arc', 'archery', 'tir', 'shooting',
			
			// Motorsports
			'karting', 'go-kart', 'moto', 'motocross',
			
			// Alternative Sports
			'ultimate frisbee', 'disc golf', 'geocaching',
			'football américain', 'american football',
			
			// Additional relevant terms
			'cercle', 'académie', 'academy', 'école', 'school',
			'centre', 'center', 'centre de loisirs', 'leisure center',
			'périscolaire', 'extracurricular', 'extracurriculaire',
			'jeunesse', 'youth', 'adolescent', 'teenager',
			'initiation', 'débutant', 'beginner'
		];
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

