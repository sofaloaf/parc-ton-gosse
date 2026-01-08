#!/usr/bin/env node
/**
 * Automated Quality Assurance and Review System
 * 
 * This script automatically:
 * 1. Runs enrichment process
 * 2. Grades results using quality metrics
 * 3. Reviews and evaluates outcomes
 * 4. Automatically adjusts strategies
 * 5. Iterates until quality thresholds are met
 * 6. Shows final results for approval
 * 
 * Usage:
 *   node server/scripts/automatedQualityReview.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import { searchWeb } from '../utils/searchProviders.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

const LEARNING_DATA_PATH = join(__dirname, '../data/enrichment-learning.json');
const QUALITY_METRICS_PATH = join(__dirname, '../data/quality-metrics.json');

// Quality thresholds
const QUALITY_THRESHOLDS = {
	minWebsiteCoverage: 0.60, // 60% of organizations should have websites found
	minEmailCoverage: 0.30,   // 30% should have emails
	minPhoneCoverage: 0.25,   // 25% should have phones
	minRegistrationCoverage: 0.15, // 15% should have registration links
	minOverallScore: 0.70,    // Overall quality score (0-1)
	maxIncorrectRate: 0.10    // Max 10% incorrect websites
};

// Learning data
let learningData = {
	successfulQueries: [],
	failedOrganizations: [],
	incorrectWebsites: [],
	searchStrategyWeights: {
		strategy1: 1.0,
		strategy2: 1.0,
		strategy3: 1.0
	},
	qualityHistory: []
};

/**
 * Load learning data
 */
async function loadLearningData() {
	try {
		const data = await fs.readFile(LEARNING_DATA_PATH, 'utf-8');
		learningData = { ...learningData, ...JSON.parse(data) };
	} catch (error) {
		// Start fresh
	}
}

/**
 * Save learning data
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
 */
async function getOrganizationWebsite(orgName, existingWebsite, categories, activityType, address) {
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
	const failedOrg = learningData.failedOrganizations.find(f => 
		f.name.toLowerCase() === orgName.toLowerCase()
	);
	if (failedOrg && failedOrg.confirmedNoWebsite) {
		return null;
	}
	
	// Check if any search provider is available
	const hasSearchProvider = !!(
		process.env.BING_SEARCH_API_KEY ||
		process.env.SERPER_API_KEY ||
		process.env.SERPAPI_KEY ||
		process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ||
		true // DuckDuckGo is always available
	);
	
	if (!hasSearchProvider) {
		return null;
	}
	
	// Build flexible search queries with learning adjustments
	// Improved query strategies for better results
	const searchStrategies = [];
	
	// Strategy 1: Most specific - name + activity + Paris + arrondissement
	let queryParts1 = [`"${orgName}"`]; // Use quotes for exact phrase
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
		weight: learningData.searchStrategyWeights.strategy1,
		strategy: 'strategy1'
	});
	
	// Strategy 2: Name + Paris + arrondissement (without quotes for flexibility)
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
		weight: learningData.searchStrategyWeights.strategy2,
		strategy: 'strategy2'
	});
	
	// Strategy 3: Name + activity type
	if (activityType || (categories && categories.length > 0)) {
		const activity = activityType || categories[0];
		searchStrategies.push({
			query: `${orgName} ${activity} Paris`,
			weight: learningData.searchStrategyWeights.strategy2 * 0.9,
			strategy: 'strategy3'
		});
	}
	
	// Strategy 4: Name + "site web" or "website"
	searchStrategies.push({
		query: `${orgName} "site web" Paris`,
		weight: learningData.searchStrategyWeights.strategy3,
		strategy: 'strategy4'
	});
	
	// Strategy 5: Name without special characters (cleaner search)
	const cleanName = orgName.replace(/[·•]/g, ' ').replace(/\s+/g, ' ').trim();
	if (cleanName !== orgName) {
		searchStrategies.push({
			query: `${cleanName} Paris association`,
			weight: learningData.searchStrategyWeights.strategy3 * 0.9,
			strategy: 'strategy5'
		});
	}
	
	// Strategy 6: Name only (most general, lowest priority)
	searchStrategies.push({
		query: orgName,
		weight: learningData.searchStrategyWeights.strategy3 * 0.8,
		strategy: 'strategy6'
	});
	
	// Sort by weight (highest first)
	searchStrategies.sort((a, b) => b.weight - a.weight);
	
	// Try each strategy with multi-provider search
	for (let strategyIndex = 0; strategyIndex < searchStrategies.length; strategyIndex++) {
		const { query, strategy } = searchStrategies[strategyIndex];
		
		try {
			// Use multi-provider search with automatic fallback
			const searchResult = await searchWeb(query);
			
			if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
				// No results from this strategy, try next
				continue;
			}
			
			const items = searchResult.results;
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
				const incorrect = learningData.incorrectWebsites.find(i => 
					i.organization.toLowerCase() === orgName.toLowerCase() &&
					i.website === link
				);
				if (incorrect) {
					continue;
				}
				
				const titleSnippet = `${title} ${snippet}`;
				const matchingWords = orgNameWords.filter(word => titleSnippet.includes(word));
				
				if (matchingWords.length >= Math.min(2, orgNameWords.length) || 
				    (orgNameWords.length <= 2 && matchingWords.length >= 1)) {
					// Record successful query
					learningData.successfulQueries.push({
						organization: orgName,
						query: query,
						strategy: strategy,
						provider: searchResult.provider,
						website: link,
						timestamp: new Date().toISOString()
					});
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
					learningData.successfulQueries.push({
						organization: orgName,
						query: query,
						strategy: strategy,
						provider: searchResult.provider,
						website: link,
						timestamp: new Date().toISOString()
					});
					return link;
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
	try {
		const sheets = getSheetsClient();
		const sheetId = process.env.GS_SHEET_ID;
		
		// Check which search providers are available
		const availableProviders = [];
		if (process.env.BING_SEARCH_API_KEY) availableProviders.push('Bing (3,000 free/month) ⭐');
		if (process.env.SERPER_API_KEY) availableProviders.push('Serper (2,500 free/month)');
		if (process.env.SERPAPI_KEY) availableProviders.push('SerpApi (250 free/month)');
		if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY) availableProviders.push('Google (100 free/day)');
		availableProviders.push('DuckDuckGo (unlimited, free)');
		
		console.log(`🔍 Available search providers: ${availableProviders.join(', ')}`);
		if (process.env.BING_SEARCH_API_KEY) {
			console.log(`   ✅ Bing API configured - will use for best results!`);
		} else {
			console.log(`   💡 Tip: Add BING_SEARCH_API_KEY for 3,000 free searches/month (see BING-API-QUICK-SETUP.md)`);
		}
		
		const organizations = await readParisOpenData(sheets, sheetId);
		const orgsToProcess = sampleSize ? organizations.slice(0, sampleSize) : organizations;
	
	const results = [];
	
		for (let i = 0; i < orgsToProcess.length; i++) {
		const org = orgsToProcess[i];
		const orgName = (org['Nom'] || '').trim();
		
		if (!orgName) continue;
		
		// Progress logging for first few and every 50
		if (i < 3 || (i + 1) % 50 === 0) {
			console.log(`  🔍 Processing ${i + 1}/${orgsToProcess.length}: ${orgName.substring(0, 50)}...`);
		}
		
		const secteurs = (org['Secteurs d\'Activités'] || '').split(';').map(s => s.trim()).filter(Boolean);
		const activityType = secteurs[0] || '';
		const categories = secteurs;
		const address = org['Adresse'] || '';
		const codePostal = org['Code Postal'] || '';
		const fullAddress = [address, codePostal].filter(Boolean).join(' ');
		
		// Check if website exists in sheet first
		const existingWebsite = org['Site Web'] || org['Website'] || org['site web'] || '';
		let website = existingWebsite.trim();
		
		// If no website in sheet, try to search
		if (!website) {
			website = await getOrganizationWebsite(orgName, null, categories, activityType, fullAddress);
		} else {
			// Format existing website
			if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
				website = `https://${website}`;
			}
		}
		
		if (i < 3 && website) {
			// Find which provider was used
			const lastQuery = learningData.successfulQueries[learningData.successfulQueries.length - 1];
			const provider = lastQuery?.provider || 'existing';
			console.log(`     ✅ Found website via ${provider}: ${website.substring(0, 60)}...`);
		}
		
		const extractedInfo = website ? await extractFromWebsite(website, orgName) : null;
		
		results.push({
			organization: orgName,
			website: website || null,
			email: extractedInfo?.email || null,
			phone: extractedInfo?.phone || null,
			registrationLink: extractedInfo?.registrationLink || null,
			hadWebsiteInSheet: !!(org['Site Web'] && org['Site Web'].trim())
		});
		
		// Rate limiting (more aggressive for DuckDuckGo to avoid blocking)
		const delay = process.env.BING_SEARCH_API_KEY ? 500 : 2000; // Faster with Bing, slower with DuckDuckGo
		if ((i + 1) % 10 === 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	return results;
	} catch (error) {
		if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
			console.error('\n❌ Network error: Cannot connect to Google APIs');
			console.error('   Please check your internet connection and try again.');
			console.error('   Error:', error.message);
			// Return empty results instead of crashing
			return [];
		}
		throw error;
	}
}

/**
 * Grade results using quality metrics
 */
function gradeResults(results) {
	const total = results.length;
	const withWebsite = results.filter(r => r.website).length;
	const withEmail = results.filter(r => r.email).length;
	const withPhone = results.filter(r => r.phone).length;
	const withRegistration = results.filter(r => r.registrationLink).length;
	const withoutWebsite = results.filter(r => !r.website).length;
	
	const metrics = {
		websiteCoverage: withWebsite / total,
		emailCoverage: withEmail / total,
		phoneCoverage: withPhone / total,
		registrationCoverage: withRegistration / total,
		missingWebsiteRate: withoutWebsite / total
	};
	
	// Calculate overall score (weighted average)
	const overallScore = (
		metrics.websiteCoverage * 0.40 +
		metrics.emailCoverage * 0.25 +
		metrics.phoneCoverage * 0.20 +
		metrics.registrationCoverage * 0.15
	);
	
	// Check if thresholds are met
	const meetsThresholds = {
		websiteCoverage: metrics.websiteCoverage >= QUALITY_THRESHOLDS.minWebsiteCoverage,
		emailCoverage: metrics.emailCoverage >= QUALITY_THRESHOLDS.minEmailCoverage,
		phoneCoverage: metrics.phoneCoverage >= QUALITY_THRESHOLDS.minPhoneCoverage,
		registrationCoverage: metrics.registrationCoverage >= QUALITY_THRESHOLDS.minRegistrationCoverage,
		overallScore: overallScore >= QUALITY_THRESHOLDS.minOverallScore
	};
	
	const allThresholdsMet = Object.values(meetsThresholds).every(v => v);
	
	return {
		metrics,
		overallScore,
		meetsThresholds,
		allThresholdsMet,
		summary: {
			total,
			withWebsite,
			withEmail,
			withPhone,
			withRegistration,
			withoutWebsite
		}
	};
}

/**
 * Analyze and suggest improvements
 */
function analyzeAndImprove(grade, results) {
	const improvements = [];
	
	// Analyze website coverage
	if (grade.metrics.websiteCoverage < QUALITY_THRESHOLDS.minWebsiteCoverage) {
		improvements.push({
			issue: 'Low website coverage',
			current: `${(grade.metrics.websiteCoverage * 100).toFixed(1)}%`,
			target: `${(QUALITY_THRESHOLDS.minWebsiteCoverage * 100).toFixed(1)}%`,
			action: 'Increase search strategy diversity and improve query building'
		});
	}
	
	// Analyze email coverage
	if (grade.metrics.emailCoverage < QUALITY_THRESHOLDS.minEmailCoverage) {
		improvements.push({
			issue: 'Low email coverage',
			current: `${(grade.metrics.emailCoverage * 100).toFixed(1)}%`,
			target: `${(QUALITY_THRESHOLDS.minEmailCoverage * 100).toFixed(1)}%`,
			action: 'Improve email extraction patterns and check more page sections'
		});
	}
	
	// Analyze phone coverage
	if (grade.metrics.phoneCoverage < QUALITY_THRESHOLDS.minPhoneCoverage) {
		improvements.push({
			issue: 'Low phone coverage',
			current: `${(grade.metrics.phoneCoverage * 100).toFixed(1)}%`,
			target: `${(QUALITY_THRESHOLDS.minPhoneCoverage * 100).toFixed(1)}%`,
			action: 'Improve phone extraction patterns and check contact pages'
		});
	}
	
	// Analyze registration coverage
	if (grade.metrics.registrationCoverage < QUALITY_THRESHOLDS.minRegistrationCoverage) {
		improvements.push({
			issue: 'Low registration link coverage',
			current: `${(grade.metrics.registrationCoverage * 100).toFixed(1)}%`,
			target: `${(QUALITY_THRESHOLDS.minRegistrationCoverage * 100).toFixed(1)}%`,
			action: 'Expand registration keyword list and check more link patterns'
		});
	}
	
	// Adjust strategy weights based on success
	adjustStrategyWeights();
	
	return improvements;
}

/**
 * Adjust search strategy weights based on learning
 */
function adjustStrategyWeights() {
	const strategyCounts = {
		strategy1: 0,
		strategy2: 0,
		strategy3: 0
	};
	
	// Count recent successful queries (last 100)
	const recentQueries = learningData.successfulQueries.slice(-100);
	recentQueries.forEach(sq => {
		if (strategyCounts[sq.strategy] !== undefined) {
			strategyCounts[sq.strategy]++;
		}
	});
	
	const total = strategyCounts.strategy1 + strategyCounts.strategy2 + strategyCounts.strategy3;
	if (total > 0) {
		// Adjust weights: more successful = higher weight
		learningData.searchStrategyWeights.strategy1 = 1.0 + (strategyCounts.strategy1 / total) * 0.5;
		learningData.searchStrategyWeights.strategy2 = 1.0 + (strategyCounts.strategy2 / total) * 0.5;
		learningData.searchStrategyWeights.strategy3 = 1.0 + (strategyCounts.strategy3 / total) * 0.5;
	}
}

/**
 * Display grade report
 */
function displayGradeReport(grade, iteration) {
	console.log('\n' + '='.repeat(80));
	console.log(`📊 QUALITY GRADE REPORT - ITERATION ${iteration}`);
	console.log('='.repeat(80));
	
	console.log(`\n📈 Coverage Metrics:`);
	console.log(`   Website Coverage:     ${(grade.metrics.websiteCoverage * 100).toFixed(1)}% ${grade.meetsThresholds.websiteCoverage ? '✅' : '❌'} (target: ${(QUALITY_THRESHOLDS.minWebsiteCoverage * 100).toFixed(1)}%)`);
	console.log(`   Email Coverage:       ${(grade.metrics.emailCoverage * 100).toFixed(1)}% ${grade.meetsThresholds.emailCoverage ? '✅' : '❌'} (target: ${(QUALITY_THRESHOLDS.minEmailCoverage * 100).toFixed(1)}%)`);
	console.log(`   Phone Coverage:       ${(grade.metrics.phoneCoverage * 100).toFixed(1)}% ${grade.meetsThresholds.phoneCoverage ? '✅' : '❌'} (target: ${(QUALITY_THRESHOLDS.minPhoneCoverage * 100).toFixed(1)}%)`);
	console.log(`   Registration Coverage: ${(grade.metrics.registrationCoverage * 100).toFixed(1)}% ${grade.meetsThresholds.registrationCoverage ? '✅' : '❌'} (target: ${(QUALITY_THRESHOLDS.minRegistrationCoverage * 100).toFixed(1)}%)`);
	
	console.log(`\n🎯 Overall Quality Score: ${(grade.overallScore * 100).toFixed(1)}% ${grade.meetsThresholds.overallScore ? '✅' : '❌'} (target: ${(QUALITY_THRESHOLDS.minOverallScore * 100).toFixed(1)}%)`);
	
	console.log(`\n📋 Summary:`);
	console.log(`   Total organizations: ${grade.summary.total}`);
	console.log(`   ✅ Websites found: ${grade.summary.withWebsite}`);
	console.log(`   📧 Emails found: ${grade.summary.withEmail}`);
	console.log(`   📞 Phones found: ${grade.summary.withPhone}`);
	console.log(`   📝 Registration links found: ${grade.summary.withRegistration}`);
	console.log(`   ❌ No website: ${grade.summary.withoutWebsite}`);
	
	console.log(`\n📊 Strategy Weights:`);
	console.log(`   Strategy 1 (name + Paris + activity): ${learningData.searchStrategyWeights.strategy1.toFixed(2)}`);
	console.log(`   Strategy 2 (name + Paris): ${learningData.searchStrategyWeights.strategy2.toFixed(2)}`);
	console.log(`   Strategy 3 (name only): ${learningData.searchStrategyWeights.strategy3.toFixed(2)}`);
	
	if (grade.allThresholdsMet) {
		console.log(`\n✅ ALL QUALITY THRESHOLDS MET!`);
	} else {
		console.log(`\n⚠️  Some quality thresholds not met. Adjusting strategies...`);
	}
	
	console.log('='.repeat(80));
}

/**
 * Main automated review loop
 */
async function automatedReview() {
	await loadLearningData();
	
	console.log('\n🤖 AUTOMATED QUALITY ASSURANCE SYSTEM');
	console.log('='.repeat(80));
	console.log('This system will automatically:');
	console.log('  1. Run enrichment process');
	console.log('  2. Grade results using quality metrics');
	console.log('  3. Analyze and improve strategies');
	console.log('  4. Iterate until quality thresholds are met');
	console.log('  5. Show final results for approval');
	console.log('='.repeat(80));
	
	let iteration = 1;
	let maxIterations = 5;
	let allThresholdsMet = false;
	let finalResults = null;
	let finalGrade = null;
	
	while (iteration <= maxIterations && !allThresholdsMet) {
		console.log(`\n🔄 ITERATION ${iteration}/${maxIterations}`);
		
		// Run enrichment (sample for first iteration, then full)
		const sampleSize = iteration === 1 ? 100 : null;
		console.log(`\n🔍 Running enrichment${sampleSize ? ` (sample: ${sampleSize} orgs)` : ' (all organizations)'}...`);
		
		const results = await runEnrichment(sampleSize);
		finalResults = results;
		
		// Grade results
		console.log(`\n📊 Grading results...`);
		const grade = gradeResults(results);
		finalGrade = grade;
		
		// Display grade report
		displayGradeReport(grade, iteration);
		
		// Record quality history
		learningData.qualityHistory.push({
			iteration,
			grade,
			timestamp: new Date().toISOString()
		});
		
		// Check if thresholds are met
		if (grade.allThresholdsMet) {
			allThresholdsMet = true;
			console.log(`\n✅ Quality thresholds met! Proceeding to final run...`);
		} else {
			// Analyze and improve
			console.log(`\n🔧 Analyzing and adjusting strategies...`);
			const improvements = analyzeAndImprove(grade, results);
			
			if (improvements.length > 0) {
				console.log(`\n💡 Suggested improvements:`);
				improvements.forEach((imp, i) => {
					console.log(`   ${i + 1}. ${imp.issue}`);
					console.log(`      Current: ${imp.current}, Target: ${imp.target}`);
					console.log(`      Action: ${imp.action}`);
				});
			}
			
			// Save learning data
			await saveLearningData();
			
			iteration++;
			
			if (iteration <= maxIterations) {
				console.log(`\n⏳ Waiting 2 seconds before next iteration...`);
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		}
	}
	
	// Final run on all organizations if thresholds met
	if (allThresholdsMet) {
		console.log(`\n🚀 Running final enrichment on ALL organizations...`);
		finalResults = await runEnrichment(); // All organizations
		finalGrade = gradeResults(finalResults);
		displayGradeReport(finalGrade, 'FINAL');
	}
	
	// Final approval report
	console.log('\n' + '='.repeat(80));
	console.log('✅ FINAL RESULTS FOR APPROVAL');
	console.log('='.repeat(80));
	
	if (finalGrade) {
		console.log(`\n📊 Final Quality Score: ${(finalGrade.overallScore * 100).toFixed(1)}%`);
		console.log(`\n📋 Final Summary:`);
		console.log(`   Total organizations processed: ${finalGrade.summary.total}`);
		console.log(`   ✅ Websites found: ${finalGrade.summary.withWebsite} (${(finalGrade.metrics.websiteCoverage * 100).toFixed(1)}%)`);
		console.log(`   📧 Emails found: ${finalGrade.summary.withEmail} (${(finalGrade.metrics.emailCoverage * 100).toFixed(1)}%)`);
		console.log(`   📞 Phones found: ${finalGrade.summary.withPhone} (${(finalGrade.metrics.phoneCoverage * 100).toFixed(1)}%)`);
		console.log(`   📝 Registration links found: ${finalGrade.summary.withRegistration} (${(finalGrade.metrics.registrationCoverage * 100).toFixed(1)}%)`);
		
		if (finalGrade.allThresholdsMet) {
			console.log(`\n✅ ALL QUALITY THRESHOLDS MET!`);
			console.log(`\n✅ Results are ready to be saved to Google Sheets.`);
			console.log(`   Run the main enrichment script to save these results.`);
		} else {
			console.log(`\n⚠️  Some quality thresholds not met after ${maxIterations} iterations.`);
			console.log(`   Results may still be useful, but consider manual review.`);
		}
	}
	
	// Save final learning data
	await saveLearningData();
	
	console.log('\n' + '='.repeat(80));
}

// Run automated review
automatedReview().catch(error => {
	console.error('\n❌ Error:', error);
	process.exit(1);
});

