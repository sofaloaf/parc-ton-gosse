/**
 * Locality-First Crawler
 * 
 * Prioritizes precision over recall by starting from authoritative municipal sources
 * and using strict validation rules to minimize false positives.
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';

export class LocalityFirstCrawler {
	constructor(options = {}) {
		this.timeout = options.timeout || 30000;
		this.minDelay = options.minDelay || 1000;
		this.maxDelay = options.maxDelay || 2000;
		this.visitedUrls = new Set();
	}

	/**
	 * Get authoritative municipal sources for an arrondissement
	 */
	getMunicipalSources(arrondissement, postalCode) {
		const arrNum = arrondissement.replace('er', '').replace('e', '');
		const sources = [];

		// Ville de Paris association listings
		sources.push({
			url: `https://www.paris.fr/pages/associations-${arrondissement}-1234`,
			type: 'paris_fr_associations',
			priority: 1
		});

		// Mairie du 20e arrondissement pages
		sources.push({
			url: `https://mairie${arrNum}.paris.fr/associations`,
			type: 'mairie_associations',
			priority: 1
		});

		sources.push({
			url: `https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`,
			type: 'mairie_activites',
			priority: 1
		});

		// Centres d'animation
		sources.push({
			url: `https://mairie${arrNum}.paris.fr/centres-animation`,
			type: 'centres_animation',
			priority: 2
		});

		// Gymnases and public facilities
		sources.push({
			url: `https://mairie${arrNum}.paris.fr/equipements-sportifs`,
			type: 'equipements_sportifs',
			priority: 2
		});

		// Event calendars
		sources.push({
			url: `https://mairie${arrNum}.paris.fr/agenda`,
			type: 'agenda',
			priority: 3
		});

		return sources.sort((a, b) => a.priority - b.priority);
	}

	/**
	 * Extract organizations from HTML page
	 */
	async extractFromHTML(url, html, arrondissement) {
		const dom = new JSDOM(html);
		const document = dom.window.document;
		const entities = [];

		// French association naming patterns
		const associationPatterns = [
			/(?:Association|Club|Cercle|Amicale|Centre|École|Académie)\s+([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})/g,
			/([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})\s+(?:Association|Club|Cercle|Amicale)/g
		];

		// Extract from headings
		const headings = document.querySelectorAll('h1, h2, h3, h4, .title, .nom, .name');
		for (const heading of headings) {
			const text = heading.textContent?.trim() || '';
			for (const pattern of associationPatterns) {
				const matches = text.matchAll(pattern);
				for (const match of matches) {
					const name = match[1]?.trim() || match[0]?.trim();
					if (name && name.length > 3 && name.length < 100) {
						// Try to find associated info nearby
						const parent = heading.parentElement;
						const context = parent?.textContent || '';
						
						const entity = this.extractEntityFromContext(name, context, url, arrondissement);
						if (entity) {
							entities.push(entity);
						}
					}
				}
			}
		}

		// Extract from list items and cards
		const listItems = document.querySelectorAll('li, .card, .association-item, .activite-item');
		for (const item of listItems) {
			const text = item.textContent || '';
			for (const pattern of associationPatterns) {
				const matches = text.matchAll(pattern);
				for (const match of matches) {
					const name = match[1]?.trim() || match[0]?.trim();
					if (name && name.length > 3 && name.length < 100) {
						const entity = this.extractEntityFromContext(name, text, url, arrondissement);
						if (entity) {
							entities.push(entity);
						}
					}
				}
			}
		}

		// Extract from links (often contain organization names)
		const links = document.querySelectorAll('a[href]');
		for (const link of links) {
			const linkText = link.textContent?.trim() || '';
			const href = link.getAttribute('href') || '';
			
			// Check if link text matches association pattern
			for (const pattern of associationPatterns) {
				if (pattern.test(linkText)) {
					const match = linkText.match(pattern);
					const name = match[1]?.trim() || match[0]?.trim();
					if (name && name.length > 3) {
						const entity = this.extractEntityFromContext(name, linkText, url, arrondissement);
						if (entity) {
							// Try to extract website from link
							if (href.startsWith('http')) {
								entity.website = href;
							} else if (href.startsWith('/')) {
								try {
									const baseUrl = new URL(url);
									entity.website = `${baseUrl.origin}${href}`;
								} catch {}
							}
							entities.push(entity);
						}
					}
				}
			}
		}

		return entities;
	}

	/**
	 * Extract entity from context text
	 */
	extractEntityFromContext(name, context, sourceUrl, arrondissement) {
		const contextLower = context.toLowerCase();
		
		// Extract contact info
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = context.match(emailPattern);
		const email = emailMatch ? emailMatch.find(e => !e.includes('noreply') && !e.includes('no-reply')) : null;

		const phonePattern = /(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g;
		const phoneMatch = context.match(phonePattern);
		const phone = phoneMatch ? phoneMatch[0].trim() : null;

		const websitePattern = /https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?/g;
		const websiteMatch = context.match(websitePattern);
		const website = websiteMatch ? websiteMatch[0].trim() : null;

		// Extract address
		const addressPattern = /\d+\s(?:rue|avenue|boulevard|place|allée|chemin|impasse)\s[A-ZÉÈÀÛÔÎÂÙÇa-zéèàûôîâùç\s\d\-.']+,?\s(?:750(?:0[1-9]|1[0-9]|20))\sParis/gi;
		const addressMatch = context.match(addressPattern);
		const address = addressMatch ? addressMatch[0].trim() : null;

		// Calculate validation score
		const validation = this.validateEntity(name, context, arrondissement, {
			email,
			phone,
			website,
			address,
			sourceUrl
		});

		// Only return if validation score >= 2 (at least 2 conditions met)
		if (validation.score < 2) {
			return null;
		}

		// Extract activity type
		const activityType = this.extractActivityType(context);

		// Extract age group
		const ageGroup = this.extractAgeGroup(context);

		return {
			id: uuidv4(),
			name: name.trim(),
			email,
			phone,
			website,
			address,
			activityType,
			ageGroup,
			sourceUrl,
			arrondissement,
			confidence: validation.score,
			validation: validation,
			extractedAt: new Date().toISOString()
		};
	}

	/**
	 * Validate entity using strict rules
	 * Returns validation object with score (0-5)
	 */
	validateEntity(name, context, arrondissement, metadata = {}) {
		const nameLower = name.toLowerCase();
		const contextLower = context.toLowerCase();
		let score = 0;
		const conditions = [];

		// Condition 1: Name follows French association naming conventions
		const hasAssociationNaming = /(?:association|club|cercle|amicale|centre|école|académie)/i.test(name);
		if (hasAssociationNaming) {
			score += 1;
			conditions.push('association_naming');
		}

		// Condition 2: Appears on municipal or para-municipal site
		const isMunicipalSource = metadata.sourceUrl && (
			metadata.sourceUrl.includes('paris.fr') ||
			metadata.sourceUrl.includes('mairie') ||
			metadata.sourceUrl.includes('ville-de-paris')
		);
		if (isMunicipalSource) {
			score += 1;
			conditions.push('municipal_source');
		}

		// Condition 3: Mentions "loi 1901"
		const mentionsLoi1901 = contextLower.includes('loi 1901') || contextLower.includes('loi du 1er juillet 1901');
		if (mentionsLoi1901) {
			score += 1;
			conditions.push('loi_1901');
		}

		// Condition 4: Mentions public facility in 20e
		const facilityKeywords = ['gymnase', 'centre d\'animation', 'salle', 'équipement', 'facility'];
		const mentionsFacility = facilityKeywords.some(keyword => contextLower.includes(keyword));
		if (mentionsFacility) {
			score += 1;
			conditions.push('public_facility');
		}

		// Condition 5: Mentions youth, sport, animation, culture
		const activityKeywords = [
			'jeunesse', 'youth', 'enfant', 'enfants', 'children', 'kids',
			'sport', 'sports', 'animation', 'culture', 'culturel',
			'loisir', 'loisirs', 'activité', 'activités'
		];
		const mentionsActivity = activityKeywords.some(keyword => contextLower.includes(keyword));
		if (mentionsActivity) {
			score += 1;
			conditions.push('youth_activity');
		}

		return {
			score,
			conditions,
			valid: score >= 2 // At least 2 conditions must be met
		};
	}

	/**
	 * Extract activity type from context
	 */
	extractActivityType(context) {
		const contextLower = context.toLowerCase();
		const types = [];

		if (contextLower.match(/\b(sport|sports|athlétisme|football|basket|tennis|natation)\b/)) {
			types.push('sport');
		}
		if (contextLower.match(/\b(arts?\s*martiaux|judo|karaté|escrime|boxe)\b/)) {
			types.push('martial_art');
		}
		if (contextLower.match(/\b(culture|culturel|théâtre|danse|musique|art)\b/)) {
			types.push('culture');
		}
		if (contextLower.match(/\b(jeunesse|youth|enfant|enfants)\b/)) {
			types.push('youth');
		}

		return types.length > 0 ? types[0] : 'general';
	}

	/**
	 * Extract age group from context
	 */
	extractAgeGroup(context) {
		const contextLower = context.toLowerCase();
		
		// Look for age patterns
		const agePatterns = [
			/(?:de|à|from|to)\s*(\d+)\s*(?:à|to|-)\s*(\d+)\s*(?:ans|years?)/i,
			/(?:à partir de|from)\s*(\d+)\s*(?:ans|years?)/i,
			/(?:jusqu'?à|until|up to)\s*(\d+)\s*(?:ans|years?)/i
		];

		for (const pattern of agePatterns) {
			const match = context.match(pattern);
			if (match) {
				if (match[2]) {
					return { min: parseInt(match[1]), max: parseInt(match[2]) };
				} else if (match[1]) {
					return { min: parseInt(match[1]), max: 99 };
				}
			}
		}

		return null;
	}

	/**
	 * Calculate geographic relevance score for arrondissement
	 */
	calculateGeographicRelevance(entity, arrondissement, postalCode) {
		let score = 0;
		const indicators = [];

		// Check address
		if (entity.address) {
			if (entity.address.includes(postalCode)) {
				score += 3;
				indicators.push('postal_code_match');
			}
			if (entity.address.includes('75020')) {
				score += 3;
				indicators.push('postal_code_75020');
			}
		}

		// Check arrondissement mentions
		const text = `${entity.name} ${entity.address || ''}`.toLowerCase();
		if (text.includes('20e') || text.includes('vingtième') || text.includes('xx')) {
			score += 2;
			indicators.push('arrondissement_mention');
		}

		// Check neighborhood mentions
		const neighborhoods = ['ménilmontant', 'saint-fargeau', 'gambetta', 'porte de bagnolet', 'belleville', 'père lachaise'];
		const hasNeighborhood = neighborhoods.some(n => text.includes(n));
		if (hasNeighborhood) {
			score += 2;
			indicators.push('neighborhood_mention');
		}

		// Check source URL
		if (entity.sourceUrl) {
			if (entity.sourceUrl.includes('mairie20') || entity.sourceUrl.includes('mairie-20')) {
				score += 2;
				indicators.push('mairie_20_source');
			}
		}

		return {
			score: Math.min(score, 10), // Cap at 10
			indicators,
			relevant: score >= 3 // At least 3 points for relevance
		};
	}

	/**
	 * Extract from PDF
	 */
	async extractFromPDF(url, arrondissement) {
		try {
			console.log(`  📄 Downloading PDF: ${url}`);
			const response = await fetch(url, { timeout: this.timeout });
			if (!response.ok) {
				throw new Error(`Failed to download PDF: HTTP ${response.status}`);
			}

			const buffer = await response.buffer();
			const data = await pdf(buffer);
			
			console.log(`  ✅ Extracted text from PDF (${data.numpages} pages, ${data.text.length} chars)`);

			const entities = [];
			const text = data.text;
			
			// Extract organizations from PDF text
			const associationPatterns = [
				/(?:Association|Club|Cercle|Amicale|Centre|École|Académie)\s+([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})/g,
				/([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})\s+(?:Association|Club|Cercle|Amicale)/g
			];

			for (const pattern of associationPatterns) {
				const matches = text.matchAll(pattern);
				for (const match of matches) {
					const name = match[1]?.trim() || match[0]?.trim();
					if (name && name.length > 3 && name.length < 100) {
						// Extract context around the match
						const matchIndex = text.indexOf(match[0]);
						const context = text.substring(
							Math.max(0, matchIndex - 200),
							Math.min(text.length, matchIndex + 200)
						);

						const entity = this.extractEntityFromContext(name, context, url, arrondissement);
						if (entity) {
							entities.push(entity);
						}
					}
				}
			}

			return entities;
		} catch (error) {
			console.error(`  ❌ PDF extraction failed for ${url}:`, error.message);
			return [];
		}
	}

	/**
	 * Main crawl method - locality-first approach
	 */
	async crawl(arrondissement, postalCode, options = {}) {
		const results = {
			entities: [],
			errors: [],
			stats: {
				sourcesCrawled: 0,
				entitiesExtracted: 0,
				entitiesValidated: 0
			}
		};

		try {
			// Step 1: Get authoritative municipal sources
			const sources = this.getMunicipalSources(arrondissement, postalCode);
			console.log(`📋 Found ${sources.length} authoritative municipal sources for ${arrondissement}`);

			// Step 2: Crawl sources in priority order
			for (const source of sources) {
				if (this.visitedUrls.has(source.url)) {
					continue;
				}
				this.visitedUrls.add(source.url);

				try {
					console.log(`  🔍 Crawling ${source.type}: ${source.url}`);
					
					// Rate limiting
					await new Promise(resolve => 
						setTimeout(resolve, this.minDelay + Math.random() * (this.maxDelay - this.minDelay))
					);

					const response = await fetch(source.url, {
						timeout: this.timeout,
						headers: {
							'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
							'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/*;q=0.8'
						}
					});

					if (!response.ok) {
						console.warn(`  ⚠️  Failed to fetch ${source.url}: HTTP ${response.status}`);
						continue;
					}

					const contentType = response.headers.get('content-type') || '';
					
					if (contentType.includes('application/pdf') || source.url.endsWith('.pdf')) {
						// Extract from PDF
						const pdfEntities = await this.extractFromPDF(source.url, arrondissement);
						results.entities.push(...pdfEntities);
						results.stats.entitiesExtracted += pdfEntities.length;
					} else {
						// Extract from HTML
						const html = await response.text();
						const htmlEntities = await this.extractFromHTML(source.url, html, arrondissement);
						
						// Calculate geographic relevance for each entity
						const relevantEntities = htmlEntities.map(entity => {
							const geoRelevance = this.calculateGeographicRelevance(entity, arrondissement, postalCode);
							return {
								...entity,
								geographicRelevance: geoRelevance,
								confidence: entity.confidence * (geoRelevance.score / 10) // Weight by geographic relevance
							};
						}).filter(entity => {
							// Only keep entities with validation score >= 2 AND geographic relevance >= 3
							return entity.validation.valid && entity.geographicRelevance.relevant;
						});

						results.entities.push(...relevantEntities);
						results.stats.entitiesExtracted += htmlEntities.length;
						results.stats.entitiesValidated += relevantEntities.length;
					}

					results.stats.sourcesCrawled++;

				} catch (error) {
					console.error(`  ❌ Error crawling ${source.url}:`, error.message);
					results.errors.push({ url: source.url, error: error.message });
				}
			}

			// Step 3: Graph expansion - find related associations
			// (This would be implemented to crawl facilities and related associations)
			// For now, we'll skip this to prioritize precision

			console.log(`✅ Locality-first crawl completed: ${results.stats.entitiesValidated} validated entities from ${results.stats.sourcesCrawled} sources`);

		} catch (error) {
			console.error('❌ Locality-first crawler error:', error);
			results.errors.push({ stage: 'crawl', error: error.message });
		}

		return results;
	}
}

