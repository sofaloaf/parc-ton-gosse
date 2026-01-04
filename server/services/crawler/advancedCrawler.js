/**
 * Advanced Hybrid Crawler
 * 
 * Combines multiple strategies:
 * 1. Static HTML parsing (JSDOM) - fast for static sites
 * 2. Playwright for JavaScript-heavy sites - full JS rendering
 * 3. Proven mairie crawler - direct government site access
 * 4. Enhanced queuing, deduplication, and politeness
 */

import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Priority queue implementation
class PriorityQueue {
	constructor() {
		this.queue = [];
	}

	enqueue(item, priority = 0) {
		this.queue.push({ item, priority });
		this.queue.sort((a, b) => b.priority - a.priority);
	}

	dequeue() {
		return this.queue.shift()?.item;
	}

	isEmpty() {
		return this.queue.length === 0;
	}

	size() {
		return this.queue.length;
	}
}

// Bloom filter-like visited URL tracker (using Set for simplicity, can upgrade to actual Bloom filter)
class VisitedTracker {
	constructor() {
		this.visited = new Set();
		this.domainCounts = new Map();
	}

	hasVisited(url) {
		return this.visited.has(url);
	}

	markVisited(url) {
		this.visited.add(url);
		const domain = new URL(url).hostname;
		this.domainCounts.set(domain, (this.domainCounts.get(domain) || 0) + 1);
	}

	getDomainCount(domain) {
		return this.domainCounts.get(domain) || 0;
	}

	size() {
		return this.visited.size;
	}
}

// Rate limiter per domain
class DomainRateLimiter {
	constructor() {
		this.domainDelays = new Map(); // domain -> last request time
		this.defaultDelay = 3000; // 3 seconds default
		this.domainDelaysConfig = new Map(); // domain -> custom delay
	}

	async waitForDomain(domain) {
		const lastRequest = this.domainDelays.get(domain) || 0;
		const delay = this.domainDelaysConfig.get(domain) || this.defaultDelay;
		const timeSinceLastRequest = Date.now() - lastRequest;

		if (timeSinceLastRequest < delay) {
			const waitTime = delay - timeSinceLastRequest;
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}

		this.domainDelays.set(domain, Date.now());
	}

	setDomainDelay(domain, delay) {
		this.domainDelaysConfig.set(domain, delay);
	}
}

// Robots.txt parser and checker
class RobotsTxtChecker {
	constructor() {
		this.robotsCache = new Map(); // domain -> { rules, lastChecked }
		this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
	}

	async canCrawl(url) {
		try {
			const urlObj = new URL(url);
			const domain = urlObj.origin;
			const path = urlObj.pathname;

			// Check cache
			const cached = this.robotsCache.get(domain);
			if (cached && Date.now() - cached.lastChecked < this.cacheTimeout) {
				return this.checkPath(cached.rules, path);
			}

			// Fetch robots.txt
			const robotsUrl = `${domain}/robots.txt`;
			try {
				const response = await fetch(robotsUrl, { timeout: 5000 });
				if (response.ok) {
					const text = await response.text();
					const rules = this.parseRobotsTxt(text);
					this.robotsCache.set(domain, { rules, lastChecked: Date.now() });
					return this.checkPath(rules, path);
				}
			} catch (error) {
				// If robots.txt doesn't exist or fails, allow crawling (permissive)
				console.log(`⚠️  Could not fetch robots.txt for ${domain}, allowing crawl`);
				return true;
			}

			return true; // Default: allow
		} catch (error) {
			return true; // Default: allow on error
		}
	}

	parseRobotsTxt(text) {
		const rules = { disallow: [], allow: [] };
		const lines = text.split('\n');
		let currentUserAgent = '*';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const [directive, value] = trimmed.split(':').map(s => s.trim());
			if (!directive || !value) continue;

			if (directive.toLowerCase() === 'user-agent') {
				currentUserAgent = value;
			} else if (directive.toLowerCase() === 'disallow' && (currentUserAgent === '*' || currentUserAgent.includes('*'))) {
				rules.disallow.push(value);
			} else if (directive.toLowerCase() === 'allow' && (currentUserAgent === '*' || currentUserAgent.includes('*'))) {
				rules.allow.push(value);
			}
		}

		return rules;
	}

	checkPath(rules, path) {
		// Check disallow rules
		for (const disallowPath of rules.disallow) {
			if (disallowPath === '/') return false; // Disallow all
			if (path.startsWith(disallowPath)) return false;
		}

		// Check allow rules (more specific takes precedence)
		for (const allowPath of rules.allow) {
			if (path.startsWith(allowPath)) return true;
		}

		return rules.disallow.length === 0; // If no disallow rules, allow
	}
}

// User agent rotation
class UserAgentRotator {
	constructor() {
		this.userAgents = [
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
		];
	}

	getRandom() {
		return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
	}
}

// Retry with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
	const { timeout = 20000, ...fetchOptions } = options;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), timeout);
			});

			const fetchPromise = fetch(url, fetchOptions);
			const response = await Promise.race([fetchPromise, timeoutPromise]);

			if (!response.ok && response.status >= 500 && attempt < maxRetries) {
				const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
				console.log(`⚠️  Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms`);
				await new Promise(resolve => setTimeout(resolve, delay));
				continue;
			}

			return response;
		} catch (error) {
			if (attempt === maxRetries) {
				throw error;
			}
			const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
			console.log(`⚠️  Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms: ${error.message}`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

// Static HTML extractor (fast, for static sites)
async function extractStaticHTML(url, userAgent) {
	try {
		const response = await fetchWithRetry(url, {
			headers: {
				'User-Agent': userAgent,
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive'
			},
			timeout: 15000
		});

		if (!response.ok) {
			return { error: `HTTP ${response.status}` };
		}

		const html = await response.text();
		const dom = new JSDOM(html, { url });
		const document = dom.window.document;

		return {
			success: true,
			document,
			html,
			url
		};
	} catch (error) {
		return { error: error.message };
	}
}

// Playwright extractor (for JS-heavy sites) - will be implemented if playwright is installed
async function extractWithPlaywright(url, userAgent) {
	// Check if playwright is available
	try {
		const { chromium } = await import('playwright');
		
		const browser = await chromium.launch({ headless: true });
		const page = await browser.newPage();
		
		await page.setUserAgent(userAgent);
		await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
		
		// Wait for content to load
		await page.waitForTimeout(2000);
		
		const html = await page.content();
		const dom = new JSDOM(html, { url });
		const document = dom.window.document;
		
		await browser.close();
		
		return {
			success: true,
			document,
			html,
			url,
			method: 'playwright'
		};
	} catch (error) {
		// Playwright not available or failed, fallback to static
		console.log(`⚠️  Playwright not available for ${url}, using static extraction`);
		return null;
	}
}

// Main advanced crawler class
export class AdvancedCrawler {
	constructor(options = {}) {
		this.queue = new PriorityQueue();
		this.visited = new VisitedTracker();
		this.rateLimiter = new DomainRateLimiter();
		this.robotsChecker = new RobotsTxtChecker();
		this.userAgentRotator = new UserAgentRotator();
		
		this.maxDepth = options.maxDepth || 3;
		this.maxUrls = options.maxUrls || 1000;
		this.usePlaywright = options.usePlaywright !== false; // Try playwright by default
		this.stats = {
			discovered: 0,
			extracted: 0,
			errors: 0,
			skipped: 0
		};
	}

	async crawl(startUrls, extractorFn) {
		// Initialize queue with start URLs
		for (const url of startUrls) {
			this.queue.enqueue({ url, depth: 0 }, 10); // High priority for start URLs
		}

		const results = [];

		while (!this.queue.isEmpty() && results.length < this.maxUrls) {
			const { url, depth } = this.queue.dequeue();

			// Check depth limit
			if (depth > this.maxDepth) {
				this.stats.skipped++;
				continue;
			}

			// Check if already visited
			if (this.visited.hasVisited(url)) {
				this.stats.skipped++;
				continue;
			}

			// Check robots.txt
			const canCrawl = await this.robotsChecker.canCrawl(url);
			if (!canCrawl) {
				console.log(`⏭️  Skipping ${url} (robots.txt disallowed)`);
				this.stats.skipped++;
				continue;
			}

			// Rate limiting
			const domain = new URL(url).hostname;
			await this.rateLimiter.waitForDomain(domain);

			// Mark as visited
			this.visited.markVisited(url);
			this.stats.discovered++;

			try {
				// Try Playwright first for JS-heavy sites, fallback to static
				let extractionResult = null;
				if (this.usePlaywright) {
					extractionResult = await extractWithPlaywright(url, this.userAgentRotator.getRandom());
				}

				// Fallback to static extraction
				if (!extractionResult || !extractionResult.success) {
					extractionResult = await extractStaticHTML(url, this.userAgentRotator.getRandom());
				}

				if (extractionResult.error) {
					throw new Error(extractionResult.error);
				}

				// Extract data using provided extractor function
				const extracted = await extractorFn(extractionResult.document, extractionResult.html, url);
				
				if (extracted) {
					results.push({
						...extracted,
						url,
						depth,
						extractedAt: new Date().toISOString()
					});
					this.stats.extracted++;
				}

				// Discover new URLs (if depth allows)
				if (depth < this.maxDepth) {
					const links = this.discoverLinks(extractionResult.document, url);
					for (const link of links) {
						if (!this.visited.hasVisited(link)) {
							// Lower priority for discovered links
							this.queue.enqueue({ url: link, depth: depth + 1 }, 5);
						}
					}
				}

			} catch (error) {
				console.error(`❌ Error crawling ${url}:`, error.message);
				this.stats.errors++;
			}
		}

		return {
			results,
			stats: this.stats,
			visited: this.visited.size()
		};
	}

	discoverLinks(document, baseUrl) {
		const links = new Set();
		const baseUrlObj = new URL(baseUrl);

		// Find all links
		const anchorTags = document.querySelectorAll('a[href]');
		for (const anchor of anchorTags) {
			const href = anchor.getAttribute('href');
			if (!href) continue;

			try {
				const fullUrl = new URL(href, baseUrl);
				// Only include same-origin or relevant external links
				if (fullUrl.hostname === baseUrlObj.hostname || 
				    fullUrl.hostname.includes('mairie') ||
				    fullUrl.hostname.includes('paris.fr') ||
				    fullUrl.pathname.includes('activite')) {
					links.add(fullUrl.href);
				}
			} catch {
				// Invalid URL, skip
			}
		}

		return Array.from(links);
	}
}

