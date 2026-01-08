#!/usr/bin/env node
/**
 * Test Search Queries - Debug Tool
 * 
 * Tests different search queries on a small sample to see which work best
 * 
 * Usage:
 *   node server/scripts/testSearchQueries.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchWeb } from '../utils/searchProviders.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Test organizations (mix of different types)
const testOrganizations = [
	{
		name: 'Paris Cycliste Olympique',
		activityType: 'Cyclisme',
		address: '75020',
		categories: ['sport']
	},
	{
		name: 'Cercle d\'escrime André Gardère',
		activityType: 'Escrime',
		address: '75020',
		categories: ['sport']
	},
	{
		name: 'Association Sportive du Centre de Paris',
		activityType: 'Sport',
		address: '75001',
		categories: ['sport']
	},
	{
		name: 'COMPAGNIE VARSORIO',
		activityType: 'Théâtre',
		address: '75020',
		categories: ['theater']
	},
	{
		name: 'CHOEUR · PRENDRE',
		activityType: 'Musique',
		address: '75020',
		categories: ['music']
	}
];

/**
 * Build search queries (same as main script)
 */
function buildSearchQueries(orgName, activityType, categories, address) {
	const searchStrategies = [];
	
	// Strategy 1: Most specific - name + activity + Paris + arrondissement
	let queryParts1 = [`"${orgName}"`];
	if (activityType) {
		queryParts1.push(activityType);
	} else if (categories && categories.length > 0) {
		queryParts1.push(categories[0]);
	}
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts1.push(arrMatch[0], 'arrondissement');
		}
	}
	queryParts1.push('Paris', 'site officiel');
	searchStrategies.push({
		query: queryParts1.join(' '),
		strategy: 'strategy1',
		description: 'Exact phrase + activity + arrondissement + "site officiel"'
	});
	
	// Strategy 2: Name + Paris + arrondissement
	let queryParts2 = [orgName];
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts2.push(arrMatch[0]);
		}
	}
	queryParts2.push('Paris', 'association');
	searchStrategies.push({
		query: queryParts2.join(' '),
		strategy: 'strategy2',
		description: 'Name + arrondissement + Paris + "association"'
	});
	
	// Strategy 3: Name + activity type
	if (activityType || (categories && categories.length > 0)) {
		const activity = activityType || categories[0];
		searchStrategies.push({
			query: `${orgName} ${activity} Paris`,
			strategy: 'strategy3',
			description: 'Name + activity + Paris'
		});
	}
	
	// Strategy 4: Name + "site web"
	searchStrategies.push({
		query: `${orgName} "site web" Paris`,
		strategy: 'strategy4',
		description: 'Name + "site web" + Paris'
	});
	
	// Strategy 5: Name only
	searchStrategies.push({
		query: orgName,
		strategy: 'strategy5',
		description: 'Name only (most general)'
	});
	
	return searchStrategies;
}

/**
 * Test a single organization
 */
async function testOrganization(org) {
	console.log(`\n${'='.repeat(80)}`);
	console.log(`🔍 Testing: ${org.name}`);
	console.log(`   Activity: ${org.activityType || 'N/A'}`);
	console.log(`   Address: ${org.address || 'N/A'}`);
	console.log(`${'='.repeat(80)}`);
	
	const queries = buildSearchQueries(org.name, org.activityType, org.categories, org.address);
	
	let foundWebsite = false;
	
	for (let i = 0; i < queries.length; i++) {
		const { query, strategy, description } = queries[i];
		
		console.log(`\n📝 Strategy ${i + 1} (${strategy}): ${description}`);
		console.log(`   Query: "${query}"`);
		
		try {
			const result = await searchWeb(query);
			
			if (!result || !result.results || result.results.length === 0) {
				console.log(`   ❌ No results from ${result?.provider || 'unknown'}`);
				continue;
			}
			
			console.log(`   ✅ Found ${result.results.length} results via ${result.provider}`);
			
			// Validate results
			const orgNameLower = org.name.toLowerCase();
			const orgNameWords = orgNameLower.split(/\s+/).filter(w => w.length > 2);
			
			for (let j = 0; j < Math.min(3, result.results.length); j++) {
				const item = result.results[j];
				const title = (item.title || '').toLowerCase();
				const snippet = (item.snippet || '').toLowerCase();
				const link = item.link || '';
				
				// Skip social media
				if (link.includes('facebook.com') || 
				    link.includes('linkedin.com') || 
				    link.includes('wikipedia.org')) {
					console.log(`      ⚠️  Result ${j + 1}: Social media/Wikipedia - ${link.substring(0, 60)}...`);
					continue;
				}
				
				const titleSnippet = `${title} ${snippet}`;
				const matchingWords = orgNameWords.filter(word => titleSnippet.includes(word));
				const matchScore = matchingWords.length / orgNameWords.length;
				
				console.log(`      ${j + 1}. ${item.title || 'No title'}`);
				console.log(`         Link: ${link.substring(0, 70)}...`);
				console.log(`         Match: ${matchingWords.length}/${orgNameWords.length} words (${(matchScore * 100).toFixed(0)}%)`);
				console.log(`         Matched words: ${matchingWords.join(', ') || 'none'}`);
				
				// Check if this looks like a good match
				if (matchScore >= 0.5 || (orgNameWords.length <= 2 && matchingWords.length >= 1)) {
					console.log(`         ✅ GOOD MATCH!`);
					if (!foundWebsite) {
						foundWebsite = true;
						console.log(`\n   🎯 BEST RESULT: ${link}`);
					}
				} else {
					console.log(`         ⚠️  Low match score`);
				}
			}
			
			// If we found a good match, we can stop trying other strategies
			if (foundWebsite) {
				console.log(`\n   ✅ Website found! Stopping search.`);
				break;
			}
			
		} catch (error) {
			console.log(`   ❌ Error: ${error.message}`);
		}
		
		// Small delay between queries
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	if (!foundWebsite) {
		console.log(`\n   ❌ No website found after trying ${queries.length} strategies`);
	}
	
	return foundWebsite;
}

/**
 * Main test function
 */
async function runTests() {
	console.log('\n🧪 SEARCH QUERY TESTING TOOL');
	console.log('='.repeat(80));
	console.log('This tool tests different search strategies on sample organizations');
	console.log('to identify which queries work best.\n');
	
	// Check available providers
	const availableProviders = [];
	if (process.env.BING_SEARCH_API_KEY) availableProviders.push('Bing ⭐');
	if (process.env.SERPER_API_KEY) availableProviders.push('Serper');
	if (process.env.SERPAPI_KEY) availableProviders.push('SerpApi');
	if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY) availableProviders.push('Google');
	availableProviders.push('DuckDuckGo');
	
	console.log(`🔍 Available providers: ${availableProviders.join(', ')}\n`);
	
	const results = {
		total: testOrganizations.length,
		found: 0,
		notFound: 0
	};
	
	for (const org of testOrganizations) {
		const found = await testOrganization(org);
		if (found) {
			results.found++;
		} else {
			results.notFound++;
		}
		
		// Delay between organizations
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
	
	// Summary
	console.log(`\n${'='.repeat(80)}`);
	console.log('📊 TEST SUMMARY');
	console.log(`${'='.repeat(80)}`);
	console.log(`Total organizations tested: ${results.total}`);
	console.log(`✅ Websites found: ${results.found} (${(results.found / results.total * 100).toFixed(1)}%)`);
	console.log(`❌ Not found: ${results.notFound} (${(results.notFound / results.total * 100).toFixed(1)}%)`);
	console.log(`${'='.repeat(80)}\n`);
	
	if (results.found < results.total * 0.5) {
		console.log('💡 Recommendations:');
		console.log('   - Consider adding Bing API for better results');
		console.log('   - Some organizations may not have websites');
		console.log('   - Try different query variations');
	}
}

// Run tests
runTests().catch(error => {
	console.error('\n❌ Error:', error);
	process.exit(1);
});

