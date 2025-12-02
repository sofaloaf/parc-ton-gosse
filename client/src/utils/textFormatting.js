/**
 * Capitalize French text properly
 * - First letter of each word is capitalized
 * - Handles common French words that should remain lowercase (articles, prepositions)
 * @param {string} text - Text to capitalize
 * @param {string} locale - 'en' or 'fr'
 * @returns {string} - Formatted text
 */
export function capitalizeFrench(text, locale = 'fr') {
	if (!text || typeof text !== 'string') return text;
	
	if (locale !== 'fr') {
		// For English, just capitalize first letter of each word
		return text.split(' ').map(word => {
			if (!word) return word;
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		}).join(' ');
	}
	
	// French capitalization rules
	const lowercaseWords = [
		'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une',
		'à', 'au', 'aux', 'en', 'et', 'ou', 'pour', 'par',
		'sur', 'sous', 'dans', 'avec', 'sans', 'chez'
	];
	
	const words = text.split(' ');
	return words.map((word, index) => {
		if (!word) return word;
		
		const normalized = word.toLowerCase();
		
		// First word is always capitalized
		if (index === 0) {
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		}
		
		// Articles and prepositions remain lowercase
		if (lowercaseWords.includes(normalized)) {
			return normalized;
		}
		
		// Other words: capitalize first letter
		return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	}).join(' ');
}

/**
 * Format a category name with proper capitalization
 * @param {string} category - Category name
 * @param {string} locale - 'en' or 'fr'
 * @returns {string} - Formatted category
 */
export function formatCategory(category, locale) {
	if (!category) return category;
	
	// Apply capitalization
	const formatted = capitalizeFrench(category, locale);
	
	// Handle special cases for French
	if (locale === 'fr') {
		// Ensure proper capitalization for compound categories
		return formatted
			.split(' ')
			.map(word => {
				// Handle hyphenated words
				if (word.includes('-')) {
					return word.split('-').map(w => 
						w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
					).join('-');
				}
				return word;
			})
			.join(' ');
	}
	
	return formatted;
}

/**
 * Format activity title/name with proper capitalization
 * @param {string|object} title - Title (can be string or {en: string, fr: string})
 * @param {string} locale - 'en' or 'fr'
 * @returns {string} - Formatted title
 */
export function formatTitle(title, locale) {
	if (!title) return '';
	
	// Handle bilingual object
	if (typeof title === 'object' && title !== null) {
		const titleText = title[locale] || title.en || title.fr || '';
		return capitalizeFrench(titleText, locale);
	}
	
	// Handle string
	if (typeof title === 'string') {
		return capitalizeFrench(title, locale);
	}
	
	return String(title);
}

