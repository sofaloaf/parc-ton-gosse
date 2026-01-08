/**
 * Multi-Provider Search API with Automatic Fallback
 * 
 * Supports:
 * - Bing Web Search API (3,000 free/month)
 * - Serper API (2,500 free/month)
 * - SerpApi (250 free/month)
 * - DuckDuckGo HTML scraping (unlimited, free)
 * - Google Custom Search (100 free/day)
 */

import fetch from 'node-fetch';

/**
 * Search using Bing Web Search API
 */
async function searchBing(query, apiKey) {
	try {
		const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10&mkt=fr-FR`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);
		
		const response = await fetch(url, {
			headers: {
				'Ocp-Apim-Subscription-Key': apiKey,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			},
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			const errorText = await response.text().catch(() => '');
			if (response.status === 401) {
				console.warn('     ⚠️  Bing API: Invalid API key');
			} else if (response.status === 429) {
				console.warn('     ⚠️  Bing API: Rate limit exceeded');
			}
			return null;
		}
		
		const data = await response.json();
		
		// Check for errors in response
		if (data.error) {
			console.warn(`     ⚠️  Bing API error: ${data.error.message || JSON.stringify(data.error)}`);
			return null;
		}
		
		return (data.webPages?.value || []).map(item => ({
			title: item.name || '',
			snippet: item.snippet || '',
			link: item.url || ''
		}));
	} catch (error) {
		if (error.name !== 'AbortError') {
			console.warn(`     ⚠️  Bing API error: ${error.message}`);
		}
		return null;
	}
}

/**
 * Search using Serper API
 */
async function searchSerper(query, apiKey) {
	try {
		const url = 'https://google.serper.dev/search';
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ q: query, num: 10 })
		});
		
		if (!response.ok) {
			return null;
		}
		
		const data = await response.json();
		return (data.organic || []).map(item => ({
			title: item.title || '',
			snippet: item.snippet || '',
			link: item.link || ''
		}));
	} catch (error) {
		return null;
	}
}

/**
 * Search using SerpApi
 */
async function searchSerpApi(query, apiKey) {
	try {
		const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`;
		const response = await fetch(url);
		
		if (!response.ok) {
			return null;
		}
		
		const data = await response.json();
		return (data.organic_results || []).map(item => ({
			title: item.title || '',
			snippet: item.snippet || '',
			link: item.link || ''
		}));
	} catch (error) {
		return null;
	}
}

/**
 * Search using DuckDuckGo HTML scraping (completely free)
 * Improved with better URL extraction and error handling
 */
async function searchDuckDuckGo(query) {
	try {
		// DuckDuckGo HTML search with French locale for better Paris results
		const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=fr-fr`;
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
		if (!html || html.length < 100) {
			return null;
		}
		
		const { JSDOM } = await import('jsdom');
		const dom = new JSDOM(html);
		const document = dom.window.document;
		
		const results = [];
		
		// Try multiple selectors for DuckDuckGo results (they change structure sometimes)
		// DuckDuckGo uses different HTML structures, try all common patterns
		let resultElements = document.querySelectorAll('.result');
		if (resultElements.length === 0) {
			resultElements = document.querySelectorAll('.web-result');
		}
		if (resultElements.length === 0) {
			resultElements = document.querySelectorAll('.result__body');
		}
		if (resultElements.length === 0) {
			resultElements = document.querySelectorAll('[class*="result"]');
		}
		if (resultElements.length === 0) {
			// Try finding links that look like search results
			resultElements = document.querySelectorAll('a[href*="uddg"]');
		}
		
		for (const element of resultElements) {
			// Try multiple selectors for title/link (DuckDuckGo has various structures)
			let titleEl = element.querySelector('.result__title a') || 
			             element.querySelector('.result__a') ||
			             element.querySelector('a.result__a') ||
			             element.querySelector('h2 a') ||
			             element.querySelector('.result__title')?.querySelector('a') ||
			             element.querySelector('a[href*="uddg"]') ||
			             element.querySelector('a[href*="http"]');
			
			// If element itself is a link, use it
			if (!titleEl && element.tagName === 'A') {
				titleEl = element;
			}
			
			const snippetEl = element.querySelector('.result__snippet') || 
			                 element.querySelector('.result__snippet--highlight') ||
			                 element.querySelector('.result__url') ||
			                 element.querySelector('.snippet') ||
			                 element.querySelector('p');
			
			if (titleEl) {
				let link = titleEl.getAttribute('href') || '';
				
				// DuckDuckGo uses redirect URLs, extract actual URL
				if (link.includes('duckduckgo.com/l/') || link.includes('uddg=')) {
					try {
						// Method 1: Extract from URL parameter
						const urlObj = new URL(link.startsWith('//') ? 'https:' + link : link);
						const uddg = urlObj.searchParams.get('uddg');
						if (uddg) {
							link = decodeURIComponent(uddg);
						} else {
							// Method 2: Extract from onclick attribute
							const onclick = titleEl.getAttribute('onclick') || '';
							const match = onclick.match(/uddg=([^&'"]+)/);
							if (match) {
								link = decodeURIComponent(match[1]);
							} else {
								// Method 3: Try data attribute
								const dataUrl = titleEl.getAttribute('data-url');
								if (dataUrl) {
									link = dataUrl;
								}
							}
						}
					} catch (e) {
						// If all extraction methods fail, skip this result
						continue;
					}
				}
				
				// Ensure link starts with http:// or https://
				if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
					if (link.startsWith('//')) {
						link = 'https:' + link;
					} else if (link.includes('.')) {
						link = 'https://' + link;
					} else {
						// Invalid link, skip
						continue;
					}
				}
				
				// Validate link is a proper URL
				try {
					new URL(link);
				} catch (e) {
					continue; // Invalid URL, skip
				}
				
				if (link) {
					results.push({
						title: (titleEl.textContent || '').trim() || '',
						snippet: (snippetEl?.textContent || '').trim() || '',
						link: link
					});
				}
			}
			
			if (results.length >= 10) break;
		}
		
		return results.length > 0 ? results : null;
	} catch (error) {
		if (error.name !== 'AbortError') {
			// Silently fail for DuckDuckGo (it's a fallback)
		}
		return null;
	}
}

/**
 * Search using Google Custom Search API
 */
async function searchGoogle(query, apiKey, cx) {
	try {
		const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0' }
		});
		
		if (!response.ok) {
			return null;
		}
		
		const data = await response.json();
		if (data.error) {
			return null;
		}
		
		return (data.items || []).map(item => ({
			title: item.title || '',
			snippet: item.snippet || '',
			link: item.link || ''
		}));
	} catch (error) {
		return null;
	}
}

/**
 * Multi-provider search with automatic fallback
 * Tries providers in order of preference (free tier capacity)
 */
export async function searchWeb(query, options = {}) {
	const {
		bingApiKey = process.env.BING_SEARCH_API_KEY,
		serperApiKey = process.env.SERPER_API_KEY,
		serpApiKey = process.env.SERPAPI_KEY,
		googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
		googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX
	} = options;
	
	// Try providers in order (most free searches first)
	
	// 1. Bing (3,000 free/month)
	if (bingApiKey) {
		const results = await searchBing(query, bingApiKey);
		if (results && results.length > 0) {
			return { provider: 'bing', results };
		}
	}
	
	// 2. Serper (2,500 free/month)
	if (serperApiKey) {
		const results = await searchSerper(query, serperApiKey);
		if (results && results.length > 0) {
			return { provider: 'serper', results };
		}
	}
	
	// 3. SerpApi (250 free/month)
	if (serpApiKey) {
		const results = await searchSerpApi(query, serpApiKey);
		if (results && results.length > 0) {
			return { provider: 'serpapi', results };
		}
	}
	
	// 4. DuckDuckGo (unlimited, free, but slower)
	const duckDuckGoResults = await searchDuckDuckGo(query);
	if (duckDuckGoResults && duckDuckGoResults.length > 0) {
		return { provider: 'duckduckgo', results: duckDuckGoResults };
	}
	
	// 5. Google (100 free/day, best quality as backup)
	if (googleApiKey && googleCx) {
		const results = await searchGoogle(query, googleApiKey, googleCx);
		if (results && results.length > 0) {
			return { provider: 'google', results };
		}
	}
	
	return null;
}

