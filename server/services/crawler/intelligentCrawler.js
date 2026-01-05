/**
 * Intelligent Crawler Module
 * 
 * Implements AI-assisted data extraction with:
 * - Seed sources (Wikidata, Association registries, official directories)
 * - Intelligent crawl scheduling and prioritization
 * - Schema.org extraction
 * - NLP-like entity recognition
 * - Validation and deduplication
 * - Cross-referencing with official registries
 */

import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Playwright is optional - lazy load it
let playwright = null;
async function getPlaywright() {
	if (playwright === null) {
		try {
			playwright = await import('playwright');
		} catch (error) {
			playwright = false; // Mark as unavailable
		}
	}
	return playwright || null;
}

export class IntelligentCrawler {
	constructor(options = {}) {
		this.googleApiKey = options.googleApiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
		this.googleCx = options.googleCx || process.env.GOOGLE_CUSTOM_SEARCH_CX;
		this.visitedUrls = new Set();
		this.priorityQueue = [];
		this.extractedEntities = new Map();
		this.rateLimiter = new Map();
		this.minDelay = options.minDelay || 1000;
		this.maxDelay = options.maxDelay || 3000;
		this.browser = null;
	}

	/**
	 * Initialize Playwright browser
	 */
	async initBrowser() {
		const playwrightModule = await getPlaywright();
		if (!playwrightModule) {
			return null; // Playwright not available
		}
		if (!this.browser) {
			this.browser = await playwrightModule.chromium.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
		}
		return this.browser;
	}

	/**
	 * Close browser
	 */
	async closeBrowser() {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	/**
	 * Seed Sources - Get initial URLs from official registries and aggregators
	 */
	async getSeedSources(arrondissement, postalCode) {
		const seedUrls = [];
		
		console.log('🌱 Gathering seed sources...');

		// 1. Wikidata SPARQL query for associations in Paris
		try {
			const wikidataQuery = `
				SELECT ?item ?itemLabel ?website ?email ?phone ?address WHERE {
					?item wdt:P31 wd:Q43229 .  # Association
					?item wdt:P131 wd:Q90 .    # Located in Paris
					OPTIONAL { ?item wdt:P856 ?website . }
					OPTIONAL { ?item wdt:P968 ?email . }
					OPTIONAL { ?item wdt:P1329 ?phone . }
					OPTIONAL { ?item wdt:P6375 ?address . }
					SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" . }
				}
				LIMIT 100
			`;
			
			const wikidataUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(wikidataQuery)}&format=json`;
			const response = await fetch(wikidataUrl, {
				headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
			});
			
			if (response.ok) {
				const data = await response.json();
				const bindings = data.results?.bindings || [];
				for (const binding of bindings) {
					const entity = {
						name: binding.itemLabel?.value || '',
						website: binding.website?.value || null,
						email: binding.email?.value || null,
						phone: binding.phone?.value || null,
						address: binding.address?.value || null,
						source: 'wikidata',
						wikidataId: binding.item?.value?.replace('http://www.wikidata.org/entity/', '') || null
					};
					if (entity.name) {
						seedUrls.push({
							url: entity.website || `https://www.wikidata.org/wiki/${entity.wikidataId}`,
							priority: 0.9,
							metadata: entity,
							source: 'wikidata'
						});
					}
				}
				console.log(`  ✅ Found ${bindings.length} entities from Wikidata`);
			}
		} catch (error) {
			console.warn('  ⚠️  Wikidata query failed:', error.message);
		}

		// 2. France Bénévolat and similar aggregators
		const aggregatorUrls = [
			`https://www.francebenevolat.org/recherche-associations?q=paris+${arrondissement}`,
			`https://www.helloasso.com/associations/paris/${arrondissement}`,
			`https://www.jeunesse-sports.gouv.fr/annuaire-des-associations`
		];

		for (const url of aggregatorUrls) {
			seedUrls.push({
				url,
				priority: 0.7,
				metadata: { source: 'aggregator' },
				source: 'aggregator'
			});
		}

		// 3. Official Paris city portals
		const arrNum = arrondissement.replace('er', '').replace('e', '');
		const cityPortals = [
			`https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`,
			`https://www.paris.fr/pages/activites-et-loisirs-${arrondissement}`,
			`https://www.paris.fr/pages/associations-${arrondissement}`
		];

		for (const url of cityPortals) {
			seedUrls.push({
				url,
				priority: 0.8,
				metadata: { source: 'city_portal' },
				source: 'city_portal'
			});
		}

		// 3.5. PDF documents (association registries, bulletins, etc.)
		// These are often found on government sites and contain structured organization data
		const pdfSearchQueries = [
			`filetype:pdf association ${arrondissement} arrondissement Paris`,
			`filetype:pdf registre associations ${arrondissement} Paris`,
			`filetype:pdf bulletin associations ${arrondissement} Paris`
		];

		if (this.googleApiKey && this.googleCx) {
			for (const query of pdfSearchQueries) {
				seedUrls.push({
					url: `google_search_pdf:${query}`,
					priority: 0.7,
					metadata: { query, source: 'google_pdf_search' },
					source: 'google_pdf_search'
				});
			}
		}

		// 4. Google Custom Search for specific queries using comprehensive activity keywords
		if (this.googleApiKey && this.googleCx) {
			const activityKeywords = this.getActivityKeywords();
			
			// Create multiple targeted search queries using the comprehensive activity list
			// Group activities into chunks to create focused queries
			const chunkSize = 15; // 15 activities per query to avoid query length limits
			const searchQueries = [];
			
			// Base queries with activity chunks
			for (let i = 0; i < activityKeywords.length; i += chunkSize) {
				const activityChunk = activityKeywords.slice(i, i + chunkSize);
				const activityQuery = activityChunk.join(' OR ');
				const query = `Paris ${arrondissement} arrondissement enfants kids (${activityQuery}) -newsletter -"lettre d'information"`;
				searchQueries.push(query);
			}
			
			// Also add specific high-value queries
			const highValueQueries = [
				`association loi 1901 ${arrondissement} arrondissement Paris enfants`,
				`club sport ${arrondissement} arrondissement Paris enfants`,
				`activités enfants ${arrondissement} arrondissement Paris`,
				`cercle escrime ${arrondissement} arrondissement Paris enfants`,
				`centre loisirs ${arrondissement} arrondissement Paris enfants`
			];
			
			// Limit total queries to avoid timeout (use first 10 activity chunk queries + all high-value queries)
			const limitedQueries = [...searchQueries.slice(0, 10), ...highValueQueries];
			
			for (const query of limitedQueries) {
				seedUrls.push({
					url: `google_search:${query}`,
					priority: 0.6,
					metadata: { query, source: 'google_search' },
					source: 'google_search'
				});
			}
			
			console.log(`  🔍 Generated ${limitedQueries.length} Google search queries using ${activityKeywords.length} activity keywords`);
		}

		console.log(`  ✅ Total seed sources: ${seedUrls.length}`);
		return seedUrls;
	}

	/**
	 * Intelligent crawl scheduling - prioritize pages by value
	 */
	prioritizeUrls(urls) {
		return urls.sort((a, b) => {
			// Higher priority first
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			// Prefer official sources
			const officialSources = ['wikidata', 'city_portal', 'official_registry'];
			const aIsOfficial = officialSources.includes(a.source);
			const bIsOfficial = officialSources.includes(b.source);
			if (aIsOfficial !== bIsOfficial) {
				return bIsOfficial ? 1 : -1;
			}
			return 0;
		});
	}

	/**
	 * Extract Schema.org structured data
	 */
	extractSchemaOrg(html, document) {
		const entities = [];
		
		// Extract JSON-LD structured data
		const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (const script of jsonLdScripts) {
			try {
				const data = JSON.parse(script.textContent);
				const extractFromSchema = (obj, path = '') => {
					if (!obj || typeof obj !== 'object') return;
					
					if (Array.isArray(obj)) {
						obj.forEach(item => extractFromSchema(item, path));
					} else {
						const type = obj['@type'] || obj.type;
						
						// Look for Organization, NonprofitOrganization, SportsOrganization, etc.
						if (type && (
							type.includes('Organization') || 
							type.includes('Nonprofit') ||
							type.includes('Sports') ||
							type.includes('LocalBusiness')
						)) {
							const entity = {
								name: obj.name || obj.legalName || '',
								website: obj.url || obj.sameAs?.find(u => u.startsWith('http')) || null,
								email: obj.email || null,
								phone: obj.telephone || obj.phoneNumber || null,
								address: obj.address ? (
									typeof obj.address === 'string' ? obj.address :
									`${obj.address.streetAddress || ''} ${obj.address.postalCode || ''} ${obj.address.addressLocality || ''}`.trim()
								) : null,
								description: obj.description || '',
								source: 'schema.org',
								schemaType: type
							};
							
							if (entity.name) {
								entities.push(entity);
							}
						}
						
						// Recursively search nested objects
						for (const [key, value] of Object.entries(obj)) {
							if (key !== '@type' && key !== 'type' && typeof value === 'object') {
								extractFromSchema(value, `${path}.${key}`);
							}
						}
					}
				};
				
				extractFromSchema(data);
			} catch (error) {
				// Invalid JSON-LD, skip
			}
		}

		// Also check for microdata
		const orgElements = document.querySelectorAll('[itemtype*="Organization"], [itemtype*="Nonprofit"], [itemtype*="Sports"]');
		for (const element of orgElements) {
			const name = element.querySelector('[itemprop="name"]')?.textContent?.trim() ||
			            element.querySelector('h1, h2, .title')?.textContent?.trim() || '';
			const website = element.querySelector('[itemprop="url"]')?.getAttribute('href') ||
			               element.querySelector('[itemprop="sameAs"]')?.getAttribute('href') || null;
			const email = element.querySelector('[itemprop="email"]')?.textContent?.trim() || null;
			const phone = element.querySelector('[itemprop="telephone"]')?.textContent?.trim() || null;
			
			if (name) {
				entities.push({
					name,
					website,
					email,
					phone,
					source: 'microdata'
				});
			}
		}

		return entities;
	}

	/**
	 * NLP-like entity extraction from unstructured text
	 */
	extractEntitiesFromText(text, url) {
		const entities = [];
		
		// STRICT FILTERING: Skip newsletter and irrelevant pages
		const textLower = text.toLowerCase();
		if (textLower.includes('newsletter') && 
		    (textLower.includes('abonnez-vous') || textLower.includes('inscription') || textLower.includes('abonnement'))) {
			console.log(`  ⏭️  Skipping newsletter page: ${url}`);
			return []; // Return empty array for newsletter pages
		}

		// Must contain activity-related keywords to be relevant
		const activityKeywords = [
			'activité', 'activités', 'activity', 'activities',
			'club', 'clubs', 'association', 'associations',
			'sport', 'sports', 'théâtre', 'danse', 'musique',
			'arts martiaux', 'gymnastique', 'natation', 'tennis',
			'football', 'basketball', 'judo', 'karate', 'escrime',
			'loisir', 'loisirs', 'atelier', 'ateliers', 'cours',
			'enfant', 'enfants', 'kids', 'children', 'jeunesse', 'youth'
		];
		
		const hasActivityKeyword = activityKeywords.some(keyword => textLower.includes(keyword));
		if (!hasActivityKeyword && !url.includes('association') && !url.includes('club') && !url.includes('activite')) {
			console.log(`  ⏭️  Skipping page without activity keywords: ${url}`);
			return []; // Return empty if no activity-related content
		}
		
		// Organization name patterns
		const namePatterns = [
			/(?:Association|Club|Cercle|Centre|Académie|École)\s+([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,60})/g,
			/([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,60})\s+(?:Association|Club|Cercle)/g,
			/<h[1-3][^>]*>([^<]+(?:Association|Club|Cercle|Centre)[^<]*)<\/h[1-3]>/gi
		];

		const foundNames = new Set();
		for (const pattern of namePatterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				const name = match[1]?.trim();
				// STRICT VALIDATION: Must be a real organization name
				if (name && 
				    name.length > 3 && 
				    name.length < 100 && 
				    !name.includes('http') &&
				    !name.toLowerCase().includes('newsletter') &&
				    !name.toLowerCase().includes('lettre') &&
				    !name.toLowerCase().includes('abonnement') &&
				    name.match(/^[A-Z]/)) { // Must start with capital letter
					foundNames.add(name);
				}
			}
		}

		// Email patterns
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emails = [...new Set(text.match(emailPattern) || [])]
			.filter(e => !e.includes('example.com') && !e.includes('noreply'));

		// Phone patterns (French format)
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g;
		const phones = [...new Set(text.match(phonePattern) || [])];

		// Website patterns
		const websitePattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9\-]+\.(?:fr|com|org|net|eu))(?:\/[^\s<>"']*)?/g;
		const websites = [...new Set(text.match(websitePattern) || [])]
			.filter(w => !w.includes('facebook.com') && !w.includes('instagram.com'));

		// Create entities from found information
		for (const name of foundNames) {
			entities.push({
				name,
				website: websites[0] || null,
				email: emails[0] || null,
				phone: phones[0] || null,
				source: 'nlp_extraction',
				confidence: 0.6
			});
		}

		// If we found contact info but no name, try to extract name from page structure
		if (entities.length === 0 && (emails.length > 0 || phones.length > 0 || websites.length > 0)) {
			// Try to find organization name near contact info
			const contactContext = text.substring(
				Math.max(0, (emails[0] ? text.indexOf(emails[0]) : 0) - 200),
				Math.min(text.length, (emails[0] ? text.indexOf(emails[0]) : text.length) + 200)
			);
			
			const nameMatch = contactContext.match(/(?:Association|Club|Cercle)\s+([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,50})/);
			if (nameMatch) {
				entities.push({
					name: nameMatch[1],
					website: websites[0] || null,
					email: emails[0] || null,
					phone: phones[0] || null,
					source: 'nlp_extraction',
					confidence: 0.5
				});
			}
		}

		return entities;
	}

	/**
	 * Fetch page with Playwright (for JS-heavy sites)
	 */
	async fetchWithPlaywright(url) {
		const playwrightModule = await getPlaywright();
		if (!playwrightModule) {
			// Fallback to regular fetch if Playwright not available
			return await this.fetchWithFetch(url);
		}
		try {
			const browser = await this.initBrowser();
			if (!browser) {
				return await this.fetchWithFetch(url);
			}
			const context = await browser.newContext({
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			});
			const page = await context.newPage();
			
			await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
			const html = await page.content();
			await context.close();
			
			return html;
		} catch (error) {
			console.error(`Playwright fetch failed for ${url}:`, error.message);
			// Fallback to regular fetch
			return await this.fetchWithFetch(url);
		}
	}

	/**
	 * Fetch page with regular fetch (for static sites)
	 */
	async fetchWithFetch(url) {
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
				},
				timeout: 20000
			});
			
			if (!response.ok) return null;
			return await response.text();
		} catch (error) {
			return null;
		}
	}

	/**
	 * Extract organization links from a page (including PDF links)
	 */
	extractOrganizationLinks(document, baseUrl) {
		const links = new Set();
		const pdfLinks = new Set();
		
		// Look for links that likely point to organization pages
		const linkSelectors = [
			'a[href*="/association"]',
			'a[href*="/club"]',
			'a[href*="/activite"]',
			'a[href*="/organisme"]',
			'a[href*="/structure"]',
			'.organization-link',
			'.association-link',
			'[class*="org"] a',
			'[class*="asso"] a'
		];

		for (const selector of linkSelectors) {
			try {
				const elements = document.querySelectorAll(selector);
				for (const element of elements) {
					const href = element.getAttribute('href');
					if (!href) continue;
					
					const fullUrl = href.startsWith('http') ? href :
					                href.startsWith('/') ? `${baseUrl}${href}` :
					                `${baseUrl}/${href}`;
					
					if (fullUrl.startsWith('http') && !this.visitedUrls.has(fullUrl)) {
						// Check if it's a PDF
						if (fullUrl.toLowerCase().endsWith('.pdf') || fullUrl.toLowerCase().includes('.pdf?')) {
							pdfLinks.add(fullUrl);
						} else {
							links.add(fullUrl);
						}
					}
				}
			} catch (error) {
				// Skip selector errors
			}
		}

		// Also search for PDF links in page text
		const html = document.documentElement.outerHTML;
		const pdfUrlPattern = /https?:\/\/[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?/gi;
		const pdfMatches = html.match(pdfUrlPattern);
		if (pdfMatches) {
			pdfMatches.forEach(url => {
				if (!this.visitedUrls.has(url)) {
					pdfLinks.add(url);
				}
			});
		}

		return {
			regularLinks: Array.from(links),
			pdfLinks: Array.from(pdfLinks)
		};
	}

	/**
	 * Validate and normalize entity
	 */
	validateEntity(entity) {
		// Must have at least name or website
		if (!entity.name && !entity.website) {
			return null;
		}

		// Normalize name
		if (entity.name) {
			entity.name = entity.name.trim()
				.replace(/\s+/g, ' ')
				.replace(/^Association\s+/i, '')
				.replace(/^Club\s+/i, '');
		}

		// Validate email
		if (entity.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entity.email)) {
			entity.email = null;
		}

		// Validate phone (French format)
		if (entity.phone) {
			const cleanPhone = entity.phone.replace(/[.\s\-]/g, '');
			if (!/^(?:\+33|0)[1-9]\d{8}$/.test(cleanPhone)) {
				entity.phone = null;
			}
		}

		// Normalize website
		if (entity.website) {
			entity.website = entity.website.replace(/\/$/, ''); // Remove trailing slash
		}

		return entity;
	}

	/**
	 * Check for duplicates using similarity matching
	 */
	isDuplicate(entity, existingEntities) {
		const entityName = (entity.name || '').toLowerCase().trim();
		const entityWebsite = (entity.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

		for (const existing of existingEntities) {
			const existingName = (existing.name || '').toLowerCase().trim();
			const existingWebsite = (existing.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

			// Exact name match
			if (entityName && existingName && entityName === existingName) {
				return true;
			}

			// Website match
			if (entityWebsite && existingWebsite && entityWebsite === existingWebsite) {
				return true;
			}

			// Similar name (Levenshtein-like check)
			if (entityName && existingName) {
				const words1 = entityName.split(/\s+/);
				const words2 = existingName.split(/\s+/);
				const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
				
				// If more than 2 significant words match, likely duplicate
				if (commonWords.length >= 2) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Main crawl method
	 */
	async crawl(arrondissement, postalCode, options = {}) {
		const results = {
			entities: [],
			errors: [],
			stats: {
				seedSources: 0,
				pagesCrawled: 0,
				entitiesExtracted: 0,
				duplicatesRemoved: 0
			}
		};

		try {
			// Step 1: Get seed sources
			const seedUrls = await this.getSeedSources(arrondissement, postalCode);
			results.stats.seedSources = seedUrls.length;
			
			// Step 2: Prioritize URLs
			const prioritizedUrls = this.prioritizeUrls(seedUrls);
			
			// Step 3: Crawl prioritized URLs
			const maxPages = options.maxPages || 50;
			for (let i = 0; i < Math.min(prioritizedUrls.length, maxPages); i++) {
				const seed = prioritizedUrls[i];
				
				if (seed.url.startsWith('google_search:') || seed.url.startsWith('google_search_pdf:')) {
					// Handle Google search (regular or PDF-specific)
					const query = seed.metadata.query;
					try {
						const searchResults = await this.googleCustomSearch(query);
						for (const result of searchResults) {
							if (!this.visitedUrls.has(result.url)) {
								// Check if result is a PDF
								const isPDF = result.url.toLowerCase().endsWith('.pdf') || 
								             result.url.toLowerCase().includes('.pdf?') ||
								             seed.url.startsWith('google_search_pdf:');
								
								if (isPDF) {
									// Process PDF immediately
									try {
										console.log(`  📄 Processing PDF from search: ${result.url}`);
										const { ExtractionModule } = await import('./extraction.js');
										const extractor = new ExtractionModule({ timeout: 30000 });
										
										const pdfResult = await extractor.extractFromPDF(result.url, {
											arrondissement: arrondissement
										});

										if (pdfResult.entities && pdfResult.entities.length > 0) {
											const pdfEntities = pdfResult.entities.map(e => ({
												...e,
												sourceUrl: result.url,
												arrondissement: arrondissement
											}))
											.map(e => this.validateEntity(e))
											.filter(e => e !== null);

											for (const entity of pdfEntities) {
												if (!this.isDuplicate(entity, results.entities)) {
													results.entities.push(entity);
													results.stats.entitiesExtracted++;
													console.log(`    ✅ Extracted from PDF: ${entity.name}`);
												} else {
													results.stats.duplicatesRemoved++;
												}
											}
										}
										this.visitedUrls.add(result.url);
									} catch (pdfError) {
										console.warn(`  ⚠️  PDF extraction failed:`, pdfError.message);
										results.errors.push({ url: result.url, error: pdfError.message });
									}
								} else {
									// Regular URL, add to priority queue
									this.priorityQueue.push({
										url: result.url,
										priority: 0.6,
										source: 'google_search'
									});
								}
							}
						}
					} catch (error) {
						results.errors.push({ source: 'google_search', error: error.message });
					}
					continue;
				}

				if (this.visitedUrls.has(seed.url)) continue;
				this.visitedUrls.add(seed.url);

				try {
					// Determine if we need Playwright (check if it's a JS-heavy site)
					const needsPlaywright = seed.url.includes('helloasso.com') || 
					                       seed.url.includes('francebenevolat.org') ||
					                       seed.source === 'aggregator';

					const html = needsPlaywright 
						? await this.fetchWithPlaywright(seed.url)
						: await this.fetchWithFetch(seed.url);

					if (!html) {
						console.warn(`  ⚠️  Failed to fetch: ${seed.url}`);
						continue;
					}

					const dom = new JSDOM(html);
					const document = dom.window.document;

					// Extract entities using multiple methods
					const schemaEntities = this.extractSchemaOrg(html, document);
					const nlpEntities = this.extractEntitiesFromText(html, seed.url);
					
					// STRICT FILTERING: Only keep entities that are actually relevant
					const activityKeywords = [
						'activité', 'activités', 'activity', 'activities',
						'club', 'clubs', 'association', 'associations',
						'sport', 'sports', 'théâtre', 'danse', 'musique',
						'arts martiaux', 'gymnastique', 'natation', 'tennis',
						'football', 'basketball', 'judo', 'karate', 'escrime',
						'loisir', 'loisirs', 'atelier', 'ateliers', 'cours',
						'enfant', 'enfants', 'kids', 'children', 'jeunesse', 'youth'
					];
					
					// Combine all entities with strict validation
					const pageEntities = [...schemaEntities, ...nlpEntities]
						.map(e => ({
							...e,
							sourceUrl: seed.url,
							arrondissement: arrondissement
						}))
						.map(e => this.validateEntity(e))
						.filter(e => {
							if (!e) return false;
							
							// Must have name
							if (!e.name || e.name.trim().length === 0) return false;
							
							// Filter out newsletters
							const nameLower = e.name.toLowerCase();
							if (nameLower.includes('newsletter') || 
							    nameLower.includes('lettre d\'information') ||
							    nameLower.includes('abonnement newsletter')) {
								return false;
							}
							
							// Must have at least website OR email OR phone (contact info)
							if (!e.website && !e.email && !e.phone) {
								// If no contact info, must have activity keyword in name or description
								const hasActivityInName = activityKeywords.some(kw => nameLower.includes(kw));
								const descLower = (e.description || '').toLowerCase();
								const hasActivityInDesc = activityKeywords.some(kw => descLower.includes(kw));
								if (!hasActivityInName && !hasActivityInDesc) {
									return false; // Too generic, skip
								}
							}
							
							return true;
						});

					// Remove duplicates
					const uniqueEntities = [];
					for (const entity of pageEntities) {
						if (!this.isDuplicate(entity, results.entities)) {
							uniqueEntities.push(entity);
							results.entities.push(entity);
						} else {
							results.stats.duplicatesRemoved++;
						}
					}

					results.stats.pagesCrawled++;
					results.stats.entitiesExtracted += uniqueEntities.length;

					console.log(`  ✅ [${i + 1}/${Math.min(prioritizedUrls.length, maxPages)}] ${seed.url}: ${uniqueEntities.length} entities`);

					// Extract organization links for further crawling (including PDFs)
					const baseUrl = new URL(seed.url).origin;
					const linkResults = this.extractOrganizationLinks(document, baseUrl);
					
					// Add regular links to priority queue
					for (const link of linkResults.regularLinks.slice(0, 10)) {
						if (!this.visitedUrls.has(link)) {
							this.priorityQueue.push({
								url: link,
								priority: 0.5,
								source: 'discovered_link'
							});
						}
					}

					// Process PDF links immediately (extract entities from PDFs)
					for (const pdfLink of linkResults.pdfLinks.slice(0, 5)) { // Limit to 5 PDFs per page
						if (this.visitedUrls.has(pdfLink)) continue;
						this.visitedUrls.add(pdfLink);

						try {
							console.log(`  📄 Processing PDF: ${pdfLink}`);
							// Use extraction module for PDF processing
							const { ExtractionModule } = await import('./extraction.js');
							const extractor = new ExtractionModule({ timeout: 30000 });
							
							const pdfResult = await extractor.extractFromPDF(pdfLink, {
								arrondissement: arrondissement
							});

							if (pdfResult.entities && pdfResult.entities.length > 0) {
								const pdfEntities = pdfResult.entities.map(e => ({
									...e,
									sourceUrl: pdfLink,
									arrondissement: arrondissement
								}))
								.map(e => this.validateEntity(e))
								.filter(e => e !== null);

								for (const entity of pdfEntities) {
									if (!this.isDuplicate(entity, results.entities)) {
										results.entities.push(entity);
										results.stats.entitiesExtracted++;
										console.log(`    ✅ Extracted from PDF: ${entity.name}`);
									} else {
										results.stats.duplicatesRemoved++;
									}
								}
							}
						} catch (pdfError) {
							console.warn(`  ⚠️  PDF extraction failed for ${pdfLink}:`, pdfError.message);
							results.errors.push({ url: pdfLink, error: pdfError.message });
						}
					}

					// Rate limiting
					await new Promise(resolve => setTimeout(resolve, this.minDelay));

				} catch (error) {
					results.errors.push({ url: seed.url, error: error.message });
					console.error(`  ❌ Error crawling ${seed.url}:`, error.message);
				}
			}

			// Step 4: Process priority queue (discovered links)
			console.log(`\n📋 Processing ${this.priorityQueue.length} discovered links...`);
			const queueLimit = Math.min(this.priorityQueue.length, 20);
			for (let i = 0; i < queueLimit; i++) {
				const item = this.priorityQueue[i];
				if (this.visitedUrls.has(item.url)) continue;
				this.visitedUrls.add(item.url);

				try {
					const html = await this.fetchWithFetch(item.url);
					if (!html) continue;

					const dom = new JSDOM(html);
					const document = dom.window.document;

					const schemaEntities = this.extractSchemaOrg(html, document);
					const nlpEntities = this.extractEntitiesFromText(html, item.url);

					const pageEntities = [...schemaEntities, ...nlpEntities]
						.map(e => ({
							...e,
							sourceUrl: item.url,
							arrondissement: arrondissement
						}))
						.map(e => this.validateEntity(e))
						.filter(e => e !== null);

					for (const entity of pageEntities) {
						if (!this.isDuplicate(entity, results.entities)) {
							results.entities.push(entity);
							results.stats.entitiesExtracted++;
						} else {
							results.stats.duplicatesRemoved++;
						}
					}

					await new Promise(resolve => setTimeout(resolve, this.minDelay));
				} catch (error) {
					results.errors.push({ url: item.url, error: error.message });
				}
			}

		} catch (error) {
			results.errors.push({ stage: 'crawl', error: error.message });
			console.error('Crawl error:', error);
		} finally {
			await this.closeBrowser();
		}

		console.log(`\n📊 Crawl complete: ${results.entities.length} entities, ${results.stats.duplicatesRemoved} duplicates removed`);
		return results;
	}

	/**
	 * Get comprehensive activity keywords (reuse from discovery module)
	 */
	getActivityKeywords() {
		// Comprehensive activity keywords in French and English
		// This matches the list from discovery.js to ensure consistency
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
			'beach volleyball', 'beach soccer', 'water polo', 'netball',
			'floorball', 'korfball', 'sepak takraw', 'bossaball', 'footvolley',
			
			// Combat & Martial Arts
			'boxe', 'boxing', 'judo', 'karate', 'karaté',
			'taekwondo', 'tae kwon do', 'kickboxing', 'kick-boxing',
			'jujitsu', 'jiu-jitsu', 'bjj', 'brazilian jiu-jitsu',
			'mma', 'mixed martial arts', 'arts martiaux', 'martial arts',
			'escrime', 'fencing', 'aïkido', 'aikido', 'kendo',
			'kung fu', 'wrestling', 'lutte', 'sambo', 'taekkyon',
			
			// Water Sports
			'natation', 'swimming', 'plongée', 'diving',
			'water polo', 'water-polo', 'kayak', 'kayaking',
			'canoë', 'canoe', 'canoeing', 'aviron', 'rowing',
			'surf', 'surfing', 'bodyboarding', 'paddle', 'paddleboarding', 'sup',
			'synchronized swimming', 'natation synchronisée', 'underwater hockey',
			'freediving', 'apnée', 'scuba diving', 'plongée sous-marine',
			
			// Racquet & Precision Sports
			'tennis', 'tennis de table', 'ping pong', 'table tennis',
			'badminton', 'squash', 'racquetball', 'pickleball',
			'padel', 'beach tennis', 'racketlon', 'pelota',
			
			// Athletics & Endurance
			'athlétisme', 'athletics', 'course', 'running',
			'marathon', 'triathlon', 'duathlon', 'biathlon',
			'orientation', 'orienteering', 'race walking', 'marche athlétique',
			'ultramarathon', 'adventure racing', 'cross-country', 'cross country',
			
			// Winter & Snow Sports
			'ski', 'skiing', 'alpine skiing', 'ski alpin',
			'cross-country skiing', 'ski de fond', 'freestyle skiing',
			'snowboard', 'snowboarding', 'hockey sur glace', 'ice hockey',
			'patinage', 'skating', 'patinage artistique', 'figure skating',
			'patinage de vitesse', 'speed skating', 'curling',
			'bobsleigh', 'luge', 'skeleton',
			
			// Cycling & Wheel Sports
			'cyclisme', 'cycling', 'vélo', 'bike', 'biking',
			'vtt', 'mountain bike', 'mtb', 'bmx', 'cyclocross',
			'roller', 'roller skating', 'patin à roulettes', 'inline hockey',
			'roller derby', 'unicycle', 'monocycle',
			
			// Gymnastics & Acrobatics
			'gymnastique', 'gymnastics', 'gymnastique artistique', 'artistic gymnastics',
			'gymnastique rythmique', 'rhythmic gymnastics',
			'trampoline', 'trampolining', 'parkour', 'freerunning',
			'cheerleading', 'acrobatie', 'acrobatics', 'tumbling',
			'aerial silks', 'soie aérienne', 'pole dancing', 'baton twirling',
			
			// Mind & Board Games
			'échecs', 'chess', 'go', 'bridge',
			'esport', 'esports', 'gaming', 'jeux vidéo',
			'rubik\'s cube', 'speedcubing', 'sport stacking',
			'board game', 'jeux de société',
			
			// Creative & Niche Activities
			'dessin', 'drawing', 'peinture', 'painting',
			'manga', 'bande dessinée', 'comics', 'manga art',
			'codage', 'coding', 'programmation', 'programming', 'hackathon',
			'théâtre', 'theater', 'theatre', 'drama',
			'danse', 'dance', 'ballet', 'hip-hop', 'hip hop',
			'salsa', 'photographie', 'photography',
			'écriture', 'writing', 'poésie', 'poetry', 'screenwriting',
			'musique', 'music', 'chorale', 'choir', 'orchestre', 'orchestra',
			'guitare', 'guitar', 'piano', 'violon', 'violin',
			'cosplay', 'modélisme', 'model building', 'aeromodeling',
			'debate', 'débat', 'public speaking', 'art oratoire',
			
			// Extreme & Adventure
			'escalade', 'climbing', 'grimpe', 'bouldering', 'bloc',
			'alpinisme', 'mountaineering', 'parapente', 'paragliding',
			'skydiving', 'saut en parachute', 'base jumping',
			'wingsuit flying', 'coasteering', 'free running',
			
			// Equestrian & Animal Sports
			'équitation', 'horseback riding', 'equestrian',
			'saut d\'obstacles', 'show jumping', 'dressage',
			'eventing', 'polo', 'equestrian vaulting',
			'agility', 'agility canine', 'dog agility',
			
			// Shooting & Archery
			'tir à l\'arc', 'archery', 'tir', 'shooting',
			'sporting clays', 'tir sportif',
			
			// Motorsports
			'karting', 'go-kart', 'moto', 'motocross',
			'formula racing', 'rally', 'stock car racing',
			'drone racing', 'course de drones',
			
			// Alternative Sports
			'ultimate frisbee', 'disc golf', 'geocaching',
			'football américain', 'american football',
			'bubble football', 'cheese rolling', 'wife carrying',
			'bog snorkeling', 'kabaddi', 'powerbocking',
			'sport kite flying', 'cerf-volant sportif',
			
			// Additional relevant terms
			'cercle', 'académie', 'academy', 'école', 'school',
			'centre', 'center', 'centre de loisirs', 'leisure center',
			'périscolaire', 'extracurricular', 'extracurriculaire',
			'jeunesse', 'youth', 'adolescent', 'teenager',
			'initiation', 'débutant', 'beginner'
		];
	}

	/**
	 * Google Custom Search helper
	 */
	async googleCustomSearch(query) {
		if (!this.googleApiKey || !this.googleCx) {
			return [];
		}

		try {
			const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleCx}&q=${encodeURIComponent(query)}&num=10`;
			const response = await fetch(url, { timeout: 15000 });
			
			if (!response.ok) return [];
			
			const data = await response.json();
			return (data.items || []).map(item => ({
				url: item.link,
				title: item.title,
				snippet: item.snippet
			}));
		} catch (error) {
			return [];
		}
	}
}

