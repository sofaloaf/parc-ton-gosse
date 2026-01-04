/**
 * Crawler Orchestrator
 * 
 * Coordinates all crawler modules and manages the workflow
 */

import { DiscoveryModule } from './discovery.js';
import { ExtractionModule } from './extraction.js';
import { ValidationModule } from './validation.js';
import { EnrichmentModule } from './enrichment.js';
import { StorageModule } from './storage.js';
import { ComplianceModule } from './compliance.js';
import { v4 as uuidv4 } from 'uuid';

export class CrawlerOrchestrator {
	constructor(options = {}) {
		// Initialize modules
		this.discovery = new DiscoveryModule(options.discovery);
		this.extraction = new ExtractionModule(options.extraction);
		this.validation = new ValidationModule(options.validation);
		this.enrichment = new EnrichmentModule(options.enrichment);
		this.storage = new StorageModule(options.storage);
		this.compliance = new ComplianceModule(options.compliance);

		// Statistics
		this.stats = {
			discovered: 0,
			extracted: 0,
			validated: 0,
			enriched: 0,
			saved: 0,
			errors: 0,
			startTime: null,
			endTime: null
		};
	}

	/**
	 * Main crawl workflow
	 */
	async crawl(query, options = {}) {
		this.stats.startTime = new Date();
		const results = {
			query,
			entities: [],
			errors: [],
			stats: {}
		};

		try {
			// Stage 1: Discovery
			console.log('🔍 Stage 1: Discovery');
			console.log(`   Query: "${query}"`);
			const discoveryResults = await this.discovery.hybridSearch(query, {
				arrondissement: options.arrondissement,
				postalCode: options.postalCode,
				expandGraph: options.expandGraph !== false
			});
			this.stats.discovered = discoveryResults.allResults.length;
			console.log(`✅ Discovered ${this.stats.discovered} potential sources`);
			console.log(`   - Google results: ${discoveryResults.googleResults.length}`);
			console.log(`   - Direct lookups: ${discoveryResults.directResults.length}`);
			console.log(`   - Expanded: ${discoveryResults.expandedResults.length}`);

			// Stage 2: Extraction
			console.log('📄 Stage 2: Extraction');
			const extractedEntities = [];
			
			// PRIORITIZE web search results first, then city hall pages
			const webSources = discoveryResults.allResults.filter(s => 
				s.source === 'google_custom_search' || s.source === 'google' || 
				(s.source !== 'mairie_direct' && s.source !== 'mairie_activity' && !s.url.includes('mairie'))
			);
			const mairieSources = discoveryResults.allResults.filter(s => 
				s.source === 'mairie_direct' || s.source === 'mairie_activity' || s.url.includes('mairie')
			);
			
			// Process web search sources FIRST (up to 150), then city hall sources (up to 100)
			const sourcesToProcess = [
				...webSources.slice(0, 150),
				...mairieSources.slice(0, 100)
			];
			
			console.log(`  📋 Processing ${mairieSources.length} mairie sources and ${otherSources.length} other sources`);
			
			// First, extract from main sources
			for (const source of sourcesToProcess) {
				// Skip if already processed
				if (this.discovery.hasVisited(source.url)) {
					continue;
				}
				this.discovery.markVisited(source.url);
				try {
					// Check robots.txt compliance
					if (!(await this.compliance.canCrawl(source.url))) {
						console.log(`⏭️  Skipping ${source.url} (robots.txt disallowed)`);
						continue;
					}

					// Apply rate limiting
					await this.compliance.applyRateLimit(source.url);

					// Extract data
					const extracted = await this.extraction.extractFromUrl(source.url, {
						confidence: source.confidence
					});

					// Skip if extraction was filtered out (e.g., newsletter pages)
					if (extracted.error && extracted.error.includes('Newsletter')) {
						console.log(`  ⏭️  Skipping ${source.url} - ${extracted.error}`);
						this.stats.skipped = (this.stats.skipped || 0) + 1;
						continue;
					}

					// Only add if we have meaningful data (name OR contact info is critical)
					if (extracted.data && Object.keys(extracted.data).length > 0) {
						// Filter out newsletter and non-activity results
						const name = (extracted.data.name || extracted.data.title || extracted.data.heading || '').toLowerCase();
						const description = (extracted.data.description || '').toLowerCase();
						
						if (name.includes('newsletter') || 
						    name.includes('lettre d\'information') ||
						    description.includes('abonnez-vous à la newsletter') ||
						    name.includes('abonnement') && name.includes('newsletter')) {
							console.log(`  ⏭️  Skipping ${source.url} - newsletter result`);
							this.stats.skipped = (this.stats.skipped || 0) + 1;
							continue;
						}
						
						// More lenient: accept if we have name OR contact info (email/phone/website)
						const hasName = extracted.data.name || extracted.data.title || extracted.data.heading;
						const hasContact = extracted.data.email || extracted.data.phone || extracted.data.website;
						
						if (!hasName && !hasContact) {
							console.log(`  ⚠️  Skipping ${source.url} - no name or contact info found`);
							continue;
						}

						// Ensure we have at least a name field (use URL as fallback)
						if (!extracted.data.name) {
							extracted.data.name = extracted.data.title || extracted.data.heading || 'Organization';
						}

						extracted.id = extracted.id || uuidv4();
						extracted.sources = [source.url];
						extracted.confidence = extracted.confidence || source.confidence || 0.5;
						extractedEntities.push(extracted);
						this.stats.extracted++;
						console.log(`  ✅ Extracted: ${extracted.data.name}${extracted.data.website ? ` (${extracted.data.website})` : ''}`);
					}

					// If this source has links (like mairie pages), also extract from those links
					if (source.links && Array.isArray(source.links) && source.links.length > 0) {
						console.log(`  📎 Found ${source.links.length} links from ${source.url}, extracting from activity pages...`);
						
						// Process links (limit to avoid too many requests)
						// For mairie pages, process more links (they're proven to work)
						const maxLinks = source.url.includes('mairie') ? 50 : 30;
						const linksToProcess = source.links
							.filter(link => {
								// Filter for activity-related links - be more inclusive
								const url = link.toLowerCase();
								return url.includes('activite') || url.includes('activites') || 
								       url.includes('association') || url.includes('club') ||
								       url.includes('cercle') || url.includes('sport') || 
								       url.includes('loisir') || url.includes('enfant') ||
								       (!url.includes('mairie') && !url.includes('paris.fr')); // External links are likely organizations
							})
							.slice(0, maxLinks);
						
						for (const link of linksToProcess) {
							try {
								if (this.discovery.hasVisited(link)) continue;
								
								// Check robots.txt
								if (!(await this.compliance.canCrawl(link))) {
									continue;
								}

								await this.compliance.applyRateLimit(link);
								this.discovery.markVisited(link);

								// Extract from activity page
								const linkExtracted = await this.extraction.extractFromUrl(link, {
									confidence: 0.8
								});

								// More lenient: accept if we have name OR contact info
								const hasName = linkExtracted.data?.name || linkExtracted.data?.title || linkExtracted.data?.heading;
								const hasContact = linkExtracted.data?.email || linkExtracted.data?.phone || linkExtracted.data?.website;
								
								if (linkExtracted.data && (hasName || hasContact)) {
									// Ensure we have at least a name field
									if (!linkExtracted.data.name) {
										linkExtracted.data.name = linkExtracted.data.title || linkExtracted.data.heading || 'Organization';
									}
									
									linkExtracted.id = linkExtracted.id || uuidv4();
									linkExtracted.sources = [link, source.url];
									linkExtracted.confidence = linkExtracted.confidence || 0.8;
									extractedEntities.push(linkExtracted);
									this.stats.extracted++;
									console.log(`    ✅ Extracted: ${linkExtracted.data.name}${linkExtracted.data.website ? ` (${linkExtracted.data.website})` : ''}`);
								} else {
									console.log(`    ⚠️  Skipping ${link} - no name or contact info found`);
								}
							} catch (error) {
								console.error(`    ❌ Error extracting from ${link}:`, error.message);
								// Continue with next link
							}
						}
					}
				} catch (error) {
					console.error(`❌ Extraction error for ${source.url}:`, error.message);
					results.errors.push({ stage: 'extraction', url: source.url, error: error.message });
					this.stats.errors++;
				}
			}
			console.log(`✅ Extracted data from ${extractedEntities.length} sources`);

			// Stage 3: Validation
			console.log('✔️  Stage 3: Validation');
			const validatedEntities = [];
			for (const entity of extractedEntities) {
				try {
					const validation = this.validation.validate(entity.data || entity);
					entity.validation = validation;
					entity.validationScore = validation.score;

					if (validation.valid || options.includeInvalid) {
						validatedEntities.push(entity);
						this.stats.validated++;
					}
				} catch (error) {
					console.error(`❌ Validation error:`, error.message);
					results.errors.push({ stage: 'validation', error: error.message });
					this.stats.errors++;
				}
			}

			// Deduplication
			const uniqueEntities = this.validation.deduplicate(validatedEntities);
			console.log(`✅ Validated ${uniqueEntities.length} unique entities (${validatedEntities.length - uniqueEntities.length} duplicates removed)`);

			// Stage 4: Enrichment
			console.log('✨ Stage 4: Enrichment');
			const enrichedEntities = [];
			for (const entity of uniqueEntities) {
				try {
					const enriched = await this.enrichment.enrich(entity, {
						geocode: options.geocode !== false,
						categorize: options.categorize !== false
					});
					enrichedEntities.push(enriched);
					this.stats.enriched++;
				} catch (error) {
					console.error(`❌ Enrichment error:`, error.message);
					results.errors.push({ stage: 'enrichment', error: error.message });
					this.stats.errors++;
					// Continue with unenriched entity
					enrichedEntities.push(entity);
				}
			}
			console.log(`✅ Enriched ${enrichedEntities.length} entities`);

			// Stage 5: Storage
			console.log('💾 Stage 5: Storage');
			if (enrichedEntities.length > 0) {
				const saveResult = await this.storage.saveEntities(enrichedEntities, {
					tabName: options.tabName
				});
				this.stats.saved = enrichedEntities.length;
				results.saveResult = saveResult;
				console.log(`✅ Saved ${enrichedEntities.length} entities to ${saveResult.tabName}`);
			}

			results.entities = enrichedEntities;
		} catch (error) {
			console.error('❌ Crawler error:', error);
			results.errors.push({ stage: 'orchestration', error: error.message });
			this.stats.errors++;
		}

		this.stats.endTime = new Date();
		results.stats = this.getStats();

		return results;
	}

	/**
	 * Get crawler statistics
	 */
	getStats() {
		const duration = this.stats.endTime && this.stats.startTime
			? (this.stats.endTime - this.stats.startTime) / 1000
			: 0;

		return {
			...this.stats,
			duration: `${duration.toFixed(2)}s`,
			discoveryStats: this.discovery.getStats(),
			complianceStats: this.compliance.getStats()
		};
	}

	/**
	 * Reset statistics
	 */
	resetStats() {
		this.stats = {
			discovered: 0,
			extracted: 0,
			validated: 0,
			enriched: 0,
			saved: 0,
			errors: 0,
			startTime: null,
			endTime: null
		};
	}
}

