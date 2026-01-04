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
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
				},
				timeout: this.timeout
			});

			if (!response.ok) {
				result.error = `HTTP ${response.status}`;
				return result;
			}

			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;

			// Extract using multiple strategies
			const structuredData = this.extractStructuredData(document);
			const metaData = this.extractMetaData(document);
			const contentData = this.extractContentData(document);
			const contactData = this.extractContactInfo(html);

			// Merge all extracted data
			result.data = {
				...structuredData,
				...metaData,
				...contentData,
				...contactData
			};

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

		return {
			heading: h1,
			content: paragraphs.join('\n\n')
		};
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

		// Address patterns
		const addressPattern = /\d+[,\s]+(?:rue|avenue|boulevard|place|allée|chemin|impasse)[^,\n]{5,50}/gi;
		const addresses = html.match(addressPattern) || [];
		data.address = addresses[0] || null;

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
	 * Extract data from PDF (placeholder - requires pdf-parse or similar)
	 */
	async extractFromPDF(url, options = {}) {
		// Note: This requires a PDF parsing library like pdf-parse
		// For now, return a placeholder structure
		return {
			url,
			source: 'pdf',
			extractedAt: new Date().toISOString(),
			confidence: 0,
			data: {},
			note: 'PDF extraction requires pdf-parse library. Install with: npm install pdf-parse',
			error: 'PDF extraction not yet implemented'
		};

		// Future implementation would:
		// 1. Download PDF
		// 2. Extract text using pdf-parse
		// 3. Apply named entity recognition
		// 4. Extract structured information
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
	 * Calculate extraction confidence based on data completeness
	 */
	calculateConfidence(data) {
		const requiredFields = ['name', 'title', 'heading'];
		const optionalFields = ['description', 'email', 'phone', 'address', 'website'];
		
		let score = 0;
		let maxScore = requiredFields.length + optionalFields.length;

		// Required fields (higher weight)
		requiredFields.forEach(field => {
			if (data[field] && data[field].trim().length > 0) {
				score += 2;
			}
		});

		// Optional fields
		optionalFields.forEach(field => {
			if (data[field] && data[field].trim().length > 0) {
				score += 1;
			}
		});

		return Math.min(score / maxScore, 1.0);
	}
}

