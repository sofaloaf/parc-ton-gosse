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
			
			arrondissementEntities.push(...filteredLocalityEntities, ...filteredIntelligentEntities);
			
			// Save to Google Sheets
			job.progress.message = `Saving results for ${arrondissement}...`;
			if (arrondissementEntities.length > 0) {
				// Use the same format as the regular crawler: "Pending - YYYY-MM-DD - Arrondissement Crawler"
				const finalSheetName = generateTabName('pending', 'arrondissement-crawler');
				console.log(`📋 Saving to sheet: "${finalSheetName}"`);
				
				// Log all entities before filtering
				console.log(`📊 Total entities before validation: ${arrondissementEntities.length}`);
				
				const validEntities = arrondissementEntities.filter(e => {
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

