/**
 * Test script to reverse engineer search approach for 20e arrondissement
 * Tests different search strategies to find existing organizations
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const GS_SHEET_ID = process.env.GS_SHEET_ID;
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

// Get Google Sheets client
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
		? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
		: process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}

	let processedKey = privateKey.replace(/\\n/g, '\n');
	if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
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

// Get existing activities for 20e via API or direct sheet read
async function getExisting20eActivities() {
	try {
		// Try API first (if server is running)
		try {
			const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
			const response = await fetch(`${apiUrl}/activities?neighborhood=20e&limit=200`);
			if (response.ok) {
				const data = await response.json();
				const activities = (data.data || data || []).map(a => ({
					title: a.title?.fr || a.title?.en || a.title || '',
					website: a.websiteLink || a.website || '',
					id: a.id
				})).filter(a => a.title);
				if (activities.length > 0) {
					console.log(`✅ Found ${activities.length} activities via API`);
					return activities;
				}
			}
		} catch (apiError) {
			console.log('⚠️  API not available, trying direct sheet read...');
		}

		// Fallback to direct sheet read
		const sheets = getSheetsClient();
		
		// Read from main Activities sheet
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: GS_SHEET_ID,
			range: 'Activities!A:Z'
		});

		const rows = response.data.values || [];
		if (rows.length === 0) {
			console.log('⚠️  No rows found in Activities sheet');
			return [];
		}

		const headers = rows[0];
		const neighborhoodIndex = headers.findIndex(h => 
			h && (h.toLowerCase().includes('neighborhood') || h.toLowerCase().includes('arrondissement'))
		);
		const titleIndex = headers.findIndex(h => 
			h && (h.toLowerCase().includes('title') || h.toLowerCase().includes('titre') || h.toLowerCase().includes('nom'))
		);
		const websiteIndex = headers.findIndex(h => 
			h && (h.toLowerCase().includes('website') || h.toLowerCase().includes('site'))
		);

		console.log(`📊 Headers found: neighborhood=${neighborhoodIndex}, title=${titleIndex}, website=${websiteIndex}`);

		if (neighborhoodIndex === -1) {
			console.log('⚠️  No neighborhood column found, checking all rows...');
		}

		const activities = [];
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			if (!row || row.length === 0) continue;

			// Check neighborhood if column exists
			if (neighborhoodIndex >= 0 && row[neighborhoodIndex]) {
				const neighborhood = String(row[neighborhoodIndex]).toLowerCase().trim();
				if (neighborhood !== '20e' && neighborhood !== '20' && !neighborhood.includes('20')) {
					continue;
				}
			}

			let title = '';
			if (titleIndex >= 0 && row[titleIndex]) {
				title = String(row[titleIndex]);
				// Try to parse JSON if it's a JSON string
				if (title.startsWith('{')) {
					try {
						const parsed = JSON.parse(title);
						title = parsed.fr || parsed.en || parsed.title || '';
					} catch {}
				}
			}

			// If no title found, skip
			if (!title || title.trim().length === 0) {
				continue;
			}

			const website = websiteIndex >= 0 && row[websiteIndex] ? String(row[websiteIndex]).trim() : '';

			activities.push({
				title: title.trim(),
				website: website,
				row: i + 1
			});
		}

		return activities;
	} catch (error) {
		console.error('Error getting existing activities:', error.message);
		console.error(error.stack);
		return [];
	}
}

// Test Google Custom Search
async function testGoogleSearch(query) {
	if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_CX) {
		console.log('⚠️  Google Custom Search not configured');
		return [];
	}

	try {
		const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}&num=10`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		return (data.items || []).map(item => ({
			title: item.title,
			url: item.link,
			snippet: item.snippet
		}));
	} catch (error) {
		console.error(`Search error for "${query}":`, error.message);
		return [];
	}
}

// Check if search results match existing activities
function checkMatches(searchResults, existingActivities) {
	const matches = [];
	const existingNames = new Set(existingActivities.map(a => a.title.toLowerCase().trim()));
	const existingWebsites = new Set(existingActivities.map(a => a.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')).filter(Boolean));

	for (const result of searchResults) {
		const resultTitle = result.title.toLowerCase();
		const resultUrl = result.url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

		// Check name match
		for (const existing of existingActivities) {
			const existingName = existing.title.toLowerCase();
			const existingWebsite = existing.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

			// Exact name match
			if (resultTitle.includes(existingName) || existingName.includes(resultTitle)) {
				matches.push({ type: 'name', existing, result, confidence: 'high' });
				break;
			}

			// Website match
			if (existingWebsite && resultUrl.includes(existingWebsite)) {
				matches.push({ type: 'website', existing, result, confidence: 'high' });
				break;
			}

			// Partial name match (at least 3 words)
			const existingWords = existingName.split(/\s+/).filter(w => w.length > 2);
			const resultWords = resultTitle.split(/\s+/).filter(w => w.length > 2);
			const commonWords = existingWords.filter(w => resultWords.includes(w));
			if (commonWords.length >= 2) {
				matches.push({ type: 'partial', existing, result, confidence: 'medium', commonWords });
				break;
			}
		}
	}

	return matches;
}

// Test different search strategies
async function testSearchStrategies() {
	console.log('🔍 Getting existing 20e activities...\n');
	const existingActivities = await getExisting20eActivities();
	console.log(`✅ Found ${existingActivities.length} existing activities for 20e\n`);

	if (existingActivities.length === 0) {
		console.log('❌ No existing activities found. Cannot test.');
		return;
	}

	// Show sample activities
	console.log('📋 Sample existing activities:');
	existingActivities.slice(0, 10).forEach((a, i) => {
		console.log(`  ${i + 1}. ${a.title}${a.website ? ` (${a.website})` : ''}`);
	});
	console.log('');

	// Test different search queries
	const testQueries = [
		// Direct organization name searches
		...existingActivities.slice(0, 5).map(a => a.title),
		
		// Generic searches
		'associations 20e arrondissement Paris',
		'clubs enfants 20e Paris',
		'activités enfants 20e arrondissement',
		'associations sport 20e Paris',
		'clubs sportifs 20e arrondissement',
		'activités périscolaires 20e Paris',
		'associations culturelles 20e arrondissement',
		'centres de loisirs 20e Paris',
		
		// Website-based searches
		...existingActivities.filter(a => a.website).slice(0, 3).map(a => {
			const domain = a.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
			return `site:${domain}`;
		}),
		
		// Combined searches
		'association OR club OR activité 20e arrondissement Paris enfants',
		'(association OR club) (20e OR "20ème") Paris',
		'associations Paris 20e arrondissement activités enfants',
	];

	console.log('🧪 Testing search strategies...\n');

	const allMatches = new Map();
	const queryResults = [];

	for (const query of testQueries) {
		console.log(`\n🔍 Testing: "${query}"`);
		const results = await testGoogleSearch(query);
		console.log(`   Found ${results.length} results`);

		const matches = checkMatches(results, existingActivities);
		console.log(`   ✅ Matched ${matches.length} existing activities`);

		if (matches.length > 0) {
			matches.forEach(match => {
				const key = match.existing.title;
				if (!allMatches.has(key)) {
					allMatches.set(key, []);
				}
				allMatches.get(key).push({ query, match });
			});

			matches.slice(0, 3).forEach(m => {
				console.log(`      - ${m.existing.title} (${m.type}, ${m.confidence})`);
			});
		}

		queryResults.push({ query, results: results.length, matches: matches.length });

		// Rate limiting
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// Summary
	console.log('\n\n📊 SUMMARY\n');
	console.log(`Total existing activities: ${existingActivities.length}`);
	console.log(`Activities found by searches: ${allMatches.size}`);
	console.log(`Coverage: ${((allMatches.size / existingActivities.length) * 100).toFixed(1)}%\n`);

	console.log('✅ Best performing queries:');
	queryResults
		.sort((a, b) => b.matches - a.matches)
		.slice(0, 10)
		.forEach((q, i) => {
			console.log(`  ${i + 1}. "${q.query}" - ${q.matches} matches`);
		});

	console.log('\n📋 Activities found:');
	Array.from(allMatches.keys()).forEach((title, i) => {
		console.log(`  ${i + 1}. ${title}`);
	});

	console.log('\n❌ Activities NOT found:');
	const foundTitles = new Set(Array.from(allMatches.keys()));
	existingActivities
		.filter(a => !foundTitles.has(a.title))
		.slice(0, 20)
		.forEach((a, i) => {
			console.log(`  ${i + 1}. ${a.title}${a.website ? ` (${a.website})` : ''}`);
		});

	// Recommendations
	console.log('\n💡 RECOMMENDATIONS:\n');
	
	const bestQueries = queryResults
		.filter(q => q.matches > 0)
		.sort((a, b) => b.matches - a.matches)
		.slice(0, 5)
		.map(q => q.query);

	console.log('Best search queries to use:');
	bestQueries.forEach((q, i) => {
		console.log(`  ${i + 1}. "${q}"`);
	});

	// Analyze patterns
	const foundActivities = Array.from(allMatches.keys()).map(title => 
		existingActivities.find(a => a.title === title)
	).filter(Boolean);

	const hasWebsite = foundActivities.filter(a => a.website).length;
	const noWebsite = foundActivities.length - hasWebsite;

	console.log(`\nPatterns:`);
	console.log(`  - Found activities with websites: ${hasWebsite}`);
	console.log(`  - Found activities without websites: ${noWebsite}`);
	console.log(`  - Average website presence: ${((hasWebsite / foundActivities.length) * 100).toFixed(1)}%`);
}

// Run tests
testSearchStrategies().catch(console.error);

