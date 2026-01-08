#!/usr/bin/env node
/**
 * Enrich Paris Open Data Activities with Website Information
 * 
 * Reads organizations from "paris open data" sheet, searches for their websites,
 * extracts detailed information, and saves as approved activities.
 * 
 * Usage:
 *   node server/scripts/enrichParisOpenDataActivities.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { ACTIVITIES_COLUMN_ORDER, getHeaders } from '../utils/sheetsFormatter.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log(`📁 Loading environment from: ${envPath}`);

if (!process.env.GS_SHEET_ID || !process.env.GS_SERVICE_ACCOUNT) {
	console.error('❌ Missing required environment variables');
	process.exit(1);
}

/**
 * Get Google Sheets client
 */
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	let privateKey = process.env.GS_PRIVATE_KEY;
	
	if (!privateKey && process.env.GS_PRIVATE_KEY_BASE64) {
		try {
			privateKey = Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
		} catch (error) {
			console.error('❌ Failed to decode base64 private key:', error.message);
			process.exit(1);
		}
	}
	
	if (!privateKey) {
		console.error('❌ GS_PRIVATE_KEY or GS_PRIVATE_KEY_BASE64 is required');
		process.exit(1);
	}
	
	const auth = new google.auth.JWT({
		email: serviceAccount,
		key: privateKey.replace(/\\n/g, '\n'),
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});
	
	return google.sheets({ version: 'v4', auth });
}

/**
 * Read organizations from "paris open data" sheet
 */
async function readParisOpenData(sheets, sheetId) {
	console.log('\n📖 Reading from "paris open data" sheet...');
	
	try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: 'paris open data!A:L'
		});
		
		const rows = response.data.values || [];
		if (rows.length < 2) {
			console.log('  ⚠️  No data found in sheet');
			return [];
		}
		
		const headers = rows[0];
		const dataRows = rows.slice(1);
		
		console.log(`  ✅ Found ${dataRows.length} organizations`);
		
		const organizations = dataRows.map(row => {
			const obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || '';
			});
			return obj;
		});
		
		return organizations;
	} catch (error) {
		console.error('  ❌ Error reading sheet:', error.message);
		throw error;
	}
}

/**
 * Get organization website (from sheet or search)
 */
async function getOrganizationWebsite(orgName, existingWebsite = null, categories = [], activityType = '', address = '') {
	// If website already exists in sheet, use it
	if (existingWebsite) {
		// Clean up the website URL
		let website = existingWebsite.trim();
		if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
			website = `https://${website}`;
		}
		if (website && (website.startsWith('http://') || website.startsWith('https://'))) {
			return website;
		}
	}
	
	// Only search if no website provided AND Google Custom Search is configured
	if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX) {
		// No API configured and no website in sheet - return null
		return null;
	}
	
	// Build flexible search queries (try multiple strategies, from specific to general)
	// Strategy 1: Organization name + Paris + activity type/category (most specific)
	// Strategy 2: Organization name + Paris (medium specificity)
	// Strategy 3: Organization name only (most general)
	
	const searchStrategies = [];
	
	// Strategy 1: Most specific
	let queryParts1 = [orgName]; // No quotes - allow partial matches
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts1.push(arrMatch[0]);
		}
	}
	if (activityType) {
		queryParts1.push(activityType);
	} else if (categories && categories.length > 0) {
		queryParts1.push(categories[0]);
	}
	queryParts1.push('Paris');
	searchStrategies.push(queryParts1.join(' '));
	
	// Strategy 2: Medium specificity
	let queryParts2 = [orgName];
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts2.push(arrMatch[0]);
		}
	}
	queryParts2.push('Paris');
	searchStrategies.push(queryParts2.join(' '));
	
	// Strategy 3: Most general (organization name only)
	searchStrategies.push(orgName);
	
	// Try each strategy until we find a good match
	for (let strategyIndex = 0; strategyIndex < searchStrategies.length; strategyIndex++) {
		const query = searchStrategies[strategyIndex];
		try {
			const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}&num=10`;
			
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000);
			
			const response = await fetch(searchUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0' },
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				continue; // Try next strategy
			}
			
			const data = await response.json();
			const items = data.items || [];
			
			if (items.length > 0) {
				// Validate results - check if title/snippet mentions organization name
				// This allows finding websites even if domain doesn't match name exactly
				const orgNameLower = orgName.toLowerCase();
				const orgNameWords = orgNameLower.split(/\s+/).filter(w => w.length > 2); // Filter out short words
				
				for (const item of items) {
					const title = (item.title || '').toLowerCase();
					const snippet = (item.snippet || '').toLowerCase();
					const link = item.link || '';
					
					// Skip obvious non-organization pages
					if (link.includes('facebook.com') || 
					    link.includes('linkedin.com') || 
					    link.includes('wikipedia.org') ||
					    link.includes('youtube.com') ||
					    link.includes('twitter.com') ||
					    link.includes('instagram.com')) {
						continue;
					}
					
					// Check if title or snippet contains significant words from organization name
					const titleSnippet = `${title} ${snippet}`;
					const matchingWords = orgNameWords.filter(word => titleSnippet.includes(word));
					
					// If at least 2 significant words match, or if it's a short name and 1 word matches
					if (matchingWords.length >= Math.min(2, orgNameWords.length) || 
					    (orgNameWords.length <= 2 && matchingWords.length >= 1)) {
						console.log(`     ✅ Found website via strategy ${strategyIndex + 1}: ${link} (matched: ${matchingWords.join(', ')})`);
						return link;
					}
				}
				
				// If no validated result, return first non-social-media result
				for (const item of items) {
					const link = item.link || '';
					if (!link.includes('facebook.com') && 
					    !link.includes('linkedin.com') && 
					    !link.includes('wikipedia.org') &&
					    !link.includes('youtube.com') &&
					    !link.includes('twitter.com') &&
					    !link.includes('instagram.com')) {
						console.log(`     ✅ Found website via strategy ${strategyIndex + 1} (fallback): ${link}`);
						return link;
					}
				}
				
				// Last resort: return first result
				if (items[0] && items[0].link) {
					console.log(`     ✅ Found website via strategy ${strategyIndex + 1} (last resort): ${items[0].link}`);
					return items[0].link;
				}
			}
		} catch (error) {
			// Try next strategy
			continue;
		}
	}
	
	console.log(`     ⚠️  No website found after trying ${searchStrategies.length} search strategies`);
	
	return null;
}

/**
 * Extract information from organization website (including registration link)
 */
async function extractFromWebsite(websiteUrl, orgName) {
	if (!websiteUrl) return null;
	
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
		
		const response = await fetch(websiteUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
			},
			signal: controller.signal,
			redirect: 'follow'
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			console.warn(`     ⚠️  HTTP ${response.status} for ${websiteUrl}`);
			return null;
		}
		
		const html = await response.text();
		if (!html || html.length < 100) {
			console.warn(`     ⚠️  Empty or very short HTML for ${websiteUrl}`);
			return null;
		}
		
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		// Extract description (meta description or first paragraph)
		let description = '';
		const metaDesc = document.querySelector('meta[name="description"]');
		if (metaDesc) {
			description = (metaDesc.getAttribute('content') || '').trim();
		}
		if (!description) {
			// Try Open Graph description
			const ogDesc = document.querySelector('meta[property="og:description"]');
			if (ogDesc) {
				description = (ogDesc.getAttribute('content') || '').trim();
			}
		}
		if (!description) {
			// Try first few paragraphs
			const paragraphs = document.querySelectorAll('p');
			for (const p of paragraphs) {
				const text = p.textContent.trim();
				if (text.length > 50 && text.length < 1000) {
					description = text.substring(0, 500);
					break;
				}
			}
		}
		
		// Extract email (look in multiple places)
		let email = null;
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatches = html.match(emailPattern);
		if (emailMatches && emailMatches.length > 0) {
			// Filter out common non-contact emails
			const filtered = emailMatches.filter(e => 
				!e.includes('example.com') && 
				!e.includes('test.com') &&
				!e.includes('noreply') &&
				!e.includes('no-reply')
			);
			if (filtered.length > 0) {
				email = filtered[0];
			}
		}
		
		// Extract phone (look in multiple formats)
		let phone = null;
		const phonePatterns = [
			/(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g, // French format
			/(?:\+33\s?|0)[1-9][\s\.\-]?(?:\d{2}[\s\.\-]?){4}/g, // With spaces/dots/dashes
			/0[1-9][\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}/g // Standard format
		];
		for (const pattern of phonePatterns) {
			const matches = html.match(pattern);
			if (matches && matches.length > 0) {
				phone = matches[0].replace(/[\s\.\-]/g, ''); // Clean up
				break;
			}
		}
		
		// Extract address (look for common patterns)
		let address = null;
		const addressPatterns = [
			/(\d+\s+[^,\n<]{10,80}(?:,\s*)?(?:750\d{2})?\s*PARIS?)/i,
			/(\d+\s+[^,\n<]{10,80}(?:,\s*)?(?:750\d{2}))/i,
			/(?:adresse|address)[:\s]+([0-9]+\s+[^,\n<]{10,80}(?:,\s*)?(?:750\d{2})?)/i
		];
		for (const pattern of addressPatterns) {
			const match = html.match(pattern);
			if (match) {
				address = match[1].trim();
				break;
			}
		}
		
		// Extract registration link
		let registrationLink = null;
		const registrationKeywords = [
			'inscription', 'inscrire', 'registration', 'register', 'adhesion', 'adhérer',
			's\'inscrire', 'sinscrire', 'inscription en ligne', 'inscription en ligne',
			'formulaire', 'formulaire d\'inscription', 'formulaire inscription'
		];
		
		// Look for links with registration keywords in text or URL
		const links = document.querySelectorAll('a[href]');
		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const text = (link.textContent || '').toLowerCase().trim();
			const hrefLower = href.toLowerCase();
			
			// Check if link text or URL contains registration keywords
			const hasKeyword = registrationKeywords.some(keyword => 
				text.includes(keyword) || hrefLower.includes(keyword)
			);
			
			if (hasKeyword) {
				// Make absolute URL if relative
				if (href.startsWith('/')) {
					const baseUrl = new URL(websiteUrl);
					registrationLink = `${baseUrl.origin}${href}`;
				} else if (href.startsWith('http://') || href.startsWith('https://')) {
					registrationLink = href;
				} else {
					const baseUrl = new URL(websiteUrl);
					registrationLink = `${baseUrl.origin}/${href}`;
				}
				break;
			}
		}
		
		// If no link found, look for forms with action URLs
		if (!registrationLink) {
			const forms = document.querySelectorAll('form[action]');
			for (const form of forms) {
				const action = form.getAttribute('action') || '';
				const formText = (form.textContent || '').toLowerCase();
				
				if (registrationKeywords.some(keyword => formText.includes(keyword))) {
					if (action.startsWith('/')) {
						const baseUrl = new URL(websiteUrl);
						registrationLink = `${baseUrl.origin}${action}`;
					} else if (action.startsWith('http://') || action.startsWith('https://')) {
						registrationLink = action;
					} else {
						const baseUrl = new URL(websiteUrl);
						registrationLink = `${baseUrl.origin}/${action}`;
					}
					break;
				}
			}
		}
		
		// Extract categories from content
		const categories = [];
		const content = html.toLowerCase();
		if (content.includes('sport') || content.includes('sportif')) categories.push('sports');
		if (content.includes('musique') || content.includes('music')) categories.push('music');
		if (content.includes('danse') || content.includes('dance')) categories.push('dance');
		if (content.includes('théâtre') || content.includes('theatre') || content.includes('théatre')) categories.push('theater');
		if (content.includes('art') && !content.includes('martial')) categories.push('arts');
		if (content.includes('arts martiaux') || content.includes('art martial')) categories.push('martial-arts');
		if (content.includes('gymnastique') || content.includes('gym')) categories.push('sports');
		if (content.includes('natation') || content.includes('swimming') || content.includes('piscine')) categories.push('sports');
		if (content.includes('football') || content.includes('soccer')) categories.push('sports');
		if (content.includes('basket') || content.includes('basketball')) categories.push('sports');
		if (content.includes('tennis')) categories.push('sports');
		if (categories.length === 0) categories.push('other');
		
		return {
			description: description || null,
			email: email || null,
			phone: phone || null,
			address: address || null,
			registrationLink: registrationLink || null,
			categories: [...new Set(categories)] // Remove duplicates
		};
	} catch (error) {
		console.warn(`     ⚠️  Error extracting from ${websiteUrl}:`, error.message);
		return null;
	}
}

/**
 * Get existing activity names to avoid duplicates
 */
async function getExistingActivityNames(sheets, sheetId) {
	const existingNames = new Set();
	
	try {
		const activitiesSheet = 'v1763586991792_2025-11-19';
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${activitiesSheet}!B:C`
		}).catch(() => ({ data: { values: [] } }));
		
		const rows = response.data.values || [];
		rows.slice(1).forEach(row => {
			if (row[0]) existingNames.add(row[0].toLowerCase().trim());
			if (row[1]) existingNames.add(row[1].toLowerCase().trim());
		});
		
		console.log(`  ✅ Found ${existingNames.size} existing activity names`);
	} catch (error) {
		console.warn('  ⚠️  Could not load existing activities:', error.message);
	}
	
	return existingNames;
}

/**
 * Save activities to pending sheet, focusing only on columns N, O, P, Q
 * (contactEmail, contactPhone, websiteLink, registrationLink)
 */
async function saveToPendingSheet(sheets, sheetId, activities) {
	console.log(`\n📋 Saving ${activities.length} activities to pending sheet (columns N, O, P, Q only)...`);
	
	const pendingSheetName = 'Pending - 2026-01-06 - paris-open-data-import';
	
	// Get or create sheet
	const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	let sheet = spreadsheet.data.sheets.find(s => s.properties.title === pendingSheetName);
	
	if (!sheet) {
		console.log(`  📄 Creating new sheet: "${pendingSheetName}"`);
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				requests: [{
					addSheet: {
						properties: {
							title: pendingSheetName,
							gridProperties: { rowCount: Math.max(1000, activities.length + 100), columnCount: ACTIVITIES_COLUMN_ORDER.length }
						}
					}
				}]
			}
		});
		
		// Write headers
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: `${pendingSheetName}!A1`,
			valueInputOption: 'RAW',
			requestBody: { values: [getHeaders(ACTIVITIES_COLUMN_ORDER)] }
		});
	} else {
		console.log(`  📄 Using existing sheet: "${pendingSheetName}"`);
	}
	
	// Get existing data to match by organization name
	const existingData = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: `${pendingSheetName}!A:Z`
	}).catch(() => ({ data: { values: [] } }));
	
	const existingRows = existingData.data.values || [];
	const headers = existingRows[0] || getHeaders(ACTIVITIES_COLUMN_ORDER);
	
	// Find column indices for N, O, P, Q (contactEmail, contactPhone, websiteLink, registrationLink)
	const colIndices = {
		contactEmail: ACTIVITIES_COLUMN_ORDER.indexOf('contactEmail'),
		contactPhone: ACTIVITIES_COLUMN_ORDER.indexOf('contactPhone'),
		websiteLink: ACTIVITIES_COLUMN_ORDER.indexOf('websiteLink'),
		registrationLink: ACTIVITIES_COLUMN_ORDER.indexOf('registrationLink'),
		title_fr: ACTIVITIES_COLUMN_ORDER.indexOf('title_fr'),
		title_en: ACTIVITIES_COLUMN_ORDER.indexOf('title_en')
	};
	
	// Create a map of existing rows by organization name (title_fr or title_en)
	const existingByName = new Map();
	existingRows.slice(1).forEach((row, index) => {
		const name = (row[colIndices.title_fr] || row[colIndices.title_en] || '').trim().toLowerCase();
		if (name) {
			existingByName.set(name, { rowIndex: index + 2, row }); // +2 because row 1 is header, and 0-indexed
		}
	});
	
	// Prepare updates: either update existing rows or append new ones
	const updates = [];
	const newRows = [];
	
	for (const activity of activities) {
		const activityName = ((activity.title_fr || activity.title_en || '').trim().toLowerCase());
		const existing = existingByName.get(activityName);
		
		// Format values for columns N, O, P, Q
		const contactEmail = activity.contactEmail || '';
		const contactPhone = activity.contactPhone || '';
		const websiteLink = activity.websiteLink || '';
		const registrationLink = activity.registrationLink || '';
		
		if (existing) {
			// Update existing row - only columns N, O, P, Q
			const rowNum = existing.rowIndex;
			updates.push({
				range: `${pendingSheetName}!N${rowNum}:Q${rowNum}`,
				values: [[contactEmail, contactPhone, websiteLink, registrationLink]]
			});
		} else {
			// New row - create full row but only populate N, O, P, Q
			const fullRow = new Array(ACTIVITIES_COLUMN_ORDER.length).fill('');
			
			// Set basic info for identification
			fullRow[colIndices.title_en] = activity.title_en || activity.title_fr || '';
			fullRow[colIndices.title_fr] = activity.title_fr || activity.title_en || '';
			
			// Set columns N, O, P, Q
			fullRow[colIndices.contactEmail] = contactEmail;
			fullRow[colIndices.contactPhone] = contactPhone;
			fullRow[colIndices.websiteLink] = websiteLink;
			fullRow[colIndices.registrationLink] = registrationLink;
			
			newRows.push(fullRow);
		}
	}
	
	// Batch update existing rows
	if (updates.length > 0) {
		console.log(`  🔄 Updating ${updates.length} existing rows...`);
		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				valueInputOption: 'RAW',
				data: updates
			}
		});
	}
	
	// Append new rows
	if (newRows.length > 0) {
		console.log(`  ➕ Appending ${newRows.length} new rows...`);
		const startRow = existingRows.length > 1 ? existingRows.length + 1 : 2;
		await sheets.spreadsheets.values.append({
			spreadsheetId: sheetId,
			range: `${pendingSheetName}!A${startRow}`,
			valueInputOption: 'RAW',
			requestBody: { values: newRows }
		});
	}
	
	// Get sheet ID for URL
	const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	const updatedSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === pendingSheetName);
	const sheetGid = updatedSheet?.properties?.sheetId || '';
	
	console.log(`\n✅ Saved ${activities.length} activities to Google Sheets`);
	console.log(`   - Updated: ${updates.length} existing rows`);
	console.log(`   - Added: ${newRows.length} new rows`);
	console.log(`📋 Sheet name: "${pendingSheetName}"`);
	console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheetGid}`);
}

/**
 * Main function
 */
async function main() {
	try {
		const sheets = getSheetsClient();
		const sheetId = process.env.GS_SHEET_ID;
		
		// Read organizations from Paris Open Data sheet
		const organizations = await readParisOpenData(sheets, sheetId);
		
		if (organizations.length === 0) {
			console.log('\n⚠️  No organizations found.');
			return;
		}
		
		// Get existing activity names to avoid duplicates
		const existingNames = await getExistingActivityNames(sheets, sheetId);
		
		// Process organizations
		console.log('\n🔍 Processing organizations and extracting website information...');
		const activities = [];
		let processed = 0;
		let duplicates = 0;
		let errors = 0;
		
		for (const org of organizations) {
			processed++;
			const orgName = (org['Nom'] || '').trim();
			
			if (!orgName) {
				errors++;
				continue;
			}
			
			// Check for duplicates
			const nameLower = orgName.toLowerCase().trim();
			if (existingNames.has(nameLower)) {
				duplicates++;
				if (processed % 100 === 0) {
					console.log(`  ⏳ Processed ${processed}/${organizations.length} (${duplicates} duplicates, ${errors} errors, ${activities.length} new)`);
				}
				continue;
			}
			
			try {
				// Get categories and activity type for better search
				const secteurs = (org['Secteurs d\'Activités'] || '').split(';').map(s => s.trim()).filter(Boolean);
				const activityType = secteurs[0] || '';
				const categories = secteurs;
				const address = org['Adresse'] || '';
				const codePostal = org['Code Postal'] || '';
				
				// Build full address for arrondissement extraction
				const fullAddress = [address, codePostal].filter(Boolean).join(' ');
				
				// Get website (from sheet or search)
				const hadWebsiteInSheet = !!(org['Site Web'] && org['Site Web'].trim());
				const website = await getOrganizationWebsite(orgName, org['Site Web'], categories, activityType, fullAddress);
				
				// Log if website was found via search
				if (website && !hadWebsiteInSheet) {
					if (processed % 10 === 0) {
						console.log(`  🔍 Found website via search for "${orgName}": ${website.substring(0, 60)}...`);
					}
				}
				
				// Extract information from website
				let extractedInfo = null;
				if (website) {
					if (processed % 10 === 0) {
						console.log(`  🔍 Extracting from website: ${website.substring(0, 60)}...`);
					}
					extractedInfo = await extractFromWebsite(website, orgName);
					
					if (extractedInfo) {
						if (processed % 10 === 0) {
							console.log(`     ✅ Extracted: email=${!!extractedInfo.email}, phone=${!!extractedInfo.phone}, registration=${!!extractedInfo.registrationLink}, description=${!!extractedInfo.description}`);
						}
					} else {
						if (processed % 10 === 0) {
							console.log(`     ⚠️  No data extracted from website`);
						}
					}
				} else {
					if (processed % 10 === 0) {
						console.log(`  ⚠️  No website found for: ${orgName}`);
					}
				}
				
				// Convert to activity (minimal - only what we need for columns N, O, P, Q)
				const activity = {
					title_en: orgName,
					title_fr: orgName,
					contactEmail: extractedInfo?.email ? `mailto:${extractedInfo.email}` : '',
					contactPhone: extractedInfo?.phone ? `tel:${extractedInfo.phone}` : '',
					websiteLink: website || '',
					registrationLink: extractedInfo?.registrationLink || ''
				};
				
				activities.push(activity);
				existingNames.add(nameLower);
				
				// Add delay to avoid rate limiting
				if (processed % 10 === 0) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
				
				if (processed % 50 === 0) {
					console.log(`  ⏳ Processed ${processed}/${organizations.length} (${duplicates} duplicates, ${errors} errors, ${activities.length} new)`);
				}
			} catch (error) {
				errors++;
				console.warn(`  ⚠️  Error processing ${orgName}:`, error.message);
			}
		}
		
		console.log(`\n✅ Processing complete:`);
		console.log(`   - Total processed: ${processed}`);
		console.log(`   - New activities: ${activities.length}`);
		console.log(`   - Duplicates: ${duplicates}`);
		console.log(`   - Errors: ${errors}`);
		
		// Save to pending sheet
		if (activities.length > 0) {
			await saveToPendingSheet(sheets, sheetId, activities);
		} else {
			console.log('\n⚠️  No new activities to save (all are duplicates or had errors)');
		}
		
		console.log('\n✅ Enrichment completed successfully!');
		
	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

// Run the script
main();

