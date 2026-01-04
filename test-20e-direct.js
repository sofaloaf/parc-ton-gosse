/**
 * Direct Test Script: Crawl 20th Arrondissement of Paris
 * 
 * This script directly calls the crawler functions without going through the API.
 * It will:
 * 1. Run the crawler for just "20e"
 * 2. Save results to a new tab in Google Sheets
 * 3. The results can then be compared with existing manually extracted activities
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import { createDataStore } from './server/services/datastore/index.js';
import { 
	generateTabName, 
	activityToSheetRow, 
	getHeaders, 
	ACTIVITIES_COLUMN_ORDER 
} from './server/utils/sheetsFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });

// Import crawler functions (we'll need to extract them)
// For now, let's use a simplified approach that calls the search function directly

// Helper to get Google Sheets client (from arrondissementCrawler.js)
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

async function main() {
	try {
		console.log('='.repeat(60));
		console.log('🧪 Direct Test: Arrondissement Crawler - 20th Arrondissement');
		console.log('='.repeat(60));
		console.log('');

		// Check if server is running
		const API_URL = process.env.API_URL || 'http://localhost:4000';
		console.log(`📡 Attempting to use API at: ${API_URL}/api`);
		console.log('   (If server is not running, this will fail)');
		console.log('');

		// For now, let's use the API approach but with better error handling
		// We'll import node-fetch dynamically
		const fetch = (await import('node-fetch')).default;

		// Try to get admin token - but first check if we can create a test admin
		console.log('🔐 Checking authentication...');
		
		// Check if ADMIN_PASSWORD is set
		if (!process.env.ADMIN_PASSWORD) {
			console.log('⚠️  ADMIN_PASSWORD not set in environment');
			console.log('💡 Please set ADMIN_PASSWORD in server/.env or run:');
			console.log('   export ADMIN_PASSWORD=your_password');
			console.log('');
			console.log('   Or, if you have an admin account, you can:');
			console.log('   1. Start the server: cd server && npm run dev');
			console.log('   2. Use the admin panel at http://localhost:5173/admin');
			console.log('   3. Run the crawler from there');
			process.exit(1);
		}

		const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sofiane.boukhalfa@gmail.com';
		
		console.log(`   Admin Email: ${ADMIN_EMAIL}`);
		console.log('   Logging in...');

		const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: ADMIN_EMAIL,
				password: process.env.ADMIN_PASSWORD
			})
		});

		if (!loginResponse.ok) {
			const errorText = await loginResponse.text();
			throw new Error(`Login failed: ${errorText}`);
		}

		const loginData = await loginResponse.json();
		const token = loginData.token;
		console.log('✅ Authentication successful\n');

		// Run crawler
		console.log('🏘️  Starting crawler for 20th arrondissement (20e)...');
		console.log('⏳ This may take several minutes (searching mairie sites, extracting data)...\n');

		const crawlerResponse = await fetch(`${API_URL}/api/arrondissement-crawler/search`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				arrondissements: ['20e'],
				useTemplate: true
			})
		});

		if (!crawlerResponse.ok) {
			const errorText = await crawlerResponse.text();
			throw new Error(`Crawler failed: ${errorText}`);
		}

		const results = await crawlerResponse.json();

		// Display results
		console.log('\n' + '='.repeat(60));
		console.log('✅ Crawler completed!');
		console.log('='.repeat(60));
		console.log(`\n📊 Summary:`);
		console.log(`   Total organizations searched: ${results.summary?.total || 0}`);
		console.log(`   Successful extractions: ${results.summary?.successful || 0}`);
		console.log(`   Partial extractions: ${results.summary?.partial || 0}`);
		console.log(`   Errors: ${results.summary?.errors || 0}`);
		console.log(`   Pending activities saved: ${results.summary?.pendingActivities || 0}`);
		
		if (results.pendingSheet) {
			const sheetId = process.env.GS_SHEET_ID;
			const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`;
			
			console.log(`\n📋 Results saved to sheet: "${results.pendingSheet}"`);
			console.log(`   Sheet URL: ${sheetUrl}`);
			console.log(`\n💡 Next steps:`);
			console.log(`   1. Open your Google Sheet: ${sheetUrl}`);
			console.log(`   2. Find the tab: "${results.pendingSheet}"`);
			console.log(`   3. Compare with existing "Activities" tab (filter by neighborhood = "20e")`);
			console.log(`   4. Identify gaps in scraper extraction by comparing:`);
			console.log(`      - Activities found by scraper vs. manual extraction`);
			console.log(`      - Data quality (completeness of fields)`);
			console.log(`      - Missing organizations`);
			console.log(`      - Incorrect extractions`);
		}

		if (results.results && results.results.length > 0) {
			console.log(`\n📝 Sample results (first 10):`);
			results.results.slice(0, 10).forEach((result, idx) => {
				console.log(`   ${idx + 1}. ${result.organization || 'N/A'} - ${result.status || 'unknown'}`);
				if (result.website) {
					console.log(`      Website: ${result.website}`);
				}
				if (result.note) {
					console.log(`      Note: ${result.note}`);
				}
			});
		}

		console.log('\n' + '='.repeat(60));
		console.log('✨ Test complete!');
		console.log('='.repeat(60));

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		if (error.stack) {
			console.error('\nStack trace:', error.stack);
		}
		
		if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
			console.error('\n💡 Tip: Make sure the server is running:');
			console.error('   cd server && npm run dev');
		}
		
		process.exit(1);
	}
}

main();

