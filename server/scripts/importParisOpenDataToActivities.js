#!/usr/bin/env node
/**
 * Import Paris Open Data Associations to Activities
 * 
 * Reads associations from "paris open data" sheet and imports them
 * as pending activities for review.
 * 
 * Usage:
 *   node server/scripts/importParisOpenDataToActivities.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { generateTabName, activityToSheetRow, ACTIVITIES_COLUMN_ORDER, getHeaders } from '../utils/sheetsFormatter.js';

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
	
	// Handle base64-encoded private key
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
 * Read associations from "paris open data" sheet
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
		
		console.log(`  ✅ Found ${dataRows.length} associations`);
		
		// Map rows to objects
		const associations = dataRows.map(row => {
			const obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || '';
			});
			return obj;
		});
		
		return associations;
	} catch (error) {
		console.error('  ❌ Error reading sheet:', error.message);
		throw error;
	}
}

/**
 * Convert association to activity format
 */
function convertToActivity(assoc) {
	const nom = (assoc['Nom'] || '').trim();
	if (!nom) return null;
	
	// Extract age range from "Public Visé" if possible
	let ageMin = 0;
	let ageMax = 99;
	const publicVise = (assoc['Public Visé'] || '').toLowerCase();
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
	
	// Determine categories from activity sectors
	const secteurs = (assoc['Secteurs d\'Activités'] || '').toLowerCase();
	const categories = [];
	if (secteurs.includes('sport')) categories.push('sports');
	if (secteurs.includes('culture') || secteurs.includes('art')) categories.push('arts');
	if (secteurs.includes('musique')) categories.push('music');
	if (secteurs.includes('danse')) categories.push('dance');
	if (secteurs.includes('théâtre') || secteurs.includes('theatre')) categories.push('theater');
	if (secteurs.includes('éducation') || secteurs.includes('education')) categories.push('education');
	if (categories.length === 0) categories.push('other');
	
	// Build description
	const objet = assoc['Objet'] || '';
	const description = objet || `Association ${nom} - ${secteurs}`;
	
	// Format address
	const adresse = assoc['Adresse'] || '';
	const codePostal = assoc['Code Postal'] || '';
	const ville = assoc['Ville'] || 'Paris';
	const fullAddress = [adresse, codePostal, ville].filter(Boolean).join(', ');
	
	// Format website
	let websiteLink = assoc['Site Web'] || '';
	if (websiteLink && !websiteLink.startsWith('http://') && !websiteLink.startsWith('https://')) {
		websiteLink = `https://${websiteLink}`;
	}
	
	// Format email
	const email = assoc['Email'] || '';
	const emailLink = email ? `mailto:${email}` : null;
	
	// Format phone
	const phone = assoc['Téléphone'] || '';
	const phoneLink = phone ? `tel:${phone}` : null;
	
	return {
		id: uuidv4(),
		title_en: nom,
		title_fr: nom,
		description_en: description,
		description_fr: description,
		categories: categories,
		activityType: secteurs.split(';')[0] || 'Association',
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
		additionalNotes: `Imported from Paris Open Data. Public Visé: ${assoc['Public Visé'] || 'N/A'}. Secteurs: ${secteurs || 'N/A'}`,
		approvalStatus: 'pending',
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
		// Check main activities sheet
		const activitiesSheet = 'v1763586991792_2025-11-19';
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${activitiesSheet}!B:C` // Title EN and FR columns
		}).catch(() => ({ data: { values: [] } }));
		
		const rows = response.data.values || [];
		rows.slice(1).forEach(row => {
			if (row[0]) existingNames.add(row[0].toLowerCase().trim());
			if (row[1]) existingNames.add(row[1].toLowerCase().trim());
		});
		
		// Check pending activities sheets
		const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
		const pendingSheets = spreadsheet.data.sheets
			.filter(s => s.properties.title.startsWith('Pending -'))
			.map(s => s.properties.title);
		
		for (const sheetName of pendingSheets) {
			try {
				const pendingResponse = await sheets.spreadsheets.values.get({
					spreadsheetId: sheetId,
					range: `${sheetName}!B:C`
				});
				const pendingRows = pendingResponse.data.values || [];
				pendingRows.slice(1).forEach(row => {
					if (row[0]) existingNames.add(row[0].toLowerCase().trim());
					if (row[1]) existingNames.add(row[1].toLowerCase().trim());
				});
			} catch (error) {
				// Skip if sheet doesn't exist or can't be read
			}
		}
		
		console.log(`  ✅ Found ${existingNames.size} existing activity names`);
	} catch (error) {
		console.warn('  ⚠️  Could not load existing activities:', error.message);
	}
	
	return existingNames;
}

/**
 * Save activities to pending sheet
 */
async function saveToPendingActivities(sheets, sheetId, activities) {
	console.log(`\n📋 Saving ${activities.length} activities to pending sheet...`);
	
	const finalSheetName = generateTabName('pending', 'paris-open-data-import');
	
	// Convert to sheet rows
	const rowsToSave = activities.map(activity => {
		const rowObject = activityToSheetRow(activity);
		return ACTIVITIES_COLUMN_ORDER.map(col => rowObject[col] || '');
	});
	
	// Get or create sheet
	const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	let sheet = spreadsheet.data.sheets.find(s => s.properties.title === finalSheetName);
	
	if (!sheet) {
		console.log(`  📄 Creating new sheet: "${finalSheetName}"`);
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				requests: [{
					addSheet: {
						properties: {
							title: finalSheetName,
							gridProperties: { rowCount: Math.max(1000, rowsToSave.length + 100), columnCount: ACTIVITIES_COLUMN_ORDER.length }
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
	} else {
		console.log(`  📄 Using existing sheet: "${finalSheetName}"`);
	}
	
	// Get existing rows to append
	const existingData = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: `${finalSheetName}!A:Z`
	}).catch(() => ({ data: { values: [] } }));
	
	const existingRows = existingData.data.values || [];
	const startRow = existingRows.length > 1 ? existingRows.length + 1 : 2;
	
	// Append rows
	if (rowsToSave.length > 0) {
		await sheets.spreadsheets.values.append({
			spreadsheetId: sheetId,
			range: `${finalSheetName}!A${startRow}`,
			valueInputOption: 'RAW',
			requestBody: { values: rowsToSave }
		});
	}
	
	// Get sheet ID for URL
	const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	const updatedSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === finalSheetName);
	const sheetGid = updatedSheet?.properties?.sheetId || '';
	
	console.log(`\n✅ Saved ${rowsToSave.length} activities to Google Sheets`);
	console.log(`📋 Sheet name: "${finalSheetName}"`);
	console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheetGid}`);
}

/**
 * Main function
 */
async function main() {
	try {
		const sheets = getSheetsClient();
		const sheetId = process.env.GS_SHEET_ID;
		
		// Read associations from Paris Open Data sheet
		const associations = await readParisOpenData(sheets, sheetId);
		
		if (associations.length === 0) {
			console.log('\n⚠️  No associations found. Make sure the "paris open data" sheet exists and has data.');
			return;
		}
		
		// Get existing activity names to avoid duplicates
		const existingNames = await getExistingActivityNames(sheets, sheetId);
		
		// Convert to activities and filter duplicates
		console.log('\n🔄 Converting associations to activities...');
		const activities = [];
		let duplicates = 0;
		
		for (const assoc of associations) {
			const activity = convertToActivity(assoc);
			if (!activity) continue;
			
			// Check for duplicates
			const nameLower = activity.title_en.toLowerCase().trim();
			if (existingNames.has(nameLower)) {
				duplicates++;
				continue;
			}
			
			activities.push(activity);
			existingNames.add(nameLower); // Track in this batch too
		}
		
		console.log(`  ✅ Converted ${activities.length} associations to activities`);
		if (duplicates > 0) {
			console.log(`  ⏭️  Skipped ${duplicates} duplicates`);
		}
		
		// Save to pending activities
		if (activities.length > 0) {
			await saveToPendingActivities(sheets, sheetId, activities);
		} else {
			console.log('\n⚠️  No new activities to import (all are duplicates)');
		}
		
		console.log('\n✅ Import completed successfully!');
		
	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

// Run the script
main();

