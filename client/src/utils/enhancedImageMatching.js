/**
 * Enhanced Image Matching System
 * 
 * Intelligently matches activity images based on:
 * Priority 1: Exact activity name match
 * Priority 2: Activity type match
 * Priority 3: Primary category match
 * Priority 4: Keyword match from description
 * Priority 5: Default category fallback
 * 
 * Uses comprehensive keyword extraction and mapping
 */

import { CATEGORY_IMAGE_SETS } from './activityImages.js';

/**
 * Activity type and keyword mappings to image categories
 * Maps specific activity types and keywords to image sets
 */
const ACTIVITY_TYPE_MAPPINGS = {
	// Sports
	'football': 'football',
	'soccer': 'soccer',
	'basketball': 'basketball',
	'tennis': 'tennis',
	'swimming': 'swimming',
	'natation': 'swimming',
	'rugby': 'rugby',
	'handball': 'handball',
	'volleyball': 'volleyball',
	'volley': 'volleyball',
	'gymnastics': 'gymnastics',
	'gymnastique': 'gymnastics',
	'cycling': 'sport',
	'vélo': 'sport',
	'velo': 'sport',
	'escalade': 'sport',
	'climbing': 'sport',
	'equitation': 'sport',
	'horse riding': 'sport',
	
	// Martial Arts
	'judo': 'judo',
	'karate': 'karate',
	'aikido': 'aikido',
	'kung fu': 'kung fu',
	'kung-fu': 'kung fu',
	'arts martiaux': 'martial arts',
	'martial arts': 'martial arts',
	
	// Arts
	'peinture': 'painting',
	'painting': 'painting',
	'dessin': 'drawing',
	'drawing': 'drawing',
	'sculpture': 'art',
	'pottery': 'pottery',
	'poterie': 'pottery',
	'ceramique': 'pottery',
	'ceramics': 'pottery',
	
	// Music
	'piano': 'piano',
	'guitar': 'guitar',
	'guitare': 'guitar',
	'violin': 'violin',
	'violon': 'violin',
	'violoncelle': 'violin',
	'cello': 'violin',
	'flute': 'music',
	'flûte': 'music',
	'chant': 'singing',
	'singing': 'singing',
	'chorale': 'choir',
	'choir': 'choir',
	'batterie': 'drums',
	'drums': 'drums',
	
	// Dance
	'ballet': 'ballet',
	'hip-hop': 'hip-hop',
	'hip hop': 'hip-hop',
	'contemporain': 'contemporary',
	'contemporary': 'contemporary',
	'salsa': 'dance',
	'classique': 'ballet',
	'classical': 'ballet',
	
	// Theater/Culture
	'theatre': 'theatre',
	'théâtre': 'theatre',
	'theater': 'theatre',
	'culture': 'culture',
	
	// Games
	'chess': 'chess',
	'echecs': 'chess',
	'puzzle': 'puzzle',
	'jeux': 'games',
	'games': 'games',
};

/**
 * Keywords extracted from descriptions that map to image categories
 */
const DESCRIPTION_KEYWORDS = {
	// Sports keywords
	'football': 'football',
	'soccer': 'soccer',
	'ballon': 'football',
	'basketball': 'basketball',
	'panier': 'basketball',
	'tennis': 'tennis',
	'raquette': 'tennis',
	'swimming': 'swimming',
	'nage': 'swimming',
	'natation': 'swimming',
	'piscine': 'swimming',
	'rugby': 'rugby',
	'handball': 'handball',
	'volleyball': 'volleyball',
	'gymnastique': 'gymnastics',
	'gymnastics': 'gymnastics',
	'équitation': 'sport',
	'cheval': 'sport',
	'horse': 'sport',
	'escalade': 'sport',
	'climbing': 'sport',
	
	// Martial Arts keywords
	'judo': 'judo',
	'karate': 'karate',
	'aikido': 'aikido',
	'kung fu': 'kung fu',
	'arts martiaux': 'martial arts',
	'martial arts': 'martial arts',
	
	// Arts keywords
	'peinture': 'painting',
	'paint': 'painting',
	'peindre': 'painting',
	'dessin': 'drawing',
	'draw': 'drawing',
	'dessiner': 'drawing',
	'sculpture': 'art',
	'sculpt': 'art',
	'poterie': 'pottery',
	'pottery': 'pottery',
	'ceramique': 'pottery',
	'ceramics': 'pottery',
	
	// Music keywords
	'piano': 'piano',
	'guitare': 'guitar',
	'guitar': 'guitar',
	'violon': 'violin',
	'violin': 'violin',
	'flute': 'music',
	'flûte': 'music',
	'chant': 'singing',
	'sing': 'singing',
	'chanter': 'singing',
	'chorale': 'choir',
	'choir': 'choir',
	'batterie': 'drums',
	'drums': 'drums',
	'drum': 'drums',
	'musique': 'music',
	'music': 'music',
	
	// Dance keywords
	'danse': 'dance',
	'dance': 'dance',
	'danser': 'dance',
	'ballet': 'ballet',
	'hip-hop': 'hip-hop',
	'hip hop': 'hip-hop',
	'contemporain': 'contemporary',
	'contemporary': 'contemporary',
	
	// Theater keywords
	'théâtre': 'theatre',
	'theatre': 'theatre',
	'theater': 'theatre',
	'spectacle': 'theatre',
	'show': 'theatre',
	'culture': 'culture',
	
	// Games keywords
	'jeux': 'games',
	'games': 'games',
	'jouer': 'games',
	'play': 'games',
	'echecs': 'chess',
	'chess': 'chess',
	'puzzle': 'puzzle',
};

/**
 * Extract keywords from text (description or title)
 */
function extractKeywords(text, locale = 'en') {
	if (!text) return [];
	
	const normalized = String(text).toLowerCase();
	
	// Split by common delimiters
	const words = normalized
		.split(/[\s,;.()\-–—]+/)
		.map(w => w.trim())
		.filter(w => w.length > 2); // Filter out very short words
	
	// Also check for multi-word phrases
	const phrases = [];
	for (let i = 0; i < words.length - 1; i++) {
		phrases.push(`${words[i]} ${words[i + 1]}`);
	}
	
	return [...words, ...phrases];
}

/**
 * Get activity name for matching
 */
function getActivityName(activity, locale = 'en') {
	if (!activity) return '';
	
	// Try title object first
	if (activity.title) {
		if (typeof activity.title === 'object' && activity.title !== null) {
			return activity.title[locale] || activity.title.en || activity.title.fr || '';
		}
		if (typeof activity.title === 'string') {
			return activity.title;
		}
	}
	
	// Try title_en/title_fr
	if (locale === 'fr' && activity.title_fr) {
		return activity.title_fr;
	}
	if (activity.title_en) {
		return activity.title_en;
	}
	
	// Try name field
	if (activity.name) {
		if (typeof activity.name === 'object' && activity.name !== null) {
			return activity.name[locale] || activity.name.en || activity.name.fr || '';
		}
		return String(activity.name);
	}
	
	return '';
}

/**
 * Get activity type for matching
 */
function getActivityType(activity) {
	if (!activity) return '';
	
	if (activity.activityType) {
		return String(activity.activityType).toLowerCase().trim();
	}
	
	return '';
}

/**
 * Get description text for keyword extraction
 */
function getDescriptionText(activity, locale = 'en') {
	if (!activity) return '';
	
	const desc = activity.description;
	if (!desc) return '';
	
	if (typeof desc === 'object' && desc !== null) {
		return desc[locale] || desc.en || desc.fr || '';
	}
	
	return String(desc);
}

/**
 * Match activity type to image category
 */
function matchActivityType(activityType) {
	if (!activityType) return null;
	
	const normalized = activityType.toLowerCase().trim();
	
	// Direct match
	if (ACTIVITY_TYPE_MAPPINGS[normalized]) {
		return ACTIVITY_TYPE_MAPPINGS[normalized];
	}
	
	// Partial match (contains)
	for (const [key, value] of Object.entries(ACTIVITY_TYPE_MAPPINGS)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return value;
		}
	}
	
	return null;
}

/**
 * Match keywords from description to image category
 */
function matchKeywords(text) {
	if (!text) return null;
	
	const keywords = extractKeywords(text);
	
	// Check each keyword against description keywords map
	for (const keyword of keywords) {
		if (DESCRIPTION_KEYWORDS[keyword]) {
			return DESCRIPTION_KEYWORDS[keyword];
		}
	}
	
	return null;
}

/**
 * Match activity name to image category
 */
function matchActivityName(name) {
	if (!name) return null;
	
	const normalized = String(name).toLowerCase().trim();
	const keywords = extractKeywords(normalized);
	
	// Check if any keyword matches
	for (const keyword of keywords) {
		if (ACTIVITY_TYPE_MAPPINGS[keyword] || DESCRIPTION_KEYWORDS[keyword]) {
			return ACTIVITY_TYPE_MAPPINGS[keyword] || DESCRIPTION_KEYWORDS[keyword];
		}
	}
	
	return null;
}

/**
 * Get image category for an activity using priority-based matching
 * 
 * Priority order:
 * 1. Exact activity name match
 * 2. Activity type match
 * 3. Primary category match (existing logic)
 * 4. Keyword match from description
 * 5. Default category fallback
 */
export function getImageCategoryForActivity(activity, locale = 'en') {
	if (!activity) return 'default';
	
	// Priority 1: Exact activity name match
	const activityName = getActivityName(activity, locale);
	if (activityName) {
		const nameMatch = matchActivityName(activityName);
		if (nameMatch && CATEGORY_IMAGE_SETS[nameMatch]) {
			if (process.env.NODE_ENV === 'development') {
				console.log(`✅ Image match (Priority 1 - Name): "${activityName}" → ${nameMatch}`);
			}
			return nameMatch;
		}
	}
	
	// Priority 2: Activity type match
	const activityType = getActivityType(activity);
	if (activityType) {
		const typeMatch = matchActivityType(activityType);
		if (typeMatch && CATEGORY_IMAGE_SETS[typeMatch]) {
			if (process.env.NODE_ENV === 'development') {
				console.log(`✅ Image match (Priority 2 - Type): "${activityType}" → ${typeMatch}`);
			}
			return typeMatch;
		}
	}
	
	// Priority 3: Primary category match (existing logic)
	if (activity.categories && Array.isArray(activity.categories) && activity.categories.length > 0) {
		const primaryCategory = activity.categories[0].toLowerCase().trim();
		if (CATEGORY_IMAGE_SETS[primaryCategory]) {
			if (process.env.NODE_ENV === 'development') {
				console.log(`✅ Image match (Priority 3 - Category): "${primaryCategory}" → ${primaryCategory}`);
			}
			return primaryCategory;
		}
		
		// Try all categories
		for (const category of activity.categories) {
			const normalized = category.toLowerCase().trim();
			if (CATEGORY_IMAGE_SETS[normalized]) {
				if (process.env.NODE_ENV === 'development') {
					console.log(`✅ Image match (Priority 3 - Category): "${normalized}" → ${normalized}`);
				}
				return normalized;
			}
		}
	}
	
	// Priority 4: Keyword match from description
	const descriptionText = getDescriptionText(activity, locale);
	if (descriptionText) {
		const keywordMatch = matchKeywords(descriptionText);
		if (keywordMatch && CATEGORY_IMAGE_SETS[keywordMatch]) {
			if (process.env.NODE_ENV === 'development') {
				console.log(`✅ Image match (Priority 4 - Keywords): description → ${keywordMatch}`);
			}
			return keywordMatch;
		}
		
		// Also try name as fallback for keywords
		if (activityName) {
			const nameKeywordMatch = matchKeywords(activityName);
			if (nameKeywordMatch && CATEGORY_IMAGE_SETS[nameKeywordMatch]) {
				if (process.env.NODE_ENV === 'development') {
					console.log(`✅ Image match (Priority 4 - Name Keywords): "${activityName}" → ${nameKeywordMatch}`);
				}
				return nameKeywordMatch;
			}
		}
	}
	
	// Priority 5: Default fallback
	if (process.env.NODE_ENV === 'development') {
		console.warn(`⚠️  No image match found for activity, using default. Activity:`, {
			id: activity.id,
			name: activityName,
			type: activityType,
			categories: activity.categories,
			description: descriptionText?.substring(0, 50) + '...'
		});
	}
	return 'default';
}

/**
 * Get image URL for activity using enhanced matching
 */
export function getEnhancedActivityImageUrl(activity, locale = 'en', width = 400, height = 300) {
	// If activity already has images, use the first one
	if (activity.images && Array.isArray(activity.images) && activity.images.length > 0) {
		const firstImage = activity.images[0];
		if (typeof firstImage === 'string' && (firstImage.startsWith('http://') || firstImage.startsWith('https://'))) {
			return firstImage;
		}
	}
	
	// Get the matched category
	const matchedCategory = getImageCategoryForActivity(activity, locale);
	
	// Generate seed for variety (use activity ID or name)
	let seed = 0;
	if (activity.id) {
		for (let i = 0; i < activity.id.length; i++) {
			seed += activity.id.charCodeAt(i);
		}
	} else {
		const name = getActivityName(activity, locale);
		for (let i = 0; i < name.length; i++) {
			seed += name.charCodeAt(i);
		}
	}
	
	// Get image from matched category
	const imageSet = CATEGORY_IMAGE_SETS[matchedCategory] || CATEGORY_IMAGE_SETS.default;
	const baseImageUrl = imageSet[seed % imageSet.length];
	
	// Add query parameters for proper sizing
	const separator = baseImageUrl.includes('?') ? '&' : '?';
	return `${baseImageUrl}${separator}w=${width}&h=${height}&fit=crop&q=80&auto=format`;
}

