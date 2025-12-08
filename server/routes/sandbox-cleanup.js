/**
 * Sandbox Cleanup and Formatting Tools
 * Creates new tabs and cleans up data formatting
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSandboxStore, isSandboxAvailable } from '../services/sandbox-sheets.js';
// googleapis will be imported dynamically

export const sandboxCleanupRouter = express.Router();

// All routes require admin authentication
sandboxCleanupRouter.use(requireAuth('admin'));

/**
 * Create new tab and copy activities with cleaned formatting
 * POST /api/sandbox/cleanup/copy-and-format
 */
sandboxCleanupRouter.post('/copy-and-format', async (req, res) => {
	// Try to initialize sandbox if not already available
	if (!isSandboxAvailable()) {
		console.log('🔄 Sandbox not initialized, attempting to initialize...');
		const { initSandboxSheets } = await import('../services/sandbox-sheets.js');
		await initSandboxSheets();
	}
	
	if (!isSandboxAvailable()) {
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
	
	try {
		const store = getSandboxStore();
		
		// Get all activities from source tab
		const activities = await store.activities.list();
		
		if (activities.length === 0) {
			return res.status(404).json({ 
				error: 'No activities found',
				message: `No activities found in "${sourceTabName}" tab`
			});
		}
		
		// Get Google Sheets client
		const sheets = await getSheetsClient();
		const sheetId = process.env.GS_SANDBOX_SHEET_ID;
		
		// Create new tab
		await createTab(sheets, sheetId, newTabName);
		
		// Clean and format activities
		const cleanedActivities = activities.map(activity => cleanActivity(activity));
		
		// Get headers from first activity
		const headers = getHeaders(cleanedActivities[0]);
		
		// Write to new tab
		await writeActivitiesToTab(sheets, sheetId, newTabName, headers, cleanedActivities);
		
		res.json({
			success: true,
			message: `Created "${newTabName}" tab with ${cleanedActivities.length} cleaned activities`,
			tabName: newTabName,
			count: cleanedActivities.length,
			activities: cleanedActivities
		});
	} catch (error) {
		console.error('Error copying and formatting:', error);
		res.status(500).json({
			error: error.message,
			success: false
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
 * Write activities to a tab
 */
async function writeActivitiesToTab(sheets, sheetId, tabName, headers, activities) {
	// Prepare rows
	const rows = [headers];
	
	for (const activity of activities) {
		const row = headers.map(header => {
			// Handle expanded bilingual fields
			if (header === 'title_en') {
				const title = activity.title;
				if (typeof title === 'object' && title !== null) {
					return title.en || '';
				}
				return '';
			}
			if (header === 'title_fr') {
				const title = activity.title;
				if (typeof title === 'object' && title !== null) {
					return title.fr || '';
				}
				return '';
			}
			if (header === 'description_en') {
				const desc = activity.description;
				if (typeof desc === 'object' && desc !== null) {
					return desc.en || '';
				}
				return '';
			}
			if (header === 'description_fr') {
				const desc = activity.description;
				if (typeof desc === 'object' && desc !== null) {
					return desc.fr || '';
				}
				return '';
			}
			
			// Handle expanded price fields
			if (header === 'price_amount') {
				const price = activity.price;
				if (typeof price === 'object' && price !== null) {
					return price.amount || 0;
				}
				if (typeof price === 'number') {
					return price;
				}
				return 0;
			}
			if (header === 'price_currency') {
				const price = activity.price;
				if (typeof price === 'object' && price !== null) {
					return price.currency || 'EUR';
				}
				return 'EUR';
			}
			
			// Get value for regular fields
			let value = activity[header];
			
			// Handle null/undefined
			if (value === null || value === undefined) {
				return '';
			}
			
			// Handle objects (addresses, etc.)
			if (typeof value === 'object' && !Array.isArray(value)) {
				// For addresses array
				if (header === 'addresses' && Array.isArray(value)) {
					return value.map(addr => 
						typeof addr === 'string' ? addr : JSON.stringify(addr)
					).join(' | ');
				}
				// Default: stringify
				return JSON.stringify(value);
			}
			
			// Handle arrays
			if (Array.isArray(value)) {
				return value.join(', ');
			}
			
			// Handle dates
			if (value instanceof Date) {
				return value.toISOString();
			}
			
			// Default: convert to string
			return String(value);
		});
		rows.push(row);
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

