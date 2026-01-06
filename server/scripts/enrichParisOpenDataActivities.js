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
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { activityToSheetRow, ACTIVITIES_COLUMN_ORDER, getHeaders } from '../utils/sheetsFormatter.js';

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
 * Search for organization website using Google Custom Search
 */
async function searchOrganizationWebsite(orgName, existingWebsite = null) {
	// If website already exists, use it
	if (existingWebsite && existingWebsite.startsWith('http')) {
		return existingWebsite;
	}
	
	if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX) {
		console.warn('  ⚠️  Google Custom Search API not configured, skipping website search');
		return null;
	}
	
	try {
		const query = `"${orgName}" Paris association`;
		const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}&num=3`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);
		
		const response = await fetch(searchUrl, {
			headers: { 'User-Agent': 'Mozilla/5.0' },
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			return null;
		}
		
		const data = await response.json();
		const items = data.items || [];
		
		if (items.length > 0) {
			// Return the first result that looks like the organization's website
			const topResult = items[0].link;
			return topResult;
		}
	} catch (error) {
		// Silently fail
	}
	
	return null;
}

/**
 * Extract information from organization website
 */
async function extractFromWebsite(websiteUrl, orgName) {
	if (!websiteUrl) return null;
	
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);
		
		const response = await fetch(websiteUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/*;q=0.8'
			},
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) return null;
		
		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		// Extract description (meta description or first paragraph)
		let description = '';
		const metaDesc = document.querySelector('meta[name="description"]');
		if (metaDesc) {
			description = metaDesc.getAttribute('content') || '';
		}
		if (!description) {
			const firstP = document.querySelector('p');
			if (firstP) {
				description = firstP.textContent.trim().substring(0, 500);
			}
		}
		
		// Extract email
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatches = html.match(emailPattern);
		const email = emailMatches ? emailMatches[0] : null;
		
		// Extract phone
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phoneMatches = html.match(phonePattern);
		const phone = phoneMatches ? phoneMatches[0] : null;
		
		// Extract address (look for common patterns)
		const addressPatterns = [
			/(\d+\s+[^,\n]{10,80}(?:,\s*)?(?:750\d{2})?\s*PARIS?)/i,
			/(\d+\s+[^,\n]{10,80}(?:,\s*)?(?:750\d{2}))/i
		];
		let address = null;
		for (const pattern of addressPatterns) {
			const match = html.match(pattern);
			if (match) {
				address = match[1].trim();
				break;
			}
		}
		
		// Extract categories from content
		const categories = [];
		const content = html.toLowerCase();
		if (content.includes('sport') || content.includes('sportif')) categories.push('sports');
		if (content.includes('musique') || content.includes('music')) categories.push('music');
		if (content.includes('danse') || content.includes('dance')) categories.push('dance');
		if (content.includes('théâtre') || content.includes('theatre')) categories.push('theater');
		if (content.includes('art') && !content.includes('martial')) categories.push('arts');
		if (content.includes('arts martiaux')) categories.push('martial-arts');
		if (content.includes('gymnastique')) categories.push('sports');
		if (content.includes('natation') || content.includes('swimming')) categories.push('sports');
		if (categories.length === 0) categories.push('other');
		
		return {
			description,
			email,
			phone,
			address,
			categories: [...new Set(categories)] // Remove duplicates
		};
	} catch (error) {
		return null;
	}
}

/**
 * Convert organization to activity format
 */
function convertToActivity(org, extractedInfo) {
	const nom = (org['Nom'] || '').trim();
	if (!nom) return null;
	
	// Use extracted info or fallback to sheet data
	const description = extractedInfo?.description || org['Objet'] || `Association ${nom}`;
	const email = extractedInfo?.email || org['Email'] || '';
	const phone = extractedInfo?.phone || org['Téléphone'] || '';
	const address = extractedInfo?.address || org['Adresse'] || '';
	const website = org['Site Web'] || '';
	
	// Format full address
	const codePostal = org['Code Postal'] || '';
	const ville = org['Ville'] || 'Paris';
	const fullAddress = [address, codePostal, ville].filter(Boolean).join(', ');
	
	// Format website
	let websiteLink = website;
	if (websiteLink && !websiteLink.startsWith('http://') && !websiteLink.startsWith('https://')) {
		websiteLink = `https://${websiteLink}`;
	}
	
	// Format email and phone as clickable links
	const emailLink = email ? `mailto:${email}` : null;
	const phoneLink = phone ? `tel:${phone}` : null;
	
	// Extract age range from "Public Visé"
	let ageMin = 0;
	let ageMax = 99;
	const publicVise = (org['Public Visé'] || '').toLowerCase();
	if (publicVise.includes('jeunes enfants') || publicVise.includes('petits')) {
		ageMin = 0;
		ageMax = 6;
	} else if (publicVise.includes('enfants')) {
		ageMin = 6;
		ageMax = 12;
	} else if (publicVise.includes('ados') || publicVise.includes('adolescent')) {
		ageMin = 12;
		ageMax = 18;
	} else if (publicVise.includes('jeunes')) {
		ageMin = 6;
		ageMax = 18;
	}
	
	// Use extracted categories or determine from sectors
	let categories = extractedInfo?.categories || [];
	if (categories.length === 0) {
		const secteurs = (org['Secteurs d\'Activités'] || '').toLowerCase();
		if (secteurs.includes('sport')) categories.push('sports');
		if (secteurs.includes('culture') || secteurs.includes('art')) categories.push('arts');
		if (secteurs.includes('musique')) categories.push('music');
		if (secteurs.includes('danse')) categories.push('dance');
		if (secteurs.includes('théâtre') || secteurs.includes('theatre')) categories.push('theater');
		if (categories.length === 0) categories.push('other');
	}
	
	// Determine activity type
	const secteurs = (org['Secteurs d\'Activités'] || '').split(';')[0] || 'Association';
	
	return {
		id: uuidv4(),
		title_en: nom,
		title_fr: nom,
		description_en: description,
		description_fr: description,
		categories: categories,
		activityType: secteurs.trim(),
		ageMin: ageMin,
		ageMax: ageMax,
		adults: false,
		price_amount: 0,
		currency: 'eur',
		addresses: fullAddress,
		neighborhood: codePostal ? `750${codePostal.substring(3)}` : 'Paris',
		websiteLink: websiteLink || null,
		contactEmail: emailLink || null,
		contactPhone: phoneLink || null,
		disponibiliteJours: '',
		disponibiliteDates: '',
		registrationLink: null,
		images: [],
		providerId: '',
		additionalNotes: `Imported from Paris Open Data. Public Visé: ${org['Public Visé'] || 'N/A'}. Secteurs: ${org['Secteurs d\'Activités'] || 'N/A'}`,
		approvalStatus: 'approved', // All approved as requested
		crawledAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
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
 * Save activities to main activities sheet
 */
async function saveToActivitiesSheet(sheets, sheetId, activities) {
	console.log(`\n📋 Saving ${activities.length} activities to main activities sheet...`);
	
	const activitiesSheet = 'v1763586991792_2025-11-19';
	
	// Convert to sheet rows
	const rowsToSave = activities.map(activity => {
		const rowObject = activityToSheetRow(activity);
		return ACTIVITIES_COLUMN_ORDER.map(col => rowObject[col] || '');
	});
	
	// Get existing rows
	const existingData = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: `${activitiesSheet}!A:Z`
	}).catch(() => ({ data: { values: [] } }));
	
	const existingRows = existingData.data.values || [];
	const startRow = existingRows.length > 1 ? existingRows.length + 1 : 2;
	
	// Append rows
	if (rowsToSave.length > 0) {
		await sheets.spreadsheets.values.append({
			spreadsheetId: sheetId,
			range: `${activitiesSheet}!A${startRow}`,
			valueInputOption: 'RAW',
			requestBody: { values: rowsToSave }
		});
	}
	
	console.log(`\n✅ Saved ${rowsToSave.length} activities to Google Sheets`);
	console.log(`📋 Sheet name: "${activitiesSheet}"`);
	console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`);
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
				// Search for website
				const website = await searchOrganizationWebsite(orgName, org['Site Web']);
				
				// Extract information from website
				let extractedInfo = null;
				if (website) {
					extractedInfo = await extractFromWebsite(website, orgName);
					// Update org with found website
					if (website && !org['Site Web']) {
						org['Site Web'] = website;
					}
				}
				
				// Convert to activity
				const activity = convertToActivity(org, extractedInfo);
				if (activity) {
					activities.push(activity);
					existingNames.add(nameLower);
				}
				
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
		
		// Save to activities sheet
		if (activities.length > 0) {
			await saveToActivitiesSheet(sheets, sheetId, activities);
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

