#!/usr/bin/env node
/**
 * Update Existing Activities with Website Extraction
 * 
 * Reads activities from the main activities sheet that are missing data,
 * extracts information from their websites, and updates them.
 * 
 * Usage:
 *   node server/scripts/updateExistingActivitiesWithExtraction.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { activityToSheetRow, ACTIVITIES_COLUMN_ORDER } from '../utils/sheetsFormatter.js';

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
 * Read activities from main activities sheet
 */
async function readActivities(sheets, sheetId) {
	console.log('\n📖 Reading activities from main sheet...');
	
	const activitiesSheet = 'v1763586991792_2025-11-19';
	
	try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${activitiesSheet}!A:Z`
		});
		
		const rows = response.data.values || [];
		if (rows.length < 2) {
			console.log('  ⚠️  No data found in sheet');
			return [];
		}
		
		const headers = rows[0];
		const dataRows = rows.slice(1);
		
		console.log(`  ✅ Found ${dataRows.length} activities`);
		
		// Map rows to objects
		const activities = dataRows.map((row, index) => {
			const obj = { _rowIndex: index + 2 }; // +2 because of header and 1-based index
			headers.forEach((header, colIndex) => {
				obj[header] = row[colIndex] || '';
			});
			return obj;
		});
		
		return activities;
	} catch (error) {
		console.error('  ❌ Error reading sheet:', error.message);
		throw error;
	}
}

/**
 * Check if activity needs extraction (missing data)
 */
function needsExtraction(activity) {
	const hasWebsite = activity['Website Link'] || activity['websiteLink'] || '';
	const hasEmail = activity['Contact Email'] || activity['contactEmail'] || '';
	const hasPhone = activity['Contact Phone'] || activity['contactPhone'] || '';
	const hasDescription = activity['Description EN'] || activity['Description FR'] || activity['description_en'] || activity['description_fr'] || '';
	
	// Needs extraction if has website but missing other data
	return hasWebsite && (!hasEmail || !hasPhone || !hasDescription || hasDescription.length < 50);
}

/**
 * Extract information from organization website (same as enrich script)
 */
async function extractFromWebsite(websiteUrl, orgName) {
	if (!websiteUrl) return null;
	
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);
		
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
		
		// Extract description
		let description = '';
		const metaDesc = document.querySelector('meta[name="description"]');
		if (metaDesc) {
			description = (metaDesc.getAttribute('content') || '').trim();
		}
		if (!description) {
			const ogDesc = document.querySelector('meta[property="og:description"]');
			if (ogDesc) {
				description = (ogDesc.getAttribute('content') || '').trim();
			}
		}
		if (!description) {
			const paragraphs = document.querySelectorAll('p');
			for (const p of paragraphs) {
				const text = p.textContent.trim();
				if (text.length > 50 && text.length < 1000) {
					description = text.substring(0, 500);
					break;
				}
			}
		}
		
		// Extract email
		let email = null;
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatches = html.match(emailPattern);
		if (emailMatches && emailMatches.length > 0) {
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
		
		// Extract phone
		let phone = null;
		const phonePatterns = [
			/(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g,
			/(?:\+33\s?|0)[1-9][\s\.\-]?(?:\d{2}[\s\.\-]?){4}/g,
			/0[1-9][\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}/g
		];
		for (const pattern of phonePatterns) {
			const matches = html.match(pattern);
			if (matches && matches.length > 0) {
				phone = matches[0].replace(/[\s\.\-]/g, '');
				break;
			}
		}
		
		// Extract address
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
		
		// Extract categories
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
		if (categories.length === 0) categories.push('other');
		
		return {
			description: description || null,
			email: email || null,
			phone: phone || null,
			address: address || null,
			categories: [...new Set(categories)]
		};
	} catch (error) {
		console.warn(`     ⚠️  Error extracting from ${websiteUrl}:`, error.message);
		return null;
	}
}

/**
 * Update activity in sheet
 */
async function updateActivity(sheets, sheetId, rowIndex, updates) {
	const activitiesSheet = 'v1763586991792_2025-11-19';
	
	// Find column indices
	const headerResponse = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: `${activitiesSheet}!A1:Z1`
	});
	
	const headers = headerResponse.data.values[0] || [];
	const columnMap = {};
	headers.forEach((header, index) => {
		columnMap[header] = index;
	});
	
	// Build update requests
	const updateRequests = [];
	
	if (updates.description_en && columnMap['Description EN'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Description EN'])}${rowIndex}`,
			values: [[updates.description_en]]
		});
	}
	
	if (updates.description_fr && columnMap['Description FR'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Description FR'])}${rowIndex}`,
			values: [[updates.description_fr]]
		});
	}
	
	if (updates.email && columnMap['Contact Email'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Contact Email'])}${rowIndex}`,
			values: [[`mailto:${updates.email}`]]
		});
	}
	
	if (updates.phone && columnMap['Contact Phone'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Contact Phone'])}${rowIndex}`,
			values: [[`tel:${updates.phone}`]]
		});
	}
	
	if (updates.address && columnMap['Addresses'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Addresses'])}${rowIndex}`,
			values: [[updates.address]]
		});
	}
	
	if (updates.categories && columnMap['Categories'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Categories'])}${rowIndex}`,
			values: [[updates.categories.join(', ')]]
		});
	}
	
	// Also set approval status to pending if it's currently approved
	if (columnMap['Approval Status'] !== undefined) {
		updateRequests.push({
			range: `${activitiesSheet}!${String.fromCharCode(65 + columnMap['Approval Status'])}${rowIndex}`,
			values: [['pending']]
		});
	}
	
	// Batch update
	if (updateRequests.length > 0) {
		const data = updateRequests.map(req => ({
			range: req.range,
			values: req.values
		}));
		
		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				valueInputOption: 'RAW',
				data: data
			}
		});
	}
}

/**
 * Main function
 */
async function main() {
	try {
		const sheets = getSheetsClient();
		const sheetId = process.env.GS_SHEET_ID;
		
		// Read activities
		const activities = await readActivities(sheets, sheetId);
		
		// Filter activities that need extraction
		const activitiesToUpdate = activities.filter(needsExtraction);
		
		console.log(`\n🔍 Found ${activitiesToUpdate.length} activities that need extraction`);
		
		if (activitiesToUpdate.length === 0) {
			console.log('\n✅ All activities already have complete data!');
			return;
		}
		
		// Process activities
		let processed = 0;
		let updated = 0;
		let errors = 0;
		
		for (const activity of activitiesToUpdate) {
			processed++;
			const website = activity['Website Link'] || activity['websiteLink'] || '';
			const name = activity['Title EN'] || activity['Title FR'] || activity['title_en'] || activity['title_fr'] || 'Unknown';
			
			if (!website) {
				errors++;
				continue;
			}
			
			try {
				console.log(`\n  🔍 [${processed}/${activitiesToUpdate.length}] Extracting from: ${website.substring(0, 60)}...`);
				
				const extractedInfo = await extractFromWebsite(website, name);
				
				if (extractedInfo) {
					const updates = {};
					if (extractedInfo.description) {
						updates.description_en = extractedInfo.description;
						updates.description_fr = extractedInfo.description;
					}
					if (extractedInfo.email) {
						updates.email = extractedInfo.email;
					}
					if (extractedInfo.phone) {
						updates.phone = extractedInfo.phone;
					}
					if (extractedInfo.address) {
						updates.address = extractedInfo.address;
					}
					if (extractedInfo.categories && extractedInfo.categories.length > 0) {
						updates.categories = extractedInfo.categories;
					}
					
					await updateActivity(sheets, sheetId, activity._rowIndex, updates);
					updated++;
					
					console.log(`     ✅ Updated: email=${!!updates.email}, phone=${!!updates.phone}, description=${!!updates.description_en}, address=${!!updates.address}`);
				} else {
					console.log(`     ⚠️  No data extracted`);
				}
				
				// Rate limiting
				if (processed % 10 === 0) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} catch (error) {
				errors++;
				console.warn(`     ⚠️  Error:`, error.message);
			}
		}
		
		console.log(`\n✅ Update complete:`);
		console.log(`   - Processed: ${processed}`);
		console.log(`   - Updated: ${updated}`);
		console.log(`   - Errors: ${errors}`);
		console.log(`\n⚠️  All updated activities set to 'pending' status for review`);
		
	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

// Run the script
main();

