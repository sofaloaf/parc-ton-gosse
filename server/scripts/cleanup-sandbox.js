/**
 * Script to clean up and format activities in sandbox sheet
 * Creates new tab with cleaned data
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSandboxSheets, getSandboxStore, isSandboxAvailable } from '../services/sandbox-sheets.js';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function cleanupAndFormat() {
	console.log('🚀 Starting sandbox cleanup and formatting...\n');
	
	// Initialize sandbox
	await initSandboxSheets();
	
	if (!isSandboxAvailable()) {
		console.error('❌ Sandbox not available. Please set GS_SANDBOX_SHEET_ID in environment variables.');
		process.exit(1);
	}
	
	const store = getSandboxStore();
	const newTabName = 'Activities Cleaned';
	const sourceTabName = 'Activities';
	
	try {
		console.log(`📖 Reading activities from "${sourceTabName}" tab...`);
		const activities = await store.activities.list();
		
		if (activities.length === 0) {
			console.error(`❌ No activities found in "${sourceTabName}" tab`);
			process.exit(1);
		}
		
		console.log(`✅ Found ${activities.length} activities\n`);
		
		// Get Google Sheets client
		console.log('🔐 Authenticating with Google Sheets...');
		const sheets = await getSheetsClient();
		const sheetId = process.env.GS_SANDBOX_SHEET_ID;
		
		// Create new tab
		console.log(`📝 Creating new tab "${newTabName}"...`);
		await createTab(sheets, sheetId, newTabName);
		console.log(`✅ Tab "${newTabName}" created\n`);
		
		// Clean and format activities
		console.log('🧹 Cleaning and formatting activities...');
		const cleanedActivities = activities.map(activity => cleanActivity(activity));
		console.log(`✅ Cleaned ${cleanedActivities.length} activities\n`);
		
		// Get headers
		const headers = getHeaders(cleanedActivities[0]);
		console.log(`📋 Using ${headers.length} columns: ${headers.slice(0, 5).join(', ')}...\n`);
		
		// Write to new tab
		console.log(`💾 Writing activities to "${newTabName}" tab...`);
		await writeActivitiesToTab(sheets, sheetId, newTabName, headers, cleanedActivities);
		console.log(`✅ Successfully wrote ${cleanedActivities.length} activities\n`);
		
		console.log('🎉 Cleanup complete!');
		console.log(`\n📊 Summary:`);
		console.log(`   - Source tab: "${sourceTabName}"`);
		console.log(`   - New tab: "${newTabName}"`);
		console.log(`   - Activities copied: ${cleanedActivities.length}`);
		console.log(`   - Columns: ${headers.length}`);
		console.log(`\n✅ All data has been cleaned and formatted!`);
		
	} catch (error) {
		console.error('❌ Error during cleanup:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Import cleaning functions from cleanup route
function cleanActivity(activity) {
	const cleaned = { ...activity };
	
	// Clean title
	if (cleaned.title) {
		if (typeof cleaned.title === 'object') {
			cleaned.title = {
				en: cleanString(cleaned.title.en),
				fr: cleanString(cleaned.title.fr)
			};
		} else {
			const title = cleanString(cleaned.title);
			cleaned.title = { en: title, fr: title };
		}
	}
	
	// Clean description
	if (cleaned.description) {
		if (typeof cleaned.description === 'object') {
			cleaned.description = {
				en: cleanString(cleaned.description.en),
				fr: cleanString(cleaned.description.fr)
			};
		} else {
			const desc = cleanString(cleaned.description);
			cleaned.description = { en: desc, fr: desc };
		}
	}
	
	// Clean categories
	if (cleaned.categories) {
		if (Array.isArray(cleaned.categories)) {
			cleaned.categories = cleaned.categories
				.map(cat => cleanString(cat))
				.filter(cat => cat.length > 0)
				.join(', ');
		} else if (typeof cleaned.categories === 'string') {
			cleaned.categories = cleaned.categories
				.split(',')
				.map(cat => cleanString(cat))
				.filter(cat => cat.length > 0)
				.join(', ');
		}
	}
	
	// Clean other fields
	if (cleaned.neighborhood) cleaned.neighborhood = cleanString(cleaned.neighborhood);
	if (cleaned.contactEmail) cleaned.contactEmail = cleanString(cleaned.contactEmail).toLowerCase().trim();
	if (cleaned.contactPhone) cleaned.contactPhone = cleanString(cleaned.contactPhone).trim();
	if (cleaned.websiteLink) cleaned.websiteLink = cleanString(cleaned.websiteLink).trim();
	if (cleaned.registrationLink) cleaned.registrationLink = cleanString(cleaned.registrationLink).trim();
	
	// Clean price
	if (cleaned.price) {
		if (typeof cleaned.price === 'object') {
			cleaned.price = {
				amount: cleanNumber(cleaned.price.amount),
				currency: cleanString(cleaned.price.currency || 'EUR').toUpperCase()
			};
		} else {
			const amount = cleanNumber(cleaned.price);
			cleaned.price = { amount, currency: 'EUR' };
		}
	}
	
	// Clean age fields
	if (cleaned.ageMin !== undefined) cleaned.ageMin = cleanNumber(cleaned.ageMin);
	if (cleaned.ageMax !== undefined) cleaned.ageMax = cleanNumber(cleaned.ageMax);
	
	// Clean images
	if (cleaned.images) {
		if (Array.isArray(cleaned.images)) {
			cleaned.images = cleaned.images
				.map(img => cleanString(img))
				.filter(img => img.length > 0)
				.join(', ');
		} else if (typeof cleaned.images === 'string') {
			cleaned.images = cleanString(cleaned.images);
		}
	}
	
	// Clean other string fields
	const stringFields = ['activityType', 'providerId', 'locationDetails', 'additionalNotes', 'schedule'];
	for (const field of stringFields) {
		if (cleaned[field]) {
			cleaned[field] = cleanString(cleaned[field]);
		}
	}
	
	return cleaned;
}

function cleanString(str) {
	if (!str) return '';
	if (typeof str !== 'string') return String(str);
	return str.trim().replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

function cleanNumber(num) {
	if (num === null || num === undefined || num === '') return null;
	const parsed = typeof num === 'number' ? num : parseFloat(String(num));
	return isNaN(parsed) ? null : parsed;
}

function getHeaders(activity) {
	return [
		'id',
		'title_en', 'title_fr',
		'description_en', 'description_fr',
		'categories',
		'activityType',
		'ageMin', 'ageMax',
		'price_amount', 'price_currency',
		'neighborhood',
		'addresses',
		'contactEmail', 'contactPhone',
		'websiteLink', 'registrationLink',
		'images',
		'schedule',
		'locationDetails',
		'providerId',
		'additionalNotes',
		'createdAt', 'updatedAt'
	];
}

async function writeActivitiesToTab(sheets, sheetId, tabName, headers, activities) {
	const rows = [headers];
	
	for (const activity of activities) {
		const row = headers.map(header => {
			if (header === 'title_en') {
				const title = activity.title;
				return (typeof title === 'object' && title !== null) ? (title.en || '') : '';
			}
			if (header === 'title_fr') {
				const title = activity.title;
				return (typeof title === 'object' && title !== null) ? (title.fr || '') : '';
			}
			if (header === 'description_en') {
				const desc = activity.description;
				return (typeof desc === 'object' && desc !== null) ? (desc.en || '') : '';
			}
			if (header === 'description_fr') {
				const desc = activity.description;
				return (typeof desc === 'object' && desc !== null) ? (desc.fr || '') : '';
			}
			if (header === 'price_amount') {
				const price = activity.price;
				if (typeof price === 'object' && price !== null) return price.amount || 0;
				if (typeof price === 'number') return price;
				return 0;
			}
			if (header === 'price_currency') {
				const price = activity.price;
				return (typeof price === 'object' && price !== null) ? (price.currency || 'EUR') : 'EUR';
			}
			
			let value = activity[header];
			if (value === null || value === undefined) return '';
			if (typeof value === 'object' && !Array.isArray(value)) {
				if (header === 'addresses' && Array.isArray(value)) {
					return value.map(addr => typeof addr === 'string' ? addr : JSON.stringify(addr)).join(' | ');
				}
				return JSON.stringify(value);
			}
			if (Array.isArray(value)) return value.join(', ');
			if (value instanceof Date) return value.toISOString();
			return String(value);
		});
		rows.push(row);
	}
	
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${tabName}!A1`,
		valueInputOption: 'RAW',
		resource: { values: rows }
	});
}

async function createTab(sheets, sheetId, tabName) {
	const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
	const exists = meta.data.sheets?.some(s => s.properties.title === tabName);
	
	if (exists) {
		throw new Error(`Tab "${tabName}" already exists`);
	}
	
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId: sheetId,
		requestBody: {
			requests: [{
				addSheet: {
					properties: { title: tabName }
				}
			}]
		}
	});
}

async function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}
	
	let processedPrivateKey = privateKey;
	if (!privateKey.includes('BEGIN PRIVATE KEY')) {
		try {
			processedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
		} catch (e) {
			processedPrivateKey = privateKey;
		}
	}
	processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
	
	const auth = new google.auth.JWT(
		serviceAccount,
		null,
		processedPrivateKey,
		['https://www.googleapis.com/auth/spreadsheets']
	);
	
	return google.sheets({ version: 'v4', auth });
}

// Run the cleanup
cleanupAndFormat().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});

