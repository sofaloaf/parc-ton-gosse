#!/usr/bin/env node
/**
 * Interactive Review and Improvement System for Paris Open Data Enrichment
 * 
 * This script:
 * 1. Runs the enrichment process
 * 2. Shows results for review
 * 3. Learns from feedback
 * 4. Automatically adjusts search strategies
 * 5. Reruns until satisfied
 * 6. Shows final results for approval
 * 
 * Usage:
 *   node server/scripts/reviewAndImproveEnrichment.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import readline from 'readline';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Learning data storage
const LEARNING_DATA_PATH = join(__dirname, '../data/enrichment-learning.json');

// Learning data structure
let learningData = {
	successfulQueries: [], // Queries that found correct websites
	failedOrganizations: [], // Organizations that couldn't find websites
	incorrectWebsites: [], // Websites that were found but are wrong
	searchStrategyWeights: {
		strategy1: 1.0, // name + Paris + activity
		strategy2: 1.0, // name + Paris
		strategy3: 1.0  // name only
	},
	keywordAdjustments: {} // Adjustments to search keywords
};

/**
 * Load learning data from file
 */
async function loadLearningData() {
	try {
		const data = await fs.readFile(LEARNING_DATA_PATH, 'utf-8');
		learningData = JSON.parse(data);
		console.log('📚 Loaded learning data from previous runs');
	} catch (error) {
		// File doesn't exist yet, start fresh
		console.log('📚 Starting with fresh learning data');
	}
}

/**
 * Save learning data to file
 */
async function saveLearningData() {
	try {
		await fs.mkdir(dirname(LEARNING_DATA_PATH), { recursive: true });
		await fs.writeFile(LEARNING_DATA_PATH, JSON.stringify(learningData, null, 2));
	} catch (error) {
		console.warn('⚠️  Could not save learning data:', error.message);
	}
}

/**
 * Get Google Sheets client
 */
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	let privateKey = process.env.GS_PRIVATE_KEY;
	
	if (!privateKey && process.env.GS_PRIVATE_KEY_BASE64) {
		try {
			privateKey = Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
		} catch (error) {
			console.error('❌ Failed to decode base64 private key:', error.message);
			process.exit(1);
		}
	}
	
	if (!privateKey) {
		console.error('❌ GS_PRIVATE_KEY or GS_PRIVATE_KEY_BASE64 is required');
		process.exit(1);
	}
	
	const auth = new google.auth.JWT({
		email: serviceAccount,
		key: privateKey.replace(/\\n/g, '\n'),
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});
	
	return google.sheets({ version: 'v4', auth });
}

/**
 * Improved website search with learning
 * This is a wrapper around the main enrichment script's search function
 */
async function getOrganizationWebsiteWithLearning(orgName, existingWebsite, categories, activityType, address, learningEnabled = true) {
	// If website already exists in sheet, use it
	if (existingWebsite) {
		let website = existingWebsite.trim();
		if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
			website = `https://${website}`;
		}
		if (website && (website.startsWith('http://') || website.startsWith('https://'))) {
			return website;
		}
	}
	
	// Check if we've learned this organization should not have a website
	if (learningEnabled) {
		const failedOrg = learningData.failedOrganizations.find(f => 
			f.name.toLowerCase() === orgName.toLowerCase()
		);
		if (failedOrg && failedOrg.confirmedNoWebsite) {
			return null;
		}
	}
	
	// Only search if Google Custom Search is configured
	if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX) {
		return null;
	}
	
	// Build flexible search queries with learning adjustments
	const searchStrategies = [];
	
	// Strategy 1: Most specific (with learning weight)
	let queryParts1 = [orgName];
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts1.push(arrMatch[0]);
		}
	}
	if (activityType) {
		queryParts1.push(activityType);
	} else if (categories && categories.length > 0) {
		queryParts1.push(categories[0]);
	}
	queryParts1.push('Paris');
	searchStrategies.push({
		query: queryParts1.join(' '),
		weight: learningData.searchStrategyWeights.strategy1,
		strategy: 'strategy1'
	});
	
	// Strategy 2: Medium specificity
	let queryParts2 = [orgName];
	if (address) {
		const arrMatch = address.match(/750(\d{2})/);
		if (arrMatch) {
			queryParts2.push(arrMatch[0]);
		}
	}
	queryParts2.push('Paris');
	searchStrategies.push({
		query: queryParts2.join(' '),
		weight: learningData.searchStrategyWeights.strategy2,
		strategy: 'strategy2'
	});
	
	// Strategy 3: Most general
	searchStrategies.push({
		query: orgName,
		weight: learningData.searchStrategyWeights.strategy3,
		strategy: 'strategy3'
	});
	
	// Sort by weight (highest first)
	searchStrategies.sort((a, b) => b.weight - a.weight);
	
	// Try each strategy until we find a good match
	for (let strategyIndex = 0; strategyIndex < searchStrategies.length; strategyIndex++) {
		const { query, strategy } = searchStrategies[strategyIndex];
		
		try {
			const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}&num=10`;
			
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000);
			
			const response = await fetch(searchUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0' },
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				continue;
			}
			
			const data = await response.json();
			const items = data.items || [];
			
			if (items.length > 0) {
				const orgNameLower = orgName.toLowerCase();
				const orgNameWords = orgNameLower.split(/\s+/).filter(w => w.length > 2);
				
				for (const item of items) {
					const title = (item.title || '').toLowerCase();
					const snippet = (item.snippet || '').toLowerCase();
					const link = item.link || '';
					
					// Skip social media
					if (link.includes('facebook.com') || 
					    link.includes('linkedin.com') || 
					    link.includes('wikipedia.org') ||
					    link.includes('youtube.com') ||
					    link.includes('twitter.com') ||
					    link.includes('instagram.com')) {
						continue;
					}
					
					// Check if we've learned this website is incorrect
					if (learningEnabled) {
						const incorrect = learningData.incorrectWebsites.find(i => 
							i.organization.toLowerCase() === orgName.toLowerCase() &&
							i.website === link
						);
						if (incorrect) {
							continue; // Skip this website
						}
					}
					
					const titleSnippet = `${title} ${snippet}`;
					const matchingWords = orgNameWords.filter(word => titleSnippet.includes(word));
					
					if (matchingWords.length >= Math.min(2, orgNameWords.length) || 
					    (orgNameWords.length <= 2 && matchingWords.length >= 1)) {
						// Record successful query for learning
						if (learningEnabled) {
							learningData.successfulQueries.push({
								organization: orgName,
								query: query,
								strategy: strategy,
								website: link,
								timestamp: new Date().toISOString()
							});
						}
						return link;
					}
				}
				
				// Fallback: first non-social-media result
				for (const item of items) {
					const link = item.link || '';
					if (!link.includes('facebook.com') && 
					    !link.includes('linkedin.com') && 
					    !link.includes('wikipedia.org') &&
					    !link.includes('youtube.com') &&
					    !link.includes('twitter.com') &&
					    !link.includes('instagram.com')) {
						if (learningEnabled) {
							learningData.successfulQueries.push({
								organization: orgName,
								query: query,
								strategy: strategy,
								website: link,
								timestamp: new Date().toISOString()
							});
						}
						return link;
					}
				}
			}
		} catch (error) {
			continue;
		}
	}
	
	return null;
}

/**
 * Extract information from website
 */
async function extractFromWebsite(websiteUrl, orgName) {
	if (!websiteUrl) return null;
	
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);
		
		const response = await fetch(websiteUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
			},
			signal: controller.signal,
			redirect: 'follow'
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			return null;
		}
		
		const html = await response.text();
		if (!html || html.length < 100) {
			return null;
		}
		
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		// Extract email
		let email = null;
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatches = html.match(emailPattern);
		if (emailMatches && emailMatches.length > 0) {
			const filtered = emailMatches.filter(e => 
				!e.includes('example.com') && 
				!e.includes('test.com') &&
				!e.includes('noreply') &&
				!e.includes('no-reply')
			);
			if (filtered.length > 0) {
				email = filtered[0];
			}
		}
		
		// Extract phone
		let phone = null;
		const phonePatterns = [
			/(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g,
			/(?:\+33\s?|0)[1-9][\s\.\-]?(?:\d{2}[\s\.\-]?){4}/g,
			/0[1-9][\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}/g
		];
		for (const pattern of phonePatterns) {
			const matches = html.match(pattern);
			if (matches && matches.length > 0) {
				phone = matches[0].replace(/[\s\.\-]/g, '');
				break;
			}
		}
		
		// Extract registration link
		let registrationLink = null;
		const registrationKeywords = [
			'inscription', 'inscrire', 'registration', 'register', 'adhesion', 'adhérer',
			's\'inscrire', 'sinscrire', 'inscription en ligne', 'formulaire', 'formulaire d\'inscription'
		];
		
		const links = document.querySelectorAll('a[href]');
		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const text = (link.textContent || '').toLowerCase().trim();
			const hrefLower = href.toLowerCase();
			
			const hasKeyword = registrationKeywords.some(keyword => 
				text.includes(keyword) || hrefLower.includes(keyword)
			);
			
			if (hasKeyword) {
				if (href.startsWith('/')) {
					const baseUrl = new URL(websiteUrl);
					registrationLink = `${baseUrl.origin}${href}`;
				} else if (href.startsWith('http://') || href.startsWith('https://')) {
					registrationLink = href;
				} else {
					const baseUrl = new URL(websiteUrl);
					registrationLink = `${baseUrl.origin}/${href}`;
				}
				break;
			}
		}
		
		return {
			email: email || null,
			phone: phone || null,
			registrationLink: registrationLink || null
		};
	} catch (error) {
		return null;
	}
}

/**
 * Read organizations from Paris Open Data sheet
 */
async function readParisOpenData(sheets, sheetId) {
	try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: 'paris open data!A:L'
		});
		
		const rows = response.data.values || [];
		if (rows.length < 2) {
			return [];
		}
		
		const headers = rows[0];
		const dataRows = rows.slice(1);
		
		return dataRows.map(row => {
			const obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || '';
			});
			return obj;
		});
	} catch (error) {
		console.error('❌ Error reading sheet:', error.message);
		throw error;
	}
}

/**
 * Run enrichment process
 */
async function runEnrichment(sampleSize = null) {
	const sheets = getSheetsClient();
	const sheetId = process.env.GS_SHEET_ID;
	
	console.log('\n🔍 Running enrichment process...\n');
	
	const organizations = await readParisOpenData(sheets, sheetId);
	
	// Limit to sample if specified
	const orgsToProcess = sampleSize ? organizations.slice(0, sampleSize) : organizations;
	
	console.log(`📊 Processing ${orgsToProcess.length} organizations...\n`);
	
	const results = [];
	
	for (let i = 0; i < orgsToProcess.length; i++) {
		const org = orgsToProcess[i];
		const orgName = (org['Nom'] || '').trim();
		
		if (!orgName) continue;
		
		const secteurs = (org['Secteurs d\'Activités'] || '').split(';').map(s => s.trim()).filter(Boolean);
		const activityType = secteurs[0] || '';
		const categories = secteurs;
		const address = org['Adresse'] || '';
		const codePostal = org['Code Postal'] || '';
		const fullAddress = [address, codePostal].filter(Boolean).join(' ');
		
		const website = await getOrganizationWebsiteWithLearning(orgName, org['Site Web'], categories, activityType, fullAddress, true);
		const extractedInfo = website ? await extractFromWebsite(website, orgName) : null;
		
		results.push({
			organization: orgName,
			website: website || null,
			email: extractedInfo?.email || null,
			phone: extractedInfo?.phone || null,
			registrationLink: extractedInfo?.registrationLink || null,
			hadWebsiteInSheet: !!(org['Site Web'] && org['Site Web'].trim())
		});
		
		// Progress indicator
		if ((i + 1) % 10 === 0) {
			const found = results.filter(r => r.website).length;
			console.log(`  ⏳ Progress: ${i + 1}/${orgsToProcess.length} (${found} websites found)`);
		}
		
		// Rate limiting
		if ((i + 1) % 10 === 0) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
	
	return results;
}

/**
 * Display results for review
 */
function displayResults(results) {
	console.log('\n' + '='.repeat(80));
	console.log('📋 ENRICHMENT RESULTS');
	console.log('='.repeat(80));
	
	const withWebsite = results.filter(r => r.website);
	const withoutWebsite = results.filter(r => !r.website);
	const withEmail = results.filter(r => r.email);
	const withPhone = results.filter(r => r.phone);
	const withRegistration = results.filter(r => r.registrationLink);
	
	console.log(`\n📊 Summary:`);
	console.log(`   Total organizations: ${results.length}`);
	console.log(`   ✅ Websites found: ${withWebsite.length} (${(withWebsite.length / results.length * 100).toFixed(1)}%)`);
	console.log(`   📧 Emails found: ${withEmail.length} (${(withEmail.length / results.length * 100).toFixed(1)}%)`);
	console.log(`   📞 Phones found: ${withPhone.length} (${(withPhone.length / results.length * 100).toFixed(1)}%)`);
	console.log(`   📝 Registration links found: ${withRegistration.length} (${(withRegistration.length / results.length * 100).toFixed(1)}%)`);
	console.log(`   ❌ No website: ${withoutWebsite.length}`);
	
	console.log(`\n🌐 Organizations with websites found:`);
	withWebsite.slice(0, 20).forEach((r, i) => {
		console.log(`   ${i + 1}. ${r.organization}`);
		console.log(`      Website: ${r.website}`);
		if (r.email) console.log(`      Email: ${r.email}`);
		if (r.phone) console.log(`      Phone: ${r.phone}`);
		if (r.registrationLink) console.log(`      Registration: ${r.registrationLink}`);
	});
	
	if (withWebsite.length > 20) {
		console.log(`   ... and ${withWebsite.length - 20} more`);
	}
	
	if (withoutWebsite.length > 0) {
		console.log(`\n❌ Organizations without websites (first 20):`);
		withoutWebsite.slice(0, 20).forEach((r, i) => {
			console.log(`   ${i + 1}. ${r.organization}`);
		});
		if (withoutWebsite.length > 20) {
			console.log(`   ... and ${withoutWebsite.length - 20} more`);
		}
	}
	
	console.log('\n' + '='.repeat(80));
}

/**
 * Interactive review interface
 */
function createReviewInterface() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
}

/**
 * Ask user for feedback on a specific result
 */
function askForFeedback(rl, result) {
	return new Promise((resolve) => {
		console.log(`\n📝 Review: ${result.organization}`);
		if (result.website) {
			console.log(`   Website: ${result.website}`);
		} else {
			console.log(`   Website: ❌ Not found`);
		}
		
		rl.question('\n   Is this correct? (y/n/skip): ', (answer) => {
			const lower = answer.toLowerCase().trim();
			if (lower === 'y' || lower === 'yes') {
				resolve('correct');
			} else if (lower === 'n' || lower === 'no') {
				if (result.website) {
					rl.question('   What is the correct website? (or "none" if no website): ', (correctWebsite) => {
						resolve({ type: 'incorrect', correctWebsite: correctWebsite.trim() });
					});
				} else {
					rl.question('   Do you know the website? (enter URL or "none"): ', (correctWebsite) => {
						resolve({ type: 'incorrect', correctWebsite: correctWebsite.trim() });
					});
				}
			} else {
				resolve('skip');
			}
		});
	});
}

/**
 * Apply learning from feedback
 */
function applyLearning(feedback) {
	if (feedback.type === 'incorrect' && feedback.correctWebsite) {
		if (feedback.correctWebsite.toLowerCase() !== 'none') {
			// We found a wrong website, record it
			learningData.incorrectWebsites.push({
				organization: feedback.organization,
				website: feedback.website,
				correctWebsite: feedback.correctWebsite,
				timestamp: new Date().toISOString()
			});
			
			// Adjust strategy weights based on what worked
			// If we can find the correct website with a different query, learn from it
			console.log(`   📚 Learning: Will avoid ${feedback.website} for ${feedback.organization}`);
		} else {
			// Organization confirmed to have no website
			learningData.failedOrganizations.push({
				name: feedback.organization,
				confirmedNoWebsite: true,
				timestamp: new Date().toISOString()
			});
			console.log(`   📚 Learning: ${feedback.organization} confirmed to have no website`);
		}
	}
}

/**
 * Adjust search strategies based on learning
 */
function adjustStrategies() {
	// Count successful queries by strategy
	const strategyCounts = {
		strategy1: 0,
		strategy2: 0,
		strategy3: 0
	};
	
	learningData.successfulQueries.forEach(sq => {
		if (strategyCounts[sq.strategy] !== undefined) {
			strategyCounts[sq.strategy]++;
		}
	});
	
	// Adjust weights (more successful = higher weight)
	const total = strategyCounts.strategy1 + strategyCounts.strategy2 + strategyCounts.strategy3;
	if (total > 0) {
		learningData.searchStrategyWeights.strategy1 = 1.0 + (strategyCounts.strategy1 / total);
		learningData.searchStrategyWeights.strategy2 = 1.0 + (strategyCounts.strategy2 / total);
		learningData.searchStrategyWeights.strategy3 = 1.0 + (strategyCounts.strategy3 / total);
	}
	
	console.log('\n📊 Strategy weights adjusted:');
	console.log(`   Strategy 1 (name + Paris + activity): ${learningData.searchStrategyWeights.strategy1.toFixed(2)}`);
	console.log(`   Strategy 2 (name + Paris): ${learningData.searchStrategyWeights.strategy2.toFixed(2)}`);
	console.log(`   Strategy 3 (name only): ${learningData.searchStrategyWeights.strategy3.toFixed(2)}`);
}

/**
 * Main interactive review loop
 */
async function interactiveReview() {
	await loadLearningData();
	
	const rl = createReviewInterface();
	
	try {
		let iteration = 1;
		let satisfied = false;
		
		while (!satisfied) {
			console.log(`\n🔄 ITERATION ${iteration}`);
			console.log('='.repeat(80));
			
			// Run enrichment (start with sample for first iteration)
			const sampleSize = iteration === 1 ? 50 : null; // First iteration: 50 orgs, then all
			const results = await runEnrichment(sampleSize);
			
			// Display results
			displayResults(results);
			
			// Ask if user wants to review specific results
			const answer = await new Promise((resolve) => {
				rl.question('\n❓ Do you want to review specific results? (y/n): ', resolve);
			});
			
			if (answer.toLowerCase().trim() === 'y') {
				// Review sample of results
				const toReview = results.slice(0, Math.min(20, results.length));
				const feedback = [];
				
				for (const result of toReview) {
					const fb = await askForFeedback(rl, result);
					if (fb !== 'skip') {
						feedback.push({ ...result, feedback: fb });
						if (fb.type === 'incorrect') {
							applyLearning({ ...result, ...fb });
						}
					}
				}
				
				// Save learning data
				await saveLearningData();
				
				// Adjust strategies
				adjustStrategies();
				await saveLearningData();
			}
			
			// Ask if satisfied
			const satisfiedAnswer = await new Promise((resolve) => {
				rl.question('\n✅ Are you satisfied with these results? (y/n): ', resolve);
			});
			
			if (satisfiedAnswer.toLowerCase().trim() === 'y') {
				satisfied = true;
			} else {
				iteration++;
				console.log('\n🔄 Adjusting and rerunning...');
			}
		}
		
		// Final approval
		console.log('\n' + '='.repeat(80));
		console.log('✅ FINAL RESULTS FOR APPROVAL');
		console.log('='.repeat(80));
		
		const finalResults = await runEnrichment(); // Run on all organizations
		displayResults(finalResults);
		
		const approval = await new Promise((resolve) => {
			rl.question('\n✅ Approve these final results? (y/n): ', resolve);
		});
		
		if (approval.toLowerCase().trim() === 'y') {
			console.log('\n✅ Approved! Results are ready to be saved to Google Sheets.');
			console.log('   Run the main enrichment script to save these results.');
		} else {
			console.log('\n⚠️  Not approved. You can continue reviewing and adjusting.');
		}
		
	} finally {
		rl.close();
		await saveLearningData();
	}
}

// Run the interactive review
interactiveReview().catch(error => {
	console.error('\n❌ Error:', error);
	process.exit(1);
});

