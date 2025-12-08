/**
 * Sandbox Cleanup and Formatting Tools
 * Creates new tabs and cleans up data formatting
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getSandboxStore, isSandboxAvailable } from '../services/sandbox-sheets.js';
// googleapis will be imported dynamically

export const sandboxCleanupRouter = express.Router();

// All routes require admin authentication
sandboxCleanupRouter.use(requireAuth('admin'));

/**
 * Check sandbox status and configuration
 * GET /api/sandbox/cleanup/status
 */
sandboxCleanupRouter.get('/status', async (req, res) => {
	const sandboxSheetId = process.env.GS_SANDBOX_SHEET_ID;
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY;
	
	const status = {
		configured: !!sandboxSheetId,
		available: isSandboxAvailable(),
		sheetId: sandboxSheetId || 'NOT SET',
		hasServiceAccount: !!serviceAccount,
		hasPrivateKey: !!privateKey,
		message: ''
	};
	
	if (!sandboxSheetId) {
		status.message = 'GS_SANDBOX_SHEET_ID not set. Set it in Railway backend variables.';
	} else if (!isSandboxAvailable()) {
		status.message = 'Sandbox sheet ID is set but not initialized. Check service account access and backend logs.';
	} else {
		status.message = 'Sandbox is ready to use.';
	}
	
	res.json(status);
});

/**
 * Create new tab and copy activities with cleaned formatting
 * POST /api/sandbox/cleanup/copy-and-format
 */
sandboxCleanupRouter.post('/copy-and-format', async (req, res) => {
	// Set a timeout for the entire operation (2 minutes)
	const timeout = setTimeout(() => {
		if (!res.headersSent) {
			res.status(504).json({
				error: 'Operation timeout',
				message: 'The cleanup operation took too long. This might be due to a large number of activities or API rate limits.',
				success: false
			});
		}
	}, 120000); // 2 minutes
	
	try {
		// Try to initialize sandbox if not already available
		if (!isSandboxAvailable()) {
			console.log('🔄 Sandbox not initialized, attempting to initialize...');
			const { initSandboxSheets } = await import('../services/sandbox-sheets.js');
			await initSandboxSheets();
		}
		
		if (!isSandboxAvailable()) {
			clearTimeout(timeout);
			const sandboxSheetId = process.env.GS_SANDBOX_SHEET_ID;
			return res.status(503).json({ 
				error: 'Sandbox not available',
				message: sandboxSheetId 
					? 'Sandbox sheet ID is set but initialization failed. Check service account access and backend logs.'
					: 'GS_SANDBOX_SHEET_ID not configured. Please set it in Railway backend variables.',
				hint: sandboxSheetId 
					? 'Verify the service account has Editor access to the sandbox sheet.'
					: 'Set GS_SANDBOX_SHEET_ID=1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A in Railway backend variables.'
			});
		}
		
		const { newTabName = 'Activities Cleaned', sourceTabName = 'Activities' } = req.body;
		
		console.log(`🧹 Starting cleanup: ${sourceTabName} → ${newTabName}`);
		
		// Get Google Sheets client first
		console.log('🔐 Getting Google Sheets client...');
		const sheets = await getSheetsClient();
		const sheetId = process.env.GS_SANDBOX_SHEET_ID;
		
		// Read activities directly from the specified tab (not using store which looks for "Activities")
		console.log(`📖 Reading activities directly from "${sourceTabName}" tab...`);
		const activities = await readActivitiesFromTab(sheets, sheetId, sourceTabName);
		console.log(`✅ Found ${activities.length} activities`);
		
		if (activities.length === 0) {
			clearTimeout(timeout);
			return res.status(404).json({ 
				error: 'No activities found',
				message: `No activities found in "${sourceTabName}" tab. Make sure the tab name is correct.`,
				hint: 'Available tabs can be checked in the Google Sheet'
			});
		}
		
		// Create new tab
		console.log(`📝 Creating new tab "${newTabName}"...`);
		await createTab(sheets, sheetId, newTabName);
		console.log(`✅ Tab "${newTabName}" created`);
		
		// Clean and format activities
		console.log(`🧹 Cleaning and formatting ${activities.length} activities...`);
		const cleanedActivities = activities.map(activity => cleanActivity(activity));
		console.log(`✅ Cleaned ${cleanedActivities.length} activities`);
		
		// Get headers from first activity
		const headers = getHeaders(cleanedActivities[0]);
		console.log(`📋 Using ${headers.length} columns`);
		
		// Write to new tab (batch if too many)
		console.log(`💾 Writing ${cleanedActivities.length} activities to "${newTabName}" tab...`);
		if (cleanedActivities.length > 1000) {
			// Batch write for large datasets
			await writeActivitiesToTabBatched(sheets, sheetId, newTabName, headers, cleanedActivities);
		} else {
			await writeActivitiesToTab(sheets, sheetId, newTabName, headers, cleanedActivities);
		}
		console.log(`✅ Successfully wrote ${cleanedActivities.length} activities`);
		
		clearTimeout(timeout);
		res.json({
			success: true,
			message: `Created "${newTabName}" tab with ${cleanedActivities.length} cleaned activities`,
			tabName: newTabName,
			count: cleanedActivities.length,
			activities: cleanedActivities.slice(0, 10) // Only return first 10 for preview
		});
	} catch (error) {
		clearTimeout(timeout);
		console.error('❌ Error copying and formatting:', error);
		console.error('Stack:', error.stack);
		res.status(500).json({
			error: error.message,
			success: false,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

/**
 * Clean a single activity - remove extra spaces, normalize formats
 */
function cleanActivity(activity) {
	const cleaned = { ...activity };
	
	// Clean title (bilingual object)
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
	
	// Clean description (bilingual object)
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
	
	// Clean categories (array)
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
	
	// Clean neighborhood
	if (cleaned.neighborhood) {
		cleaned.neighborhood = cleanString(cleaned.neighborhood);
	}
	
	// Clean addresses
	if (cleaned.addresses) {
		if (Array.isArray(cleaned.addresses)) {
			cleaned.addresses = cleaned.addresses
				.map(addr => typeof addr === 'object' ? cleanAddress(addr) : cleanString(addr))
				.filter(addr => addr && (typeof addr === 'string' ? addr.length > 0 : Object.keys(addr).length > 0));
		} else if (typeof cleaned.addresses === 'string') {
			// Try to parse JSON
			try {
				const parsed = JSON.parse(cleaned.addresses);
				if (Array.isArray(parsed)) {
					cleaned.addresses = parsed.map(addr => cleanAddress(addr));
				}
			} catch (e) {
				cleaned.addresses = cleanString(cleaned.addresses);
			}
		}
	}
	
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
	if (cleaned.ageMin !== undefined) {
		cleaned.ageMin = cleanNumber(cleaned.ageMin);
	}
	if (cleaned.ageMax !== undefined) {
		cleaned.ageMax = cleanNumber(cleaned.ageMax);
	}
	
	// Clean contact fields
	if (cleaned.contactEmail) {
		cleaned.contactEmail = cleanString(cleaned.contactEmail).toLowerCase().trim();
	}
	if (cleaned.contactPhone) {
		cleaned.contactPhone = cleanString(cleaned.contactPhone).trim();
	}
	
	// Clean links
	if (cleaned.websiteLink) {
		cleaned.websiteLink = cleanString(cleaned.websiteLink).trim();
	}
	if (cleaned.registrationLink) {
		cleaned.registrationLink = cleanString(cleaned.registrationLink).trim();
	}
	
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
	
	// Clean schedule
	if (cleaned.schedule) {
		if (Array.isArray(cleaned.schedule)) {
			cleaned.schedule = cleaned.schedule
				.map(s => typeof s === 'object' ? JSON.stringify(s) : cleanString(s))
				.filter(s => s.length > 0)
				.join('; ');
		} else if (typeof cleaned.schedule === 'string') {
			cleaned.schedule = cleanString(cleaned.schedule);
		}
	}
	
	// Clean other string fields
	const stringFields = ['activityType', 'providerId', 'locationDetails', 'additionalNotes'];
	for (const field of stringFields) {
		if (cleaned[field]) {
			cleaned[field] = cleanString(cleaned[field]);
		}
	}
	
	// Ensure dates are ISO format
	if (cleaned.createdAt) {
		cleaned.createdAt = formatDate(cleaned.createdAt);
	}
	if (cleaned.updatedAt) {
		cleaned.updatedAt = formatDate(cleaned.updatedAt);
	}
	
	return cleaned;
}

/**
 * Clean a string - remove extra spaces, trim, normalize
 */
function cleanString(str) {
	if (!str) return '';
	if (typeof str !== 'string') return String(str);
	
	return str
		.trim()
		.replace(/\s+/g, ' ') // Replace multiple spaces with single space
		.replace(/\n\s*\n/g, '\n') // Remove empty lines
		.trim();
}

/**
 * Clean a number
 */
function cleanNumber(num) {
	if (num === null || num === undefined || num === '') return null;
	const parsed = typeof num === 'number' ? num : parseFloat(String(num));
	return isNaN(parsed) ? null : parsed;
}

/**
 * Clean an address object
 */
function cleanAddress(addr) {
	if (typeof addr === 'string') {
		return cleanString(addr);
	}
	if (typeof addr !== 'object' || !addr) {
		return addr;
	}
	
	const cleaned = {};
	if (addr.street) cleaned.street = cleanString(addr.street);
	if (addr.city) cleaned.city = cleanString(addr.city);
	if (addr.postalCode) cleaned.postalCode = cleanString(addr.postalCode);
	if (addr.country) cleaned.country = cleanString(addr.country);
	if (addr.coordinates) {
		if (typeof addr.coordinates === 'object') {
			cleaned.coordinates = {
				lat: cleanNumber(addr.coordinates.lat),
				lng: cleanNumber(addr.coordinates.lng)
			};
		}
	}
	
	return cleaned;
}

/**
 * Format date to ISO string
 */
function formatDate(date) {
	if (!date) return new Date().toISOString();
	if (date instanceof Date) return date.toISOString();
	if (typeof date === 'string') {
		const parsed = new Date(date);
		return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
	}
	return new Date().toISOString();
}

/**
 * Get headers from activity object
 * Expands bilingual fields into separate columns for readability
 */
function getHeaders(activity) {
	const headers = [];
	const fieldOrder = [
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
	
	// Add ordered fields first
	for (const field of fieldOrder) {
		headers.push(field);
	}
	
	// Add any remaining fields that aren't already included
	for (const key of Object.keys(activity)) {
		if (!headers.includes(key) && key !== 'title' && key !== 'description' && key !== 'price') {
			headers.push(key);
		}
	}
	
	return headers;
}

/**
 * Write activities to a tab (batched for large datasets)
 */
async function writeActivitiesToTabBatched(sheets, sheetId, tabName, headers, activities) {
	const batchSize = 500; // Google Sheets API limit is ~10MB, ~500 rows is safe
	const batches = [];
	
	// First batch: headers
	batches.push([headers]);
	
	// Split activities into batches
	for (let i = 0; i < activities.length; i += batchSize) {
		const batch = activities.slice(i, i + batchSize);
		const rows = batch.map(activity => formatActivityRow(activity, headers));
		batches.push(rows);
	}
	
	console.log(`📦 Writing ${batches.length - 1} batches of activities...`);
	
	// Write headers first
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${tabName}!A1`,
		valueInputOption: 'RAW',
		resource: { values: [headers] }
	});
	
	// Write batches
	for (let i = 1; i < batches.length; i++) {
		const startRow = i === 1 ? 2 : (i - 1) * batchSize + 2;
		const range = `${tabName}!A${startRow}`;
		console.log(`   Writing batch ${i}/${batches.length - 1} (rows ${startRow}-${startRow + batches[i].length - 1})...`);
		
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: range,
			valueInputOption: 'RAW',
			resource: { values: batches[i] }
		});
	}
	
	console.log(`✅ All batches written successfully`);
}

/**
 * Format a single activity row
 */
function formatActivityRow(activity, headers) {
	return headers.map(header => {
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
}

/**
 * Write activities to a tab
 */
async function writeActivitiesToTab(sheets, sheetId, tabName, headers, activities) {
	// Prepare rows
	const rows = [headers];
	
	for (const activity of activities) {
		rows.push(formatActivityRow(activity, headers));
	}
	
	// Write to sheet
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${tabName}!A1`,
		valueInputOption: 'RAW',
		resource: { values: rows }
	});
}

/**
 * Create a new tab in the sheet
 */
async function createTab(sheets, sheetId, tabName) {
	try {
		// Check if tab already exists
		const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
		const exists = meta.data.sheets?.some(s => s.properties.title === tabName);
		
		if (exists) {
			throw new Error(`Tab "${tabName}" already exists`);
		}
		
		// Create new tab
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				requests: [{
					addSheet: {
						properties: {
							title: tabName
						}
					}
				}]
			}
		});
		
		console.log(`✅ Created tab: ${tabName}`);
	} catch (error) {
		if (error.message.includes('already exists')) {
			throw error;
		}
		console.error('Error creating tab:', error);
		throw new Error(`Failed to create tab: ${error.message}`);
	}
}

/**
 * Read activities directly from a specific tab
 */
async function readActivitiesFromTab(sheets, sheetId, tabName) {
	try {
		// Read the sheet data
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${tabName}!A:Z`
		});
		
		const rows = response.data.values || [];
		if (rows.length === 0) return [];
		
		const headers = rows[0];
		const activities = [];
		
		// Process each row
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			if (!row || row.length === 0) continue;
			
			const activity = {};
			headers.forEach((header, colIndex) => {
				const value = row[colIndex] || '';
				if (value) {
					// Try to parse JSON if it looks like JSON
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
			
			// Only add if it has some data
			if (Object.keys(activity).length > 0) {
				// Generate ID if missing
				if (!activity.id) {
					activity.id = uuidv4();
				}
				activities.push(activity);
			}
		}
		
		return activities;
	} catch (error) {
		if (error.message?.includes('Unable to parse range') || error.message?.includes('not found')) {
			console.error(`❌ Tab "${tabName}" not found in sheet`);
			return [];
		}
		throw error;
	}
}

/**
 * Get Google Sheets client
 */
async function getSheetsClient() {
	const { google } = await import('googleapis');
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}
	
	// Process private key
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

