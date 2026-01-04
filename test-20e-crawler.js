/**
 * Test Script: Crawl 20th Arrondissement of Paris
 * 
 * This script tests the arrondissement crawler specifically for the 20e arrondissement.
 * It will:
 * 1. Run the crawler for just "20e"
 * 2. Save results to a new tab in Google Sheets
 * 3. The results can then be compared with existing manually extracted activities
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });

const API_URL = process.env.API_URL || process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sofiane.boukhalfa@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function getAdminToken() {
	if (!ADMIN_PASSWORD) {
		throw new Error('ADMIN_PASSWORD environment variable is required');
	}

	console.log('🔐 Logging in as admin...');
	const response = await fetch(`${API_URL}/api/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Login failed: ${error}`);
	}

	const data = await response.json();
	console.log('✅ Admin login successful');
	return data.token;
}

async function run20eCrawler(token) {
	console.log('\n🏘️  Starting crawler for 20th arrondissement (20e)...');
	console.log('⏳ This may take several minutes...\n');

	const response = await fetch(`${API_URL}/api/arrondissement-crawler/search`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		body: JSON.stringify({
			arrondissements: ['20e'],
			useTemplate: true // Use existing 20e activities as template
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Crawler failed: ${error}`);
	}

	return await response.json();
}

async function main() {
	try {
		console.log('='.repeat(60));
		console.log('🧪 Testing Arrondissement Crawler - 20th Arrondissement');
		console.log('='.repeat(60));
		console.log(`API URL: ${API_URL}`);
		console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

		// Step 1: Get admin token
		const token = await getAdminToken();

		// Step 2: Run crawler for 20e
		const results = await run20eCrawler(token);

		// Step 3: Display results
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
			console.log(`\n📋 Results saved to sheet: "${results.pendingSheet}"`);
			console.log(`\n💡 Next steps:`);
			console.log(`   1. Open your Google Sheet`);
			console.log(`   2. Find the tab: "${results.pendingSheet}"`);
			console.log(`   3. Compare with existing "Activities" tab (filter by neighborhood = "20e")`);
			console.log(`   4. Identify gaps in scraper extraction`);
		}

		if (results.results && results.results.length > 0) {
			console.log(`\n📝 Sample results (first 5):`);
			results.results.slice(0, 5).forEach((result, idx) => {
				console.log(`   ${idx + 1}. ${result.organization || 'N/A'} - ${result.status || 'unknown'}`);
				if (result.website) {
					console.log(`      Website: ${result.website}`);
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
		process.exit(1);
	}
}

main();

