/**
 * Test the proven mairie crawler approach to see what it finds
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

dotenv.config();

// Get existing activities for 20e via API
async function getExisting20eActivities() {
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
			return activities;
		}
	} catch (error) {
		console.error('Error getting activities:', error.message);
	}
	return [];
}

// Test mairie crawler approach
async function testMairieCrawler() {
	console.log('🔍 Getting existing 20e activities...\n');
	const existingActivities = await getExisting20eActivities();
	console.log(`✅ Found ${existingActivities.length} existing activities\n`);

	if (existingActivities.length === 0) {
		console.log('❌ No existing activities found');
		return;
	}

	// Show sample
	console.log('📋 Sample existing activities:');
	existingActivities.slice(0, 10).forEach((a, i) => {
		console.log(`  ${i + 1}. ${a.title}${a.website ? ` (${a.website})` : ''}`);
	});
	console.log('');

	// Test mairie page
	const arrondissement = '20e';
	const postalCode = '75020';
	const arrNum = arrondissement.replace('er', '').replace('e', '');
	const mairieUrl = `https://mairie${arrNum}.paris.fr/recherche/activites?arrondissements=${postalCode}`;
	
	console.log(`🔍 Testing mairie page: ${mairieUrl}\n`);

	try {
		const response = await fetch(mairieUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9'
			},
			timeout: 20000
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const html = await response.text();
		
		// Save HTML for inspection
		console.log(`📄 HTML length: ${html.length} characters`);
		console.log(`📄 First 2000 chars: ${html.substring(0, 2000)}\n`);
		
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Find activity links using proven selectors
		const activityLinks = new Set();
		const baseUrl = `https://mairie${arrNum}.paris.fr`;

		// Try ALL links first to see what's available
		const allLinks = document.querySelectorAll('a[href]');
		console.log(`📊 Found ${allLinks.length} total links on page\n`);
		
		// Show first 20 links for debugging
		console.log('📋 First 20 links found:');
		Array.from(allLinks).slice(0, 20).forEach((link, i) => {
			const href = link.getAttribute('href');
			const text = link.textContent?.trim().substring(0, 50) || '';
			console.log(`  ${i + 1}. ${href} - "${text}"`);
		});
		console.log('');

		const activitySelectors = [
			'a[href*="/activites/"]',
			'a[href*="/activite/"]',
			'a[href*="activites"]',
			'a[href*="activite"]',
			'article a',
			'.result-item a',
			'.activity-item a',
			'.search-result a',
			'[class*="result"] a',
			'[class*="activity"] a',
			'[class*="activite"] a',
			'.card a',
			'.item a',
			'li a[href*="activite"]',
			'a[href*="/pages/"]', // Try pages links
			'a[href*="/page/"]',
			'.content a',
			'main a',
			'[role="main"] a'
		];
		
		for (const selector of activitySelectors) {
			try {
				const links = document.querySelectorAll(selector);
				for (const link of links) {
					const href = link.getAttribute('href');
					if (!href) continue;
					
					// More lenient matching
					const hrefLower = href.toLowerCase();
					const linkText = (link.textContent || '').toLowerCase();
					
					const isActivityLink = hrefLower.includes('activite') || 
					                     hrefLower.includes('activites') ||
					                     hrefLower.includes('/pages/') ||
					                     linkText.includes('activité') ||
					                     linkText.includes('activite') ||
					                     linkText.includes('association') ||
					                     linkText.includes('club');
					
					if (isActivityLink) {
						let fullUrl = href;
						if (href.startsWith('/')) {
							fullUrl = `${baseUrl}${href}`;
						} else if (!href.startsWith('http')) {
							fullUrl = `${baseUrl}/${href}`;
						}
						
						// Filter out obvious non-activity links
						if (fullUrl.startsWith('http') && 
						    !fullUrl.includes('newsletter') &&
						    !fullUrl.includes('cdn') &&
						    !fullUrl.includes('font-awesome') &&
						    !fullUrl.includes('.css') &&
						    !fullUrl.includes('.js')) {
							activityLinks.add(fullUrl);
						}
					}
				}
			} catch (e) {
				// Skip selector errors
			}
		}

		// Also search for URLs in page text (more comprehensive)
		const urlPatterns = [
			/https?:\/\/mairie\d+\.paris\.fr\/[^"'\s<>]*activit[^"'\s<>]*/gi,
			/https?:\/\/mairie\d+\.paris\.fr\/pages\/[^"'\s<>]*/gi,
			/https?:\/\/mairie\d+\.paris\.fr\/[^"'\s<>]*association[^"'\s<>]*/gi
		];
		
		for (const pattern of urlPatterns) {
			const urlMatches = html.match(pattern);
			if (urlMatches) {
				urlMatches.forEach(url => {
					if (!url.includes('newsletter') && !url.includes('cdn')) {
						activityLinks.add(url);
					}
				});
			}
		}
		
		// Parse JSON-LD structured data
		const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (const script of jsonLdScripts) {
			try {
				const jsonLd = JSON.parse(script.textContent);
				const extractUrls = (obj) => {
					if (typeof obj !== 'object' || obj === null) return;
					if (Array.isArray(obj)) {
						obj.forEach(extractUrls);
					} else {
						for (const [key, value] of Object.entries(obj)) {
							if (key === 'url' && typeof value === 'string' && 
							    (value.includes('activite') || value.includes('association'))) {
								activityLinks.add(value);
							} else if (typeof value === 'object') {
								extractUrls(value);
							}
						}
					}
				};
				extractUrls(jsonLd);
			} catch (e) {
				// Invalid JSON-LD, skip
			}
		}

		console.log(`✅ Found ${activityLinks.size} activity links on mairie page\n`);

		// Test extracting from first 10 activity pages
		const activityArray = Array.from(activityLinks).slice(0, 10);
		const foundOrganizations = [];
		const matchedExisting = new Set();

		console.log(`📋 Testing extraction from ${activityArray.length} activity pages...\n`);

		for (let i = 0; i < activityArray.length; i++) {
			const activityUrl = activityArray[i];
			try {
				console.log(`  [${i + 1}/${activityArray.length}] Testing: ${activityUrl}`);
				
				const pageResponse = await fetch(activityUrl, {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						'Accept-Language': 'fr-FR,fr;q=0.9'
					},
					timeout: 15000
				});

				if (!pageResponse.ok) {
					console.log(`    ⚠️  HTTP ${pageResponse.status}`);
					continue;
				}

				const pageHtml = await pageResponse.text();
				const pageDom = new JSDOM(pageHtml);
				const pageDoc = pageDom.window.document;

				// Extract title
				const title = pageDoc.querySelector('h1')?.textContent?.trim() ||
				             pageDoc.querySelector('.title')?.textContent?.trim() ||
				             pageDoc.querySelector('title')?.textContent?.trim() || '';

				// Extract website
				let orgWebsite = null;
				let orgName = title;

				const websiteSelectors = [
					'a[href^="http"]:not([href*="mairie"]):not([href*="paris.fr"])',
					'a[href^="https://"]',
					'.website',
					'.site-web',
					'[class*="website"]',
					'[class*="site"]',
					'a[href*="www."]'
				];

				for (const selector of websiteSelectors) {
					const links = pageDoc.querySelectorAll(selector);
					for (const link of links) {
						const href = link.getAttribute('href');
						if (href && href.startsWith('http') && 
						    !href.includes('mairie') && 
						    !href.includes('paris.fr') &&
						    !href.includes('facebook.com') &&
						    !href.includes('instagram.com') &&
						    !href.includes('twitter.com') &&
						    !href.includes('youtube.com')) {
							orgWebsite = href;
							const linkText = link.textContent?.trim();
							if (linkText && linkText.length > 3 && linkText.length < 50) {
								orgName = linkText;
							}
							break;
						}
					}
					if (orgWebsite) break;
				}

				// Search in text for URLs
				if (!orgWebsite) {
					const urlPattern = /https?:\/\/[^\s<>"']+[^.,;!?]/g;
					const matches = pageHtml.match(urlPattern);
					if (matches) {
						for (const url of matches) {
							const cleanUrl = url.replace(/[.,;!?]+$/, '');
							if (!cleanUrl.includes('mairie') && 
							    !cleanUrl.includes('paris.fr') &&
							    !cleanUrl.includes('facebook.com') &&
							    !cleanUrl.includes('instagram.com') &&
							    !cleanUrl.includes('twitter.com') &&
							    !cleanUrl.includes('youtube.com') &&
							    cleanUrl.includes('.')) {
								orgWebsite = cleanUrl;
								break;
							}
						}
					}
				}

				// Extract email
				const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
				const emailMatch = pageHtml.match(emailPattern);
				const email = emailMatch ? emailMatch.find(e => !e.includes('mairie') && !e.includes('paris.fr') && !e.includes('noreply')) : null;

				const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
				const phoneMatch = pageHtml.match(phonePattern);
				const phone = phoneMatch ? phoneMatch[0].trim() : null;

				if (orgWebsite || email || phone) {
					foundOrganizations.push({
						name: orgName,
						website: orgWebsite,
						email: email,
						phone: phone,
						sourceUrl: activityUrl
					});

					// Check if it matches existing
					const orgNameLower = orgName.toLowerCase();
					for (const existing of existingActivities) {
						const existingName = existing.title.toLowerCase();
						const existingWebsite = existing.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
						const foundWebsite = orgWebsite ? orgWebsite.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '') : '';

						if (orgNameLower.includes(existingName) || 
						    existingName.includes(orgNameLower) ||
						    (foundWebsite && existingWebsite && foundWebsite.includes(existingWebsite))) {
							matchedExisting.add(existing.title);
							console.log(`    ✅ MATCHED: ${orgName} → ${existing.title}`);
							break;
						}
					}

					if (!matchedExisting.has(orgName)) {
						console.log(`    ✅ Found: ${orgName}${orgWebsite ? ` (${orgWebsite})` : ''}`);
					}
				} else {
					console.log(`    ⚠️  No contact info found`);
				}

				// Rate limiting
				await new Promise(resolve => setTimeout(resolve, 2000));

			} catch (error) {
				console.log(`    ❌ Error: ${error.message}`);
			}
		}

		// Summary
		console.log('\n\n📊 SUMMARY\n');
		console.log(`Total existing activities: ${existingActivities.length}`);
		console.log(`Activity links found on mairie page: ${activityLinks.size}`);
		console.log(`Organizations extracted: ${foundOrganizations.length}`);
		console.log(`Matched existing activities: ${matchedExisting.size}`);
		console.log(`Coverage: ${((matchedExisting.size / existingActivities.length) * 100).toFixed(1)}%\n`);

		console.log('✅ Matched organizations:');
		Array.from(matchedExisting).forEach((title, i) => {
			console.log(`  ${i + 1}. ${title}`);
		});

		console.log('\n📋 New organizations found (not in existing):');
		foundOrganizations
			.filter(org => !Array.from(matchedExisting).some(existing => 
				org.name.toLowerCase().includes(existing.toLowerCase()) ||
				existing.toLowerCase().includes(org.name.toLowerCase())
			))
			.forEach((org, i) => {
				console.log(`  ${i + 1}. ${org.name}${org.website ? ` (${org.website})` : ''}`);
			});

	} catch (error) {
		console.error('❌ Error:', error.message);
		console.error(error.stack);
	}
}

testMairieCrawler().catch(console.error);

