#!/usr/bin/env node
/**
 * Paris Open Data Association Extractor
 * 
 * Extracts relevant kids' activity associations from Paris Open Data.
 * Filters by age groups (jeunes enfants, children) and activity sectors.
 * 
 * Usage:
 *   node server/scripts/extractParisOpenData.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import { google } from 'googleapis';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log(`📁 Loading environment from: ${envPath}`);
console.log(`🔍 Checking environment variables...`);
console.log(`   GS_SHEET_ID: ${process.env.GS_SHEET_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   GS_SERVICE_ACCOUNT: ${process.env.GS_SERVICE_ACCOUNT ? '✅ Set' : '❌ Missing'}`);
console.log(`   GS_PRIVATE_KEY_BASE64: ${process.env.GS_PRIVATE_KEY_BASE64 ? '✅ Set' : '❌ Missing'}`);

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
			console.log('✅ Decoded base64 private key');
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
 * Fetch associations from Paris Open Data API
 */
async function fetchParisOpenDataAssociations() {
	console.log('\n📊 Fetching associations from Paris Open Data...');
	
	const apiEndpoints = [
		// Try the official API endpoint
		'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/liste_des_associations_parisiennes/records?limit=10000',
		// Alternative format
		'https://opendata.paris.fr/api/records/1.0/search/?dataset=liste_des_associations_parisiennes&rows=10000',
		// CSV export (fallback)
		'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/liste_des_associations_parisiennes/exports/csv'
	];
	
	let associations = [];
	
	for (const endpoint of apiEndpoints) {
		try {
			console.log(`  🔍 Trying: ${endpoint}`);
			
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);
			
			const response = await fetch(endpoint, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0 (compatible; ParcTonGosse/1.0)'
				},
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				console.log(`  ⚠️  Response not OK: ${response.status}`);
				continue;
			}
			
			const contentType = response.headers.get('content-type') || '';
			
			if (contentType.includes('application/json')) {
				const data = await response.json();
				
				// Handle different API response formats
				if (data.results) {
					// Format: { results: [{ record: { fields: {...} } }] }
					associations = data.results.map(r => r.record?.fields || r.fields || r).filter(Boolean);
				} else if (data.records) {
					// Format: { records: [{ fields: {...} }] }
					associations = data.records.map(r => r.fields || r).filter(Boolean);
				} else if (Array.isArray(data)) {
					associations = data;
				} else if (data.data) {
					associations = Array.isArray(data.data) ? data.data : [];
				}
				
				if (associations.length > 0) {
					console.log(`  ✅ Successfully fetched ${associations.length} associations from JSON API`);
					break;
				}
			} else if (contentType.includes('text/csv') || endpoint.includes('.csv')) {
				// Handle CSV format
				const csvText = await response.text();
				associations = parseCSV(csvText);
				if (associations.length > 0) {
					console.log(`  ✅ Successfully parsed ${associations.length} associations from CSV`);
					break;
				}
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log(`  ⏱️  Timeout for ${endpoint}`);
			} else {
				console.warn(`  ⚠️  Failed to fetch from ${endpoint}:`, error.message);
			}
			continue;
		}
	}
	
	if (associations.length === 0) {
		throw new Error('Failed to fetch associations from any endpoint');
	}
	
	return associations;
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
	const lines = csvText.split('\n').filter(line => line.trim());
	if (lines.length < 2) return [];
	
	const parseCSVLine = (line) => {
		const result = [];
		let current = '';
		let inQuotes = false;
		
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}
		result.push(current.trim());
		return result;
	};
	
	const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
	const results = [];
	
	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
		if (values.length < headers.length) continue;
		
		const obj = {};
		headers.forEach((header, index) => {
			obj[header] = values[index] || '';
		});
		results.push(obj);
	}
	
	return results;
}

/**
 * Filter associations for kids' activities
 */
function filterKidsActivities(associations) {
	console.log(`\n🔍 Filtering ${associations.length} associations for kids' activities...`);
	
	// First, let's inspect the first few associations to see the actual field names
	if (associations.length > 0) {
		console.log(`\n📋 Sample association fields (first record):`);
		const sample = associations[0];
		console.log(`   Available fields:`, Object.keys(sample).slice(0, 20).join(', '));
		console.log(`   Sample values:`);
		Object.keys(sample).slice(0, 10).forEach(key => {
			const value = sample[key];
			if (value && typeof value === 'string' && value.length < 100) {
				console.log(`     ${key}: ${value.substring(0, 80)}`);
			}
		});
	}
	
	// Age group keywords (French)
	const kidsAgeKeywords = [
		'jeunes enfants', 'jeune enfant', 'enfants', 'enfant',
		'petits', 'petit', 'petite', 'petites',
		'jeunes', 'jeune', 'jeunesse',
		'ados', 'adolescent', 'adolescents', 'adolescente', 'adolescentes',
		'scolaire', 'scolaires',
		'crèche', 'crèches', // Daycare
		'centre de loisirs', 'centres de loisirs',
		'colonie', 'colonies', 'camp', 'camps',
		'extracurriculaire', 'extracurriculaires'
	];
	
	// Activity sector keywords
	const activitySectorKeywords = [
		'sport', 'sports', 'sportif', 'sportive',
		'activité', 'activités', 'activite', 'activites',
		'culture', 'culturel', 'culturelle', 'culturels',
		'loisir', 'loisirs',
		'éducation', 'éducatif', 'éducative',
		'art', 'arts', 'artistique', 'artistiques',
		'musique', 'musical', 'musicale',
		'danse', 'dance',
		'théâtre', 'theatre', 'théâtral',
		'arts martiaux', 'art martial',
		'gymnastique', 'natation', 'swimming',
		'club', 'clubs', 'association', 'associations',
		'cours', 'atelier', 'ateliers',
		'école', 'académie', 'cercle'
	];
	
	// Excluded terms
	const excludedTerms = [
		'senior', 'séniors', 'retraité', 'retraités',
		'adulte', 'adultes', 'adult',
		'services', 'service', 'municipalité',
		'mentions légales', 'politique de cookies'
	];
	
	let debugCount = 0;
	const filtered = associations.filter((assoc, index) => {
		// Try multiple possible field name variations
		const publicVise = (
			assoc['pv-public visé'] || 
			assoc['pv_public_vise'] || 
			assoc['public_vise'] || 
			assoc['public visé'] || 
			assoc['publicVise'] ||
			assoc['pv_public_vise'] ||
			assoc['public_vise'] ||
			assoc['public'] ||
			''
		).toString().toLowerCase();
		
		const secteursActivites = (
			assoc['sa secteurs d\'activités'] || 
			assoc['sa_secteurs_activites'] || 
			assoc['secteurs_activites'] || 
			assoc['secteurs d\'activités'] || 
			assoc['secteursActivites'] ||
			assoc['secteurs_activites'] ||
			assoc['secteurs'] ||
			assoc['activites'] ||
			''
		).toString().toLowerCase();
		
		const nom = (
			assoc['nom'] || 
			assoc['noms'] || 
			assoc['name'] || 
			assoc['association'] ||
			assoc['libelle'] ||
			''
		).toString().toLowerCase();
		
		const objet = (
			assoc['objet'] || 
			assoc['object'] || 
			assoc['description'] ||
			assoc['objet_social'] ||
			''
		).toString().toLowerCase();
		
		const combined = `${publicVise} ${secteursActivites} ${nom} ${objet}`;
		
		// Debug first few to see what we're getting
		if (index < 5 && debugCount < 5) {
			console.log(`\n  🔍 Sample ${index + 1}:`);
			console.log(`     Nom: ${nom || '(empty)'}`);
			console.log(`     Public Visé: ${publicVise || '(empty)'}`);
			console.log(`     Secteurs: ${secteursActivites || '(empty)'}`);
			console.log(`     Objet: ${objet.substring(0, 80) || '(empty)'}`);
			debugCount++;
		}
		
		// Exclude adult-only
		if (excludedTerms.some(term => combined.includes(term))) {
			return false;
		}
		
		// Must have kids age group OR activity sector OR relevant keywords in name/objet
		const hasKidsAge = kidsAgeKeywords.some(kw => publicVise.includes(kw) || combined.includes(kw));
		const hasActivitySector = activitySectorKeywords.some(kw => secteursActivites.includes(kw) || combined.includes(kw));
		
		// Also check if name or objet contains activity keywords (more lenient)
		const hasActivityInName = activitySectorKeywords.some(kw => nom.includes(kw) || objet.includes(kw));
		const hasKidsInName = kidsAgeKeywords.some(kw => nom.includes(kw) || objet.includes(kw));
		
		return hasKidsAge || hasActivitySector || hasActivityInName || hasKidsInName;
	});
	
	console.log(`  ✅ Filtered to ${filtered.length} kids' activity associations`);
	
	return filtered;
}

/**
 * Save associations to Google Sheets
 */
async function saveToGoogleSheets(associations, sheets, sheetId) {
	console.log(`\n📋 Saving ${associations.length} associations to Google Sheets...`);
	
	const sheetName = 'paris open data';
	
	// Prepare headers
	const headers = [
		'Nom',
		'Objet',
		'Public Visé',
		'Secteurs d\'Activités',
		'Adresse',
		'Code Postal',
		'Ville',
		'Site Web',
		'Email',
		'Téléphone',
		'Date de Création',
		'Source'
	];
	
	// Prepare rows
	const rows = associations.map(assoc => {
		// Handle different field names
		const nom = assoc['nom'] || assoc['noms'] || assoc['name'] || assoc['association'] || '';
		const objet = assoc['objet'] || assoc['object'] || assoc['description'] || '';
		const publicVise = assoc['pv-public visé'] || assoc['pv_public_vise'] || assoc['public_vise'] || assoc['public visé'] || assoc['publicVise'] || '';
		const secteursActivites = assoc['sa secteurs d\'activités'] || assoc['sa_secteurs_activites'] || assoc['secteurs_activites'] || assoc['secteurs d\'activités'] || assoc['secteursActivites'] || '';
		const adresse = assoc['adresse'] || assoc['address'] || assoc['adresse_siege'] || assoc['siege'] || '';
		const codePostal = assoc['code_postal'] || assoc['postal_code'] || assoc['cp'] || '';
		const ville = assoc['ville'] || assoc['city'] || 'Paris';
		const siteWeb = assoc['site_web'] || assoc['website'] || assoc['url'] || assoc['lien_site'] || '';
		const email = assoc['email'] || assoc['courriel'] || assoc['mail'] || '';
		const telephone = assoc['telephone'] || assoc['phone'] || assoc['tel'] || '';
		const dateCreation = assoc['date_creation'] || assoc['date_crea'] || assoc['created_at'] || '';
		
		return [
			nom,
			objet,
			publicVise,
			secteursActivites,
			adresse,
			codePostal,
			ville,
			siteWeb,
			email,
			telephone,
			dateCreation,
			'Paris Open Data'
		];
	});
	
	// Get or create sheet
	const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	let sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
	
	if (!sheet) {
		console.log(`  📄 Creating new sheet: "${sheetName}"`);
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				requests: [{
					addSheet: {
						properties: {
							title: sheetName,
							gridProperties: { rowCount: Math.max(1000, rows.length + 100), columnCount: headers.length }
						}
					}
				}]
			}
		});
	} else {
		console.log(`  📄 Using existing sheet: "${sheetName}"`);
		// Clear existing data (optional - comment out if you want to append)
		// await sheets.spreadsheets.values.clear({
		// 	spreadsheetId: sheetId,
		// 	range: `${sheetName}!A:Z`
		// });
	}
	
	// Write headers
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${sheetName}!A1`,
		valueInputOption: 'RAW',
		requestBody: { values: [headers] }
	});
	
	// Write data
	if (rows.length > 0) {
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: `${sheetName}!A2`,
			valueInputOption: 'RAW',
			requestBody: { values: rows }
		});
	}
	
	// Get sheet ID for URL
	const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	const updatedSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === sheetName);
	const sheetGid = updatedSheet?.properties?.sheetId || '';
	
	console.log(`\n✅ Saved ${rows.length} associations to Google Sheets`);
	console.log(`📋 Sheet name: "${sheetName}"`);
	console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${sheetGid}`);
}

/**
 * Main function
 */
async function main() {
	try {
		// Initialize Google Sheets client
		const sheets = getSheetsClient();
		const sheetId = process.env.GS_SHEET_ID;
		
		// Fetch associations
		const allAssociations = await fetchParisOpenDataAssociations();
		
		// Filter for kids' activities
		const kidsAssociations = filterKidsActivities(allAssociations);
		
		// Save to Google Sheets
		await saveToGoogleSheets(kidsAssociations, sheets, sheetId);
		
		console.log('\n✅ Extraction completed successfully!');
		
	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

// Run the script
main();

