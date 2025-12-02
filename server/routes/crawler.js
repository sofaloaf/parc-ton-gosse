import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { 
	generateTabName, 
	activityToSheetRow, 
	getHeaders, 
	ACTIVITIES_COLUMN_ORDER 
} from '../utils/sheetsFormatter.js';

export const crawlerRouter = express.Router();

// Helper to get Google Sheets client
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
		? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
		: process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}

	// Process private key (handle newlines)
	let processedKey = privateKey.replace(/\\n/g, '\n');
	if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
		// Key might be on one line, try to format it
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

// Extract data from website using various strategies
async function extractWebsiteData(url) {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			},
			timeout: 10000 // 10 second timeout
		});

		if (!response.ok) {
			return { error: `HTTP ${response.status}` };
		}

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Extract data using multiple strategies
		const data = {
			title: null,
			description: null,
			price: null,
			ageRange: null,
			address: null,
			phone: null,
			email: null,
			images: [],
			categories: [],
			schedule: null
		};

		// Strategy 1: Meta tags
		data.title = document.querySelector('meta[property="og:title"]')?.content ||
			document.querySelector('meta[name="twitter:title"]')?.content ||
			document.querySelector('title')?.textContent?.trim();

		data.description = document.querySelector('meta[property="og:description"]')?.content ||
			document.querySelector('meta[name="twitter:description"]')?.content ||
			document.querySelector('meta[name="description"]')?.content ||
			document.querySelector('p')?.textContent?.trim();

		// Strategy 2: Structured data (JSON-LD)
		const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (const script of jsonLdScripts) {
			try {
				const jsonLd = JSON.parse(script.textContent);
				if (Array.isArray(jsonLd)) {
					for (const item of jsonLd) {
						extractFromStructuredData(item, data);
					}
				} else {
					extractFromStructuredData(jsonLd, data);
				}
			} catch (e) {
				// Invalid JSON-LD, skip
			}
		}

		// Strategy 3: Common class/id patterns
		if (!data.title) {
			data.title = document.querySelector('h1')?.textContent?.trim() ||
				document.querySelector('.title')?.textContent?.trim() ||
				document.querySelector('#title')?.textContent?.trim();
		}

		if (!data.description) {
			data.description = document.querySelector('.description')?.textContent?.trim() ||
				document.querySelector('#description')?.textContent?.trim() ||
				document.querySelector('article p')?.textContent?.trim();
		}

		// Extract price
		const pricePatterns = [
			/\b(\d+)\s*€/gi,
			/\b(\d+)\s*EUR/gi,
			/prix[:\s]+(\d+)/gi,
			/tarif[:\s]+(\d+)/gi
		];
		for (const pattern of pricePatterns) {
			const match = html.match(pattern);
			if (match) {
				const prices = match.map(m => parseInt(m.replace(/\D/g, '')));
				data.price = Math.min(...prices.filter(p => p > 0));
				break;
			}
		}

		// Extract age range
		const agePatterns = [
			/(\d+)\s*-\s*(\d+)\s*ans?/gi,
			/(\d+)\s*à\s*(\d+)\s*ans?/gi,
			/à partir de\s*(\d+)\s*ans?/gi,
			/jusqu'à\s*(\d+)\s*ans?/gi
		];
		for (const pattern of agePatterns) {
			const match = html.match(pattern);
			if (match) {
				const ages = match[0].match(/\d+/g);
				if (ages && ages.length >= 1) {
					data.ageRange = ages.length === 2 
						? `${ages[0]}-${ages[1]}`
						: ages[0];
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
		const phonePatterns = [
			/(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g,
			/0[1-9]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g
		];
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
		data.images = data.images.slice(0, 5); // Limit to 5 images

		// Extract categories from keywords or content
		const categoryKeywords = {
			'sport': ['sport', 'sportif', 'football', 'tennis', 'natation', 'gymnastique'],
			'musique': ['musique', 'musical', 'instrument', 'piano', 'violon'],
			'arts': ['art', 'peinture', 'dessin', 'créatif', 'artistique'],
			'danse': ['danse', 'dance', 'chorégraphie'],
			'théâtre': ['théâtre', 'theatre', 'drame', 'comédie'],
			'sciences': ['science', 'scientifique', 'expérience', 'laboratoire'],
			'nature': ['nature', 'environnement', 'écologie', 'jardin'],
			'lecture': ['lecture', 'livre', 'bibliothèque', 'conte']
		};

		for (const [category, keywords] of Object.entries(categoryKeywords)) {
			const text = html.toLowerCase();
			if (keywords.some(keyword => text.includes(keyword))) {
				data.categories.push(category);
			}
		}

		return data;
	} catch (error) {
		return { error: error.message };
	}
}

// Extract data from structured data (JSON-LD)
function extractFromStructuredData(item, data) {
	if (!item || typeof item !== 'object') return;

	// Handle different schema.org types
	if (item['@type'] === 'Event' || item['@type'] === 'Product' || item['@type'] === 'Service') {
		if (item.name && !data.title) data.title = item.name;
		if (item.description && !data.description) data.description = item.description;
		if (item.offers?.price && !data.price) {
			data.price = parseInt(item.offers.price);
		}
		if (item.audience?.audienceType && !data.ageRange) {
			data.ageRange = item.audience.audienceType;
		}
		if (item.location) {
			if (typeof item.location === 'string') {
				data.address = item.location;
			} else if (item.location.address) {
				data.address = typeof item.location.address === 'string' 
					? item.location.address
					: [item.location.address.streetAddress, item.location.address.addressLocality, item.location.address.postalCode].filter(Boolean).join(', ');
			}
		}
		if (item.telephone && !data.phone) data.phone = item.telephone;
		if (item.email && !data.email) data.email = item.email;
		if (item.image) {
			const images = Array.isArray(item.image) ? item.image : [item.image];
			data.images.push(...images.map(img => typeof img === 'string' ? img : img.url || img.contentUrl));
		}
	}

	// Recursively check nested objects
	for (const value of Object.values(item)) {
		if (typeof value === 'object' && value !== null) {
			extractFromStructuredData(value, data);
		}
	}
}

// Compare and merge data
function mergeData(existing, crawled, headers) {
	const merged = { ...existing };
	const changes = [];

	// Map crawled data to sheet column names
	// Try to match crawled fields to existing column names
	const fieldMappings = {
		'title': ['title', 'Title', 'Titre', 'Nom', 'title_en', 'Title EN', 'title_fr', 'Title FR'],
		'description': ['description', 'Description', 'Desc', 'description_en', 'Description EN', 'description_fr', 'Description FR'],
		'price': ['price', 'Price', 'Prix', 'price_amount'],
		'ageRange': ['ageMin', 'ageMax', 'Age Min', 'Age Max', 'age_min', 'age_max'],
		'address': ['address', 'Address', 'Adresse', 'addresses', 'Addresses', 'Adresses'],
		'phone': ['phone', 'Phone', 'Téléphone', 'contactPhone', 'Contact Phone'],
		'email': ['email', 'Email', 'contactEmail', 'Contact Email'],
		'images': ['images', 'Images', 'Photos'],
		'categories': ['categories', 'Category', 'Categories', 'Catégories']
	};

	// Update fields based on crawled data
	for (const [crawledKey, possibleColumns] of Object.entries(fieldMappings)) {
		const crawledValue = crawled[crawledKey];
		
		if (!crawledValue || (Array.isArray(crawledValue) && crawledValue.length === 0)) {
			continue; // Skip empty values
		}

		// Find matching column in headers
		const matchingColumn = headers.find(h => 
			h && possibleColumns.some(col => 
				h.toLowerCase().replace(/\s+/g, '').includes(col.toLowerCase().replace(/\s+/g, ''))
			)
		);

		if (matchingColumn) {
			const existingValue = existing[matchingColumn];
			
			// Format value based on type
			let formattedValue = crawledValue;
			if (Array.isArray(crawledValue)) {
				formattedValue = crawledValue.join(', ');
			} else if (crawledKey === 'ageRange' && typeof crawledValue === 'string') {
				// Parse age range (e.g., "6-12" or "6 à 12 ans")
				const ages = crawledValue.match(/\d+/g);
				if (ages && ages.length >= 2) {
					// Update both ageMin and ageMax columns if they exist
					const ageMinCol = headers.find(h => h && (h.includes('ageMin') || h.includes('Age Min') || h.includes('Âge Min')));
					const ageMaxCol = headers.find(h => h && (h.includes('ageMax') || h.includes('Age Max') || h.includes('Âge Max')));
					if (ageMinCol) merged[ageMinCol] = ages[0];
					if (ageMaxCol) merged[ageMaxCol] = ages[1];
					changes.push(`Age Range: ${existingValue || 'N/A'} → ${ages[0]}-${ages[1]}`);
					continue;
				}
			}

			// Compare and update
			if (existingValue !== formattedValue && formattedValue !== '') {
				merged[matchingColumn] = formattedValue;
				changes.push(`${matchingColumn}: ${existingValue || 'N/A'} → ${formattedValue}`);
			}
		}
	}

	return { merged, changes };
}

// Main crawler endpoint
crawlerRouter.post('/validate', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	const sheetId = process.env.GS_SHEET_ID;

	if (!sheetId) {
		return res.status(400).json({ error: 'GS_SHEET_ID not configured' });
	}

	try {
		const sheets = getSheetsClient();
		
		// Read activities from master sheet
		const activitiesResponse = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: 'Activities!A:Z'
		});

		const rows = activitiesResponse.data.values || [];
		if (rows.length === 0) {
			return res.status(400).json({ error: 'No activities found in sheet' });
		}

		// Get headers
		const headers = rows[0];
		const websiteLinkIndex = headers.findIndex(h => 
			h && (h.toLowerCase().includes('lien') || h.toLowerCase().includes('site') || h.toLowerCase().includes('url') || h.toLowerCase().includes('website'))
		);

		if (websiteLinkIndex === -1) {
			return res.status(400).json({ error: 'Website link column not found. Look for column with "lien", "site", "url", or "website" in name.' });
		}

		// Create standardized tab name
		const sheetName = generateTabName('validated', 'crawler');

		// Process activities
		const results = [];
		const updatedRows = [];
		
		// Use standardized column order and headers
		const standardHeaders = getHeaders(ACTIVITIES_COLUMN_ORDER);
		updatedRows.push(standardHeaders);

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			const websiteUrl = row[websiteLinkIndex];

			if (!websiteUrl || !websiteUrl.startsWith('http')) {
				// No valid URL, skip
				results.push({
					row: i + 1,
					url: websiteUrl || 'N/A',
					status: 'skipped',
					reason: 'No valid URL'
				});
				continue;
			}

			// Build existing data object from original row
			const existing = {};
			headers.forEach((header, idx) => {
				if (header && row[idx]) {
					existing[header] = row[idx];
				}
			});

			// Crawl website
			const crawled = await extractWebsiteData(websiteUrl);

			if (crawled.error) {
				// Error crawling, skip
				results.push({
					row: i + 1,
					url: websiteUrl,
					status: 'error',
					error: crawled.error
				});
				continue;
			}

			// Merge data
			const { merged, changes } = mergeData(existing, crawled, headers);

			// Convert to activity object format
			const activity = {
				id: existing.id || uuidv4(),
				title_en: merged['title_en'] || merged['Title EN'] || merged['title']?.en || '',
				title_fr: merged['title_fr'] || merged['Title FR'] || merged['title']?.fr || '',
				description_en: merged['description_en'] || merged['Description EN'] || merged['description']?.en || '',
				description_fr: merged['description_fr'] || merged['Description FR'] || merged['description']?.fr || '',
				categories: merged['categories'] || merged['Categories'] || [],
				activityType: merged['activityType'] || merged['Type d\'activité'] || '',
				ageMin: merged['ageMin'] || merged['Age Min'] || 0,
				ageMax: merged['ageMax'] || merged['Age Max'] || 99,
				price_amount: merged['price_amount'] || merged['price']?.amount || merged['Price'] || 0,
				currency: merged['currency'] || merged['price']?.currency || 'EUR',
				neighborhood: merged['neighborhood'] || merged['Neighborhood'] || merged['Quartier'] || '',
				addresses: merged['addresses'] || merged['Addresses'] || merged['Adresses'] || '',
				contactEmail: merged['contactEmail'] || merged['Contact Email'] || '',
				contactPhone: merged['contactPhone'] || merged['Contact Phone'] || '',
				websiteLink: websiteUrl,
				registrationLink: merged['registrationLink'] || merged['Registration Link'] || '',
				disponibiliteJours: merged['disponibiliteJours'] || merged['Disponibilité (jours)'] || '',
				disponibiliteDates: merged['disponibiliteDates'] || merged['Disponibilité (dates)'] || '',
				images: merged['images'] || merged['Images'] || [],
				adults: merged['adults'] || merged['Adults'] || false,
				additionalNotes: merged['additionalNotes'] || merged['Additional Notes'] || '',
				approvalStatus: merged['approvalStatus'] || 'approved',
				providerId: merged['providerId'] || merged['Provider'] || '',
				createdAt: merged['createdAt'] || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Convert to sheet row format
			const sheetRow = activityToSheetRow(activity, ACTIVITIES_COLUMN_ORDER);
			const updatedRow = ACTIVITIES_COLUMN_ORDER.map(col => sheetRow[col] || '');
			updatedRows.push(updatedRow);

			results.push({
				row: i + 1,
				url: websiteUrl,
				status: 'success',
				changes: changes.length,
				changesList: changes
			});

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
		}

		// Create new sheet tab
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: sheetId,
			requestBody: {
				requests: [{
					addSheet: {
						properties: {
							title: sheetName
						}
					}
				}]
			}
		});

		// Write data to new sheet
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: `${sheetName}!A1`,
			valueInputOption: 'RAW',
			requestBody: {
				values: updatedRows
			}
		});

		// Update website links in Activities sheet to point to new validated sheet
		// Find or create a column for the validated sheet reference
		let sheetReferenceIndex = headers.findIndex(h => 
			h && (h.toLowerCase().includes('validated') || h.toLowerCase().includes('version') || h.toLowerCase().includes('source'))
		);

		// If no reference column exists, add one
		if (sheetReferenceIndex === -1) {
			sheetReferenceIndex = headers.length;
			headers.push('Validated Sheet');
			
			// Update all rows to have the new column
			rows.forEach((row, idx) => {
				if (idx === 0) {
					// Header row
					row.push('Validated Sheet');
				} else {
					// Data rows
					while (row.length <= sheetReferenceIndex) {
						row.push('');
					}
					row[sheetReferenceIndex] = sheetName;
				}
			});
		} else {
			// Update existing column
			rows.forEach((row, idx) => {
				if (idx === 0) {
					// Update header
					row[sheetReferenceIndex] = `Validated Sheet (${sheetName})`;
				} else {
					// Update data rows
					while (row.length <= sheetReferenceIndex) {
						row.push('');
					}
					row[sheetReferenceIndex] = sheetName;
				}
			});
		}

		// Write back to Activities sheet with updated references
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: 'Activities!A1',
			valueInputOption: 'RAW',
			requestBody: {
				values: rows
			}
		});

		const summary = {
			total: rows.length - 1,
			successful: results.filter(r => r.status === 'success').length,
			errors: results.filter(r => r.status === 'error').length,
			skipped: results.filter(r => r.status === 'skipped').length,
			totalChanges: results.reduce((sum, r) => sum + (r.changes || 0), 0)
		};

		res.json({
			success: true,
			sheetName: sheetName,
			summary: summary,
			results: results.slice(0, 10), // Return first 10 results as sample
			message: `Created new sheet "${sheetName}" with ${summary.successful} validated activities`
		});

	} catch (error) {
		console.error('Crawler error:', error);
		res.status(500).json({ 
			error: 'Crawler failed', 
			message: error.message 
		});
	}
});

// Get crawler status/history
crawlerRouter.get('/status', requireAuth('admin'), async (req, res) => {
	const sheetId = process.env.GS_SHEET_ID;

	if (!sheetId) {
		return res.status(400).json({ error: 'GS_SHEET_ID not configured' });
	}

	try {
		const sheets = getSheetsClient();
		
		// Get all sheets
		const spreadsheet = await sheets.spreadsheets.get({
			spreadsheetId: sheetId
		});

		// Find validated sheets (format: "Validated - YYYY-MM-DD - Crawler")
		const versionedSheets = spreadsheet.data.sheets
			.filter(sheet => {
				const title = sheet.properties.title;
				return /^Validated - \d{4}-\d{2}-\d{2} -/.test(title);
			})
			.map(sheet => ({
				name: sheet.properties.title,
				sheetId: sheet.properties.sheetId,
				index: sheet.properties.index
			}))
			.sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (newest first)

		res.json({
			versionedSheets: versionedSheets,
			total: versionedSheets.length
		});

	} catch (error) {
		console.error('Status check error:', error);
		res.status(500).json({ 
			error: 'Failed to get status', 
			message: error.message 
		});
	}
});

