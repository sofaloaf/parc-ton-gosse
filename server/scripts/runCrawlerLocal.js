#!/usr/bin/env node
/**
 * Standalone Local Crawler Script
 * 
 * Run this script on your local machine for unlimited crawl time.
 * No Railway timeout limits - can run for hours if needed.
 * 
 * Usage:
 *   node server/scripts/runCrawlerLocal.js [arrondissements...]
 * 
 * Examples:
 *   node server/scripts/runCrawlerLocal.js 20e
 *   node server/scripts/runCrawlerLocal.js 20e 19e 18e
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startBackgroundCrawl, getJobStatus } from '../services/crawler/backgroundCrawler.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../server/.env') });

// Set app reference for background crawler
global.app = {
	get: (key) => {
		if (key === 'dataStore') {
			// Lazy load datastore
			return import('../services/datastore/index.js').then(async ({ createDataStore }) => {
				return await createDataStore({
					backend: process.env.DATA_BACKEND || 'sheets',
					sheetId: process.env.GS_SHEET_ID,
					serviceAccount: process.env.GS_SERVICE_ACCOUNT,
					privateKey: process.env.GS_PRIVATE_KEY || process.env.GS_PRIVATE_KEY_BASE64,
					airtableApiKey: process.env.AIRTABLE_API_KEY,
					airtableBaseId: process.env.AIRTABLE_BASE_ID
				});
			});
		}
		return null;
	}
};

async function main() {
	const arrondissements = process.argv.slice(2).length > 0 
		? process.argv.slice(2) 
		: ['20e'];
	
	console.log(`\n🚀 Starting LOCAL background crawler for: ${arrondissements.join(', ')}`);
	console.log(`⏱️  No time limits - this can run for as long as needed\n`);
	
	try {
		// Initialize datastore
		const { createDataStore } = await import('../services/datastore/index.js');
		const store = await createDataStore({
			backend: process.env.DATA_BACKEND || 'sheets',
			sheetId: process.env.GS_SHEET_ID,
			serviceAccount: process.env.GS_SERVICE_ACCOUNT,
			privateKey: process.env.GS_PRIVATE_KEY || process.env.GS_PRIVATE_KEY_BASE64,
			airtableApiKey: process.env.AIRTABLE_API_KEY,
			airtableBaseId: process.env.AIRTABLE_BASE_ID
		});
		global.app.get = (key) => key === 'dataStore' ? store : null;
		
		// Start background crawl
		const job = await startBackgroundCrawl(arrondissements, {
			maxPages: 100, // More pages for local runs
			timeout: 60000 // Longer timeout per source
		});
		
		console.log(`✅ Job started: ${job.id}`);
		console.log(`📊 Status: ${job.status}`);
		console.log(`\n⏳ Monitoring progress...\n`);
		
		// Poll for status updates
		const startTime = Date.now();
		const pollInterval = setInterval(async () => {
			const status = getJobStatus(job.id);
			if (!status) {
				console.log('❌ Job not found');
				clearInterval(pollInterval);
				process.exit(1);
			}
			
			const elapsed = Math.round((Date.now() - startTime) / 1000);
			const progress = status.progress || { percent: 0, message: 'Starting...' };
			
			process.stdout.write(`\r⏱️  [${elapsed}s] ${progress.percent}% - ${progress.message}`);
			
			if (status.status === 'completed') {
				clearInterval(pollInterval);
				console.log(`\n\n✅ Crawl completed successfully!`);
				console.log(`📊 Results:`);
				console.log(`   - Entities found: ${status.results.entities.length}`);
				console.log(`   - Errors: ${status.results.errors.length}`);
				console.log(`   - Time taken: ${elapsed}s`);
				console.log(`\n📋 Results saved to Google Sheets`);
				process.exit(0);
			} else if (status.status === 'failed') {
				clearInterval(pollInterval);
				console.log(`\n\n❌ Crawl failed: ${status.error}`);
				process.exit(1);
			}
		}, 2000); // Poll every 2 seconds
		
		// Handle graceful shutdown
		process.on('SIGINT', () => {
			console.log(`\n\n⚠️  Crawler interrupted. Job ${job.id} may still be running.`);
			clearInterval(pollInterval);
			process.exit(0);
		});
		
	} catch (error) {
		console.error('❌ Failed to start crawler:', error);
		process.exit(1);
	}
}

main();

