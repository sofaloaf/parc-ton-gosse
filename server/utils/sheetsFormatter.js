/**
 * Google Sheets Data Formatter
 * 
 * Converts application data structures to human-readable formats for Google Sheets
 * and provides standardized tab naming conventions.
 */

/**
 * Format data for Google Sheets - makes it human-readable
 */
export function formatForSheets(data, fieldName) {
	if (data === null || data === undefined) return '';
	
	// Handle arrays (categories, images, etc.)
	if (Array.isArray(data)) {
		if (data.length === 0) return '';
		
		// Categories: format as readable list
		if (fieldName === 'categories') {
			return data.map(cat => {
				// Capitalize first letter
				return cat.charAt(0).toUpperCase() + cat.slice(1);
			}).join(', ');
		}
		
		// Images: show count or first URL
		if (fieldName === 'images') {
			if (data.length === 0) return '';
			if (data.length === 1) return data[0];
			return `${data.length} images (first: ${data[0]})`;
		}
		
		// Schedule: format as readable list
		if (fieldName === 'schedule') {
			return data.map(item => {
				if (typeof item === 'string') return item;
				return `${item.date || ''} ${item.time || ''} ${item.location || ''}`.trim();
			}).join('; ');
		}
		
		// Default: comma-separated
		return data.join(', ');
	}
	
	// Handle objects
	if (typeof data === 'object') {
		// Bilingual fields (title, description)
		if (data.en !== undefined || data.fr !== undefined) {
			const en = data.en || '';
			const fr = data.fr || '';
			
			if (en && fr) {
				return `${en} / ${fr}`;
			}
			return en || fr || '';
		}
		
		// Price object
		if (data.amount !== undefined) {
			const amount = data.amount || 0;
			const currency = data.currency || 'EUR';
			return `${amount} ${currency}`;
		}
		
		// Default: JSON string (for complex objects)
		return JSON.stringify(data);
	}
	
	// Handle booleans
	if (typeof data === 'boolean') {
		return data ? 'Yes' : 'No';
	}
	
	// Handle numbers
	if (typeof data === 'number') {
		return String(data);
	}
	
	// Handle strings
	return String(data);
}

/**
 * Parse data from Google Sheets - converts human-readable back to app format
 */
export function parseFromSheets(value, fieldName) {
	if (!value || value === '') return null;
	
	// Categories: parse comma-separated list
	if (fieldName === 'categories') {
		return value.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
	}
	
	// Bilingual fields: parse "EN / FR" format
	if (fieldName === 'title' || fieldName === 'description') {
		if (value.includes(' / ')) {
			const [en, fr] = value.split(' / ').map(s => s.trim());
			return { en, fr };
		}
		// Single value - use for both languages
		return { en: value, fr: value };
	}
	
	// Price: parse "amount currency" format
	if (fieldName === 'price') {
		const match = value.match(/(\d+)\s+(\w+)/);
		if (match) {
			return {
				amount: parseInt(match[1]),
				currency: match[2].toUpperCase()
			};
		}
		// Try to parse as number
		const num = parseInt(value);
		if (!isNaN(num)) {
			return { amount: num, currency: 'EUR' };
		}
	}
	
	// Boolean fields
	if (fieldName === 'adults' || fieldName === 'waitlist') {
		const lower = value.toLowerCase();
		return lower === 'yes' || lower === 'true' || lower === '1' || lower === 'oui';
	}
	
	// Try to parse as JSON
	if (value.startsWith('{') || value.startsWith('[')) {
		try {
			return JSON.parse(value);
		} catch (e) {
			// Not valid JSON, return as string
		}
	}
	
	return value;
}

/**
 * Standardized column order for Activities sheet
 */
export const ACTIVITIES_COLUMN_ORDER = [
	// Identification
	'id',
	
	// Basic Info (Bilingual)
	'title_en',
	'title_fr',
	'description_en',
	'description_fr',
	
	// Classification
	'categories',
	'activityType',
	'ageMin',
	'ageMax',
	
	// Pricing
	'price_amount',
	'currency',
	
	// Location
	'neighborhood',
	'addresses',
	
	// Contact
	'contactEmail',
	'contactPhone',
	
	// Links
	'websiteLink',
	'registrationLink',
	
	// Availability
	'disponibiliteJours',
	'disponibiliteDates',
	
	// Media
	'images',
	
	// Additional
	'adults',
	'additionalNotes',
	
	// Approval & Tracking
	'approvalStatus',
	'crawledAt',
	'providerId',
	
	// Timestamps
	'createdAt',
	'updatedAt'
];

/**
 * Human-readable column headers
 */
export const ACTIVITIES_COLUMN_HEADERS = {
	id: 'ID',
	title_en: 'Title (English)',
	title_fr: 'Title (French)',
	description_en: 'Description (English)',
	description_fr: 'Description (French)',
	categories: 'Categories',
	activityType: 'Activity Type',
	ageMin: 'Min Age',
	ageMax: 'Max Age',
	price_amount: 'Price (€)',
	currency: 'Currency',
	neighborhood: 'Neighborhood',
	addresses: 'Addresses',
	contactEmail: 'Contact Email',
	contactPhone: 'Contact Phone',
	websiteLink: 'Website Link',
	registrationLink: 'Registration Link',
	disponibiliteJours: 'Available Days',
	disponibiliteDates: 'Available Dates',
	images: 'Images',
	adults: 'Adults Allowed',
	additionalNotes: 'Additional Notes',
	approvalStatus: 'Approval Status',
	crawledAt: 'Crawled At',
	providerId: 'Provider ID',
	createdAt: 'Created At',
	updatedAt: 'Updated At'
};

/**
 * Generate standardized tab name
 * 
 * @param {string} type - Type of sheet: 'validated', 'pending', 'archive'
 * @param {string} source - Source identifier (e.g., 'crawler', 'arrondissement-crawler')
 * @param {Date} date - Date for the sheet (defaults to now)
 * @returns {string} Formatted tab name
 * 
 * Examples:
 * - Validated: "Validated - 2025-12-01 - Crawler"
 * - Pending: "Pending - 2025-12-01 - Arrondissement Crawler"
 * - Archive: "Archive - 2025-12-01 - v1"
 */
export function generateTabName(type, source = 'system', date = null) {
	const d = date || new Date();
	const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
	
	const sourceMap = {
		'crawler': 'Crawler',
		'arrondissement': 'Arrondissement Crawler',
		'system': 'System',
		'manual': 'Manual Import'
	};
	
	const sourceName = sourceMap[source] || source;
	
	switch (type) {
		case 'validated':
			return `Validated - ${dateStr} - ${sourceName}`;
		case 'pending':
			return `Pending - ${dateStr} - ${sourceName}`;
		case 'archive':
			return `Archive - ${dateStr} - ${sourceName}`;
		case 'main':
			return 'Activities'; // Main activities sheet
		default:
			return `${type} - ${dateStr} - ${sourceName}`;
	}
}

/**
 * Convert activity object to Google Sheets row format
 */
export function activityToSheetRow(activity, columnOrder = ACTIVITIES_COLUMN_ORDER) {
	const row = {};
	
	columnOrder.forEach(col => {
		const value = activity[col];
		row[col] = formatForSheets(value, col);
	});
	
	return row;
}

/**
 * Convert Google Sheets row to activity object
 */
export function sheetRowToActivity(row, columnOrder = ACTIVITIES_COLUMN_ORDER) {
	const activity = {};
	
	columnOrder.forEach(col => {
		if (row[col] !== undefined) {
			activity[col] = parseFromSheets(row[col], col);
		}
	});
	
	// Convert separate EN/FR columns to bilingual objects
	if (activity.title_en || activity.title_fr) {
		activity.title = {
			en: activity.title_en || '',
			fr: activity.title_fr || ''
		};
		delete activity.title_en;
		delete activity.title_fr;
	}
	
	if (activity.description_en || activity.description_fr) {
		activity.description = {
			en: activity.description_en || '',
			fr: activity.description_fr || ''
		};
		delete activity.description_en;
		delete activity.description_fr;
	}
	
	// Convert price_amount and currency to price object
	if (activity.price_amount !== undefined) {
		activity.price = {
			amount: activity.price_amount,
			currency: activity.currency || 'EUR'
		};
		delete activity.price_amount;
		delete activity.currency;
	}
	
	return activity;
}

/**
 * Get headers array with human-readable names
 */
export function getHeaders(columnOrder = ACTIVITIES_COLUMN_ORDER) {
	return columnOrder.map(col => ACTIVITIES_COLUMN_HEADERS[col] || col);
}




