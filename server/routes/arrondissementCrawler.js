import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { 
	generateTabName, 
	activityToSheetRow, 
	getHeaders, 
	ACTIVITIES_COLUMN_ORDER 
} from '../utils/sheetsFormatter.js';
import { CrawlerOrchestrator } from '../services/crawler/index.js';

export const arrondissementCrawlerRouter = express.Router();

// Paris arrondissements (excluding 20e which already has data)
const ARRONDISSEMENTS = [
	'1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
	'11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e'
];

// Map arrondissement names to postal codes for mairie URLs
const ARRONDISSEMENT_TO_POSTAL = {
	'1er': '75001',
	'2e': '75002',
	'3e': '75003',
	'4e': '75004',
	'5e': '75005',
	'6e': '75006',
	'7e': '75007',
	'8e': '75008',
	'9e': '75009',
	'10e': '75010',
	'11e': '75011',
	'12e': '75012',
	'13e': '75013',
	'14e': '75014',
	'15e': '75015',
	'16e': '75016',
	'17e': '75017',
	'18e': '75018',
	'19e': '75019',
	'20e': '75020'
};

// Helper function to fetch with timeout and retries
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
	const timeout = options.timeout || 20000;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Create timeout promise
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), timeout);
			});

			// Create fetch promise
			const fetchPromise = fetch(url, {
				...options,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
					'Accept-Encoding': 'gzip, deflate, br',
					'Connection': 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
					...options.headers
				}
			});

			const response = await Promise.race([fetchPromise, timeoutPromise]);
			
			if (!response.ok && response.status >= 500 && attempt < maxRetries) {
				// Retry on server errors
				const delay = Math.random() * 2000 + 1000 * attempt; // Exponential backoff with jitter
				console.log(`⚠️ Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms`);
				await new Promise(resolve => setTimeout(resolve, delay));
				continue;
			}

			return response;
		} catch (error) {
			if (attempt === maxRetries) {
				throw error;
			}
			const delay = Math.random() * 2000 + 1000 * attempt;
			console.log(`⚠️ Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms: ${error.message}`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

// Random delay to mimic human behavior
function randomDelay(min = 1000, max = 3000) {
	const delay = Math.random() * (max - min) + min;
	return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper to get Google Sheets client
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
		? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
		: process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}

	let processedKey = privateKey.replace(/\\n/g, '\n');
	if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
		processedKey = processedKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
			.replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
	}

	const auth = new google.auth.JWT({
		email: serviceAccount,
		key: processedKey,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	return google.sheets({ version: 'v4', auth });
}

// Search for activities on Paris mairie websites
async function searchMairieActivities(arrondissement, postalCode) {
	const activities = [];
	
	try {
		// Build mairie activities URL
		const arrNum = arrondissement.replace('er', '').replace('e', '');
		const mairieUrl = `https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`;
		console.log(`🔍 [${arrondissement}] Searching mairie: ${mairieUrl}`);
		
		const response = await fetchWithRetry(mairieUrl, { timeout: 20000 });

		if (!response.ok) {
			console.warn(`⚠️ [${arrondissement}] Mairie search failed: HTTP ${response.status}`);
			return activities;
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const activityLinks = new Set();
		const baseUrl = `https://mairie${arrNum}.paris.fr`;

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
						if (fullUrl.startsWith('http') && !activityLinks.has(fullUrl)) {
							activityLinks.add(fullUrl);
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
			urlMatches.forEach(url => activityLinks.add(url));
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
								activityLinks.add(value);
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

		console.log(`📋 [${arrondissement}] Found ${activityLinks.size} activity links on mairie page`);

		// Visit each activity page to extract organization info
		const maxActivitiesPerArrondissement = 200;
		const activityArray = Array.from(activityLinks).slice(0, maxActivitiesPerArrondissement);
		
		console.log(`📋 [${arrondissement}] Processing ${activityArray.length} activity links...`);
		
		for (let i = 0; i < activityArray.length; i++) {
			const activityUrl = activityArray[i];
			try {
				await randomDelay(1500, 3000);
				const orgInfo = await extractOrganizationFromMairiePage(activityUrl, arrondissement);
				
				// Accept organizations even if they don't have a website (we can use email or other contact info)
				if (orgInfo && (orgInfo.website || orgInfo.email || orgInfo.phone)) {
					activities.push(orgInfo);
					console.log(`✅ [${arrondissement}] Found: ${orgInfo.name} (${i + 1}/${activityArray.length})${orgInfo.website ? '' : ' (no website)'}`);
				} else if (orgInfo) {
					// Even without contact info, save the activity from mairie page
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

		// Extract activity title
		const title = document.querySelector('h1')?.textContent?.trim() ||
		             document.querySelector('.title')?.textContent?.trim() ||
		             document.querySelector('title')?.textContent?.trim() ||
		             '';

		// Extract organization website
		let orgWebsite = null;
		let orgName = title;

		// Look for website links
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
				    !href.includes('instagram.com') &&
				    !href.includes('twitter.com') &&
				    !href.includes('youtube.com')) {
					orgWebsite = href;
					const linkText = link.textContent?.trim();
					if (linkText && linkText.length > 3 && linkText.length < 50) {
						orgName = linkText;
					}
					break;
				}
			}
			if (orgWebsite) break;
		}

		// Search in text content for URLs
		if (!orgWebsite) {
			const urlPattern = /https?:\/\/[^\s<>"']+[^.,;!?]/g;
			const matches = html.match(urlPattern);
			if (matches) {
				for (const url of matches) {
					const cleanUrl = url.replace(/[.,;!?]+$/, '');
					if (!cleanUrl.includes('mairie') && 
					    !cleanUrl.includes('paris.fr') &&
					    !cleanUrl.includes('facebook.com') &&
					    !cleanUrl.includes('instagram.com') &&
					    !cleanUrl.includes('twitter.com') &&
					    !cleanUrl.includes('youtube.com') &&
					    cleanUrl.includes('.')) {
						orgWebsite = cleanUrl;
						break;
					}
				}
			}
		}

		// Extract contact info
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = html.match(emailPattern);
		const email = emailMatch ? emailMatch.find(e => !e.includes('mairie') && !e.includes('paris.fr') && !e.includes('noreply')) : null;

		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phoneMatch = html.match(phonePattern);
		const phone = phoneMatch ? phoneMatch[0].trim() : null;

		const addressPatterns = [
			/\d+\s+[A-Za-z\s]+(?:rue|avenue|boulevard|place|allée)[A-Za-z\s,]+(?:Paris|Île-de-France)/gi,
			/\d{5}\s+Paris/gi
		];
		let address = null;
		for (const pattern of addressPatterns) {
			const match = html.match(pattern);
			if (match) {
				address = match[0].trim();
				break;
			}
		}

		if (!orgWebsite && !email) {
			return null;
		}

		// If we have email but no website, try to construct website from email domain
		if (!orgWebsite && email) {
			const domain = email.split('@')[1];
			if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.com') && !domain.includes('hotmail.com') && !domain.includes('outlook.com')) {
				orgWebsite = `https://${domain}`;
			}
		}

		return {
			name: orgName || 'Organization',
			website: orgWebsite,
			email: email,
			phone: phone,
			address: address,
			arrondissement: arrondissement,
			sourceUrl: activityUrl,
			status: 'pending'
		};
	} catch (error) {
		console.error(`Error extracting from mairie page ${activityUrl}:`, error.message);
		return null;
	}
}

// Additional search using web search for associations
async function searchAssociationsWeb(arrondissement, templateActivity) {
	const results = [];
	const postalCode = ARRONDISSEMENT_TO_POSTAL[arrondissement];
	
	// Search terms based on template and arrondissement
	const categories = templateActivity?.categories || [];
	const searchTerms = [
		`association enfants ${arrondissement} Paris`,
		`club enfants ${arrondissement} Paris`,
		`activités enfants ${arrondissement} Paris`,
		`loisirs enfants ${arrondissement} Paris`,
		`ateliers enfants ${arrondissement} Paris`
	];

	// Add category-specific searches
	if (categories.length > 0) {
		categories.forEach(cat => {
			searchTerms.push(`${cat} enfants ${arrondissement} Paris`);
		});
	}

	// Limit to 3 search terms to avoid rate limiting
	for (const searchTerm of searchTerms.slice(0, 3)) {
		try {
			await randomDelay(2000, 4000);
			const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerm)}`;
			console.log(`🔍 [${arrondissement}] Web search: ${searchTerm}`);
			
			const response = await fetchWithRetry(searchUrl, { timeout: 20000 });

			if (!response.ok) {
				continue;
			}

			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;

			const resultLinks = document.querySelectorAll('.result__a, .web-result__a, a.result-link, .result a');
			
			for (const link of Array.from(resultLinks).slice(0, 5)) {
				let href = link.getAttribute('href');
				const title = link.textContent?.trim();
				
				if (!href || !title) continue;
				
				// Handle DuckDuckGo redirect URLs
				if (href.startsWith('/l/?kh=') || href.includes('duckduckgo.com')) {
					const onclick = link.getAttribute('onclick');
					if (onclick) {
						const match = onclick.match(/href='([^']+)'/);
						if (match) href = match[1];
					}
				}
				
				if (results.some(r => r.website === href)) continue;
				
				const lowerTitle = title.toLowerCase();
				const lowerHref = href.toLowerCase();
				const relevantKeywords = ['enfant', 'kid', 'child', 'loisir', 'activite', 'atelier', 'sport', 'musique', 'danse', 'art', 'culture', 'association', 'club'];
				const hasRelevantKeyword = relevantKeywords.some(keyword => 
					lowerTitle.includes(keyword) || lowerHref.includes(keyword)
				);
				
				if (!hasRelevantKeyword) continue;
				
				const skipDomains = ['wikipedia.org', 'facebook.com', 'instagram.com', 'youtube.com', 
				                     'twitter.com', 'linkedin.com', 'pinterest.com', 'tiktok.com',
				                     'google.com', 'bing.com', 'duckduckgo.com', 'mairie', 'paris.fr'];
				if (skipDomains.some(domain => lowerHref.includes(domain))) {
					continue;
				}

				let orgName = title;
				try {
					const url = new URL(href);
					if (orgName.length < 10 || orgName.toLowerCase().includes('paris') || orgName.toLowerCase().includes('result')) {
						orgName = url.hostname.replace('www.', '').split('.')[0];
						orgName = orgName.charAt(0).toUpperCase() + orgName.slice(1);
					}
				} catch (e) {
					continue;
				}

				results.push({
					name: orgName,
					website: href,
					arrondissement: arrondissement,
					categories: categories.length > 0 ? categories : ['sport'],
					status: 'pending'
				});
			}
		} catch (error) {
			console.error(`❌ [${arrondissement}] Web search error for "${searchTerm}":`, error.message);
			continue;
		}
	}
	
	return results;
}

// Search for organizations in a specific arrondissement
async function searchOrganizations(arrondissement, templateActivity) {
	const results = [];
	const postalCode = ARRONDISSEMENT_TO_POSTAL[arrondissement];
	
	if (!postalCode) {
		console.error(`❌ No postal code mapping for ${arrondissement}`);
		return results;
	}

	console.log(`\n🏘️  Starting search for ${arrondissement} (${postalCode})...`);

	// Strategy 1: Search mairie activities
	console.log(`📍 [${arrondissement}] Strategy 1: Searching mairie activities...`);
	const mairieActivities = await searchMairieActivities(arrondissement, postalCode);
	
		// Add all mairie activities, even without websites
		for (const activity of mairieActivities) {
			results.push({
				name: activity.name,
				website: activity.website || null,
				arrondissement: arrondissement,
				categories: templateActivity?.categories || ['sport'],
				email: activity.email,
				phone: activity.phone,
				address: activity.address,
				status: 'pending'
			});
		}

	console.log(`✅ [${arrondissement}] Found ${results.length} organizations from mairie`);

	// Strategy 2: Additional web search for associations
	if (results.length < 50) { // Only if we didn't find many from mairie
		console.log(`📍 [${arrondissement}] Strategy 2: Web search for associations...`);
		const webResults = await searchAssociationsWeb(arrondissement, templateActivity);
		
		for (const org of webResults) {
			if (!results.some(r => r.website === org.website)) {
				results.push(org);
			}
		}
		
		console.log(`✅ [${arrondissement}] Found ${webResults.length} additional organizations from web search`);
	}

	console.log(`🎯 [${arrondissement}] Total: ${results.length} organizations found\n`);
	
	return results;
}

// Extract data from organization website
async function extractOrganizationData(url, templateActivity) {
	try {
		const response = await fetchWithRetry(url, { timeout: 15000 });

		if (!response.ok) {
			return { error: `HTTP ${response.status}` };
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const data = {
			title: null,
			description: null,
			price: null,
			ageRange: null,
			address: null,
			phone: null,
			email: null,
			images: [],
			categories: templateActivity?.categories || [],
			schedule: null,
			websiteLink: url
		};

		// Extract title - try multiple sources
		data.title = document.querySelector('meta[property="og:title"]')?.content?.trim() ||
			document.querySelector('meta[name="twitter:title"]')?.content?.trim() ||
			document.querySelector('title')?.textContent?.trim() ||
			document.querySelector('h1')?.textContent?.trim() ||
			document.querySelector('h2')?.textContent?.trim() ||
			null;
		
		// Clean up title if found
		if (data.title) {
			data.title = data.title
				.replace(/^Home\s*-\s*/i, '')
				.replace(/^Accueil\s*-\s*/i, '')
				.replace(/\s*-\s*Paris.*$/i, '')
				.replace(/\s*-\s*Site.*$/i, '')
				.replace(/\s*-\s*Accueil.*$/i, '')
				.trim()
				.substring(0, 100);
		}

		// Extract description
		data.description = document.querySelector('meta[property="og:description"]')?.content ||
			document.querySelector('meta[name="description"]')?.content ||
			document.querySelector('p')?.textContent?.trim();

		// Extract price
		const pricePatterns = [/\b(\d+)\s*€/gi, /\b(\d+)\s*EUR/gi];
		for (const pattern of pricePatterns) {
			const match = html.match(pattern);
			if (match) {
				const prices = match.map(m => parseInt(m.replace(/\D/g, '')));
				data.price = Math.min(...prices.filter(p => p > 0));
				break;
			}
		}

		// Extract age range
		const agePatterns = [/(\d+)\s*-\s*(\d+)\s*ans?/gi, /(\d+)\s*à\s*(\d+)\s*ans?/gi];
		for (const pattern of agePatterns) {
			const match = html.match(pattern);
			if (match) {
				const ages = match[0].match(/\d+/g);
				if (ages && ages.length >= 2) {
					data.ageRange = `${ages[0]}-${ages[1]}`;
				}
				break;
			}
		}

		// Extract address
		const addressPatterns = [
			/\d+\s+[A-Za-z\s]+(?:rue|avenue|boulevard|place|allée)[A-Za-z\s,]+(?:Paris|Île-de-France)/gi,
			/\d{5}\s+Paris/gi
		];
		for (const pattern of addressPatterns) {
			const match = html.match(pattern);
			if (match) {
				data.address = match[0].trim();
				break;
			}
		}

		// Extract phone
		const phonePatterns = [/(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g];
		for (const pattern of phonePatterns) {
			const match = html.match(pattern);
			if (match) {
				data.phone = match[0].trim();
				break;
			}
		}

		// Extract email
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = html.match(emailPattern);
		if (emailMatch) {
			data.email = emailMatch[0];
		}

		// Extract images
		const images = document.querySelectorAll('img');
		for (const img of images) {
			const src = img.src || img.getAttribute('data-src');
			if (src && !src.includes('logo') && !src.includes('icon')) {
				const fullUrl = src.startsWith('http') ? src : new URL(src, url).href;
				data.images.push(fullUrl);
			}
		}
		data.images = data.images.slice(0, 5);

		return data;
	} catch (error) {
		return { error: error.message };
	}
}

// Main crawler endpoint
arrondissementCrawlerRouter.post('/search', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const sheetId = process.env.GS_SHEET_ID;
	const { arrondissements, useTemplate } = req.body;

	if (!sheetId) {
		return res.status(400).json({ error: 'GS_SHEET_ID not configured' });
	}

	try {
		const sheets = getSheetsClient();
		
		// Get template activity from existing data (20e arrondissement)
		let templateActivity = null;
		if (useTemplate) {
			const activities = await store.activities.list();
			templateActivity = activities.find(a => a.neighborhood === '20e') || activities[0];
		}

		// Get arrondissements to search (default to all except 20e)
		const arrondissementsToSearch = arrondissements && Array.isArray(arrondissements) 
			? arrondissements 
			: ARRONDISSEMENTS;

		const results = [];
		const pendingActivities = [];

		// Search each arrondissement sequentially
		for (const arrondissement of arrondissementsToSearch) {
			console.log(`\n${'='.repeat(60)}`);
			console.log(`🏘️  Processing ${arrondissement} arrondissement`);
			console.log('='.repeat(60));
			
			// Search for organizations
			const organizations = await searchOrganizations(arrondissement, templateActivity || {});
			
			for (const org of organizations) {
				try {
					let extracted = { error: null };
					
					// Try to extract data from website if available
					if (org.website && org.website.startsWith('http') && org.website.includes('.')) {
						try {
							await randomDelay(2000, 4000);
							extracted = await extractOrganizationData(org.website, templateActivity || {});
						} catch (error) {
							console.warn(`⚠️ [${arrondissement}] Website extraction failed for ${org.website}: ${error.message}`);
							// Continue with org data from mairie page
							extracted = { error: error.message };
						}
					}

					// Extract and ensure we have a good title
					let activityTitle = extracted.title || org.name;
					
					// If title is still empty or too generic, derive from website
					if (!activityTitle || activityTitle.trim().length < 3 || activityTitle.toLowerCase().includes('untitled')) {
						if (org.website) {
							try {
								const url = new URL(org.website);
								const domain = url.hostname.replace('www.', '').split('.')[0];
								activityTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
							} catch (e) {
								// Fallback
								activityTitle = org.name || `Activity ${arrondissement}`;
							}
						} else {
							activityTitle = org.name || `Activity ${arrondissement}`;
						}
					}
					
					// Clean up title
					activityTitle = activityTitle.trim()
						.replace(/^Home\s*-\s*/i, '')
						.replace(/^Accueil\s*-\s*/i, '')
						.replace(/\s*-\s*Paris.*$/i, '')
						.replace(/\s*-\s*Site.*$/i, '')
						.substring(0, 100);
					
					// Create activity object - save even if website extraction failed
					const activity = {
						id: uuidv4(),
						title: {
							en: activityTitle,
							fr: activityTitle
						},
						description: {
							en: extracted.description || '',
							fr: extracted.description || ''
						},
						categories: extracted.categories || org.categories || templateActivity?.categories || [],
						ageMin: extracted.ageRange ? parseInt(extracted.ageRange.split('-')[0]) : (templateActivity?.ageMin || 3),
						ageMax: extracted.ageRange ? parseInt(extracted.ageRange.split('-')[1]) : (templateActivity?.ageMax || 99),
						price: extracted.price ? { amount: extracted.price, currency: 'EUR' } : (templateActivity?.price || { amount: 0, currency: 'EUR' }),
						addresses: extracted.address || org.address || '',
						contactEmail: extracted.email || org.email || '',
						contactPhone: extracted.phone || org.phone || '',
						images: extracted.images || [],
						neighborhood: arrondissement,
						websiteLink: org.website || '',
						approvalStatus: 'pending',
						crawledAt: new Date().toISOString(),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};

					pendingActivities.push(activity);
					results.push({
						arrondissement,
						organization: org.name,
						website: org.website || 'N/A',
						status: extracted.error ? 'partial' : 'success',
						activityId: activity.id,
						note: extracted.error ? 'Saved with mairie data only' : 'Full extraction successful'
					});
					
					console.log(`✅ [${arrondissement}] Saved: ${activityTitle} (${extracted.error ? 'mairie data only' : 'full extraction'})`);
				} catch (error) {
					console.error(`❌ [${arrondissement}] Error processing ${org.name}:`, error.message);
					results.push({
						arrondissement,
						organization: org.name,
						website: org.website || 'N/A',
						status: 'error',
						error: error.message
					});
				}
			}
			
			// Add delay between arrondissements
			await randomDelay(3000, 5000);
		}

		// Save pending activities
		if (pendingActivities.length > 0) {
			try {
				// Create standardized tab name
				let finalSheetName = generateTabName('pending', 'arrondissement-crawler');
				
				// Check if sheet already exists and create with unique name if needed
				try {
					await sheets.spreadsheets.batchUpdate({
						spreadsheetId: sheetId,
						requestBody: {
							requests: [{
								addSheet: {
									properties: {
										title: finalSheetName
									}
								}
							}]
						}
					});
				} catch (sheetError) {
					// If sheet exists, add a timestamp suffix
					if (sheetError.message && sheetError.message.includes('already exists')) {
						const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0].split('T')[1];
						finalSheetName = `Pending - ${new Date().toISOString().split('T')[0]} - Arrondissement Crawler (${timestamp})`;
						await sheets.spreadsheets.batchUpdate({
							spreadsheetId: sheetId,
							requestBody: {
								requests: [{
									addSheet: {
										properties: {
											title: finalSheetName
										}
									}
								}]
							}
						});
					} else {
						throw sheetError;
					}
				}

				// Use standardized column order and headers
				const standardHeaders = getHeaders(ACTIVITIES_COLUMN_ORDER);

				// Convert activities to sheet rows
				const rows = [standardHeaders];
				pendingActivities.forEach(activity => {
					// Convert activity to sheet format
					const sheetActivity = {
						id: activity.id,
						title_en: activity.title?.en || activity.title || '',
						title_fr: activity.title?.fr || activity.title || '',
						description_en: activity.description?.en || activity.description || '',
						description_fr: activity.description?.fr || activity.description || '',
						categories: activity.categories || [],
						activityType: activity.activityType || '',
						ageMin: activity.ageMin || 0,
						ageMax: activity.ageMax || 99,
						price_amount: activity.price?.amount || 0,
						currency: activity.price?.currency || 'EUR',
						neighborhood: activity.neighborhood || '',
						addresses: activity.addresses || '',
						contactEmail: activity.contactEmail || '',
						contactPhone: activity.contactPhone || '',
						websiteLink: activity.websiteLink || '',
						registrationLink: activity.registrationLink || '',
						disponibiliteJours: activity.disponibiliteJours || '',
						disponibiliteDates: activity.disponibiliteDates || '',
						images: activity.images || [],
						adults: activity.adults || false,
						additionalNotes: activity.additionalNotes || '',
						approvalStatus: activity.approvalStatus || 'pending',
						crawledAt: activity.crawledAt || new Date().toISOString(),
						providerId: activity.providerId || '',
						createdAt: activity.createdAt || new Date().toISOString(),
						updatedAt: activity.updatedAt || new Date().toISOString()
					};
					
					const sheetRow = activityToSheetRow(sheetActivity, ACTIVITIES_COLUMN_ORDER);
					const row = ACTIVITIES_COLUMN_ORDER.map(col => sheetRow[col] || '');
					rows.push(row);
				});

				// Write to pending sheet ONLY - do NOT write to main Activities sheet
				console.log(`\n📝 Writing ${rows.length - 1} activities to sheet "${finalSheetName}" (${rows.length} total rows including header)`);
				const writeResult = await sheets.spreadsheets.values.update({
					spreadsheetId: sheetId,
					range: `${finalSheetName}!A1`,
					valueInputOption: 'RAW',
					requestBody: {
						values: rows
					}
				});
				
				console.log(`✅ Write successful! Updated range: ${writeResult.data.updatedRange}`);
				console.log(`✅ Updated ${writeResult.data.updatedCells || rows.length * rows[0]?.length || 'unknown'} cells`);

				// IMPORTANT: Do NOT save to main Activities sheet via datastore
				// Pending activities should ONLY be in the pending sheet until approved
				// The main Activities sheet should remain untouched
				console.log(`\n✅ Saved ${pendingActivities.length} activities to pending sheet "${finalSheetName}"`);
				console.log(`📋 These activities are NOT in the main Activities sheet - they will only appear after approval`);
				console.log(`📊 Google Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
				console.log(`📋 Tab name: "${finalSheetName}"`);

				res.json({
					success: true,
					pendingSheet: finalSheetName,
					sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
					sheetId: sheetId,
					summary: {
						total: results.length,
						successful: results.filter(r => r.status === 'success').length,
						partial: results.filter(r => r.status === 'partial').length,
						errors: results.filter(r => r.status === 'error').length,
						pendingActivities: pendingActivities.length
					},
					results: results.slice(0, 50),
					message: `Found ${pendingActivities.length} organizations. Review and approve in admin panel.`
				});

			} catch (error) {
				console.error('Failed to save pending activities:', error);
				res.status(500).json({ 
					error: 'Failed to save pending activities', 
					message: error.message 
				});
			}
		} else {
			res.json({
				success: true,
				summary: {
					total: results.length,
					successful: 0,
					errors: results.filter(r => r.status === 'error').length
				},
				results: results,
				message: 'No organizations found'
			});
		}

	} catch (error) {
		console.error('Crawler error:', error);
		res.status(500).json({ 
			error: 'Crawler failed', 
			message: error.message 
		});
	}
});

// Enhanced crawler endpoint using new modular architecture
arrondissementCrawlerRouter.post('/search-enhanced', requireAuth('admin'), async (req, res) => {
	const sheetId = process.env.GS_SHEET_ID;
	const { arrondissements, useEnhanced } = req.body;

	if (!sheetId) {
		return res.status(400).json({ error: 'GS_SHEET_ID not configured' });
	}

	try {
		// Initialize enhanced crawler orchestrator
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

		// Get arrondissements to search
		const arrondissementsToSearch = arrondissements && Array.isArray(arrondissements) 
			? arrondissements 
			: ['20e']; // Default to 20e for testing

		const allResults = [];
		const allErrors = [];

		// Search each arrondissement
		for (const arrondissement of arrondissementsToSearch) {
			const postalCode = ARRONDISSEMENT_TO_POSTAL[arrondissement];
			if (!postalCode) {
				console.warn(`⚠️  No postal code for ${arrondissement}, skipping`);
				continue;
			}

			console.log(`\n🔍 Starting enhanced crawl for ${arrondissement} (${postalCode})`);

			// Build search query
			const query = `associations activités enfants ${arrondissement} Paris`;

			// Run enhanced crawler
			const crawlResults = await orchestrator.crawl(query, {
				arrondissement: arrondissement,
				postalCode: postalCode,
				maxSources: 50,
				geocode: true,
				categorize: true,
				expandGraph: true,
				tabName: generateTabName('pending', 'enhanced-crawler')
			});

			allResults.push({
				arrondissement,
				postalCode,
				entities: crawlResults.entities || [],
				stats: crawlResults.stats
			});

			allErrors.push(...(crawlResults.errors || []));

			console.log(`✅ Enhanced crawl completed for ${arrondissement}: ${crawlResults.entities?.length || 0} entities`);
		}

		// Aggregate results
		const totalEntities = allResults.reduce((sum, r) => sum + (r.entities?.length || 0), 0);
		const totalStats = orchestrator.getStats();

		res.json({
			success: true,
			summary: {
				total: totalEntities,
				arrondissements: arrondissementsToSearch.length,
				entities: totalEntities,
				errors: allErrors.length
			},
			results: allResults,
			errors: allErrors,
			stats: totalStats,
			message: `Enhanced crawler found ${totalEntities} entities across ${arrondissementsToSearch.length} arrondissement(s)`
		});

	} catch (error) {
		console.error('Enhanced crawler error:', error);
		res.status(500).json({ 
			error: 'Enhanced crawler failed', 
			message: error.message 
		});
	}
});

// Get pending activities for approval - read from pending sheets, NOT main Activities sheet
arrondissementCrawlerRouter.get('/pending', requireAuth('admin'), async (req, res) => {
	const sheetId = process.env.GS_SHEET_ID;
	
	if (!sheetId) {
		return res.status(400).json({ error: 'GS_SHEET_ID not configured' });
	}
	
	try {
		const sheets = getSheetsClient();
		
		// Get all sheets in the spreadsheet
		const spreadsheet = await sheets.spreadsheets.get({
			spreadsheetId: sheetId
		});
		
		// Find all pending sheets (format: "Pending - YYYY-MM-DD - ...")
		const pendingSheets = spreadsheet.data.sheets
			.filter(sheet => {
				const title = sheet.properties.title;
				return /^Pending - \d{4}-\d{2}-\d{2}/.test(title);
			})
			.map(sheet => sheet.properties.title)
			.sort()
			.reverse(); // Newest first
		
		console.log(`📋 Found ${pendingSheets.length} pending sheets:`, pendingSheets);
		
		if (pendingSheets.length === 0) {
			console.log('⚠️  No pending sheets found. Make sure crawler has run and saved data.');
			return res.json({
				total: 0,
				activities: []
			});
		}
		
		// Read activities from all pending sheets
		const allPendingActivities = [];
		
		for (const sheetName of pendingSheets) {
			try {
				const response = await sheets.spreadsheets.values.get({
					spreadsheetId: sheetId,
					range: `${sheetName}!A:Z`
				});
				
				const rows = response.data.values || [];
				if (rows.length <= 1) {
					console.log(`⚠️  Sheet "${sheetName}" has no data rows (only headers)`);
					continue; // Skip if only headers
				}
				
				const headers = rows[0];
				console.log(`📋 Reading "${sheetName}": ${rows.length - 1} data rows, ${headers.length} columns`);
				
				// Convert rows to activity objects
				for (let i = 1; i < rows.length; i++) {
					const row = rows[i];
					const activity = {};
					
					headers.forEach((header, idx) => {
						if (header && row[idx] !== undefined && row[idx] !== '') {
							const value = row[idx];
							// Handle JSON strings
							if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
								try {
									activity[header] = JSON.parse(value);
								} catch {
									activity[header] = value;
								}
							} else {
								activity[header] = value;
							}
						}
					});
					
					// Convert to app format
					// Check for ID in various column name formats (header is "ID" from ACTIVITIES_COLUMN_HEADERS)
					const activityId = activity.id || activity.ID || activity['ID (UUID)'] || activity['Id (UUID)'] || activity['id (uuid)'] || activity['Id'] || activity['id'];
					if (activityId && activityId.toString().trim() !== '') {
						const appActivity = {
							id: activityId.toString().trim(),
							title: {
								en: activity['Title (English)'] || activity['title_en'] || activity.title?.en || activity.title || '',
								fr: activity['Title (French)'] || activity['title_fr'] || activity.title?.fr || activity.title || ''
							},
							description: {
								en: activity['Description (English)'] || activity['description_en'] || activity.description?.en || activity.description || '',
								fr: activity['Description (French)'] || activity['description_fr'] || activity.description?.fr || activity.description || ''
							},
							categories: typeof activity.Categories === 'string' 
								? activity.Categories.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
								: (activity.categories || []),
							ageMin: parseInt(activity['Min Age'] || activity.ageMin || 0),
							ageMax: parseInt(activity['Max Age'] || activity.ageMax || 99),
							price: {
								amount: parseInt(activity['Price (€)'] || activity.price_amount || activity.price?.amount || 0),
								currency: activity.Currency || activity.currency || 'EUR'
							},
							neighborhood: activity.Neighborhood || activity.neighborhood || '',
							addresses: activity.Addresses || activity.addresses || '',
							contactEmail: activity['Contact Email'] || activity.contactEmail || '',
							contactPhone: activity['Contact Phone'] || activity.contactPhone || '',
							websiteLink: activity['Website Link'] || activity.websiteLink || '',
							images: typeof activity.Images === 'string' 
								? activity.Images.split(',').map(s => s.trim()).filter(s => s)
								: (activity.images || []),
							approvalStatus: activity['Approval Status'] || activity.approvalStatus || 'pending',
							crawledAt: activity['Crawled At'] || activity.crawledAt || new Date().toISOString(),
							createdAt: activity['Created At'] || activity.createdAt || new Date().toISOString(),
							updatedAt: activity['Updated At'] || activity.updatedAt || new Date().toISOString()
						};
						
						// Only include activities that are still pending (not approved or rejected)
						const status = appActivity.approvalStatus?.toLowerCase() || 'pending';
						if (status === 'pending') {
							allPendingActivities.push(appActivity);
							console.log(`  ✅ Loaded pending activity: ${appActivity.title?.en || appActivity.title?.fr || appActivity.id}`);
						} else {
							console.log(`  ⏭️  Skipped ${status} activity: ${appActivity.title?.en || appActivity.title?.fr || appActivity.id}`);
						}
					} else {
						console.log(`  ⚠️  Row ${i + 1} in "${sheetName}" has no ID, skipping`);
					}
				}
				console.log(`✅ Loaded ${allPendingActivities.length - (allPendingActivities.length - (i - 1))} activities from "${sheetName}"`);
			} catch (error) {
				console.error(`❌ Error reading pending sheet ${sheetName}:`, error.message);
				console.error(`   Stack:`, error.stack);
				continue;
			}
		}
		
		// Sort by crawledAt (newest first)
		allPendingActivities.sort((a, b) => {
			const aTime = a.crawledAt || a.createdAt || '';
			const bTime = b.crawledAt || b.createdAt || '';
			return bTime.localeCompare(aTime);
		});
		
		console.log(`✅ Found ${allPendingActivities.length} pending activities from ${pendingSheets.length} pending sheets`);
		
		res.json({
			total: allPendingActivities.length,
			activities: allPendingActivities
		});
	} catch (error) {
		console.error('Failed to get pending activities:', error);
		res.status(500).json({ 
			error: 'Failed to get pending activities', 
			message: error.message 
		});
	}
});

// Approve or reject activity - reads from pending sheets, writes to main Activities sheet when approved
arrondissementCrawlerRouter.post('/approve', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const sheetId = process.env.GS_SHEET_ID;
	const { activityId, action } = req.body;
	
	if (!activityId || !action) {
		return res.status(400).json({ error: 'activityId and action required' });
	}
	
	if (action !== 'approve' && action !== 'reject') {
		return res.status(400).json({ error: 'action must be "approve" or "reject"' });
	}
	
	try {
		// Find activity in pending sheets
		const sheets = getSheetsClient();
		const spreadsheet = await sheets.spreadsheets.get({
			spreadsheetId: sheetId
		});
		
		const pendingSheets = spreadsheet.data.sheets
			.filter(sheet => /^Pending - \d{4}-\d{2}-\d{2}/.test(sheet.properties.title))
			.map(sheet => sheet.properties.title);
		
		let foundActivity = null;
		let foundSheet = null;
		
		// Search through pending sheets
		for (const sheetName of pendingSheets) {
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: `${sheetName}!A:Z`
			});
			
			const rows = response.data.values || [];
			if (rows.length <= 1) continue;
			
			const headers = rows[0];
			const idColIndex = headers.findIndex(h => h && (h.toLowerCase() === 'id' || h.toLowerCase() === 'id (uuid)'));
			
			if (idColIndex === -1) continue;
			
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				if (row[idColIndex] === activityId) {
					// Found the activity - reconstruct it
					const activity = {};
					headers.forEach((header, idx) => {
						if (header && row[idx] !== undefined && row[idx] !== '') {
							const value = row[idx];
							if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
								try {
									activity[header] = JSON.parse(value);
								} catch {
									activity[header] = value;
								}
							} else {
								activity[header] = value;
							}
						}
					});
					
					// Convert to app format
					foundActivity = {
						id: activity.id || activity.ID || activityId,
						title: {
							en: activity['Title (English)'] || activity['title_en'] || activity.title?.en || activity.title || '',
							fr: activity['Title (French)'] || activity['title_fr'] || activity.title?.fr || activity.title || ''
						},
						description: {
							en: activity['Description (English)'] || activity['description_en'] || activity.description?.en || activity.description || '',
							fr: activity['Description (French)'] || activity['description_fr'] || activity.description?.fr || activity.description || ''
						},
						categories: typeof activity.Categories === 'string' 
							? activity.Categories.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
							: (activity.categories || []),
						ageMin: parseInt(activity['Min Age'] || activity.ageMin || 0),
						ageMax: parseInt(activity['Max Age'] || activity.ageMax || 99),
						price: {
							amount: parseInt(activity['Price (€)'] || activity.price_amount || activity.price?.amount || 0),
							currency: activity.Currency || activity.currency || 'EUR'
						},
						neighborhood: activity.Neighborhood || activity.neighborhood || '',
						addresses: activity.Addresses || activity.addresses || '',
						contactEmail: activity['Contact Email'] || activity.contactEmail || '',
						contactPhone: activity['Contact Phone'] || activity.contactPhone || '',
						websiteLink: activity['Website Link'] || activity.websiteLink || '',
						images: typeof activity.Images === 'string' 
							? activity.Images.split(',').map(s => s.trim()).filter(s => s)
							: (activity.images || []),
						approvalStatus: action === 'approve' ? 'approved' : 'rejected',
						approvedAt: new Date().toISOString(),
						approvedBy: req.user.email,
						createdAt: activity['Created At'] || activity.createdAt || new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
					
					foundSheet = sheetName;
					break;
				}
			}
			
			if (foundActivity) break;
		}
		
		if (!foundActivity) {
			return res.status(404).json({ error: 'Activity not found in pending sheets' });
		}
		
		if (action === 'approve') {
			// Add to main Activities sheet
			await store.activities.create(foundActivity);
			console.log(`✅ Approved activity ${activityId} - added to main Activities sheet`);
		} else {
			// Just update the pending sheet to mark as rejected
			// Update the approval status in the pending sheet
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: `${foundSheet}!A:Z`
			});
			
			const rows = response.data.values || [];
			const headers = rows[0];
			const idColIndex = headers.findIndex(h => h && (h.toLowerCase() === 'id' || h.toLowerCase() === 'id (uuid)'));
			const statusColIndex = headers.findIndex(h => h && (h.toLowerCase().includes('approval') || h.toLowerCase().includes('status')));
			
			if (statusColIndex === -1) {
				// Add approval status column if it doesn't exist
				headers.push('Approval Status');
				const newStatusColIndex = headers.length - 1;
				rows[0] = headers;
				
				// Find the row and update it
				for (let i = 1; i < rows.length; i++) {
					if (rows[i][idColIndex] === activityId) {
						while (rows[i].length <= newStatusColIndex) {
							rows[i].push('');
						}
						rows[i][newStatusColIndex] = 'rejected';
						break;
					}
				}
			} else {
				// Update existing status column
				for (let i = 1; i < rows.length; i++) {
					if (rows[i][idColIndex] === activityId) {
						rows[i][statusColIndex] = 'rejected';
						break;
					}
				}
			}
			
			await sheets.spreadsheets.values.update({
				spreadsheetId: sheetId,
				range: `${foundSheet}!A1`,
				valueInputOption: 'RAW',
				requestBody: { values: rows }
			});
			
			console.log(`❌ Rejected activity ${activityId} - marked in pending sheet`);
		}
		
		res.json({
			success: true,
			activityId,
			status: action === 'approve' ? 'approved' : 'rejected'
		});
	} catch (error) {
		console.error('Failed to update activity:', error);
		res.status(500).json({ 
			error: 'Failed to update activity', 
			message: error.message 
		});
	}
});

// Batch approve/reject - processes multiple activities from pending sheets
arrondissementCrawlerRouter.post('/batch-approve', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const sheetId = process.env.GS_SHEET_ID;
	const { activityIds, action } = req.body;
	
	if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
		return res.status(400).json({ error: 'activityIds array required' });
	}
	
	if (action !== 'approve' && action !== 'reject') {
		return res.status(400).json({ error: 'action must be "approve" or "reject"' });
	}
	
	try {
		// Load all pending activities (reuse the pending endpoint logic)
		const sheets = getSheetsClient();
		const spreadsheet = await sheets.spreadsheets.get({
			spreadsheetId: sheetId
		});
		
		const pendingSheets = spreadsheet.data.sheets
			.filter(sheet => /^Pending - \d{4}-\d{2}-\d{2}/.test(sheet.properties.title))
			.map(sheet => sheet.properties.title);
		
		// Build a map of activityId -> activity data
		const activityMap = new Map();
		
		for (const sheetName of pendingSheets) {
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: `${sheetName}!A:Z`
			});
			
			const rows = response.data.values || [];
			if (rows.length <= 1) continue;
			
			const headers = rows[0];
			const idColIndex = headers.findIndex(h => h && (h.toLowerCase() === 'id' || h.toLowerCase() === 'id (uuid)'));
			
			if (idColIndex === -1) continue;
			
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const rowId = row[idColIndex];
				if (!rowId || !activityIds.includes(rowId)) continue;
				
				// Reconstruct activity
				const activity = {};
				headers.forEach((header, idx) => {
					if (header && row[idx] !== undefined && row[idx] !== '') {
						const value = row[idx];
						if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
							try {
								activity[header] = JSON.parse(value);
							} catch {
								activity[header] = value;
							}
						} else {
							activity[header] = value;
						}
					}
				});
				
				// Convert to app format
				const appActivity = {
					id: activity.id || activity.ID || rowId,
					title: {
						en: activity['Title (English)'] || activity['title_en'] || activity.title?.en || activity.title || '',
						fr: activity['Title (French)'] || activity['title_fr'] || activity.title?.fr || activity.title || ''
					},
					description: {
						en: activity['Description (English)'] || activity['description_en'] || activity.description?.en || activity.description || '',
						fr: activity['Description (French)'] || activity['description_fr'] || activity.description?.fr || activity.description || ''
					},
					categories: typeof activity.Categories === 'string' 
						? activity.Categories.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
						: (activity.categories || []),
					ageMin: parseInt(activity['Min Age'] || activity.ageMin || 0),
					ageMax: parseInt(activity['Max Age'] || activity.ageMax || 99),
					price: {
						amount: parseInt(activity['Price (€)'] || activity.price_amount || activity.price?.amount || 0),
						currency: activity.Currency || activity.currency || 'EUR'
					},
					neighborhood: activity.Neighborhood || activity.neighborhood || '',
					addresses: activity.Addresses || activity.addresses || '',
					contactEmail: activity['Contact Email'] || activity.contactEmail || '',
					contactPhone: activity['Contact Phone'] || activity.contactPhone || '',
					websiteLink: activity['Website Link'] || activity.websiteLink || '',
					images: typeof activity.Images === 'string' 
						? activity.Images.split(',').map(s => s.trim()).filter(s => s)
						: (activity.images || []),
					approvalStatus: action === 'approve' ? 'approved' : 'rejected',
					approvedAt: new Date().toISOString(),
					approvedBy: req.user.email,
					createdAt: activity['Created At'] || activity.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					_sheetName: sheetName,
					_rowIndex: i
				};
				
				activityMap.set(rowId, appActivity);
			}
		}
		
		// Process each activity
		const results = [];
		for (const activityId of activityIds) {
			try {
				const activity = activityMap.get(activityId);
				if (activity) {
					if (action === 'approve') {
						// Add to main Activities sheet
						await store.activities.create(activity);
						results.push({ activityId, status: 'success', message: 'Approved and added to Activities sheet' });
					} else {
						// Update pending sheet to mark as rejected
						const response = await sheets.spreadsheets.values.get({
							spreadsheetId: sheetId,
							range: `${activity._sheetName}!A:Z`
						});
						
						const rows = response.data.values || [];
						const headers = rows[0];
						const statusColIndex = headers.findIndex(h => h && (h.toLowerCase().includes('approval') || h.toLowerCase().includes('status')));
						
						if (statusColIndex === -1) {
							headers.push('Approval Status');
							rows[0] = headers;
							const newStatusColIndex = headers.length - 1;
							while (rows[activity._rowIndex].length <= newStatusColIndex) {
								rows[activity._rowIndex].push('');
							}
							rows[activity._rowIndex][newStatusColIndex] = 'rejected';
						} else {
							rows[activity._rowIndex][statusColIndex] = 'rejected';
						}
						
						await sheets.spreadsheets.values.update({
							spreadsheetId: sheetId,
							range: `${activity._sheetName}!A1`,
							valueInputOption: 'RAW',
							requestBody: { values: rows }
						});
						
						results.push({ activityId, status: 'success', message: 'Rejected and marked in pending sheet' });
					}
				} else {
					results.push({ activityId, status: 'not_found', message: 'Activity not found in pending sheets' });
				}
			} catch (error) {
				results.push({ activityId, status: 'error', error: error.message });
			}
		}
		
		res.json({
			success: true,
			action,
			processed: results.length,
			results
		});
	} catch (error) {
		console.error('Failed to batch update activities:', error);
		res.status(500).json({ 
			error: 'Failed to batch update activities', 
			message: error.message 
		});
	}
});
