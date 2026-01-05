/**
 * Feature Extractor
 * 
 * Extracts numerical features from organization/activity data for ML model.
 * Uses ALL available fields from the 132 activities dataset.
 */

export class FeatureExtractor {
	constructor() {
		// Keywords for kids' activities (French and English)
		this.kidsKeywords = [
			'enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth',
			'ado', 'adolescent', 'petit', 'petits', 'junior', 'scolaire',
			'extracurriculaire', 'centre de loisirs', 'colonie', 'camp'
		];
		
		// Activity keywords
		this.activityKeywords = [
			'sport', 'sports', 'activité', 'activités', 'activity', 'activities',
			'club', 'clubs', 'association', 'associations', 'cours', 'lesson',
			'atelier', 'ateliers', 'workshop', 'training', 'entraînement'
		];
		
		// Adult-only indicators (negative)
		this.adultOnlyKeywords = [
			'senior', 'séniors', 'adulte', 'adultes', 'adult', 'retraité',
			'retraités', 'retired', 'troisième âge'
		];
		
		// Generic nonprofit keywords (negative if no activity keywords)
		this.genericNonprofitKeywords = [
			'bénévolat', 'volunteer', 'charity', 'charité', 'fondation',
			'foundation', 'aide', 'help', 'soutien', 'support'
		];
	}

	/**
	 * Extract all features from an organization/activity object
	 * Returns a flat array of numerical features for ML model
	 */
	extract(organization) {
		const features = [];
		
		// Text features (from title, description, activityType, categories, additionalNotes)
		features.push(...this.extractTextFeatures(organization));
		
		// Contact features (email, phone, website, registration link)
		features.push(...this.extractContactFeatures(organization));
		
		// Geographic features (neighborhood, addresses)
		features.push(...this.extractGeographicFeatures(organization));
		
		// Age features (ageMin, ageMax, adults)
		features.push(...this.extractAgeFeatures(organization));
		
		// Pricing features (price_amount, currency)
		features.push(...this.extractPricingFeatures(organization));
		
		// Availability features (disponibiliteJours, disponibiliteDates)
		features.push(...this.extractAvailabilityFeatures(organization));
		
		// Structural features (data completeness, providerId patterns)
		features.push(...this.extractStructuralFeatures(organization));
		
		return features;
	}

	/**
	 * Extract text-based features
	 */
	extractTextFeatures(org) {
		const features = [];
		
		// Combine all text fields
		const titleEn = (org.title_en || org.title?.en || '').toLowerCase();
		const titleFr = (org.title_fr || org.title?.fr || '').toLowerCase();
		const descEn = (org.description_en || org.description?.en || '').toLowerCase();
		const descFr = (org.description_fr || org.description?.fr || '').toLowerCase();
		const activityType = (org.activityType || '').toLowerCase();
		const categories = Array.isArray(org.categories) ? org.categories.join(' ').toLowerCase() : (org.categories || '').toLowerCase();
		const additionalNotes = (org.additionalNotes || '').toLowerCase();
		
		const allText = `${titleEn} ${titleFr} ${descEn} ${descFr} ${activityType} ${categories} ${additionalNotes}`;
		
		// Feature 1-10: Keyword presence (kids keywords)
		for (let i = 0; i < 10; i++) {
			const keyword = this.kidsKeywords[i] || '';
			features.push(allText.includes(keyword) ? 1 : 0);
		}
		
		// Feature 11-20: Activity keyword presence
		for (let i = 0; i < 10; i++) {
			const keyword = this.activityKeywords[i] || '';
			features.push(allText.includes(keyword) ? 1 : 0);
		}
		
		// Feature 21-25: Adult-only keyword presence (negative indicator)
		for (let i = 0; i < 5; i++) {
			const keyword = this.adultOnlyKeywords[i] || '';
			features.push(allText.includes(keyword) ? 1 : 0);
		}
		
		// Feature 26-30: Generic nonprofit keywords (negative if no activity keywords)
		let hasActivityKeyword = this.activityKeywords.some(kw => allText.includes(kw));
		for (let i = 0; i < 5; i++) {
			const keyword = this.genericNonprofitKeywords[i] || '';
			// Negative if generic nonprofit keyword present but no activity keywords
			features.push((allText.includes(keyword) && !hasActivityKeyword) ? 1 : 0);
		}
		
		// Feature 31: Title length (normalized)
		const titleLength = (titleEn + titleFr).length;
		features.push(Math.min(titleLength / 100, 1)); // Normalize to 0-1
		
		// Feature 32: Description length (normalized)
		const descLength = (descEn + descFr).length;
		features.push(Math.min(descLength / 500, 1)); // Normalize to 0-1
		
		// Feature 33: Has activity type
		features.push(activityType.length > 0 ? 1 : 0);
		
		// Feature 34: Number of categories
		const categoryCount = Array.isArray(org.categories) ? org.categories.length : (org.categories ? 1 : 0);
		features.push(Math.min(categoryCount / 5, 1)); // Normalize to 0-1
		
		// Feature 35: Has additional notes
		features.push(additionalNotes.length > 0 ? 1 : 0);
		
		return features;
	}

	/**
	 * Extract contact-based features
	 */
	extractContactFeatures(org) {
		const features = [];
		
		// Feature 36: Has email
		const hasEmail = !!(org.contactEmail || org.email);
		features.push(hasEmail ? 1 : 0);
		
		// Feature 37: Email format validity
		const email = org.contactEmail || org.email || '';
		const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
		features.push(validEmail ? 1 : 0);
		
		// Feature 38: Has phone
		const hasPhone = !!(org.contactPhone || org.phone);
		features.push(hasPhone ? 1 : 0);
		
		// Feature 39: Phone format validity (French format)
		const phone = org.contactPhone || org.phone || '';
		const validPhone = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/.test(phone);
		features.push(validPhone ? 1 : 0);
		
		// Feature 40: Has website
		const hasWebsite = !!(org.websiteLink || org.website);
		features.push(hasWebsite ? 1 : 0);
		
		// Feature 41: Website URL validity
		const website = org.websiteLink || org.website || '';
		let validWebsite = false;
		try {
			if (website) {
				new URL(website.startsWith('http') ? website : `https://${website}`);
				validWebsite = true;
			}
		} catch {}
		features.push(validWebsite ? 1 : 0);
		
		// Feature 42: Has registration link
		features.push(!!org.registrationLink ? 1 : 0);
		
		// Feature 43: Contact completeness (0-1)
		const contactFields = [hasEmail, hasPhone, hasWebsite, !!org.registrationLink];
		const contactCompleteness = contactFields.filter(Boolean).length / contactFields.length;
		features.push(contactCompleteness);
		
		return features;
	}

	/**
	 * Extract geographic features
	 */
	extractGeographicFeatures(org) {
		const features = [];
		
		// Feature 44: Has neighborhood
		features.push(!!org.neighborhood ? 1 : 0);
		
		// Feature 45: Neighborhood mentions arrondissement (20e, 20, XX)
		const neighborhood = (org.neighborhood || '').toLowerCase();
		const mentionsArrondissement = /20|xx|vingtième/i.test(neighborhood);
		features.push(mentionsArrondissement ? 1 : 0);
		
		// Feature 46: Has address
		const hasAddress = !!(org.addresses || org.address);
		features.push(hasAddress ? 1 : 0);
		
		// Feature 47: Address mentions 75020
		const address = (org.addresses || org.address || '').toLowerCase();
		const mentions75020 = address.includes('75020') || address.includes('paris 20');
		features.push(mentions75020 ? 1 : 0);
		
		// Feature 48: Address mentions arrondissement neighborhoods
		const neighborhoods = ['ménilmontant', 'saint-fargeau', 'gambetta', 'porte de bagnolet'];
		const mentionsNeighborhood = neighborhoods.some(n => address.includes(n));
		features.push(mentionsNeighborhood ? 1 : 0);
		
		// Feature 49: Geographic completeness (0-1)
		const geoFields = [!!org.neighborhood, hasAddress];
		const geoCompleteness = geoFields.filter(Boolean).length / geoFields.length;
		features.push(geoCompleteness);
		
		return features;
	}

	/**
	 * Extract age-based features
	 */
	extractAgeFeatures(org) {
		const features = [];
		
		// Feature 50: Has ageMin
		features.push(org.ageMin !== undefined && org.ageMin !== null ? 1 : 0);
		
		// Feature 51: Has ageMax
		features.push(org.ageMax !== undefined && org.ageMax !== null ? 1 : 0);
		
		// Feature 52: AgeMin value (normalized, 0-18)
		const ageMin = org.ageMin || 0;
		features.push(Math.min(ageMin / 18, 1));
		
		// Feature 53: AgeMax value (normalized, 0-18)
		const ageMax = org.ageMax || 18;
		features.push(Math.min(ageMax / 18, 1));
		
		// Feature 54: Age range appropriateness for kids (0-1)
		// Ideal: ageMin <= 12, ageMax >= 6
		const appropriateForKids = (ageMin <= 12 && ageMax >= 6) ? 1 : 0;
		features.push(appropriateForKids);
		
		// Feature 55: Adults allowed (negative indicator for kids-only focus)
		features.push(org.adults ? 1 : 0);
		
		return features;
	}

	/**
	 * Extract pricing features
	 */
	extractPricingFeatures(org) {
		const features = [];
		
		// Feature 56: Has price
		const hasPrice = !!(org.price_amount || org.price?.amount);
		features.push(hasPrice ? 1 : 0);
		
		// Feature 57: Price amount (normalized, 0-1000€)
		const priceAmount = org.price_amount || org.price?.amount || 0;
		features.push(Math.min(priceAmount / 1000, 1));
		
		// Feature 58: Has currency
		features.push(!!(org.currency || org.price?.currency) ? 1 : 0);
		
		return features;
	}

	/**
	 * Extract availability features
	 */
	extractAvailabilityFeatures(org) {
		const features = [];
		
		// Feature 59: Has disponibiliteJours
		features.push(!!org.disponibiliteJours ? 1 : 0);
		
		// Feature 60: Has disponibiliteDates
		features.push(!!org.disponibiliteDates ? 1 : 0);
		
		// Feature 61: Schedule completeness (0-1)
		const scheduleFields = [!!org.disponibiliteJours, !!org.disponibiliteDates];
		const scheduleCompleteness = scheduleFields.filter(Boolean).length / scheduleFields.length;
		features.push(scheduleCompleteness);
		
		return features;
	}

	/**
	 * Extract structural features (data completeness, patterns)
	 */
	extractStructuralFeatures(org) {
		const features = [];
		
		// Feature 62: Overall data completeness (0-1)
		// Count filled fields vs total expected fields
		const expectedFields = [
			'title_en', 'title_fr', 'description_en', 'description_fr',
			'categories', 'activityType', 'ageMin', 'ageMax',
			'contactEmail', 'contactPhone', 'websiteLink',
			'neighborhood', 'addresses', 'price_amount'
		];
		
		let filledCount = 0;
		expectedFields.forEach(field => {
			if (field.includes('title') || field.includes('description')) {
				const en = field.replace('_en', '').replace('_fr', '');
				if (org[`${en}_en`] || org[`${en}_fr`] || org[en]?.en || org[en]?.fr) {
					filledCount++;
				}
			} else if (org[field] !== undefined && org[field] !== null && org[field] !== '') {
				filledCount++;
			}
		});
		
		const completeness = filledCount / expectedFields.length;
		features.push(completeness);
		
		// Feature 63: Has providerId (indicates existing organization)
		features.push(!!org.providerId ? 1 : 0);
		
		// Feature 64: ProviderId pattern (not "Provider-X" indicates real provider)
		const providerId = org.providerId || '';
		const hasRealProviderId = providerId && !providerId.toLowerCase().startsWith('provider-');
		features.push(hasRealProviderId ? 1 : 0);
		
		return features;
	}

	/**
	 * Get feature count (for model input shape)
	 */
	getFeatureCount() {
		// Total: 64 features
		return 64;
	}
}

