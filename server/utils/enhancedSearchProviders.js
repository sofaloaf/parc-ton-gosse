/**
 * Enhanced Multi-Source Free Search Providers
 * 
 * Implements free search solutions:
 * 1. SearXNG (public instances - aggregates multiple sources)
 * 2. Brave Search API (free tier: 2,000 queries/month)
 * 3. Improved DuckDuckGo (unlimited, free)
 * 4. Direct source scraping (Pages Jaunes, associations.gouv.fr)
 * 
 * Priority order: Direct scraping > SearXNG > Brave > DuckDuckGo
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

/**
 * List of public SearXNG instances (from searx.space)
 * Using instances that are known to be reliable
 */
const SEARXNG_INSTANCES = [
	'https://searx.be',
	'https://searx.prvcy.eu',
	'https://searx.tiekoetter.com',
	'https://searx.fmac.xyz',
	'https://search.sapti.me'
];

/**
 * Search using SearXNG (free, aggregates multiple sources)
 */
export async function searchSearXNG(query, locale = 'fr') {
	for (const instance of SEARXNG_INSTANCES) {
		try {
			const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=${locale}`;
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);
			
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; ParcTonGosse/1.0)',
					'Accept': 'application/json'
				},
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				continue; // Try next instance
			}
			
			const data = await response.json();
			
			if (data.results && Array.isArray(data.results)) {
				return data.results.map(result => ({
					title: result.title || '',
					snippet: result.content || '',
					link: result.url || ''
				}));
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.warn(`  ⚠️  SearXNG instance ${instance} failed: ${error.message}`);
			}
			continue; // Try next instance
		}
	}
	
	return null; // All instances failed
}

/**
 * Search using Brave Search API (free tier: 2,000 queries/month)
 */
export async function searchBrave(query, apiKey) {
	if (!apiKey) {
		return null;
	}
	
	try {
		const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&country=FR&search_lang=fr`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);
		
		const response = await fetch(url, {
			headers: {
				'X-Subscription-Token': apiKey,
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ParcTonGosse/1.0)'
			},
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			if (response.status === 401) {
				console.warn('  ⚠️  Brave API: Invalid API key');
			} else if (response.status === 429) {
				console.warn('  ⚠️  Brave API: Rate limit exceeded');
			}
			return null;
		}
		
		const data = await response.json();
		
		if (data.web?.results && Array.isArray(data.web.results)) {
			return data.web.results.map(result => ({
				title: result.title || '',
				snippet: result.description || '',
				link: result.url || ''
			}));
		}
		
		return null;
	} catch (error) {
		if (error.name !== 'AbortError') {
			console.warn(`  ⚠️  Brave Search error: ${error.message}`);
		}
		return null;
	}
}

/**
 * Improved DuckDuckGo search with better query construction
 */
export async function searchDuckDuckGoImproved(query, locale = 'fr-FR') {
	try {
		// Use DuckDuckGo HTML scraping (more reliable than API)
		const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${locale}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);
		
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
			},
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			return null;
		}
		
		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		const results = [];
		const resultElements = document.querySelectorAll('.result');
		
		for (const element of resultElements) {
			const titleElement = element.querySelector('.result__title a');
			const snippetElement = element.querySelector('.result__snippet');
			
			if (titleElement) {
				const title = titleElement.textContent?.trim() || '';
				const link = titleElement.getAttribute('href') || '';
				const snippet = snippetElement?.textContent?.trim() || '';
				
				// Extract actual URL from DuckDuckGo redirect
				const urlMatch = link.match(/uddg=(.+?)&/);
				const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : link;
				
				if (title && actualUrl) {
					results.push({
						title,
						snippet,
						link: actualUrl
					});
				}
			}
			
			if (results.length >= 10) break;
		}
		
		return results.length > 0 ? results : null;
	} catch (error) {
		if (error.name !== 'AbortError') {
			console.warn(`  ⚠️  DuckDuckGo search error: ${error.message}`);
		}
		return null;
	}
}

/**
 * Scrape Pages Jaunes (French business directory - 100% free, very accurate)
 */
export async function scrapePagesJaunes(organizationName, address = '') {
	try {
		// Pages Jaunes search URL
		const query = `${organizationName} ${address}`.trim();
		const url = `https://www.pagesjaunes.fr/recherche?quoi=${encodeURIComponent(organizationName)}&ou=${encodeURIComponent(address || 'Paris')}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);
		
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9'
			},
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			return null;
		}
		
		const html = await response.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		// Find first result card
		const resultCard = document.querySelector('.bi-bloc');
		if (!resultCard) {
			return null;
		}
		
		const result = {};
		
		// Extract phone
		const phoneElement = resultCard.querySelector('a[href^="tel:"]');
		if (phoneElement) {
			const phone = phoneElement.getAttribute('href')?.replace('tel:', '') || '';
			if (phone) result.phone = phone;
		}
		
		// Extract website
		const websiteElement = resultCard.querySelector('a[href^="http"]:not([href*="pagesjaunes.fr"])');
		if (websiteElement) {
			const website = websiteElement.getAttribute('href') || '';
			if (website) result.website = website;
		}
		
		// Extract address
		const addressElement = resultCard.querySelector('.bi-adresse');
		if (addressElement) {
			const addressText = addressElement.textContent?.trim() || '';
			if (addressText) result.address = addressText;
		}
		
		// Extract hours/schedule (if available)
		const hoursElement = resultCard.querySelector('.horaires');
		if (hoursElement) {
			const hours = hoursElement.textContent?.trim() || '';
			if (hours) result.schedule = hours;
		}
		
		return Object.keys(result).length > 0 ? result : null;
	} catch (error) {
		if (error.name !== 'AbortError') {
			console.warn(`  ⚠️  Pages Jaunes scraping error: ${error.message}`);
		}
		return null;
	}
}

/**
 * Scrape associations.gouv.fr (official government database - 100% free, authoritative)
 */
export async function scrapeAssociationsGouv(organizationName) {
	try {
		// Official government registry search
		const url = `https://www.data.gouv.fr/fr/datasets/repertoire-national-des-associations/`;
		
		// Note: The actual API endpoint for associations.gouv.fr might require different approach
		// For now, we'll use a search approach
		// This is a placeholder - may need to use the actual API if available
		
		// Try to search via Google/Brave with site:associations.gouv.fr
		const siteQuery = `site:associations.gouv.fr "${organizationName}"`;
		
		// Use improved DuckDuckGo with site-specific query
		const results = await searchDuckDuckGoImproved(siteQuery);
		
		if (results && results.length > 0) {
			// Try to extract information from the first result
			const firstResult = results[0];
			
			return {
				website: firstResult.link,
				source: 'associations.gouv.fr',
				confidence: 'medium'
			};
		}
		
		return null;
	} catch (error) {
		console.warn(`  ⚠️  Associations.gouv.fr scraping error: ${error.message}`);
		return null;
	}
}

/**
 * Unified search function with automatic fallback
 * Tries providers in priority order: Direct scraping > SearXNG > Brave > DuckDuckGo
 */
export async function searchEnhanced(query, options = {}) {
	const {
		organizationName,
		address = '',
		fieldType = 'website', // 'website', 'email', 'phone', 'schedule', 'registration'
		locale = 'fr',
		braveApiKey = process.env.BRAVE_SEARCH_API_KEY,
		preferDirectScraping = true
	} = options;
	
	const results = [];
	
	// Strategy 1: Direct scraping (most accurate, 100% free)
	if (preferDirectScraping && organizationName) {
		if (['website', 'phone', 'email', 'address', 'schedule'].includes(fieldType)) {
			const pagesJaunesResult = await scrapePagesJaunes(organizationName, address);
			if (pagesJaunesResult) {
				results.push({
					source: 'pagesjaunes',
					priority: 1,
					data: pagesJaunesResult
				});
			}
		}
		
		if (fieldType === 'website') {
			const govResult = await scrapeAssociationsGouv(organizationName);
			if (govResult) {
				results.push({
					source: 'associations.gouv.fr',
					priority: 1,
					data: govResult
				});
			}
		}
	}
	
	// Strategy 2: SearXNG (aggregated results, free)
	const searxngResults = await searchSearXNG(query, locale);
	if (searxngResults && searxngResults.length > 0) {
		results.push({
			source: 'searxng',
			priority: 2,
			data: searxngResults
		});
	}
	
	// Strategy 3: Brave Search (free tier)
	if (braveApiKey) {
		const braveResults = await searchBrave(query, braveApiKey);
		if (braveResults && braveResults.length > 0) {
			results.push({
				source: 'brave',
				priority: 3,
				data: braveResults
			});
		}
	}
	
	// Strategy 4: Improved DuckDuckGo (fallback, unlimited free)
	const ddgResults = await searchDuckDuckGoImproved(query, locale);
	if (ddgResults && ddgResults.length > 0) {
		results.push({
			source: 'duckduckgo',
			priority: 4,
			data: ddgResults
		});
	}
	
	// Sort by priority (lower number = higher priority)
	results.sort((a, b) => a.priority - b.priority);
	
	return results.length > 0 ? results : null;
}

/**
 * Extract field value from search results based on field type
 */
export function extractFieldFromResults(searchResults, fieldType, organizationName = '') {
	if (!searchResults || searchResults.length === 0) {
		return null;
	}
	
	// Use highest priority result
	const topResult = searchResults[0];
	
	if (topResult.source === 'pagesjaunes' && topResult.data) {
		// Direct scraping result
		const data = topResult.data;
		
		if (fieldType === 'website' && data.website) {
			return data.website;
		}
		if (fieldType === 'phone' && data.phone) {
			return data.phone;
		}
		if (fieldType === 'address' && data.address) {
			return data.address;
		}
		if (fieldType === 'schedule' && data.schedule) {
			return data.schedule;
		}
	}
	
	if (topResult.source === 'associations.gouv.fr' && topResult.data?.website) {
		if (fieldType === 'website') {
			return topResult.data.website;
		}
	}
	
	// For search engine results, extract from first result
	if (Array.isArray(topResult.data) && topResult.data.length > 0) {
		const firstResult = topResult.data[0];
		
		if (fieldType === 'website' && firstResult.link) {
			return firstResult.link;
		}
		
		// For email/phone, try to extract from snippet
		if (fieldType === 'email') {
			const emailMatch = firstResult.snippet?.match(/[\w\.-]+@[\w\.-]+\.\w+/);
			if (emailMatch) {
				return emailMatch[0];
			}
		}
		
		if (fieldType === 'phone') {
			const phoneMatch = firstResult.snippet?.match(/(?:\+33|0)[1-9](?:[\.\s]?\d{2}){4}/);
			if (phoneMatch) {
				return phoneMatch[0];
			}
		}
	}
	
	return null;
}

