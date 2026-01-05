/**
 * Enhanced Discovery with Database/PDF Focus
 * 
 * Prioritizes existing databases and PDFs over web searches:
 * - Official registries (Wikidata, France Bénévolat, etc.)
 * - PDF documents from municipal sites
 * - Existing activity databases
 * - Cross-reference multiple sources
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import pdf from 'pdf-parse';

export class EnhancedDiscovery {
	constructor(options = {}) {
		this.googleApiKey = options.googleApiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
		this.googleCx = options.googleCx || process.env.GOOGLE_CUSTOM_SEARCH_CX;
		this.visitedUrls = new Set();
		this.pdfCache = new Map(); // Cache PDF text to avoid re-downloading
	}

	/**
	 * Search official databases and registries
	 */
	async searchOfficialDatabases(arrondissement, postalCode) {
		const results = [];
		
		console.log('📚 Searching official databases and registries...');
		
		// 1. Wikidata SPARQL query
		try {
			const wikidataQuery = `
				SELECT ?item ?itemLabel ?website ?email ?phone ?address WHERE {
					?item wdt:P31 wd:Q43229 .  # Association
					?item wdt:P131 wd:Q90 .    # Located in Paris
					OPTIONAL { ?item wdt:P856 ?website . }
					OPTIONAL { ?item wdt:P968 ?email . }
					OPTIONAL { ?item wdt:P1329 ?phone . }
					OPTIONAL { ?item wdt:P6375 ?address . }
					SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" . }
				}
				LIMIT 200
			`;
			
			const wikidataUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(wikidataQuery)}&format=json`;
			const response = await fetch(wikidataUrl, {
				headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
			});
			
			if (response.ok) {
				const data = await response.json();
				const bindings = data.results?.bindings || [];
				
				for (const binding of bindings) {
					const name = binding.itemLabel?.value || '';
					const website = binding.website?.value || '';
					const email = binding.email?.value || '';
					const phone = binding.phone?.value || '';
					const address = binding.address?.value || '';
					
					// Filter for kids' activities
					if (this.isKidsActivity(name, website, address)) {
						results.push({
							name,
							website,
							email,
							phone,
							address,
							source: 'wikidata',
							type: 'database'
						});
					}
				}
				
				console.log(`  ✅ Wikidata: Found ${results.length} relevant associations`);
			}
		} catch (error) {
			console.warn(`  ⚠️  Wikidata search failed:`, error.message);
		}
		
		// 2. Search for PDFs on municipal sites
		try {
			const arrNum = arrondissement.replace('er', '').replace('e', '');
			const pdfUrls = [
				`https://mairie${arrNum}.paris.fr/recherche?q=associations+pdf`,
				`https://mairie${arrNum}.paris.fr/recherche?q=activités+pdf`,
				`https://www.paris.fr/pages/associations-${arrondissement}`,
			];
			
			for (const pdfUrl of pdfUrls) {
				const pdfResults = await this.searchPDFsOnPage(pdfUrl, arrondissement);
				results.push(...pdfResults);
			}
			
			console.log(`  ✅ PDF search: Found ${results.filter(r => r.type === 'pdf').length} PDF sources`);
		} catch (error) {
			console.warn(`  ⚠️  PDF search failed:`, error.message);
		}
		
		return results;
	}

	/**
	 * Search for PDFs on a page and extract organizations
	 */
	async searchPDFsOnPage(pageUrl, arrondissement) {
		const results = [];
		
		try {
			const response = await fetch(pageUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0' }
			});
			
			if (!response.ok) return results;
			
			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;
			
			// Find PDF links
			const pdfLinks = Array.from(document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf"]'))
				.map(a => {
					const href = a.getAttribute('href');
					if (href.startsWith('http')) return href;
					if (href.startsWith('/')) {
						const baseUrl = new URL(pageUrl).origin;
						return baseUrl + href;
					}
					return new URL(href, pageUrl).href;
				})
				.filter(url => url.endsWith('.pdf') || url.includes('.pdf'));
			
			console.log(`  📄 Found ${pdfLinks.length} PDF links on ${pageUrl}`);
			
			// Extract from PDFs
			for (const pdfUrl of pdfLinks.slice(0, 10)) { // Limit to 10 PDFs
				try {
					const pdfResults = await this.extractFromPDF(pdfUrl, arrondissement);
					results.push(...pdfResults);
				} catch (error) {
					console.warn(`  ⚠️  Failed to extract from PDF ${pdfUrl}:`, error.message);
				}
			}
		} catch (error) {
			console.warn(`  ⚠️  Failed to search PDFs on ${pageUrl}:`, error.message);
		}
		
		return results;
	}

	/**
	 * Extract organizations from PDF
	 */
	async extractFromPDF(pdfUrl, arrondissement) {
		const results = [];
		
		// Check cache
		if (this.pdfCache.has(pdfUrl)) {
			return this.extractOrganizationsFromText(this.pdfCache.get(pdfUrl), pdfUrl, arrondissement);
		}
		
		try {
			const response = await fetch(pdfUrl);
			if (!response.ok) return results;
			
			const buffer = await response.arrayBuffer();
			const pdfData = await pdf(Buffer.from(buffer));
			const text = pdfData.text;
			
			// Cache PDF text
			this.pdfCache.set(pdfUrl, text);
			
			return this.extractOrganizationsFromText(text, pdfUrl, arrondissement);
		} catch (error) {
			console.warn(`  ⚠️  Failed to parse PDF ${pdfUrl}:`, error.message);
			return results;
		}
	}

	/**
	 * Extract organizations from text (PDF or HTML)
	 */
	extractOrganizationsFromText(text, sourceUrl, arrondissement) {
		const results = [];
		const lowerText = text.toLowerCase();
		
		// Skip if not relevant
		if (!this.isRelevantText(lowerText)) {
			return results;
		}
		
		// French association naming patterns
		const associationPatterns = [
			/(?:Association|Club|Cercle|Amicale|Centre|École|Académie)\s+([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})/g,
			/([A-ZÉÈÀÛÔÎÂÙÇ][a-zA-ZÉÈÀÛÔÎÂÙÇ\s\-'\.]{3,60})\s+(?:Association|Club|Cercle|Amicale)/g
		];
		
		// Extract organization names
		const foundNames = new Set();
		for (const pattern of associationPatterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				const name = (match[1] || match[0]).trim();
				if (name.length > 3 && name.length < 100) {
					foundNames.add(name);
				}
			}
		}
		
		// Extract contact info
		const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		const phonePattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/g;
		const websitePattern = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		
		const emails = Array.from(text.matchAll(emailPattern)).map(m => m[0]);
		const phones = Array.from(text.matchAll(phonePattern)).map(m => m[0]);
		const websites = Array.from(text.matchAll(websitePattern))
			.map(m => m[0])
			.filter(url => !url.includes('paris.fr') && !url.includes('mairie')) // Exclude municipal sites
			.slice(0, 10);
		
		// Create results for each found organization
		for (const name of foundNames) {
			// Check if it's a kids' activity
			if (this.isKidsActivity(name, '', '')) {
				results.push({
					name: name,
					email: emails[0] || null,
					phone: phones[0] || null,
					website: websites[0] || null,
					address: this.extractAddress(text, name),
					source: sourceUrl,
					type: 'pdf'
				});
			}
		}
		
		return results;
	}

	/**
	 * Check if text is relevant (contains activity keywords)
	 */
	isRelevantText(text) {
		const activityKeywords = [
			'activité', 'activités', 'activity', 'activities',
			'club', 'clubs', 'association', 'associations',
			'sport', 'sports', 'loisir', 'loisirs',
			'enfant', 'enfants', 'kids', 'children'
		];
		
		return activityKeywords.some(kw => text.includes(kw));
	}

	/**
	 * Check if organization is a kids' activity
	 */
	isKidsActivity(name, website, address) {
		const text = `${name} ${website} ${address}`.toLowerCase();
		
		const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth', 'junior'];
		const activityKeywords = ['activité', 'activités', 'activity', 'activities', 'club', 'sport', 'sports'];
		
		const hasKids = kidsKeywords.some(kw => text.includes(kw));
		const hasActivity = activityKeywords.some(kw => text.includes(kw));
		
		// Exclude adult-only
		const adultOnly = ['senior', 'séniors', 'adulte', 'adultes', 'retraité'].some(kw => text.includes(kw));
		
		return (hasKids || hasActivity) && !adultOnly;
	}

	/**
	 * Extract address from text near organization name
	 */
	extractAddress(text, orgName) {
		// Look for address patterns near organization name
		const nameIndex = text.indexOf(orgName);
		if (nameIndex === -1) return null;
		
		const context = text.substring(nameIndex, nameIndex + 200);
		const addressPattern = /(?:adresse|address)[:\s]+([0-9]+\s+[^,\n]{10,80})/i;
		const match = context.match(addressPattern);
		
		return match ? match[1].trim() : null;
	}
}

