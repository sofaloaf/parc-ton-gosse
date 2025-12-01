import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

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
	'19e': '75019'
};

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
		const mairieUrl = `https://mairie${arrondissement.replace('er', '').replace('e', '')}.paris.fr/recherche/activites?arrondissements=${postalCode}`;
		console.log(`🔍 Searching mairie activities: ${mairieUrl}`);
		
		const response = await fetch(mairieUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
			},
			timeout: 15000
		});

		if (!response.ok) {
			console.warn(`Mairie search failed for ${arrondissement}: HTTP ${response.status}`);
			return activities;
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Find activity links - try multiple selectors for mairie pages
		// Paris mairie pages typically have links in various formats
		const activitySelectors = [
			'a[href*="/activites/"]',
			'a[href*="/activite/"]',
			'a[href*="/activites"]',
			'a[href*="activites"]',
			'.activity-link',
			'.activite-link',
			'article a',
			'.result-item a',
			'.activity-item a',
			'.search-result a',
			'[class*="result"] a',
			'[class*="activity"] a',
			'[class*="activite"] a'
		];

		const activityLinks = new Set();
		const baseUrl = `https://mairie${arrondissement.replace('er', '').replace('e', '')}.paris.fr`;
		
		for (const selector of activitySelectors) {
			const links = document.querySelectorAll(selector);
			for (const link of links) {
				const href = link.getAttribute('href');
				if (!href) continue;
				
				// Check if it's an activity-related link
				const isActivityLink = href.includes('activite') || 
				                     href.includes('activites') ||
				                     link.textContent?.toLowerCase().includes('activité') ||
				                     link.textContent?.toLowerCase().includes('activite');
				
				if (isActivityLink) {
					// Make absolute URL if relative
					let fullUrl = href;
					if (href.startsWith('/')) {
						fullUrl = `${baseUrl}${href}`;
					} else if (!href.startsWith('http')) {
						fullUrl = `${baseUrl}/${href}`;
					}
					// Only add if it's a valid URL and not already in set
					if (fullUrl.startsWith('http') && !activityLinks.has(fullUrl)) {
						activityLinks.add(fullUrl);
					}
				}
			}
		}

		// Also search for activity links in the page text/HTML directly
		const activityUrlPattern = /https?:\/\/mairie\d+\.paris\.fr\/[^"'\s]*activit[^"'\s]*/gi;
		const urlMatches = html.match(activityUrlPattern);
		if (urlMatches) {
			for (const url of urlMatches) {
				activityLinks.add(url);
			}
		}

		console.log(`📋 Found ${activityLinks.size} activity links on mairie page`);

		// Visit each activity page to extract organization info
		for (const activityUrl of Array.from(activityLinks).slice(0, 20)) { // Limit to 20 per arrondissement
			try {
				const orgInfo = await extractOrganizationFromMairiePage(activityUrl, arrondissement);
				if (orgInfo && orgInfo.website) {
					activities.push(orgInfo);
				}
				// Add delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 2000));
			} catch (error) {
				console.error(`Error extracting from ${activityUrl}:`, error.message);
				continue;
			}
		}
	} catch (error) {
		console.error(`Error searching mairie for ${arrondissement}:`, error);
	}
	
	return activities;
}

// Extract organization information from mairie activity page
async function extractOrganizationFromMairiePage(activityUrl, arrondissement) {
	try {
		const response = await fetch(activityUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
			},
			timeout: 10000
		});

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

		// Extract organization website - look for common patterns
		let orgWebsite = null;
		let orgName = title;

		// Look for website links in various formats
		const websiteSelectors = [
			'a[href*="http"]:not([href*="mairie"]):not([href*="paris.fr"])',
			'a[href^="http"]',
			'.website',
			'.site-web',
			'[class*="website"]',
			'[class*="site"]'
		];

		for (const selector of websiteSelectors) {
			const links = document.querySelectorAll(selector);
			for (const link of links) {
				const href = link.getAttribute('href');
				if (href && href.startsWith('http') && 
				    !href.includes('mairie') && 
				    !href.includes('paris.fr') &&
				    !href.includes('facebook.com') &&
				    !href.includes('instagram.com')) {
					orgWebsite = href;
					// Try to get organization name from link text
					const linkText = link.textContent?.trim();
					if (linkText && linkText.length > 3 && linkText.length < 50) {
						orgName = linkText;
					}
					break;
				}
			}
			if (orgWebsite) break;
		}

		// Also search in text content for URLs
		if (!orgWebsite) {
			const urlPattern = /https?:\/\/[^\s<>"']+/g;
			const matches = html.match(urlPattern);
			if (matches) {
				for (const url of matches) {
					if (!url.includes('mairie') && 
					    !url.includes('paris.fr') &&
					    !url.includes('facebook.com') &&
					    !url.includes('instagram.com') &&
					    !url.includes('twitter.com') &&
					    !url.includes('youtube.com')) {
						orgWebsite = url.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
						break;
					}
				}
			}
		}

		// Extract contact email if available
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = html.match(emailPattern);
		const email = emailMatch ? emailMatch.find(e => !e.includes('mairie') && !e.includes('paris.fr')) : null;

		// Extract phone number
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phoneMatch = html.match(phonePattern);
		const phone = phoneMatch ? phoneMatch[0].trim() : null;

		// Extract address
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
			// No way to contact organization, skip
			return null;
		}

		// If we have email but no website, try to construct website from email domain
		if (!orgWebsite && email) {
			const domain = email.split('@')[1];
			if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.com') && !domain.includes('hotmail.com')) {
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

// Search for organizations in a specific arrondissement
async function searchOrganizations(arrondissement, templateActivity) {
	const results = [];
	const postalCode = ARRONDISSEMENT_TO_POSTAL[arrondissement];
	
	if (!postalCode) {
		console.error(`No postal code mapping for ${arrondissement}`);
		return results;
	}

	// First, search mairie activities
	console.log(`🔍 Searching mairie activities for ${arrondissement} (${postalCode})...`);
	const mairieActivities = await searchMairieActivities(arrondissement, postalCode);
	
	for (const activity of mairieActivities) {
		if (activity.website) {
			results.push({
				name: activity.name,
				website: activity.website,
				arrondissement: arrondissement,
				categories: templateActivity?.categories || ['sport'],
				email: activity.email,
				phone: activity.phone,
				address: activity.address,
				status: 'pending'
			});
		}
	}

	console.log(`✅ Found ${results.length} organizations from mairie for ${arrondissement}`);
	
	return results;
}

// Extract data from organization website
async function extractOrganizationData(url, templateActivity) {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			},
			timeout: 10000
		});

		if (!response.ok) {
			return { error: `HTTP ${response.status}` };
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Extract data using template as reference
		const data = {
			title: null,
			description: null,
			price: null,
			ageRange: null,
			address: null,
			phone: null,
			email: null,
			images: [],
			categories: templateActivity.categories || [],
			schedule: null,
			websiteLink: url
		};

		// Extract title
		data.title = document.querySelector('meta[property="og:title"]')?.content ||
			document.querySelector('title')?.textContent?.trim() ||
			document.querySelector('h1')?.textContent?.trim();

		// Extract description
		data.description = document.querySelector('meta[property="og:description"]')?.content ||
			document.querySelector('meta[name="description"]')?.content ||
			document.querySelector('p')?.textContent?.trim();

		// Extract price (similar to existing crawler)
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
			// Find an activity from 20e as template
			templateActivity = activities.find(a => a.neighborhood === '20e') || activities[0];
		}

		// Get arrondissements to search (default to all except 20e)
		const arrondissementsToSearch = arrondissements && Array.isArray(arrondissements) 
			? arrondissements 
			: ARRONDISSEMENTS;

		const results = [];
		const pendingActivities = [];

		// Search each arrondissement
		for (const arrondissement of arrondissementsToSearch) {
			console.log(`🔍 Searching ${arrondissement}...`);
			
			// Search for organizations
			const organizations = await searchOrganizations(arrondissement, templateActivity || {});
			
			for (const org of organizations) {
				// Extract data from website
				if (org.website && org.website.startsWith('http')) {
					const extracted = await extractOrganizationData(org.website, templateActivity || {});
					
					if (extracted.error) {
						results.push({
							arrondissement,
							organization: org.name,
							website: org.website,
							status: 'error',
							error: extracted.error
						});
						continue;
					}

					// Create activity object with pending status
					const activity = {
						id: uuidv4(),
						title: {
							en: extracted.title || org.name,
							fr: extracted.title || org.name
						},
						description: {
							en: extracted.description || '',
							fr: extracted.description || ''
						},
						categories: extracted.categories || org.categories || [],
						ageMin: extracted.ageRange ? parseInt(extracted.ageRange.split('-')[0]) : (templateActivity?.ageMin || 0),
						ageMax: extracted.ageRange ? parseInt(extracted.ageRange.split('-')[1]) : (templateActivity?.ageMax || 99),
						price: extracted.price ? { amount: extracted.price, currency: 'EUR' } : (templateActivity?.price || { amount: 0, currency: 'EUR' }),
						addresses: extracted.address || '',
						contactEmail: extracted.email || '',
						contactPhone: extracted.phone || '',
						images: extracted.images || [],
						neighborhood: arrondissement,
						websiteLink: org.website,
						approvalStatus: 'pending', // Requires admin approval
						crawledAt: new Date().toISOString(),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};

					pendingActivities.push(activity);
					results.push({
						arrondissement,
						organization: org.name,
						website: org.website,
						status: 'success',
						activityId: activity.id
					});

					// Add delay to avoid rate limiting
					await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
				}
			}
		}

		// Save pending activities to Google Sheets (in a pending sheet or with approvalStatus field)
		if (pendingActivities.length > 0) {
			try {
				// Save to Activities sheet with approvalStatus = 'pending'
				// The datastore should handle this, but we'll also create a separate pending sheet for review
				const pendingSheetName = `Pending_${new Date().toISOString().split('T')[0]}`;
				
				// Create pending sheet
				await sheets.spreadsheets.batchUpdate({
					spreadsheetId: sheetId,
					requestBody: {
						requests: [{
							addSheet: {
								properties: {
									title: pendingSheetName
								}
							}
						}]
					}
				});

				// Get headers from existing activities
				const activitiesResponse = await sheets.spreadsheets.values.get({
					spreadsheetId: sheetId,
					range: 'Activities!A1:Z1'
				});
				const headers = activitiesResponse.data.values?.[0] || [
					'id', 'title', 'description', 'categories', 'ageMin', 'ageMax', 
					'price', 'addresses', 'contactEmail', 'contactPhone', 'images', 
					'neighborhood', 'websiteLink', 'approvalStatus', 'crawledAt', 'createdAt', 'updatedAt'
				];

				// Convert activities to rows
				const rows = [headers];
				pendingActivities.forEach(activity => {
					const row = headers.map(header => {
						const value = activity[header];
						if (value === null || value === undefined) return '';
						if (typeof value === 'object') return JSON.stringify(value);
						return String(value);
					});
					rows.push(row);
				});

				// Write to pending sheet
				await sheets.spreadsheets.values.update({
					spreadsheetId: sheetId,
					range: `${pendingSheetName}!A1`,
					valueInputOption: 'RAW',
					requestBody: {
						values: rows
					}
				});

				// Also save to main Activities sheet with approvalStatus = 'pending'
				// This allows the admin to see them in the approval interface
				for (const activity of pendingActivities) {
					try {
						await store.activities.create(activity);
					} catch (e) {
						console.error(`Failed to save activity ${activity.id}:`, e);
					}
				}

				res.json({
					success: true,
					pendingSheet: pendingSheetName,
					summary: {
						total: results.length,
						successful: results.filter(r => r.status === 'success').length,
						errors: results.filter(r => r.status === 'error').length,
						pendingActivities: pendingActivities.length
					},
					results: results.slice(0, 20), // Return first 20 results
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

// Get pending activities for approval
arrondissementCrawlerRouter.get('/pending', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	
	try {
		const allActivities = await store.activities.list();
		const pending = allActivities.filter(a => a.approvalStatus === 'pending');
		
		res.json({
			total: pending.length,
			activities: pending
		});
	} catch (error) {
		console.error('Failed to get pending activities:', error);
		res.status(500).json({ 
			error: 'Failed to get pending activities', 
			message: error.message 
		});
	}
});

// Approve or reject activity
arrondissementCrawlerRouter.post('/approve', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const { activityId, action } = req.body; // action: 'approve' or 'reject'
	
	if (!activityId || !action) {
		return res.status(400).json({ error: 'activityId and action required' });
	}
	
	if (action !== 'approve' && action !== 'reject') {
		return res.status(400).json({ error: 'action must be "approve" or "reject"' });
	}
	
	try {
		const activity = await store.activities.get(activityId);
		if (!activity) {
			return res.status(404).json({ error: 'Activity not found' });
		}
		
		await store.activities.update(activityId, {
			approvalStatus: action === 'approve' ? 'approved' : 'rejected',
			approvedAt: new Date().toISOString(),
			approvedBy: req.user.email
		});
		
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

// Batch approve/reject
arrondissementCrawlerRouter.post('/batch-approve', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const { activityIds, action } = req.body;
	
	if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
		return res.status(400).json({ error: 'activityIds array required' });
	}
	
	if (action !== 'approve' && action !== 'reject') {
		return res.status(400).json({ error: 'action must be "approve" or "reject"' });
	}
	
	try {
		const results = [];
		for (const activityId of activityIds) {
			try {
				const activity = await store.activities.get(activityId);
				if (activity) {
					await store.activities.update(activityId, {
						approvalStatus: action === 'approve' ? 'approved' : 'rejected',
						approvedAt: new Date().toISOString(),
						approvedBy: req.user.email
					});
					results.push({ activityId, status: 'success' });
				} else {
					results.push({ activityId, status: 'not_found' });
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

