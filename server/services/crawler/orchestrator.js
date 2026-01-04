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
			const discoveryResults = await this.discovery.hybridSearch(query, {
				arrondissement: options.arrondissement,
				postalCode: options.postalCode,
				expandGraph: options.expandGraph !== false
			});
			this.stats.discovered = discoveryResults.allResults.length;
			console.log(`✅ Discovered ${this.stats.discovered} potential sources`);

			// Stage 2: Extraction
			console.log('📄 Stage 2: Extraction');
			const extractedEntities = [];
			for (const source of discoveryResults.allResults.slice(0, options.maxSources || 50)) {
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

					if (extracted.data && Object.keys(extracted.data).length > 0) {
						extracted.id = extracted.id || uuidv4();
						extracted.sources = [source.url];
						extracted.confidence = extracted.confidence || source.confidence || 0.5;
						extractedEntities.push(extracted);
						this.stats.extracted++;
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

