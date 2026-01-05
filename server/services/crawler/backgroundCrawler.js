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
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { LocalityFirstCrawler } from './localityFirstCrawler.js';
import { IntelligentCrawler } from './intelligentCrawler.js';
import { AdvancedCrawler } from './advancedCrawler.js';
import { CrawlerOrchestrator } from './orchestrator.js';
import { MLQualityScorer } from './mlQualityScorer.js';
import { AdaptiveSearchStrategy } from './adaptiveSearch.js';
import { EnhancedDiscovery } from './enhancedDiscovery.js';
import { generateTabName, activityToSheetRow, ACTIVITIES_COLUMN_ORDER, getHeaders } from '../../utils/sheetsFormatter.js';

// In-memory job store (in production, use Redis or database)
const jobs = new Map();

// Helper functions (copied from arrondissementCrawler.js)
function randomDelay(min, max) {
	const delay = Math.floor(Math.random() * (max - min + 1)) + min;
	return new Promise(resolve => setTimeout(resolve, delay));
}

// Fetch with retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const controller = new AbortController();
			const timeout = options.timeout || 20000;
			const timeoutId = setTimeout(() => controller.abort(), timeout);
			
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/*;q=0.8',
					...options.headers
				}
			});
			
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			if (attempt === maxRetries - 1) throw error;
			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
		}
	}
}

// Search for activities on Paris mairie websites (PROVEN WORKING FUNCTION)
async function searchMairieActivities(arrondissement, postalCode) {
	const activities = [];
	
	try {
		// Build mairie activities URL - try multiple URL patterns
		const arrNum = arrondissement.replace('er', '').replace('e', '');
		const mairieUrls = [
			`https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`,
			`https://mairie${arrNum}.paris.fr/recherche?q=activités&arrondissements=${postalCode}`,
			`https://mairie${arrNum}.paris.fr/recherche?q=associations&arrondissements=${postalCode}`,
			`https://mairie${arrNum}.paris.fr/recherche?q=clubs&arrondissements=${postalCode}`
		];
		
		const allActivityLinks = new Set();
		
		// Try each URL pattern
		for (const mairieUrl of mairieUrls) {
			try {
				console.log(`🔍 [${arrondissement}] Trying mairie URL: ${mairieUrl}`);
				const response = await fetchWithRetry(mairieUrl, { timeout: 20000 });

				if (!response.ok) {
					console.warn(`⚠️ [${arrondissement}] Mairie URL failed: HTTP ${response.status}`);
					continue;
				}

				const html = await response.text();
				const dom = new JSDOM(html);
				const document = dom.window.document;

				const baseUrl = `https://mairie${arrNum}.paris.fr`;
				const pageActivityLinks = new Set();

				// Find activity links - try multiple selectors
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
				
				for (const selector of activitySelectors) {
					try {
						const links = document.querySelectorAll(selector);
						for (const link of links) {
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
								if (fullUrl.startsWith('http') && !pageActivityLinks.has(fullUrl)) {
									pageActivityLinks.add(fullUrl);
								}
							}
						}
					} catch (e) {
						// Skip selector errors
					}
				}

				// Also search for URLs in page text
				const activityUrlPattern = /https?:\/\/mairie\d+\.paris\.fr\/[^"'\s<>]*activit[^"'\s<>]*/gi;
				const urlMatches = html.match(activityUrlPattern);
				if (urlMatches) {
					urlMatches.forEach(url => pageActivityLinks.add(url));
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
										pageActivityLinks.add(value);
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

				pageActivityLinks.forEach(link => allActivityLinks.add(link));
				console.log(`  ✅ Found ${pageActivityLinks.size} links from this URL (total: ${allActivityLinks.size})`);
				
				await randomDelay(1000, 2000);
				
			} catch (urlError) {
				console.warn(`  ⚠️  Error with URL ${mairieUrl}:`, urlError.message);
				continue;
			}
		}

		console.log(`📋 [${arrondissement}] Found ${allActivityLinks.size} total activity links from all mairie URLs`);
		
		const activityArray = Array.from(allActivityLinks).slice(0, 50); // Limit to 50 to avoid timeout
		console.log(`📋 [${arrondissement}] Processing ${activityArray.length} activity links...`);
		
		for (let i = 0; i < activityArray.length; i++) {
			const activityUrl = activityArray[i];
			try {
				await randomDelay(1500, 3000);
				const orgInfo = await extractOrganizationFromMairiePage(activityUrl, arrondissement);
				
				if (orgInfo && (orgInfo.website || orgInfo.email || orgInfo.phone)) {
					activities.push(orgInfo);
					console.log(`✅ [${arrondissement}] Found: ${orgInfo.name} (${i + 1}/${activityArray.length})${orgInfo.website ? '' : ' (no website)'}`);
				} else if (orgInfo) {
					activities.push({
						...orgInfo,
						name: orgInfo.name || `Activity from ${arrondissement}`,
						website: null
					});
					console.log(`⚠️ [${arrondissement}] Found activity without contact: ${orgInfo.name} (${i + 1}/${activityArray.length})`);
				}
			} catch (error) {
				console.error(`❌ [${arrondissement}] Error extracting from ${activityUrl}:`, error.message);
				continue;
			}
		}
	} catch (error) {
		console.error(`❌ [${arrondissement}] Error searching mairie:`, error.message);
	}
	
	return activities;
}

// Get comprehensive activity keywords (same as discovery.js)
function getActivityKeywords() {
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
		
		// Creative & Arts
		'théâtre', 'theater', 'theatre', 'danse', 'dance',
		'musique', 'music', 'piano', 'guitare', 'guitar',
		'violon', 'violin', 'chant', 'singing', 'chorale', 'choir',
		'dessin', 'drawing', 'peinture', 'painting', 'art plastique', 'plastic arts',
		'sculpture', 'poterie', 'pottery', 'céramique', 'ceramics',
		'photographie', 'photography', 'cinéma', 'cinema', 'film',
		'écriture', 'writing', 'littérature', 'literature',
		
		// Youth & Kids Specific
		'enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth',
		'ado', 'adolescent', 'adolescents', 'teenager', 'teenagers',
		'petit', 'petits', 'little', 'junior', 'juniors',
		'école', 'school', 'scolaire', 'extracurriculaire', 'extracurricular',
		'centre de loisirs', 'leisure center', 'centre aéré', 'day camp',
		'colonie', 'summer camp', 'camp de vacances', 'vacation camp'
	];
}

// Extract organization information from mairie activity page
async function extractOrganizationFromMairiePage(activityUrl, arrondissement) {
	try {
		const response = await fetchWithRetry(activityUrl, { timeout: 15000 });

		if (!response.ok) {
			return null;
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const title = document.querySelector('h1')?.textContent?.trim() ||
		             document.querySelector('.title')?.textContent?.trim() ||
		             document.querySelector('title')?.textContent?.trim() ||
		             '';

		// Get full page text for keyword checking
		const pageText = (document.body?.textContent || html).toLowerCase();
		const titleLower = title.toLowerCase();
		
		// FILTER: Must be related to kids activities
		const activityKeywords = getActivityKeywords();
		const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth', 'ado', 'adolescent', 'petit', 'petits', 'junior', 'scolaire', 'extracurriculaire', 'centre de loisirs', 'colonie', 'camp'];
		
		// Check if page mentions kids/children/youth
		const hasKidsMention = kidsKeywords.some(kw => 
			titleLower.includes(kw) || 
			pageText.includes(kw) ||
			activityUrl.toLowerCase().includes(kw)
		);
		
		// Check if page mentions activities
		const hasActivityKeyword = activityKeywords.some(kw => 
			titleLower.includes(kw) || 
			pageText.includes(kw) ||
			activityUrl.toLowerCase().includes(kw)
		);
		
		// REJECT if it's a general nonprofit without kids/activity focus
		// Must have BOTH kids mention AND activity keyword (or very strong activity keyword)
		if (!hasKidsMention && !hasActivityKeyword) {
			console.log(`  ⏭️  Skipping non-kids-activity organization: ${title}`);
			return null;
		}
		
		// If it has activity keywords but no kids mention, check if it's clearly for adults only
		const adultOnlyKeywords = ['senior', 'séniors', 'adulte', 'adultes', 'adult', 'retraité', 'retraités', 'retired', 'troisième âge'];
		const isAdultOnly = adultOnlyKeywords.some(kw => titleLower.includes(kw) || pageText.includes(kw));
		if (isAdultOnly && !hasKidsMention) {
			console.log(`  ⏭️  Skipping adults-only organization: ${title}`);
			return null;
		}
		
		// Filter out general nonprofits that aren't activity-focused
		const genericNonprofitKeywords = ['bénévolat', 'volunteer', 'charity', 'charité', 'fondation', 'foundation', 'aide', 'help', 'soutien', 'support'];
		const isGenericNonprofit = genericNonprofitKeywords.some(kw => 
			(titleLower.includes(kw) || pageText.includes(kw)) && 
			!hasActivityKeyword
		);
		if (isGenericNonprofit) {
			console.log(`  ⏭️  Skipping generic nonprofit without activities: ${title}`);
			return null;
		}

		let orgWebsite = null;
		let orgName = title;

		const websiteSelectors = [
			'a[href^="http"]:not([href*="mairie"]):not([href*="paris.fr"])',
			'a[href^="https://"]',
			'.website',
			'.site-web',
			'[class*="website"]',
			'[class*="site"]',
			'a[href*="www."]'
		];

		for (const selector of websiteSelectors) {
			const links = document.querySelectorAll(selector);
			for (const link of links) {
				const href = link.getAttribute('href');
				if (href && href.startsWith('http') && 
				    !href.includes('mairie') && 
				    !href.includes('paris.fr') &&
				    !href.includes('facebook.com') &&
				    !href.includes('twitter.com') &&
				    !href.includes('instagram.com')) {
					orgWebsite = href;
					break;
				}
			}
			if (orgWebsite) break;
		}

		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = html.match(emailPattern);
		const email = emailMatch ? emailMatch.find(e => !e.includes('mairie') && !e.includes('paris.fr') && !e.includes('noreply')) : null;

		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phoneMatch = html.match(phonePattern);
		const phone = phoneMatch ? phoneMatch[0].trim() : null;

		const addressPattern = /\d+\s(?:rue|avenue|boulevard|place|allée|chemin|impasse)\s[A-ZÉÈÀÛÔÎÂÙÇa-zéèàûôîâùç\s\d\-.']+,?\s(?:750(?:0[1-9]|1[0-9]|20))\sParis/gi;
		const addressMatch = html.match(addressPattern);
		const address = addressMatch ? addressMatch[0].trim() : null;

		return {
			name: orgName,
			website: orgWebsite,
			email: email,
			phone: phone,
			address: address,
			arrondissement: arrondissement,
			sourceUrl: activityUrl
		};
	} catch (error) {
		console.error(`Error extracting from ${activityUrl}:`, error.message);
		return null;
	}
}

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
		job.progress = { stage: 'loading', message: 'Loading existing organizations and ML model...', percent: 5 };
		
		// Initialize ML Quality Scorer
		let mlScorer = null;
		try {
			mlScorer = new MLQualityScorer();
			await mlScorer.initialize();
			// Try to train if no model exists (loads 132 activities and trains)
			if (!mlScorer.model) {
				console.log('📚 No ML model found, training on existing activities...');
				const store = global.app?.get('dataStore');
				if (store) {
					const existingActivities = await store.activities.list();
					if (existingActivities.length > 0) {
						await mlScorer.train(existingActivities);
						console.log('✅ ML model trained and ready');
					}
				}
			} else {
				console.log('✅ ML model loaded and ready');
			}
		} catch (mlError) {
			console.warn('⚠️  ML scorer initialization failed, will use rule-based scoring:', mlError.message);
			mlScorer = null; // Fallback to rule-based
		}
		
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
			
			// STEP 0: Use proven mairie crawler (this works!)
			job.progress.message = `Step 0: Using proven mairie crawler for ${arrondissement}...`;
			let mairieEntities = [];
			try {
				const mairieActivities = await searchMairieActivities(arrondissement, postalCode);
				console.log(`✅ Found ${mairieActivities.length} activities from mairie pages`);
				
				// Filter mairie activities with keyword validation
				const activityKeywords = getActivityKeywords();
				const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth', 'ado', 'adolescent', 'petit', 'petits', 'junior', 'scolaire', 'extracurriculaire', 'centre de loisirs', 'colonie', 'camp'];
				
				mairieEntities = mairieActivities
					.filter(activity => {
						const name = (activity.name || '').toLowerCase().trim();
						
						// Skip rejected/existing
						if (rejectedOrganizations.names.has(name)) return false;
						if (existingOrganizations.names.has(name)) return false;
						
						// Filter out newsletters
						if (name.includes('newsletter') || name.includes('lettre d\'information')) {
							console.log(`  ⏭️  Skipping newsletter from mairie: ${activity.name}`);
							return false;
						}
						
						// Must be kids activity related
						const combined = `${name} ${activity.website || ''} ${activity.email || ''} ${activity.phone || ''}`.toLowerCase();
						const hasKidsMention = kidsKeywords.some(kw => combined.includes(kw));
						const hasActivityKeyword = activityKeywords.some(kw => combined.includes(kw));
						
						if (!hasKidsMention && !hasActivityKeyword) {
							console.log(`  ⏭️  Skipping non-kids-activity from mairie: ${activity.name}`);
							return false;
						}
						
						return true;
					})
					.map(activity => ({
						id: uuidv4(),
						data: {
							name: activity.name,
							title: activity.name,
							website: activity.website,
							websiteLink: activity.website,
							email: activity.email,
							phone: activity.phone,
							address: activity.address,
							description: `Activity from ${arrondissement} arrondissement`,
							neighborhood: arrondissement,
							arrondissement: arrondissement
						},
						sources: [activity.sourceUrl || 'mairie'],
						confidence: 0.9,
						extractedAt: new Date().toISOString(),
						validation: { valid: true, score: 0.9 }
					}));
				
				arrondissementEntities.push(...mairieEntities);
				console.log(`✅ Added ${mairieEntities.length} mairie entities`);
			} catch (mairieError) {
				console.error(`  ❌ Mairie crawler failed:`, mairieError.message);
				allErrors.push({ stage: 'mairie_crawler', error: mairieError.message });
			}
			
			// STEP 1: Locality-first crawler (highest precision)
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
			
			// STEP 1: Intelligent crawler (with keyword filtering)
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
				
				// Filter entities to only include kids activities
				const activityKeywords = getActivityKeywords();
				const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth', 'ado', 'adolescent', 'petit', 'petits', 'junior', 'scolaire', 'extracurriculaire', 'centre de loisirs', 'colonie', 'camp'];
				
				intelligentEntities = intelligentResults.entities
					.filter(e => {
						const name = (e.name || '').toLowerCase();
						const desc = (e.description || '').toLowerCase();
						const website = (e.website || '').toLowerCase();
						const combined = `${name} ${desc} ${website}`;
						
						// Must have kids mention OR strong activity keyword
						const hasKidsMention = kidsKeywords.some(kw => combined.includes(kw));
						const hasActivityKeyword = activityKeywords.some(kw => combined.includes(kw));
						
						// Filter out adult-only organizations
						const adultOnlyKeywords = ['senior', 'séniors', 'adulte', 'adultes', 'adult', 'retraité', 'retraités', 'retired', 'troisième âge'];
						const isAdultOnly = adultOnlyKeywords.some(kw => combined.includes(kw)) && !hasKidsMention;
						
						// Filter out generic nonprofits
						const genericNonprofitKeywords = ['bénévolat', 'volunteer', 'charity', 'charité', 'fondation', 'foundation'];
						const isGenericNonprofit = genericNonprofitKeywords.some(kw => combined.includes(kw)) && !hasActivityKeyword;
						
						return (hasKidsMention || hasActivityKeyword) && !isAdultOnly && !isGenericNonprofit;
					})
					.map(e => ({
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
				
				console.log(`✅ Intelligent crawler: ${intelligentEntities.length} kids activity entities (filtered from ${intelligentResults.entities.length} total)`);
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
			
			// STEP 2: Advanced crawler with Playwright for JS-heavy sites
			job.progress.message = `Step 2: Advanced crawler for ${arrondissement}...`;
			let advancedEntities = [];
			try {
				const advancedCrawler = new AdvancedCrawler({
					maxDepth: 2,
					maxUrls: 30,
					usePlaywright: true,
					timeout: 30000
				});
				
				const arrNum = arrondissement.replace('er', '').replace('e', '');
				const startUrls = [
					`https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`,
					`https://www.paris.fr/pages/activites-et-loisirs-${arrondissement}-1234`
				];
				
				const extractorFn = async (document, html, url) => {
					const pageText = (document.body?.textContent || html).toLowerCase();
					const title = document.querySelector('h1')?.textContent?.trim() ||
					             document.querySelector('.title')?.textContent?.trim() ||
					             document.querySelector('title')?.textContent?.trim() || '';
					const titleLower = title.toLowerCase();
					
					// Filter out newsletters and non-kids activities
					if (titleLower.includes('newsletter') || 
					    titleLower.includes('lettre d\'information') ||
					    pageText.includes('abonnez-vous à la newsletter')) {
						return null;
					}
					
					const activityKeywords = getActivityKeywords();
					const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth'];
					const combined = `${titleLower} ${pageText}`;
					const hasKidsMention = kidsKeywords.some(kw => combined.includes(kw));
					const hasActivityKeyword = activityKeywords.some(kw => combined.includes(kw));
					
					if (!hasKidsMention && !hasActivityKeyword) {
						return null;
					}
					
					// Extract organization info
					const websiteSelectors = [
						'a[href^="http"]:not([href*="mairie"]):not([href*="paris.fr"])',
						'a[href^="https://"]'
					];
					
					let website = null;
					for (const selector of websiteSelectors) {
						const links = document.querySelectorAll(selector);
						for (const link of links) {
							const href = link.getAttribute('href');
							if (href && href.startsWith('http') && 
							    !href.includes('mairie') && 
							    !href.includes('paris.fr') &&
							    !href.includes('facebook.com') &&
							    !href.includes('instagram.com') &&
							    !href.includes('twitter.com')) {
								website = href;
								break;
							}
						}
						if (website) break;
					}
					
					const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
					const emailMatch = html.match(emailPattern);
					const email = emailMatch ? emailMatch.find(e => !e.includes('mairie') && !e.includes('paris.fr') && !e.includes('noreply')) : null;
					
					const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
					const phoneMatch = html.match(phonePattern);
					const phone = phoneMatch ? phoneMatch[0].trim() : null;
					
					if (!title && !website && !email) {
						return null;
					}
					
					return {
						id: uuidv4(),
						data: {
							name: title || 'Organization',
							title: title || 'Organization',
							website: website,
							websiteLink: website,
							email: email,
							phone: phone,
							description: `Activity from ${arrondissement} arrondissement`,
							neighborhood: arrondissement,
							arrondissement: arrondissement
						},
						sources: [url],
						confidence: 0.8
					};
				};
				
				const advancedResults = await advancedCrawler.crawl(startUrls, extractorFn);
				
				advancedEntities = (advancedResults.results || []).map(r => ({
					id: r.id || uuidv4(),
					data: {
						name: r.data.name,
						title: r.data.title,
						website: r.data.website,
						websiteLink: r.data.websiteLink,
						email: r.data.email,
						phone: r.data.phone,
						address: r.data.address,
						description: r.data.description || `Activity from ${arrondissement} arrondissement (via advanced crawler)`,
						neighborhood: arrondissement,
						arrondissement: arrondissement,
						categories: r.data.categories || [],
						images: r.data.images || []
					},
					sources: r.sources || [r.url],
					confidence: r.confidence || 0.8,
					extractedAt: r.extractedAt || new Date().toISOString(),
					validation: { valid: true, score: 0.8 }
				}));
				
				console.log(`✅ Advanced crawler: ${advancedEntities.length} entities`);
			} catch (advancedError) {
				console.error(`  ❌ Advanced crawler failed:`, advancedError.message);
				allErrors.push({ stage: 'advanced_crawler', error: advancedError.message });
			}
			
			// STEP 3: Crawler Orchestrator with Google Custom Search
			job.progress.message = `Step 3: Orchestrator crawler for ${arrondissement}...`;
			let orchestratorEntities = [];
			try {
				const orchestrator = new CrawlerOrchestrator({
					discovery: {
						googleApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
						googleCx: process.env.GOOGLE_CUSTOM_SEARCH_CX,
						minDelay: 1000,
						maxDelay: 3000
					},
					enrichment: {
						googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
					},
					storage: {
						sheetId: sheetId
					},
					compliance: {
						minDelay: 1000,
						maxDelay: 3000
					}
				});
				
				// Build comprehensive query using activity keywords
				const activityKeywords = getActivityKeywords();
				const topActivities = activityKeywords.slice(0, 30);
				const activityQuery = topActivities.join(' OR ');
				const query = `Paris ${arrondissement} arrondissement enfants kids (${activityQuery}) -newsletter -"lettre d'information"`;
				
				const crawlResults = await orchestrator.crawl(query, {
					arrondissement: arrondissement,
					postalCode: postalCode,
					maxSources: 20, // More sources for local runs
					geocode: false, // Skip geocoding to save time
					categorize: false, // Skip categorization to save time
					expandGraph: false,
					tabName: generateTabName('pending', 'orchestrator-crawler')
				});
				
				// Filter orchestrator results for kids activities
				const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth'];
				orchestratorEntities = (crawlResults.entities || [])
					.filter(e => {
						const name = (e.data?.name || e.data?.title || '').toLowerCase();
						const desc = (e.data?.description || '').toLowerCase();
						const website = (e.data?.website || e.data?.websiteLink || '').toLowerCase();
						const combined = `${name} ${desc} ${website}`;
						
						const hasKidsMention = kidsKeywords.some(kw => combined.includes(kw));
						const hasActivityKeyword = activityKeywords.some(kw => combined.includes(kw));
						const adultOnlyKeywords = ['senior', 'séniors', 'adulte', 'adultes', 'adult', 'retraité'];
						const isAdultOnly = adultOnlyKeywords.some(kw => combined.includes(kw)) && !hasKidsMention;
						const genericNonprofitKeywords = ['bénévolat', 'volunteer', 'charity', 'charité', 'fondation'];
						const isGenericNonprofit = genericNonprofitKeywords.some(kw => combined.includes(kw)) && !hasActivityKeyword;
						
						return (hasKidsMention || hasActivityKeyword) && !isAdultOnly && !isGenericNonprofit;
					})
					.map(e => ({
						id: e.id || uuidv4(),
						data: {
							name: e.data?.name || e.data?.title || 'Organization',
							title: e.data?.title || e.data?.name || 'Organization',
							website: e.data?.website || e.data?.websiteLink,
							websiteLink: e.data?.websiteLink || e.data?.website,
							email: e.data?.email,
							phone: e.data?.phone,
							address: e.data?.address,
							description: e.data?.description || `Activity from ${arrondissement} arrondissement (via orchestrator)`,
							neighborhood: arrondissement,
							arrondissement: arrondissement,
							categories: e.data?.categories || [],
							images: e.data?.images || []
						},
						sources: e.sources || [e.sourceUrl || 'orchestrator'],
						confidence: e.confidence || 0.7,
						extractedAt: e.extractedAt || new Date().toISOString(),
						validation: { valid: true, score: e.confidence || 0.7 }
					}));
				
				console.log(`✅ Orchestrator crawler: ${orchestratorEntities.length} kids activity entities (filtered from ${crawlResults.entities?.length || 0} total)`);
			} catch (orchestratorError) {
				console.error(`  ❌ Orchestrator crawler failed:`, orchestratorError.message);
				allErrors.push({ stage: 'orchestrator_crawler', error: orchestratorError.message });
			}
			
			// Merge all results
			// Filter advanced and orchestrator entities
			const filteredAdvancedEntities = advancedEntities.filter(e => {
				const name = (e.data.name || '').toLowerCase().trim();
				if (rejectedOrganizations.names.has(name) || existingOrganizations.names.has(name)) return false;
				if (existingNames.has(name)) return false;
				existingNames.add(name);
				return true;
			});
			
			const filteredOrchestratorEntities = orchestratorEntities.filter(e => {
				const name = (e.data.name || '').toLowerCase().trim();
				if (rejectedOrganizations.names.has(name) || existingOrganizations.names.has(name)) return false;
				if (existingNames.has(name)) return false;
				existingNames.add(name);
				return true;
			});
			
			// Merge all results
			arrondissementEntities.push(...filteredLocalityEntities, ...filteredIntelligentEntities, ...filteredAdvancedEntities, ...filteredOrchestratorEntities);
			
			console.log(`📊 Total entities from all crawlers: ${arrondissementEntities.length}`);
			console.log(`   - Mairie: ${mairieEntities.length}`);
			console.log(`   - Locality-first: ${filteredLocalityEntities.length}`);
			console.log(`   - Intelligent: ${filteredIntelligentEntities.length}`);
			console.log(`   - Advanced: ${filteredAdvancedEntities.length}`);
			console.log(`   - Orchestrator: ${filteredOrchestratorEntities.length}`);
			
			// ML Quality Scoring: Score all entities
			job.progress.message = `Scoring entities with ML model for ${arrondissement}...`;
			let scoredEntities = [];
			let mlStats = { total: 0, accepted: 0, reviewed: 0, avgScore: 0 };
			
			if (mlScorer && arrondissementEntities.length > 0) {
				console.log(`🧠 Scoring ${arrondissementEntities.length} entities with ML model...`);
				const scores = [];
				
				for (const entity of arrondissementEntities) {
					try {
						// Convert entity to organization format for scoring
						const orgForScoring = {
							title_en: entity.data?.title_en || entity.data?.title?.en || entity.data?.name || '',
							title_fr: entity.data?.title_fr || entity.data?.title?.fr || entity.data?.name || '',
							description_en: entity.data?.description_en || entity.data?.description?.en || '',
							description_fr: entity.data?.description_fr || entity.data?.description?.fr || '',
							activityType: entity.data?.activityType || '',
							categories: entity.data?.categories || [],
							contactEmail: entity.data?.email || entity.data?.contactEmail || '',
							contactPhone: entity.data?.phone || entity.data?.contactPhone || '',
							websiteLink: entity.data?.website || entity.data?.websiteLink || '',
							registrationLink: entity.data?.registrationLink || '',
							neighborhood: entity.data?.neighborhood || arrondissement,
							addresses: entity.data?.address || entity.data?.addresses || '',
							ageMin: entity.data?.ageMin,
							ageMax: entity.data?.ageMax,
							adults: entity.data?.adults || false,
							price_amount: entity.data?.price?.amount || entity.data?.price_amount || 0,
							currency: entity.data?.price?.currency || entity.data?.currency || 'eur',
							disponibiliteJours: entity.data?.disponibiliteJours || '',
							disponibiliteDates: entity.data?.disponibiliteDates || '',
							additionalNotes: entity.data?.additionalNotes || '',
							providerId: entity.data?.providerId || ''
						};
						
						const scoreResult = await mlScorer.score(orgForScoring);
						
						// Add ML score to entity
						entity.mlScore = scoreResult.score;
						entity.mlConfidence = scoreResult.confidence;
						entity.mlBreakdown = scoreResult.breakdown;
						entity.mlRecommendation = scoreResult.recommendation;
						entity.mlMethod = scoreResult.method;
						
						scores.push(scoreResult.score);
						mlStats.total++;
						
						if (scoreResult.recommendation === 'accept') {
							mlStats.accepted++;
						} else {
							mlStats.reviewed++;
						}
						
						// Include all entities (both accepted and reviewed)
						scoredEntities.push(entity);
					} catch (scoreError) {
						console.warn(`  ⚠️  ML scoring failed for entity, including anyway:`, scoreError.message);
						// Include entity even if scoring fails
						scoredEntities.push(entity);
					}
				}
				
				if (scores.length > 0) {
					mlStats.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
				}
				
				console.log(`📊 ML Scoring Results:`);
				console.log(`   - Total scored: ${mlStats.total}`);
				console.log(`   - Average score: ${mlStats.avgScore.toFixed(2)}/10`);
				console.log(`   - Accepted (score >= 7): ${mlStats.accepted}`);
				console.log(`   - Needs review (score < 7): ${mlStats.reviewed}`);
			} else {
				// No ML scorer, use all entities
				scoredEntities = arrondissementEntities;
				console.log('⚠️  ML scorer not available, using all entities without scoring');
			}
			
			// Save to Google Sheets
			job.progress.message = `Saving results for ${arrondissement}...`;
			if (scoredEntities.length > 0) {
				// Use the same format as the regular crawler: "Pending - YYYY-MM-DD - Arrondissement Crawler"
				const finalSheetName = generateTabName('pending', 'arrondissement-crawler');
				console.log(`📋 Saving to sheet: "${finalSheetName}"`);
				
				// Log all entities before filtering
				console.log(`📊 Total entities before validation: ${scoredEntities.length}`);
				
				const validEntities = scoredEntities.filter(e => {
					if (!e.data) {
						console.log(`  ⏭️  Skipping entity without data`);
						return false;
					}
					const name = (e.data.name || e.data.title || '').toLowerCase().trim();
					if (!name || name.length === 0) {
						console.log(`  ⏭️  Skipping entity without name`);
						return false;
					}
					
					// Filter out newsletters
					if (name.includes('newsletter') || name.includes('lettre d\'information')) {
						console.log(`  ⏭️  Skipping newsletter: ${name}`);
						return false;
					}
					
					const hasContact = e.data.website || e.data.websiteLink || e.data.email || e.data.phone;
					if (!hasContact) {
						console.log(`  ⏭️  Skipping entity without contact info: ${name}`);
						return false;
					}
					return true;
				});
				
				console.log(`📊 Valid entities after filtering: ${validEntities.length}`);
				
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
						additionalNotes: e.mlScore ? `ML Score: ${e.mlScore.toFixed(2)}/10 (${e.mlMethod})` : '',
						approvalStatus: e.mlRecommendation === 'accept' ? 'pending' : 'pending', // All go to pending for review
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
				
				// Get sheet ID for URL
				const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
				const updatedSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === finalSheetName);
				const sheetGid = updatedSheet?.properties?.sheetId || '';
				
				console.log(`✅ Saved ${rowsToSave.length} entities to Google Sheets`);
				console.log(`📋 Sheet name: "${finalSheetName}"`);
				console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheetGid}`);
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

