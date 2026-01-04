/**
 * Production Test Script: Crawl 20th Arrondissement
 * 
 * This script can be run from your local machine to test the crawler
 * on the production server at parctongosse.com
 * 
 * Usage:
 *   1. Get your admin token from the browser (see instructions below)
 *   2. Run: ADMIN_TOKEN=your_token node run-20e-test-production.js
 */

import fetch from 'node-fetch';

const PRODUCTION_API = 'https://parc-ton-gosse-backend-production.up.railway.app/api';
// Or if you have a custom domain for backend:
// const PRODUCTION_API = 'https://api.parctongosse.com/api';

async function run20eCrawler(token) {
	console.log('🏘️  Starting crawler for 20th arrondissement (20e) on production...');
	console.log('⏳ This may take several minutes...\n');

	const response = await fetch(`${PRODUCTION_API}/arrondissement-crawler/search`, {
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

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Crawler failed: ${errorText}`);
	}

	return await response.json();
}

async function main() {
	try {
		const token = process.env.ADMIN_TOKEN;
		
		if (!token) {
			console.log('='.repeat(60));
			console.log('❌ ADMIN_TOKEN environment variable is required');
			console.log('='.repeat(60));
			console.log('\n📝 How to get your admin token:');
			console.log('\n   Option 1: From Browser Console');
			console.log('   1. Go to https://parctongosse.com/admin');
			console.log('   2. Log in as admin');
			console.log('   3. Open browser DevTools (F12)');
			console.log('   4. Go to Console tab');
			console.log('   5. Type: localStorage.getItem("token")');
			console.log('   6. Copy the token value');
			console.log('   7. Run: ADMIN_TOKEN=your_token node run-20e-test-production.js');
			
			console.log('\n   Option 2: From Network Tab');
			console.log('   1. Go to https://parctongosse.com/admin');
			console.log('   2. Log in as admin');
			console.log('   3. Open browser DevTools (F12)');
			console.log('   4. Go to Network tab');
			console.log('   5. Make any API call (refresh page)');
			console.log('   6. Find a request, look at Headers');
			console.log('   7. Find "Authorization: Bearer ..." header');
			console.log('   8. Copy the token after "Bearer "');
			console.log('   9. Run: ADMIN_TOKEN=your_token node run-20e-test-production.js');
			
			console.log('\n   Option 3: Use Cookie (if using httpOnly cookies)');
			console.log('   1. Go to https://parctongosse.com/admin');
			console.log('   2. Log in as admin');
			console.log('   3. Open browser DevTools (F12)');
			console.log('   4. Go to Application/Storage tab');
			console.log('   5. Find Cookies → parctongosse.com');
			console.log('   6. Copy the "token" cookie value');
			console.log('   7. Run: ADMIN_TOKEN=your_token node run-20e-test-production.js');
			
			console.log('\n💡 Or, you can modify this script to login first:');
			console.log('   Add your email/password and uncomment the login section');
			process.exit(1);
		}

		console.log('='.repeat(60));
		console.log('🧪 Testing Arrondissement Crawler - 20th Arrondissement');
		console.log('🌐 Production Server: parctongosse.com');
		console.log('='.repeat(60));
		console.log('');

		const results = await run20eCrawler(token);

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
			const sheetId = process.env.GS_SHEET_ID || '1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0';
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
		
		if (error.message.includes('401') || error.message.includes('unauthorized')) {
			console.error('\n💡 Authentication failed. Make sure your token is valid.');
			console.error('   Get a fresh token from the browser (see instructions above).');
		}
		
		process.exit(1);
	}
}

main();

