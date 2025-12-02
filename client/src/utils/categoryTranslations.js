import { formatCategory } from './textFormatting.js';

// Category translations: French -> English
const categoryTranslations = {
	'sport': 'Sports',
	'sports': 'Sports',
	'arts': 'Arts',
	'arts martiaux': 'Martial Arts',
	'culture': 'Culture',
	'dance': 'Dance',
	'danse': 'Dance',
	'jeux': 'Games',
	'musique': 'Music',
	'music': 'Music',
	'théâtre': 'Theater',
	'theatre': 'Theater',
	'sciences': 'Science',
	'science': 'Science',
	'nature': 'Nature',
	'lecture': 'Reading',
	'reading': 'Reading',
	'langue': 'Language',
	'language': 'Language',
	'cuisine': 'Cooking',
	'cooking': 'Cooking',
	'informatique': 'Computer Science',
	'computer science': 'Computer Science',
	'programmation': 'Programming',
	'programming': 'Programming'
};

// Reverse map for English -> French
const reverseCategoryTranslations = Object.fromEntries(
	Object.entries(categoryTranslations).map(([fr, en]) => [en.toLowerCase(), fr])
);

/**
 * Translate a category based on locale
 * @param {string} category - The category to translate
 * @param {string} locale - 'en' or 'fr'
 * @returns {string} - Translated and formatted category
 */
export function translateCategory(category, locale) {
	if (!category) return category;
	const normalized = category.toLowerCase().trim();
	
	let translated;
	if (locale === 'en') {
		// Translate from French to English
		translated = categoryTranslations[normalized] || category;
	} else {
		// Keep French as-is, or translate from English to French
		translated = reverseCategoryTranslations[normalized] || category;
	}
	
	// Apply proper capitalization
	return formatCategory(translated, locale);
}

/**
 * Translate an array of categories
 * @param {string[]|string} categories - Categories to translate
 * @param {string} locale - 'en' or 'fr'
 * @returns {string[]|string} - Translated categories
 */
export function translateCategories(categories, locale) {
	if (!categories) return categories;
	
	if (Array.isArray(categories)) {
		return categories.map(cat => translateCategory(cat, locale));
	}
	
	return translateCategory(categories, locale);
}

