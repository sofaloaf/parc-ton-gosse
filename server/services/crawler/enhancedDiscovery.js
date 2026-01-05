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
		
		// 1. Paris Open Data - Liste des associations parisiennes
		try {
			console.log('  📊 Fetching from Paris Open Data...');
			const parisOpenDataResults = await this.fetchParisOpenDataAssociations(arrondissement, postalCode);
			results.push(...parisOpenDataResults);
			console.log(`  ✅ Paris Open Data: Found ${parisOpenDataResults.length} relevant associations`);
		} catch (error) {
			console.warn(`  ⚠️  Paris Open Data search failed:`, error.message);
		}
		
		// 2. Wikidata SPARQL query
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
		
		// 3. Search for PDFs on municipal sites
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
	 * Fetch associations from Paris Open Data portal
	 * API: https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/liste_des_associations_parisiennes/records
	 */
	async fetchParisOpenDataAssociations(arrondissement, postalCode) {
		const results = [];
		
		try {
			// Paris Open Data uses CKAN-like API
			// Try multiple API endpoints
			const apiEndpoints = [
				// Direct dataset API
				`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/liste_des_associations_parisiennes/records?limit=1000&where=code_postal="${postalCode}"`,
				// Alternative format
				`https://opendata.paris.fr/api/records/1.0/search/?dataset=liste_des_associations_parisiennes&q=&rows=1000&facet=code_postal&refine.code_postal=${postalCode}`,
				// CSV download (fallback)
				`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/liste_des_associations_parisiennes/exports/csv?where=code_postal="${postalCode}"`
			];
			
			let associations = [];
			
			for (const endpoint of apiEndpoints) {
				try {
					// Use AbortController for timeout
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 10000);
					
					const response = await fetch(endpoint, {
						headers: {
							'Accept': 'application/json',
							'User-Agent': 'Mozilla/5.0 (compatible; ParcTonGosse/1.0)'
						},
						signal: controller.signal
					});
					
					clearTimeout(timeoutId);
					
					if (!response.ok) continue;
					
					const contentType = response.headers.get('content-type') || '';
					
					if (contentType.includes('application/json')) {
						const data = await response.json();
						
						// Handle different API response formats
						if (data.results) {
							// Format: { results: [{ record: { fields: {...} } }] }
							associations = data.results.map(r => r.record?.fields || r.fields || r).filter(Boolean);
						} else if (data.records) {
							// Format: { records: [{ fields: {...} }] }
							associations = data.records.map(r => r.fields || r).filter(Boolean);
						} else if (Array.isArray(data)) {
							associations = data;
						} else if (data.data) {
							associations = Array.isArray(data.data) ? data.data : [];
						}
						
						if (associations.length > 0) {
							console.log(`  ✅ Successfully fetched ${associations.length} associations from ${endpoint}`);
							break; // Success, stop trying other endpoints
						}
					} else if (contentType.includes('text/csv') || endpoint.includes('.csv')) {
						// Handle CSV format
						const csvText = await response.text();
						associations = this.parseCSV(csvText);
						if (associations.length > 0) {
							console.log(`  ✅ Successfully parsed ${associations.length} associations from CSV`);
							break;
						}
					}
				} catch (error) {
					console.warn(`  ⚠️  Failed to fetch from ${endpoint}:`, error.message);
					continue;
				}
			}
			
			// Process and filter associations
			for (const assoc of associations) {
				// Extract fields (handle different field names)
				const name = assoc.nom || assoc.name || assoc.nom_association || assoc.association || assoc.titre || '';
				const address = assoc.adresse || assoc.address || assoc.adresse_siege || assoc.siege || '';
				const postal = assoc.code_postal || assoc.postal_code || assoc.cp || '';
				const website = assoc.site_web || assoc.website || assoc.url || assoc.lien_site || '';
				const email = assoc.email || assoc.courriel || assoc.mail || '';
				const phone = assoc.telephone || assoc.phone || assoc.tel || '';
				const objet = assoc.objet || assoc.object || assoc.description || assoc.activite || '';
				
				// Filter for relevant kids' activities
				if (!name || name.length < 3) continue;
				
				// Check if it's in the target arrondissement
				if (postal && postal !== postalCode && !postal.startsWith(postalCode.substring(0, 3))) {
					continue;
				}
				
				// Check if it's a kids' activity
				const fullText = `${name} ${objet} ${address}`.toLowerCase();
				if (!this.isKidsActivity(name, website || '', address)) {
					continue;
				}
				
				// Validate and enrich with website search if missing
				let validatedWebsite = website;
				let validatedEmail = email;
				let validatedPhone = phone;
				
				// If website is missing or incomplete, search for it
				// Only search for a limited number to avoid rate limits
				if (results.length < 50 && (!validatedWebsite || !validatedWebsite.startsWith('http'))) {
					try {
						// Add small delay to avoid rate limiting
						await new Promise(resolve => setTimeout(resolve, 200));
						
						const searchResults = await this.searchOrganizationWebsite(name, address, postal);
						if (searchResults.website) {
							validatedWebsite = searchResults.website;
						}
						if (searchResults.email && !validatedEmail) {
							validatedEmail = searchResults.email;
						}
						if (searchResults.phone && !validatedPhone) {
							validatedPhone = searchResults.phone;
						}
					} catch (error) {
						console.warn(`  ⚠️  Website search failed for ${name}:`, error.message);
					}
				}
				
				// Only include if we have at least name + (website OR email OR phone)
				if (validatedWebsite || validatedEmail || validatedPhone) {
					results.push({
						name: name.trim(),
						website: validatedWebsite || null,
						email: validatedEmail || null,
						phone: validatedPhone || null,
						address: address || null,
						postalCode: postal || postalCode,
						description: objet || null,
						source: 'paris_opendata',
						type: 'database',
						validated: !!(validatedWebsite || validatedEmail || validatedPhone)
					});
				}
			}
			
			console.log(`  ✅ Processed ${results.length} validated associations from Paris Open Data`);
			
		} catch (error) {
			console.error(`  ❌ Paris Open Data fetch error:`, error);
		}
		
		return results;
	}
	
	/**
	 * Parse CSV text into array of objects
	 * Handles quoted fields and commas within quotes
	 */
	parseCSV(csvText) {
		const lines = csvText.split('\n').filter(line => line.trim());
		if (lines.length < 2) return [];
		
		// Parse header line (handle quoted fields)
		const parseCSVLine = (line) => {
			const result = [];
			let current = '';
			let inQuotes = false;
			
			for (let i = 0; i < line.length; i++) {
				const char = line[i];
				
				if (char === '"') {
					if (inQuotes && line[i + 1] === '"') {
						// Escaped quote
						current += '"';
						i++;
					} else {
						// Toggle quote state
						inQuotes = !inQuotes;
					}
				} else if (char === ',' && !inQuotes) {
					result.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
			result.push(current.trim());
			return result;
		};
		
		const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
		const results = [];
		
		for (let i = 1; i < lines.length; i++) {
			const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
			if (values.length < headers.length) continue;
			
			const obj = {};
			headers.forEach((header, index) => {
				obj[header] = values[index] || '';
			});
			results.push(obj);
		}
		
		return results;
	}
	
	/**
	 * Search for organization website using Google Custom Search
	 */
	async searchOrganizationWebsite(orgName, address, postalCode) {
		if (!this.googleApiKey || !this.googleCx) {
			return { website: null, email: null, phone: null };
		}
		
		try {
			// Build search query
			const query = `"${orgName}" ${address ? address.split(' ')[0] : ''} ${postalCode || 'Paris'} site:`;
			
			const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleCx}&q=${encodeURIComponent(query)}&num=3`;
			
			// Use AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			
			const response = await fetch(searchUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0' },
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				return { website: null, email: null, phone: null };
			}
			
			const data = await response.json();
			const items = data.items || [];
			
			// Find the most relevant result (usually first one)
			if (items.length > 0) {
				const topResult = items[0];
				const website = topResult.link || null;
				
				// Try to fetch the website to extract contact info
				let email = null;
				let phone = null;
				
				if (website) {
					try {
						// Use AbortController for timeout
						const siteController = new AbortController();
						const siteTimeoutId = setTimeout(() => siteController.abort(), 5000);
						
						const siteResponse = await fetch(website, {
							headers: { 'User-Agent': 'Mozilla/5.0' },
							signal: siteController.signal
						});
						
						clearTimeout(siteTimeoutId);
						
						if (siteResponse.ok) {
							const html = await siteResponse.text();
							const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
							const phoneMatch = html.match(/(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/);
							
							email = emailMatch ? emailMatch[0] : null;
							phone = phoneMatch ? phoneMatch[0] : null;
						}
					} catch (error) {
						// Ignore website fetch errors
					}
				}
				
				return { website, email, phone };
			}
		} catch (error) {
			console.warn(`  ⚠️  Website search error:`, error.message);
		}
		
		return { website: null, email: null, phone: null };
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
		
		// STRICT EXCLUSIONS - These should NEVER be included
		const excludedDomains = [
			'youtube.com', 'youtu.be',
			'mozilla.org', 'firefox',
			'service-public.fr',
			'google.com', 'gmail.com',
			'facebook.com', 'twitter.com', 'instagram.com',
			'paris.fr', 'mairie', 'ville-de-paris',
			'prefecture', 'gouv.fr',
			'play.google.com', 'apps.apple.com',
			'openstreetmap', 'umap',
			'acce-o.fr', // Generic service portal
			'novagouv.fr', // Government portal
			'demande-logement-social.gouv.fr',
			'prefecturedepolice.interieur.gouv.fr'
		];
		
		// Check if website is excluded
		if (website) {
			const websiteLower = website.toLowerCase();
			if (excludedDomains.some(domain => websiteLower.includes(domain))) {
				return false;
			}
		}
		
		// Exclude generic municipal services
		const excludedTerms = [
			'services', 'service', 'municipalité', 'municipal',
			'prendre rendez-vous', 'demander une place',
			'horaires et informations pratiques',
			'mentions légales', 'politique de cookies', 'plan du site',
			'accessibilité', 'contact', 'accueil',
			'les marchés de', 'fêtes de fin d\'année',
			'calendrier de l\'avent', 'remportez des cadeaux',
			'il était une fois', 'quartier populaire',
			'newsletter', 'lettre d\'information',
			'crèche', 'crèches', // Daycare (not activity)
			'logement social', 'demande de logement'
		];
		
		if (excludedTerms.some(term => text.includes(term))) {
			return false;
		}
		
		// Must have activity-related keywords
		const kidsKeywords = ['enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth', 'junior', 'ado', 'adolescent', 'petit', 'petits', 'scolaire', 'extracurriculaire'];
		const activityKeywords = [
			'activité', 'activités', 'activity', 'activities',
			'club', 'clubs', 'sport', 'sports',
			'association', 'associations',
			'cours', 'atelier', 'ateliers',
			'danse', 'dance', 'musique', 'music',
			'théâtre', 'theatre', 'arts martiaux',
			'gymnastique', 'natation', 'swimming',
			'centre de loisirs', 'colonie', 'camp',
			'école de', 'académie', 'cercle'
		];
		
		const hasKids = kidsKeywords.some(kw => text.includes(kw));
		const hasActivity = activityKeywords.some(kw => text.includes(kw));
		
		// Exclude adult-only
		const adultOnly = ['senior', 'séniors', 'adulte', 'adultes', 'retraité', 'retraités'].some(kw => text.includes(kw));
		
		// Must be an actual organization (not just a service page)
		const isGenericService = ['service', 'services', 'information', 'informations', 'démarche', 'démarches'].some(kw => 
			text.includes(kw) && !hasActivity && !hasKids
		);
		
		return (hasKids || hasActivity) && !adultOnly && !isGenericService;
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

