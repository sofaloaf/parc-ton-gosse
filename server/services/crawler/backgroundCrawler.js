/**
 * Background Crawler Service
 * 
 * Allows crawler to run asynchronously, either:
 * 1. On Railway (background job with status tracking)
 * 2. On local machine (standalone script)
 * 
 * This enables longer, more accurate crawls without hitting Railway's 60s timeout.
 */

import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { LocalityFirstCrawler } from './localityFirstCrawler.js';
import { IntelligentCrawler } from './intelligentCrawler.js';
import { AdvancedCrawler } from './advancedCrawler.js';
import { CrawlerOrchestrator } from './orchestrator.js';
import { generateTabName, activityToSheetRow, ACTIVITIES_COLUMN_ORDER, getHeaders } from '../../utils/sheetsFormatter.js';

// In-memory job store (in production, use Redis or database)
const jobs = new Map();

/**
 * Get Google Sheets client
 */
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
		? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
		: process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured: GS_SERVICE_ACCOUNT and GS_PRIVATE_KEY_BASE64 or GS_PRIVATE_KEY required');
	}
	
	const auth = new google.auth.JWT(
		serviceAccount,
		null,
		privateKey.replace(/\\n/g, '\n'),
		['https://www.googleapis.com/auth/spreadsheets']
	);
	
	return google.sheets({ version: 'v4', auth });
}

/**
 * Start a background crawl job
 * Returns immediately with job ID, crawler runs in background
 */
export async function startBackgroundCrawl(arrondissements, options = {}) {
	const jobId = uuidv4();
	const job = {
		id: jobId,
		status: 'queued',
		arrondissements,
		options,
		progress: {
			stage: 'initializing',
			message: 'Starting crawler...',
			percent: 0
		},
		results: {
			entities: [],
			errors: [],
			stats: {}
		},
		startedAt: new Date().toISOString(),
		completedAt: null,
		error: null
	};
	
	jobs.set(jobId, job);
	
	// Start crawler in background (non-blocking)
	setImmediate(() => {
		runCrawlerJob(jobId).catch(err => {
			const job = jobs.get(jobId);
			if (job) {
				job.status = 'failed';
				job.error = err.message;
				job.completedAt = new Date().toISOString();
			}
		});
	});
	
	return job;
}

/**
 * Get job status
 */
export function getJobStatus(jobId) {
	return jobs.get(jobId) || null;
}

/**
 * List all jobs
 */
export function listJobs(limit = 50) {
	return Array.from(jobs.values())
		.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
		.slice(0, limit);
}

/**
 * Run the actual crawler job
 */
async function runCrawlerJob(jobId) {
	const job = jobs.get(jobId);
	if (!job) {
		throw new Error(`Job ${jobId} not found`);
	}
	
		try {
			job.status = 'running';
			job.progress = { stage: 'starting', message: 'Initializing crawlers...', percent: 0 };
			
			const sheetId = process.env.GS_SHEET_ID;
			if (!sheetId) {
				throw new Error('GS_SHEET_ID not configured');
			}
			
			// Get sheets client
			const sheets = getSheetsClient();
		
		// Load existing and rejected organizations
		job.progress = { stage: 'loading', message: 'Loading existing organizations...', percent: 5 };
		
		// Get existing organizations from database
		const store = global.app?.get('dataStore');
		const existingActivities = store ? await store.activities.list() : [];
		const existingOrganizations = {
			names: new Set(),
			websites: new Set()
		};
		existingActivities.forEach(activity => {
			const name = (activity.title?.en || activity.title?.fr || '').toLowerCase().trim();
			if (name) existingOrganizations.names.add(name);
			const website = (activity.websiteLink || '').toLowerCase();
			if (website) {
				const normalized = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
				existingOrganizations.websites.add(normalized);
			}
		});
		
		// Get rejected organizations
		const rejectedSheetName = 'Rejected Organizations';
		const rejectedOrganizations = { names: new Set(), websites: new Set() };
		try {
			const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
			const rejectedSheet = spreadsheet.data.sheets.find(s => s.properties.title === rejectedSheetName);
			if (rejectedSheet) {
				const response = await sheets.spreadsheets.values.get({
					spreadsheetId: sheetId,
					range: `${rejectedSheetName}!A:Z`
				});
				const rows = response.data.values || [];
				if (rows.length > 1) {
					const headers = rows[0];
					const nameColIndex = headers.findIndex(h => h && h.toLowerCase() === 'name');
					const websiteColIndex = headers.findIndex(h => h && h.toLowerCase() === 'website');
					for (let i = 1; i < rows.length; i++) {
						const row = rows[i];
						if (nameColIndex !== -1 && row[nameColIndex]) {
							rejectedOrganizations.names.add(row[nameColIndex].toLowerCase());
						}
						if (websiteColIndex !== -1 && row[websiteColIndex]) {
							rejectedOrganizations.websites.add(row[websiteColIndex].replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''));
						}
					}
				}
			}
		} catch (error) {
			console.warn('Could not load rejected organizations:', error.message);
		}
		
		const ARRONDISSEMENT_TO_POSTAL = {
			'1er': '75001', '2e': '75002', '3e': '75003', '4e': '75004',
			'5e': '75005', '6e': '75006', '7e': '75007', '8e': '75008',
			'9e': '75009', '10e': '75010', '11e': '75011', '12e': '75012',
			'13e': '75013', '14e': '75014', '15e': '75015', '16e': '75016',
			'17e': '75017', '18e': '75018', '19e': '75019', '20e': '75020'
		};
		
		const allResults = [];
		const allErrors = [];
		const arrondissementsToSearch = Array.isArray(job.arrondissements) ? job.arrondissements : ['20e'];
		
		for (let i = 0; i < arrondissementsToSearch.length; i++) {
			const arrondissement = arrondissementsToSearch[i];
			const postalCode = ARRONDISSEMENT_TO_POSTAL[arrondissement];
			if (!postalCode) {
				console.warn(`⚠️  No postal code for ${arrondissement}, skipping`);
				continue;
			}
			
			const progressPercent = 10 + (i / arrondissementsToSearch.length) * 80;
			job.progress = {
				stage: 'crawling',
				message: `Crawling ${arrondissement} arrondissement (${postalCode})...`,
				percent: Math.round(progressPercent)
			};
			
			console.log(`\n🔍 Starting BACKGROUND crawl for ${arrondissement} (${postalCode})`);
			
			const arrondissementEntities = [];
			
			// STEP 0: Locality-first crawler (highest precision)
			job.progress.message = `Step 0: Locality-first crawler for ${arrondissement}...`;
			let localityEntities = [];
			try {
				const localityCrawler = new LocalityFirstCrawler({
					timeout: 30000, // Longer timeout for background jobs
					minDelay: 1000,
					maxDelay: 2000,
					rejectedNames: rejectedOrganizations.names,
					rejectedWebsites: rejectedOrganizations.websites,
					existingNames: existingOrganizations.names,
					existingWebsites: existingOrganizations.websites
				});
				
				const localityResults = await localityCrawler.crawl(arrondissement, postalCode, {
					maxPages: 50 // More pages for background jobs
				});
				
				localityEntities = localityResults.entities.map(e => ({
					id: e.id || uuidv4(),
					data: {
						name: e.name,
						title: e.name,
						website: e.website,
						websiteLink: e.website,
						email: e.email,
						phone: e.phone,
						address: e.address,
						description: `Activity from ${arrondissement} arrondissement (locality-first crawler)`,
						neighborhood: arrondissement,
						arrondissement: arrondissement,
						categories: e.categories || [],
						images: e.images || []
					},
					sources: [e.sourceUrl || 'locality_first'],
					confidence: e.confidence || 0.9,
					extractedAt: e.extractedAt,
					validation: e.validation
				}));
				
				console.log(`✅ Locality-first crawler: ${localityEntities.length} entities`);
			} catch (localityError) {
				console.error(`  ❌ Locality-first crawler failed:`, localityError.message);
				allErrors.push({ stage: 'locality_first_crawler', error: localityError.message });
			}
			
			// STEP 1: Intelligent crawler
			job.progress.message = `Step 1: Intelligent crawler for ${arrondissement}...`;
			let intelligentEntities = [];
			try {
				const intelligentCrawler = new IntelligentCrawler({
					googleApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
					googleCx: process.env.GOOGLE_CUSTOM_SEARCH_CX,
					minDelay: 1000,
					maxDelay: 2000,
					rejectedNames: rejectedOrganizations.names,
					rejectedWebsites: rejectedOrganizations.websites,
					existingNames: existingOrganizations.names,
					existingWebsites: existingOrganizations.websites
				});
				
				const intelligentResults = await intelligentCrawler.crawl(arrondissement, postalCode, {
					maxPages: 50 // More pages for background jobs
				});
				
				intelligentEntities = intelligentResults.entities.map(e => ({
					id: uuidv4(),
					data: {
						name: e.name,
						title: e.name,
						website: e.website,
						websiteLink: e.website,
						email: e.email,
						phone: e.phone,
						address: e.address,
						description: e.description || `Activity from ${arrondissement} arrondissement (via intelligent crawler)`,
						neighborhood: arrondissement,
						arrondissement: arrondissement,
						categories: e.categories || [],
						images: e.images || []
					},
					sources: [e.sourceUrl || e.source || 'intelligent_crawler'],
					confidence: e.confidence || 0.7,
					extractedAt: new Date().toISOString(),
					validation: { valid: true, score: e.confidence || 0.7 }
				}));
				
				console.log(`✅ Intelligent crawler: ${intelligentEntities.length} entities`);
			} catch (intelligentError) {
				console.error(`  ❌ Intelligent crawler failed:`, intelligentError.message);
				allErrors.push({ stage: 'intelligent_crawler', error: intelligentError.message });
			}
			
			// Merge and deduplicate
			const existingNames = new Set([
				...existingOrganizations.names,
				...rejectedOrganizations.names
			]);
			
			const filteredLocalityEntities = localityEntities.filter(e => {
				const name = (e.data.name || '').toLowerCase().trim();
				if (rejectedOrganizations.names.has(name) || existingOrganizations.names.has(name)) return false;
				existingNames.add(name);
				return true;
			});
			
			const filteredIntelligentEntities = intelligentEntities.filter(e => {
				const name = (e.data.name || '').toLowerCase().trim();
				if (rejectedOrganizations.names.has(name) || existingOrganizations.names.has(name)) return false;
				if (existingNames.has(name)) return false;
				existingNames.add(name);
				return true;
			});
			
			arrondissementEntities.push(...filteredLocalityEntities, ...filteredIntelligentEntities);
			
			// Save to Google Sheets
			job.progress.message = `Saving results for ${arrondissement}...`;
			if (arrondissementEntities.length > 0) {
				const finalSheetName = generateTabName('pending', 'arrondissement-crawler');
				
				const validEntities = arrondissementEntities.filter(e => {
					if (!e.data) return false;
					const name = (e.data.name || e.data.title || '').toLowerCase().trim();
					if (!name || name.length === 0) return false;
					const hasContact = e.data.website || e.data.websiteLink || e.data.email || e.data.phone;
					return hasContact;
				});
				
				const rowsToSave = validEntities.map(e => {
					let websiteLink = e.data.website || e.data.websiteLink || null;
					if (websiteLink && !websiteLink.startsWith('http://') && !websiteLink.startsWith('https://')) {
						websiteLink = `https://${websiteLink}`;
					}
					
					const activityName = e.data.name || e.data.title || 'Organization';
					const titleObj = typeof activityName === 'string' 
						? { en: activityName, fr: activityName } 
						: (activityName || { en: 'Organization', fr: 'Organization' });
					
					const descObj = typeof e.data.description === 'string'
						? { en: e.data.description || '', fr: e.data.description || '' }
						: (e.data.description || { en: '', fr: '' });
					
					const sheetActivity = {
						id: e.id || uuidv4(),
						title_en: titleObj.en || titleObj.fr || 'Organization',
						title_fr: titleObj.fr || titleObj.en || 'Organization',
						description_en: descObj.en || '',
						description_fr: descObj.fr || '',
						websiteLink: websiteLink,
						contactEmail: e.data.email || null,
						contactPhone: e.data.phone || null,
						addresses: e.data.address || null,
						neighborhood: arrondissement,
						categories: e.data.categories || [],
						ageMin: e.data.ageMin || 0,
						ageMax: e.data.ageMax || 99,
						price_amount: e.data.price?.amount || 0,
						currency: e.data.price?.currency || 'eur',
						images: e.data.images || [],
						disponibiliteJours: '',
						disponibiliteDates: '',
						adults: false,
						additionalNotes: '',
						approvalStatus: 'pending',
						crawledAt: new Date().toISOString(),
						providerId: '',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
					
					const rowObject = activityToSheetRow(sheetActivity, ACTIVITIES_COLUMN_ORDER);
					return ACTIVITIES_COLUMN_ORDER.map(col => rowObject[col] || '');
				});
				
				// Get or create sheet
				const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
				let sheet = spreadsheet.data.sheets.find(s => s.properties.title === finalSheetName);
				
				if (!sheet) {
					await sheets.spreadsheets.batchUpdate({
						spreadsheetId: sheetId,
						requestBody: {
							requests: [{
								addSheet: {
									properties: {
										title: finalSheetName,
										gridProperties: { rowCount: 1000, columnCount: 30 }
									}
								}
							}]
						}
					});
					// Write headers
					await sheets.spreadsheets.values.update({
						spreadsheetId: sheetId,
						range: `${finalSheetName}!A1`,
						valueInputOption: 'RAW',
						requestBody: { values: [getHeaders(ACTIVITIES_COLUMN_ORDER)] }
					});
				}
				
				// Append rows
				const existingData = await sheets.spreadsheets.values.get({
					spreadsheetId: sheetId,
					range: `${finalSheetName}!A:Z`
				}).catch(() => ({ data: { values: [] } }));
				
				const existingRows = existingData.data.values || [];
				const startRow = existingRows.length > 1 ? existingRows.length + 1 : 2;
				
				await sheets.spreadsheets.values.append({
					spreadsheetId: sheetId,
					range: `${finalSheetName}!A${startRow}`,
					valueInputOption: 'RAW',
					requestBody: { values: rowsToSave }
				});
				
				console.log(`✅ Saved ${rowsToSave.length} entities to Google Sheets (${finalSheetName})`);
			}
			
			allResults.push({
				arrondissement,
				postalCode,
				entities: arrondissementEntities,
				localityCount: filteredLocalityEntities.length,
				intelligentCount: filteredIntelligentEntities.length
			});
		}
		
		// Aggregate results
		const finalAggregatedEntities = allResults.flatMap(r => r.entities || []);
		
		job.status = 'completed';
		job.progress = { stage: 'completed', message: 'Crawl completed successfully', percent: 100 };
		job.results = {
			entities: finalAggregatedEntities,
			errors: allErrors,
			stats: {
				total: finalAggregatedEntities.length,
				arrondissements: arrondissementsToSearch.length
			}
		};
		job.completedAt = new Date().toISOString();
		
		console.log(`✅ Background crawl completed: ${finalAggregatedEntities.length} entities found`);
		
	} catch (error) {
		console.error(`❌ Background crawl failed:`, error);
		job.status = 'failed';
		job.error = error.message;
		job.completedAt = new Date().toISOString();
		throw error;
	}
}

