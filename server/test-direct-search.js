/**
 * Test direct search approaches using organization names and websites
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

dotenv.config();

// Get existing activities
async function getExisting20eActivities() {
	try {
		const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
		const response = await fetch(`${apiUrl}/activities?neighborhood=20e&limit=200`);
		if (response.ok) {
			const data = await response.json();
			return (data.data || data || []).map(a => ({
				title: a.title?.fr || a.title?.en || a.title || '',
				website: a.websiteLink || a.website || '',
				id: a.id
			})).filter(a => a.title);
		}
	} catch (error) {
		console.error('Error:', error.message);
	}
	return [];
}

// Search for organization by name on mairie site
async function searchMairieByName(orgName) {
	try {
		const searchUrl = `https://mairie20.paris.fr/recherche?q=${encodeURIComponent(orgName)}`;
		const response = await fetch(searchUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
			},
			timeout: 15000
		});

		if (!response.ok) return null;

		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Look for activity links in search results
		const links = document.querySelectorAll('a[href*="activite"], a[href*="/pages/"]');
		return Array.from(links).map(link => ({
			href: link.getAttribute('href'),
			text: link.textContent?.trim()
		}));
	} catch (error) {
		return null;
	}
}

// Try to find organization website directly
async function findOrganizationWebsite(orgName, website) {
	const results = {
		found: false,
		method: null,
		url: null
	};

	// Method 1: If website exists, try to access it
	if (website) {
		try {
			let testUrl = website;
			if (!testUrl.startsWith('http')) {
				testUrl = `https://${testUrl}`;
			}
			
			const response = await fetch(testUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0' },
				timeout: 10000,
				method: 'HEAD'
			});

			if (response.ok) {
				results.found = true;
				results.method = 'direct_website';
				results.url = testUrl;
				return results;
			}
		} catch (error) {
			// Website doesn't exist or is down
		}
	}

	// Method 2: Try common domain patterns
	const nameWords = orgName.toLowerCase()
		.replace(/association|club|cercle|centre/g, '')
		.trim()
		.split(/\s+/)
		.filter(w => w.length > 2)
		.slice(0, 3);

	if (nameWords.length > 0) {
		const possibleDomains = [
			`${nameWords.join('')}.fr`,
			`${nameWords.join('')}.com`,
			`${nameWords.join('-')}.fr`,
			`${nameWords.join('-')}.com`,
			`www.${nameWords.join('')}.fr`,
			`www.${nameWords.join('-')}.fr`
		];

		for (const domain of possibleDomains) {
			try {
				const testUrl = `https://${domain}`;
				const response = await fetch(testUrl, {
					headers: { 'User-Agent': 'Mozilla/5.0' },
					timeout: 5000,
					method: 'HEAD'
				});

				if (response.ok) {
					results.found = true;
					results.method = 'guessed_domain';
					results.url = testUrl;
					return results;
				}
			} catch (error) {
				// Domain doesn't exist
			}
		}
	}

	return results;
}

// Main test
async function testDirectSearch() {
	console.log('🔍 Getting existing 20e activities...\n');
	const existingActivities = await getExisting20eActivities();
	console.log(`✅ Found ${existingActivities.length} existing activities\n`);

	// Analyze what we have
	const withWebsite = existingActivities.filter(a => a.website);
	const withoutWebsite = existingActivities.filter(a => !a.website);
	
	console.log(`📊 Analysis:`);
	console.log(`  - With website: ${withWebsite.length} (${((withWebsite.length / existingActivities.length) * 100).toFixed(1)}%)`);
	console.log(`  - Without website: ${withoutWebsite.length} (${((withoutWebsite.length / existingActivities.length) * 100).toFixed(1)}%)\n`);

	// Test website accessibility
	console.log('🌐 Testing website accessibility...\n');
	let accessibleWebsites = 0;
	let inaccessibleWebsites = 0;

	for (const activity of withWebsite.slice(0, 20)) {
		const result = await findOrganizationWebsite(activity.title, activity.website);
		if (result.found) {
			accessibleWebsites++;
			console.log(`  ✅ ${activity.title}: ${result.url} (${result.method})`);
		} else {
			inaccessibleWebsites++;
			console.log(`  ❌ ${activity.title}: ${activity.website} (not accessible)`);
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	console.log(`\n📊 Website accessibility: ${accessibleWebsites} accessible, ${inaccessibleWebsites} inaccessible\n`);

	// Try searching mairie by organization name
	console.log('🔍 Testing mairie search by organization name...\n');
	const testOrgs = existingActivities.slice(0, 5);
	
	for (const org of testOrgs) {
		console.log(`  Searching for: "${org.title}"`);
		const searchResults = await searchMairieByName(org.title);
		if (searchResults && searchResults.length > 0) {
			console.log(`    ✅ Found ${searchResults.length} results`);
			searchResults.slice(0, 3).forEach(r => {
				console.log(`      - ${r.text}: ${r.href}`);
			});
		} else {
			console.log(`    ❌ No results found`);
		}
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	// Recommendations
	console.log('\n\n💡 RECOMMENDATIONS:\n');
	console.log('1. Most organizations have websites - use direct website access');
	console.log('2. Try searching mairie by organization name');
	console.log('3. Use organization websites to extract data directly');
	console.log('4. Build a list of known organization websites for 20e');
}

testDirectSearch().catch(console.error);

