/**
 * Enrichment Module
 * 
 * Handles data enrichment:
 * - Geocoding (address → coordinates)
 * - Categorization (activity type classification)
 * - Normalization (format standardization)
 * - Data fusion (merge from multiple sources)
 */

import { Client } from '@googlemaps/google-maps-services-js';

export class EnrichmentModule {
	constructor(options = {}) {
		this.googleMapsApiKey = options.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
		this.mapsClient = this.googleMapsApiKey ? new Client({}) : null;
	}

	/**
	 * Enrich entity with geocoding, categorization, etc.
	 */
	async enrich(entity, options = {}) {
		const enriched = { ...entity };

		// Geocoding
		if (options.geocode !== false && entity.data?.address) {
			const geocodeResult = await this.geocode(entity.data.address);
			if (geocodeResult) {
				enriched.data = enriched.data || {};
				enriched.data.latitude = geocodeResult.lat;
				enriched.data.longitude = geocodeResult.lng;
				enriched.data.formattedAddress = geocodeResult.formattedAddress;
			}
		}

		// Categorization
		if (options.categorize !== false) {
			enriched.data = enriched.data || {};
			enriched.data.categories = this.categorize(entity);
		}

		// Normalization
		enriched.data = this.normalize(enriched.data);

		// Add enrichment metadata
		enriched.enrichedAt = new Date().toISOString();
		enriched.enrichmentVersion = '1.0';

		return enriched;
	}

	/**
	 * Geocode an address
	 */
	async geocode(address) {
		if (!this.mapsClient || !this.googleMapsApiKey) {
			console.warn('Google Maps API not configured, skipping geocoding');
			return null;
		}

		try {
			const response = await this.mapsClient.geocode({
				params: {
					address: `${address}, Paris, France`,
					key: this.googleMapsApiKey
				}
			});

			if (response.data.results && response.data.results.length > 0) {
				const result = response.data.results[0];
				const location = result.geometry.location;
				return {
					lat: location.lat,
					lng: location.lng,
					formattedAddress: result.formatted_address,
					placeId: result.place_id
				};
			}

			return null;
		} catch (error) {
			console.error('Geocoding error:', error.message);
			return null;
		}
	}

	/**
	 * Categorize entity based on name, description, etc.
	 */
	categorize(entity) {
		const categories = [];
		const text = `${entity.name || ''} ${entity.title || ''} ${entity.data?.description || ''} ${entity.data?.content || ''}`.toLowerCase();

		// Activity categories (French)
		const categoryKeywords = {
			'sport': ['sport', 'football', 'basket', 'tennis', 'natation', 'danse', 'gymnastique', 'athlétisme'],
			'musique': ['musique', 'chant', 'chorale', 'orchestre', 'piano', 'guitare', 'violon'],
			'art': ['art', 'peinture', 'dessin', 'sculpture', 'théâtre', 'théatre', 'improvisation'],
			'sciences': ['sciences', 'robotique', 'programmation', 'informatique', 'mathématiques', 'expérience'],
			'langues': ['langue', 'anglais', 'espagnol', 'allemand', 'chinois', 'cours de langue'],
			'loisirs': ['loisir', 'jeu', 'activité', 'atelier', 'club', 'association'],
			'culture': ['culture', 'histoire', 'patrimoine', 'musée', 'bibliothèque'],
			'nature': ['nature', 'environnement', 'jardin', 'écologie', 'développement durable']
		};

		for (const [category, keywords] of Object.entries(categoryKeywords)) {
			if (keywords.some(keyword => text.includes(keyword))) {
				categories.push(category);
			}
		}

		// Age range detection
		const agePatterns = [
			{ pattern: /(\d+)\s*(?:à|-|et)\s*(\d+)\s*ans?/i, extract: (m) => ({ min: parseInt(m[1]), max: parseInt(m[2]) }) },
			{ pattern: /(?:dès|à partir de|début)\s*(\d+)\s*ans?/i, extract: (m) => ({ min: parseInt(m[1]), max: 18 }) },
			{ pattern: /(?:jusqu'?à|maximum)\s*(\d+)\s*ans?/i, extract: (m) => ({ min: 0, max: parseInt(m[1]) }) }
		];

		for (const { pattern, extract } of agePatterns) {
			const match = text.match(pattern);
			if (match) {
				const ageRange = extract(match);
				entity.data = entity.data || {};
				entity.data.ageMin = ageRange.min;
				entity.data.ageMax = ageRange.max;
				break;
			}
		}

		return categories.length > 0 ? categories : ['loisirs']; // Default category
	}

	/**
	 * Normalize data formats
	 */
	normalize(data) {
		if (!data) return {};

		const normalized = { ...data };

		// Normalize name/title
		if (normalized.name) {
			normalized.name = normalized.name.trim();
		}
		if (normalized.title) {
			normalized.title = normalized.title.trim();
		}

		// Normalize phone
		if (normalized.phone) {
			normalized.phone = this.normalizePhone(normalized.phone);
		}

		// Normalize email
		if (normalized.email) {
			normalized.email = normalized.email.toLowerCase().trim();
		}

		// Normalize website URL
		if (normalized.website) {
			normalized.website = this.normalizeUrl(normalized.website);
		}

		// Normalize address
		if (normalized.address) {
			normalized.address = normalized.address.trim();
		}

		// Normalize price
		if (normalized.price) {
			normalized.price = this.normalizePrice(normalized.price);
		}

		// Ensure arrays
		if (normalized.categories && !Array.isArray(normalized.categories)) {
			normalized.categories = [normalized.categories];
		}
		if (normalized.images && !Array.isArray(normalized.images)) {
			normalized.images = [normalized.images];
		}

		return normalized;
	}

	/**
	 * Normalize phone number
	 */
	normalizePhone(phone) {
		// Remove spaces, dots, dashes
		let normalized = phone.replace(/[.\s-]/g, '');
		
		// Convert +33 to 0
		if (normalized.startsWith('+33')) {
			normalized = '0' + normalized.substring(3);
		}
		
		// Format: 0X XX XX XX XX
		if (normalized.length === 10 && normalized.startsWith('0')) {
			return normalized.match(/.{1,2}/g)?.join(' ') || normalized;
		}
		
		return phone; // Return original if can't normalize
	}

	/**
	 * Normalize URL
	 */
	normalizeUrl(url) {
		try {
			const urlObj = new URL(url);
			return urlObj.href;
		} catch {
			// If invalid, try to fix common issues
			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				return `https://${url}`;
			}
			return url;
		}
	}

	/**
	 * Normalize price
	 */
	normalizePrice(price) {
		if (typeof price === 'number') {
			return { amount: price, currency: 'EUR' };
		}

		if (typeof price === 'string') {
			// Extract number
			const match = price.match(/(\d+(?:[.,]\d+)?)/);
			if (match) {
				const amount = parseFloat(match[1].replace(',', '.'));
				const currency = price.includes('€') || price.includes('EUR') ? 'EUR' : 'EUR';
				return { amount, currency };
			}
		}

		return { amount: 0, currency: 'EUR' };
	}

	/**
	 * Fuse data from multiple sources
	 */
	fuseData(sources) {
		if (!sources || sources.length === 0) return null;

		// Sort by confidence (highest first)
		const sorted = sources.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

		// Start with highest confidence source
		const fused = { ...sorted[0].data };

		// Merge in data from other sources (fill gaps)
		for (let i = 1; i < sorted.length; i++) {
			const source = sorted[i];
			for (const [key, value] of Object.entries(source.data || {})) {
				if (!fused[key] && value) {
					fused[key] = value;
				}
			}
		}

		return fused;
	}
}

