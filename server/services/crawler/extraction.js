/**
 * Extraction Module
 * 
 * Handles data extraction from multiple sources:
 * - HTML (structured and semi-structured)
 * - PDF files
 * - JSON-LD / Schema.org structured data
 * - Named entity recognition
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export class ExtractionModule {
	constructor(options = {}) {
		this.timeout = options.timeout || 20000;
		this.maxRetries = options.maxRetries || 3;
		this.userAgents = [
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
		];
	}

	getRandomUserAgent() {
		return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
	}

	/**
	 * Extract data from a URL (auto-detects content type)
	 */
	async extractFromUrl(url, options = {}) {
		try {
			// Check content type
			const headResponse = await fetch(url, { method: 'HEAD', timeout: 5000 });
			const contentType = headResponse.headers.get('content-type') || '';

			if (contentType.includes('application/pdf') || url.endsWith('.pdf')) {
				return await this.extractFromPDF(url, options);
			} else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
				return await this.extractFromHTML(url, options);
			} else if (contentType.includes('application/json')) {
				return await this.extractFromJSON(url, options);
			} else {
				// Default to HTML
				return await this.extractFromHTML(url, options);
			}
		} catch (error) {
			console.error(`Extraction failed for ${url}:`, error.message);
			return {
				url,
				error: error.message,
				extractedAt: new Date().toISOString(),
				confidence: 0
			};
		}
	}

	/**
	 * Extract data from HTML page
	 * Uses adaptive extraction similar to AI-powered crawlers
	 */
	async extractFromHTML(url, options = {}) {
		const result = {
			url,
			source: 'html',
			extractedAt: new Date().toISOString(),
			confidence: 0,
			data: {}
		};

		try {
			// Try with retries and better headers (anti-detection)
			const headers = {
				'User-Agent': this.getRandomUserAgent(),
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'none',
				'Cache-Control': 'max-age=0'
			};

			const response = await fetch(url, {
				headers,
				timeout: this.timeout,
				redirect: 'follow'
			});

			if (!response.ok) {
				result.error = `HTTP ${response.status}`;
				return result;
			}

			const html = await response.text();
			const dom = new JSDOM(html, {
				url: url,
				referrer: url,
				contentType: 'text/html',
				includeNodeLocations: false,
				storageQuota: 10000000
			});
			const document = dom.window.document;

			// Filter out newsletter and non-activity pages early
			const pageText = (document.body?.textContent || html).toLowerCase();
			const title = document.querySelector('title')?.textContent?.toLowerCase() || '';
			
			// Skip newsletter pages
			if (title.includes('newsletter') || 
			    title.includes('lettre d\'information') ||
			    pageText.includes('abonnez-vous à la newsletter') ||
			    pageText.includes('inscription newsletter') ||
			    url.toLowerCase().includes('newsletter')) {
				result.error = 'Newsletter page - skipped';
				result.confidence = 0;
				return result;
			}
			
			// Extract using multiple strategies - prioritize proven approaches
			const structuredData = this.extractStructuredData(document);
			const metaData = this.extractMetaData(document);
			const contentData = this.extractContentData(document);
			const contactData = this.extractContactInfo(html);
			
			// Use proven extraction approach from working crawler (for mairie pages)
			const provenExtraction = this.extractUsingProvenApproach(document, html, url);

			// Merge all extracted data - prioritize proven extraction
			result.data = {
				...structuredData,
				...metaData,
				...contentData,
				...contactData,
				...provenExtraction // Proven approach takes precedence
			};

			// Ensure we have a name field (critical for organization identification)
			// Try proven extraction first, then fallback
			if (!result.data.name) {
				result.data.name = provenExtraction.name || contentData.name || metaData.title || contentData.heading;
			}
			
			// Extract website from page if not already found
			if (!result.data.website) {
				result.data.website = provenExtraction.website || this.extractWebsiteFromPage(document, url);
			}
			
			// Merge contact info from proven extraction
			if (provenExtraction.email && !result.data.email) {
				result.data.email = provenExtraction.email;
			}
			if (provenExtraction.phone && !result.data.phone) {
				result.data.phone = provenExtraction.phone;
			}
			if (provenExtraction.address && !result.data.address) {
				result.data.address = provenExtraction.address;
			}

			// Calculate confidence based on data completeness
			result.confidence = this.calculateConfidence(result.data);

			return result;
		} catch (error) {
			result.error = error.message;
			return result;
		}
	}

	/**
	 * Extract structured data (JSON-LD, microdata, schema.org)
	 */
	extractStructuredData(document) {
		const data = {};

		// JSON-LD
		const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (const script of jsonLdScripts) {
			try {
				const jsonLd = JSON.parse(script.textContent);
				const extracted = this.parseStructuredDataObject(jsonLd);
				Object.assign(data, extracted);
			} catch (e) {
				// Invalid JSON, skip
			}
		}

		// Microdata
		const microdataItems = document.querySelectorAll('[itemtype]');
		for (const item of microdataItems) {
			const itemType = item.getAttribute('itemtype');
			if (itemType && itemType.includes('schema.org')) {
				const extracted = this.parseMicrodataItem(item);
				Object.assign(data, extracted);
			}
		}

		return data;
	}

	/**
	 * Parse structured data object (recursive)
	 */
	parseStructuredDataObject(obj, result = {}) {
		if (typeof obj !== 'object' || obj === null) return result;

		if (Array.isArray(obj)) {
			obj.forEach(item => this.parseStructuredDataObject(item, result));
		} else {
			// Map common schema.org properties
			const propertyMap = {
				'@type': 'type',
				'name': 'name',
				'legalName': 'name',
				'description': 'description',
				'address': 'address',
				'telephone': 'phone',
				'email': 'email',
				'url': 'website',
				'image': 'images',
				'priceRange': 'price',
				'openingHours': 'schedule'
			};

			for (const [key, value] of Object.entries(obj)) {
				const mappedKey = propertyMap[key] || key;
				
				if (typeof value === 'string') {
					result[mappedKey] = value;
				} else if (typeof value === 'object') {
					if (key === 'address') {
						result.address = this.parseAddress(value);
					} else {
						this.parseStructuredDataObject(value, result);
					}
				}
			}
		}

		return result;
	}

	/**
	 * Parse microdata item
	 */
	parseMicrodataItem(item) {
		const data = {};
		const properties = item.querySelectorAll('[itemprop]');
		
		for (const prop of properties) {
			const propName = prop.getAttribute('itemprop');
			const propValue = prop.textContent?.trim() || prop.getAttribute('content') || '';
			
			if (propValue) {
				data[propName] = propValue;
			}
		}

		return data;
	}

	/**
	 * Extract metadata (meta tags, title)
	 */
	extractMetaData(document) {
		return {
			title: document.querySelector('meta[property="og:title"]')?.content ||
			       document.querySelector('meta[name="twitter:title"]')?.content ||
			       document.querySelector('title')?.textContent?.trim() || '',
			description: document.querySelector('meta[property="og:description"]')?.content ||
			            document.querySelector('meta[name="twitter:description"]')?.content ||
			            document.querySelector('meta[name="description"]')?.content || '',
			images: this.extractImages(document)
		};
	}

	/**
	 * Extract content data (text, headings, etc.)
	 */
	extractContentData(document) {
		const h1 = document.querySelector('h1')?.textContent?.trim() || '';
		const paragraphs = Array.from(document.querySelectorAll('p'))
			.map(p => p.textContent?.trim())
			.filter(p => p.length > 20)
			.slice(0, 5);

		// Extract organization name using multiple strategies
		const orgName = this.extractOrganizationName(document);

		return {
			heading: h1,
			name: orgName || h1, // Use extracted org name or fallback to h1
			content: paragraphs.join('\n\n')
		};
	}

	/**
	 * Extract organization name from page using multiple heuristics
	 */
	extractOrganizationName(document) {
		// Strategy 1: Look for common organization name patterns in headings
		const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
			.map(h => h.textContent?.trim())
			.filter(h => h && h.length > 3 && h.length < 100);

		// Look for patterns like "Cercle d'escrime", "Association", "Club", etc.
		const orgKeywords = ['cercle', 'association', 'club', 'fédération', 'ligue', 'société', 'centre', 'école', 'académie', 'escrime', 'sport'];
		
		// First, try to find headings with organization keywords
		for (const heading of headings) {
			const lowerHeading = heading.toLowerCase();
			if (orgKeywords.some(keyword => lowerHeading.includes(keyword))) {
				// Clean up the heading (remove common prefixes/suffixes)
				let cleanName = heading.trim();
				// Remove common prefixes
				cleanName = cleanName.replace(/^(le|la|les|un|une)\s+/i, '');
				// Remove common suffixes
				cleanName = cleanName.replace(/\s*-\s*(Paris|France|Île-de-France).*$/i, '');
				return cleanName.trim();
			}
		}

		// If no keyword match, use the first substantial heading
		if (headings.length > 0) {
			let firstHeading = headings[0];
			// Clean up
			firstHeading = firstHeading.replace(/^(le|la|les|un|une)\s+/i, '');
			firstHeading = firstHeading.replace(/\s*-\s*(Paris|France|Île-de-France).*$/i, '');
			if (firstHeading.length > 3 && firstHeading.length < 100) {
				return firstHeading.trim();
			}
		}

		// Strategy 2: Look in structured data (already extracted, but check title/name)
		// This will be handled by structured data extraction

		// Strategy 3: Look for organization name in meta tags
		const ogTitle = document.querySelector('meta[property="og:title"]')?.content?.trim();
		if (ogTitle && ogTitle.length > 3 && ogTitle.length < 100) {
			return ogTitle;
		}

		// Strategy 4: Look for organization name in specific class names
		const orgNameSelectors = [
			'.organization-name',
			'.org-name',
			'.association-name',
			'[class*="organization"]',
			'[class*="association"]',
			'[class*="club"]',
			'.title-organization',
			'.nom-association'
		];

		for (const selector of orgNameSelectors) {
			const element = document.querySelector(selector);
			if (element) {
				const text = element.textContent?.trim();
				if (text && text.length > 3 && text.length < 100) {
					return text;
				}
			}
		}

		// Strategy 5: Use h1 if it looks like an organization name
		if (h1 && h1.length > 3 && h1.length < 100) {
			return h1;
		}

		// Strategy 6: Look for organization names in page content using patterns
		const bodyText = document.body?.textContent || '';
		const orgPatterns = [
			/(?:Cercle|Association|Club|Fédération|Ligue|Société|Centre|École|Académie)\s+(?:d['\']|de|du|des|la|le|les)?\s*[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s'-]{5,50}/gi,
			/[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+(?:\s+(?:d['\']|de|du|des|la|le|les))?\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+(?:\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+)?/g
		];

		for (const pattern of orgPatterns) {
			const matches = bodyText.match(pattern);
			if (matches && matches.length > 0) {
				// Filter matches that look like organization names
				const orgMatches = matches.filter(m => {
					const lower = m.toLowerCase();
					return (lower.includes('cercle') || lower.includes('association') || 
					        lower.includes('club') || lower.includes('escrime') ||
					        (m.length > 10 && m.length < 80 && /^[A-Z]/.test(m.trim())));
				});
				
				if (orgMatches.length > 0) {
					// Return the first substantial match
					const name = orgMatches[0].trim();
					if (name.length > 5 && name.length < 100) {
						return name;
					}
				}
			}
		}

		return null;
	}

	/**
	 * Extract contact information using regex patterns
	 */
	extractContactInfo(html) {
		const data = {};

		// Email
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emails = html.match(emailPattern) || [];
		data.email = emails.find(e => !e.includes('noreply') && !e.includes('no-reply')) || null;

		// Phone (French format)
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phones = html.match(phonePattern) || [];
		data.phone = phones[0] || null;

		// Address patterns (more comprehensive)
		const addressPatterns = [
			/\d+[,\s]+(?:rue|avenue|boulevard|place|allée|chemin|impasse|passage)[^,\n]{5,80}/gi,
			/\d{1,3}\s+[A-Za-zÀ-ÿ\s'-]+(?:rue|avenue|boulevard|place|allée|chemin|impasse|passage)[^,\n]{5,80}/gi,
			/(?:rue|avenue|boulevard|place|allée|chemin|impasse|passage)\s+[A-Za-zÀ-ÿ\s'-]+\s+\d{5}\s+Paris/gi
		];
		
		for (const pattern of addressPatterns) {
			const matches = html.match(pattern);
			if (matches && matches.length > 0) {
				data.address = matches[0].trim();
				break;
			}
		}

		// Extract neighborhood/arrondissement from address or content
		const arrondissementPattern = /(?:arrondissement|arr\.?)\s*(\d{1,2}(?:er|e)?)/gi;
		const arrMatch = html.match(arrondissementPattern);
		if (arrMatch) {
			data.neighborhood = arrMatch[0].replace(/arrondissement|arr\.?/gi, '').trim();
		}

		return data;
	}

	/**
	 * Extract images
	 */
	extractImages(document) {
		const images = [];
		
		// Open Graph images
		const ogImage = document.querySelector('meta[property="og:image"]')?.content;
		if (ogImage) images.push(ogImage);

		// Images in content
		const imgTags = document.querySelectorAll('img[src]');
		for (const img of Array.from(imgTags).slice(0, 5)) {
			const src = img.getAttribute('src');
			if (src && !src.includes('logo') && !src.includes('icon')) {
				try {
					const url = new URL(src, document.location.href);
					images.push(url.href);
				} catch {
					// Invalid URL, skip
				}
			}
		}

		return images;
	}

	/**
	 * Extract data from PDF using pdf-parse
	 * PDFs often contain association registries, bulletins, or activity listings
	 */
	async extractFromPDF(url, options = {}) {
		try {
			// Lazy load pdf-parse
			let pdfParse;
			try {
				pdfParse = (await import('pdf-parse')).default;
			} catch (error) {
				console.warn('⚠️  pdf-parse not available, skipping PDF extraction');
				return {
					url,
					source: 'pdf',
					extractedAt: new Date().toISOString(),
					confidence: 0,
					data: {},
					error: 'PDF parsing library not available'
				};
			}

			console.log(`  📄 Extracting from PDF: ${url}`);
			
			// 1. Download PDF
			const response = await fetch(url, {
				headers: {
					'User-Agent': this.getRandomUserAgent(),
					'Accept': 'application/pdf,*/*'
				},
				timeout: this.timeout
			});

			if (!response.ok) {
				throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
			}

			const pdfBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(pdfBuffer);

			// 2. Extract text using pdf-parse
			const pdfData = await pdfParse(buffer);
			const text = pdfData.text;

			if (!text || text.trim().length === 0) {
				console.warn(`  ⚠️  PDF contains no extractable text: ${url}`);
				return {
					url,
					source: 'pdf',
					extractedAt: new Date().toISOString(),
					confidence: 0,
					data: {},
					note: 'PDF contains no extractable text (may be image-based)'
				};
			}

			console.log(`  ✅ Extracted ${text.length} characters from PDF (${pdfData.numpages || 0} pages)`);

			// 3. Extract organization entities from PDF text using NLP-like patterns
			const entities = this.extractEntitiesFromPDFText(text, url, options);

			console.log(`  ✅ Found ${entities.length} potential organizations in PDF`);

			// Return in the same format as HTML extraction
			return {
				url,
				source: 'pdf',
				extractedAt: new Date().toISOString(),
				confidence: entities.length > 0 ? 0.7 : 0.3,
				data: {
					name: entities[0]?.name || '',
					title: entities[0]?.name || '',
					website: entities[0]?.website || null,
					email: entities[0]?.email || null,
					phone: entities[0]?.phone || null,
					address: entities[0]?.address || null,
					description: `Extracted from PDF document (${pdfData.numpages || 0} pages)`,
					entities: entities // Include all entities found
				},
				entities: entities, // Also include at top level for compatibility
				textLength: text.length,
				pageCount: pdfData.numpages || 0
			};
		} catch (error) {
			console.error(`  ❌ PDF extraction failed for ${url}:`, error.message);
			return {
				url,
				source: 'pdf',
				extractedAt: new Date().toISOString(),
				confidence: 0,
				data: {},
				error: error.message
			};
		}
	}

	/**
	 * Extract organization entities from PDF text using NLP-like patterns
	 */
	extractEntitiesFromPDFText(text, sourceUrl, options = {}) {
		const entities = [];
		const arrondissement = options.arrondissement || '';

		// Pattern 1: Association names (common formats in French registries)
		const associationPatterns = [
			/(?:Association|Club|Cercle|Centre|Académie|École)\s+([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,60})/g,
			/([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,60})\s*\(?(?:Association|Club|Cercle|Centre)/g,
			/(?:L\'|La\s+|Le\s+)?([A-Z][a-zA-Z\s\-'éèêëàâäôöùûüç]{3,60})\s*-\s*(?:Association|Club)/g
		];

		const foundNames = new Set();
		for (const pattern of associationPatterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				const name = match[1]?.trim();
				if (name && name.length > 3 && name.length < 100) {
					foundNames.add(name);
				}
			}
		}

		// Pattern 2: Extract contact information
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emails = [...new Set(text.match(emailPattern) || [])]
			.filter(e => !e.includes('example.com') && !e.includes('noreply') && !e.includes('no-reply'));

		const phonePattern = /(?:\+33|0)[1-9](?:[.\s\-]?\d{2}){4}/g;
		const phones = [...new Set(text.match(phonePattern) || [])];

		const websitePattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9\-]+\.(?:fr|com|org|net|eu))(?:\/[^\s<>"']*)?/g;
		const websites = [...new Set(text.match(websitePattern) || [])]
			.filter(w => !w.includes('facebook.com') && !w.includes('instagram.com'));

		// Pattern 3: Address patterns (French format)
		const addressPattern = /(\d{1,3}(?:\s+[a-zA-Z]+){1,3}(?:\s+[a-zA-Z]+)*\s+(?:rue|avenue|boulevard|place|allée|impasse|chemin)\s+[A-Za-z\s\-']+,\s*\d{5}\s+[A-Za-z\s\-']+)/g;
		const addresses = [...new Set(text.match(addressPattern) || [])];

		// Pattern 4: Activity keywords
		const activityKeywords = [
			'sport', 'activité', 'activités', 'club', 'association',
			'théâtre', 'danse', 'musique', 'arts martiaux', 'gymnastique',
			'natation', 'tennis', 'football', 'basketball', 'judo', 'karate'
		];

		// Group information by proximity in text
		const textChunks = [];
		const chunkSize = 500;
		for (let i = 0; i < text.length; i += chunkSize) {
			textChunks.push({
				text: text.substring(i, i + chunkSize),
				start: i,
				end: Math.min(i + chunkSize, text.length)
			});
		}

		// For each name found, try to find associated contact info nearby
		for (const name of foundNames) {
			const nameIndex = text.indexOf(name);
			if (nameIndex === -1) continue;

			const relevantChunk = textChunks.find(chunk => 
				nameIndex >= chunk.start && nameIndex < chunk.end
			) || { text: text.substring(Math.max(0, nameIndex - 200), Math.min(text.length, nameIndex + 200)) };

			const chunkText = relevantChunk.text;
			const nearbyEmail = emails.find(e => chunkText.includes(e)) || null;
			const nearbyPhone = phones.find(p => chunkText.includes(p)) || null;
			const nearbyWebsite = websites.find(w => chunkText.includes(w)) || null;
			const nearbyAddress = addresses.find(a => chunkText.includes(a)) || null;

			const hasActivityKeyword = activityKeywords.some(keyword => 
				chunkText.toLowerCase().includes(keyword)
			);

			if (nearbyEmail || nearbyPhone || nearbyWebsite || nearbyAddress || hasActivityKeyword) {
				entities.push({
					name: name,
					email: nearbyEmail,
					phone: nearbyPhone,
					website: nearbyWebsite,
					address: nearbyAddress,
					description: hasActivityKeyword ? `Organization found in PDF document` : '',
					source: 'pdf',
					sourceUrl: sourceUrl,
					arrondissement: arrondissement,
					confidence: (nearbyEmail || nearbyPhone || nearbyWebsite) ? 0.7 : 0.5
				});
			}
		}

		return entities;
	}

	/**
	 * Extract data from JSON endpoint
	 */
	async extractFromJSON(url, options = {}) {
		try {
			const response = await fetch(url, { timeout: this.timeout });
			if (!response.ok) {
				return { url, error: `HTTP ${response.status}`, confidence: 0 };
			}

			const json = await response.json();
			return {
				url,
				source: 'json',
				extractedAt: new Date().toISOString(),
				confidence: 0.8,
				data: json
			};
		} catch (error) {
			return { url, error: error.message, confidence: 0 };
		}
	}

	/**
	 * Parse address object from structured data
	 */
	parseAddress(addressObj) {
		if (typeof addressObj === 'string') return addressObj;

		const parts = [];
		if (addressObj.streetAddress) parts.push(addressObj.streetAddress);
		if (addressObj.addressLocality) parts.push(addressObj.addressLocality);
		if (addressObj.postalCode) parts.push(addressObj.postalCode);
		if (addressObj.addressCountry) parts.push(addressObj.addressCountry);

		return parts.join(', ');
	}

	/**
	 * Extract using proven approach from working arrondissement crawler
	 */
	extractUsingProvenApproach(document, html, url) {
		const data = {};
		
		// Extract title (organization name) - same as working crawler
		const title = document.querySelector('h1')?.textContent?.trim() ||
		             document.querySelector('.title')?.textContent?.trim() ||
		             document.querySelector('title')?.textContent?.trim() ||
		             '';
		data.name = title;

		// Extract website using proven selectors
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
			const links = document.querySelectorAll(selector);
			for (const link of links) {
				const href = link.getAttribute('href');
				if (href && href.startsWith('http') && 
				    !href.includes('mairie') && 
				    !href.includes('paris.fr') &&
				    !href.includes('facebook.com') &&
				    !href.includes('instagram.com') &&
				    !href.includes('twitter.com') &&
				    !href.includes('youtube.com') &&
				    !href.includes('linkedin.com')) {
					data.website = href;
					const linkText = link.textContent?.trim();
					if (linkText && linkText.length > 3 && linkText.length < 50 && !data.name) {
						data.name = linkText;
					}
					break;
				}
			}
			if (data.website) break;
		}

		// Search in text content for URLs (proven approach)
		if (!data.website) {
			const urlPattern = /https?:\/\/[^\s<>"']+[^.,;!?]/g;
			const matches = html.match(urlPattern);
			if (matches) {
				for (const urlMatch of matches) {
					const cleanUrl = urlMatch.replace(/[.,;!?]+$/, '');
					if (!cleanUrl.includes('mairie') && 
					    !cleanUrl.includes('paris.fr') &&
					    !cleanUrl.includes('facebook.com') &&
					    !cleanUrl.includes('instagram.com') &&
					    !cleanUrl.includes('twitter.com') &&
					    !cleanUrl.includes('youtube.com') &&
					    !cleanUrl.includes('linkedin.com') &&
					    cleanUrl.includes('.')) {
						data.website = cleanUrl;
						break;
					}
				}
			}
		}

		// Extract email (proven approach)
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const emailMatch = html.match(emailPattern);
		if (emailMatch) {
			const email = emailMatch.find(e => 
				!e.includes('mairie') && 
				!e.includes('paris.fr') && 
				!e.includes('noreply') &&
				!e.includes('no-reply')
			);
			if (email) {
				data.email = email;
				// If we have email but no website, try to construct website from email domain
				if (!data.website) {
					const domain = email.split('@')[1];
					if (domain && 
					    !domain.includes('gmail.com') && 
					    !domain.includes('yahoo.com') && 
					    !domain.includes('hotmail.com') && 
					    !domain.includes('outlook.com') &&
					    !domain.includes('free.fr') &&
					    !domain.includes('orange.fr')) {
						data.website = `https://${domain}`;
					}
				}
			}
		}

		// Extract phone (proven approach)
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const phoneMatch = html.match(phonePattern);
		if (phoneMatch) {
			data.phone = phoneMatch[0].trim();
		}

		// Extract address (proven approach)
		const addressPatterns = [
			/\d+\s+[A-Za-zÀ-ÿ\s'-]+(?:rue|avenue|boulevard|place|allée|chemin|impasse|passage)[A-Za-zÀ-ÿ\s,]+(?:Paris|Île-de-France)/gi,
			/\d{5}\s+Paris/gi,
			/\d+[,\s]+(?:rue|avenue|boulevard|place|allée|chemin|impasse|passage)[^,\n]{5,80}/gi
		];
		
		for (const pattern of addressPatterns) {
			const match = html.match(pattern);
			if (match && match.length > 0) {
				data.address = match[0].trim();
				break;
			}
		}

		return data;
	}

	/**
	 * Extract website URL from page
	 */
	extractWebsiteFromPage(document, currentUrl) {
		// Look for external links that might be the organization's website
		const links = Array.from(document.querySelectorAll('a[href]'));
		for (const link of links) {
			const href = link.getAttribute('href');
			if (!href) continue;

			try {
				const linkUrl = new URL(href, currentUrl);
				const currentDomain = new URL(currentUrl).hostname;

				// Skip if it's the same domain or social media
				if (linkUrl.hostname === currentDomain ||
				    linkUrl.hostname.includes('facebook.com') ||
				    linkUrl.hostname.includes('instagram.com') ||
				    linkUrl.hostname.includes('twitter.com') ||
				    linkUrl.hostname.includes('youtube.com') ||
				    linkUrl.hostname.includes('linkedin.com')) {
					continue;
				}

				// If it's an external link and looks like a main website
				if (linkUrl.hostname && !linkUrl.hostname.includes('mairie') && !linkUrl.hostname.includes('paris.fr')) {
					return linkUrl.href;
				}
			} catch {
				// Invalid URL, skip
			}
		}

		return null;
	}

	/**
	 * Calculate extraction confidence based on data completeness
	 */
	calculateConfidence(data) {
		const requiredFields = ['name', 'title', 'heading'];
		const optionalFields = ['description', 'email', 'phone', 'address', 'website'];
		
		let score = 0;
		let maxScore = requiredFields.length + optionalFields.length;

		// Required fields (higher weight)
		requiredFields.forEach(field => {
			if (data[field] && String(data[field]).trim().length > 0) {
				score += 2;
			}
		});

		// Optional fields
		optionalFields.forEach(field => {
			if (data[field] && String(data[field]).trim().length > 0) {
				score += 1;
			}
		});

		return Math.min(score / maxScore, 1.0);
	}
}

