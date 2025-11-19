#!/usr/bin/env node

/**
 * Script to run the data validator/crawler
 * 
 * Usage:
 *   node run-crawler.js
 * 
 * This script will:
 * 1. Start the server if not running
 * 2. Authenticate as admin
 * 3. Call the crawler endpoint
 * 4. Display results
 */

import fetch from 'node-fetch';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sofiane.boukhalfa@gmail.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

async function authenticateAsAdmin() {
	// Try to get admin token via Google OAuth
	if (GOOGLE_CLIENT_ID) {
		console.log('⚠️  Google OAuth authentication required.');
		console.log('Please authenticate via the admin panel first, then use the token.');
		return null;
	}
	
	// For now, we'll need manual authentication
	console.log('⚠️  Manual authentication required.');
	console.log('Please log in as admin via the web interface first.');
	return null;
}

async function runCrawler(token) {
	console.log('🚀 Starting data validator/crawler...\n');
	
	try {
		const response = await fetch(`${API_URL}/api/crawler/validate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': `token=${token}`
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`HTTP ${response.status}: ${errorText}`);
		}

		const result = await response.json();
		
		console.log('✅ Crawler completed successfully!\n');
		console.log('📊 Summary:');
		console.log(`   Total activities: ${result.summary.total}`);
		console.log(`   Successful: ${result.summary.successful}`);
		console.log(`   Errors: ${result.summary.errors}`);
		console.log(`   Skipped: ${result.summary.skipped}`);
		console.log(`   Total changes: ${result.summary.totalChanges}\n`);
		console.log(`📋 New sheet created: "${result.sheetName}"\n`);
		
		if (result.results && result.results.length > 0) {
			console.log('📝 Sample results (first 5):');
			result.results.slice(0, 5).forEach((r, i) => {
				console.log(`   ${i + 1}. Row ${r.row}: ${r.url}`);
				console.log(`      Status: ${r.status}`);
				if (r.changes) {
					console.log(`      Changes: ${r.changes}`);
				}
				if (r.error) {
					console.log(`      Error: ${r.error}`);
				}
			});
		}
		
		console.log(`\n✅ Validation complete! Check Google Sheets for the new tab: "${result.sheetName}"`);
		
		return result;
	} catch (error) {
		console.error('❌ Crawler failed:', error.message);
		throw error;
	}
}

async function main() {
	console.log('🔍 Data Validator/Crawler\n');
	console.log('This will:');
	console.log('  1. Read all activities from Google Sheets');
	console.log('  2. Visit each activity website');
	console.log('  3. Extract and validate data');
	console.log('  4. Create a new versioned sheet with updated data\n');
	
	// Check if server is running
	try {
		const healthCheck = await fetch(`${API_URL}/api/health`);
		if (!healthCheck.ok) {
			throw new Error('Server not healthy');
		}
		console.log('✅ Server is running\n');
	} catch (error) {
		console.error('❌ Server is not running or not accessible');
		console.error(`   Make sure the server is running at ${API_URL}`);
		console.error('   Start it with: cd server && npm run dev');
		process.exit(1);
	}
	
	// For now, we need manual token
	console.log('⚠️  Authentication required');
	console.log('\nTo run the crawler:');
	console.log('  1. Log in as admin via the web interface');
	console.log('  2. Open browser DevTools → Application → Cookies');
	console.log('  3. Copy the "token" cookie value');
	console.log('  4. Run: node run-crawler.js <token>\n');
	
	const token = process.argv[2];
	if (!token) {
		console.log('Or use curl:');
		console.log(`   curl -X POST ${API_URL}/api/crawler/validate \\`);
		console.log('     -H "Cookie: token=YOUR_ADMIN_TOKEN"\n');
		process.exit(1);
	}
	
	await runCrawler(token);
}

main().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});

