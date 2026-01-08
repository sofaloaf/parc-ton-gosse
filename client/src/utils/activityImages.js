/**
 * Generate professional activity images based on activity categories
 * Uses direct image URLs - no API calls needed
 * Category-specific images showing children doing activities
 */

/**
 * Category to image URL mapping
 * Using Unsplash direct image URLs (free, no API key needed)
 * Each URL shows children doing that specific activity
 * Images are optimized for 400x300px cards
 * Using arrays for multiple variations per category
 */
export const CATEGORY_IMAGE_SETS = {
	// Sports category - Children playing sports (multiple variations)
	'sport': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1530549387789-4c1017266635'
	],
	'sports': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1530549387789-4c1017266635'
	],
	'football': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'soccer': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'basketball': [
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'tennis': [
		'https://images.unsplash.com/photo-1622163642991-c6c81a9162b8',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	'swimming': [
		'https://images.unsplash.com/photo-1530549387789-4c1017266635',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'natation': [
		'https://images.unsplash.com/photo-1530549387789-4c1017266635',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'rugby': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'handball': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'volleyball': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'gymnastics': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'gymnastique': [
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	
	// Arts category - Children doing art (multiple variations)
	'art': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420'
	],
	'arts': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420'
	],
	'peinture': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'painting': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'dessin': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'drawing': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'sculpture': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'pottery': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'poterie': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	
	// Music category - Children playing music (multiple variations)
	'music': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'musique': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'piano': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'guitar': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'guitare': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'violin': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'violon': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'chant': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'singing': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'chorale': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'choir': [
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'batterie': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'drums': [
		'https://images.unsplash.com/photo-1511735111819-9a3f7709049c',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	
	// Dance category - Children dancing (multiple variations)
	'dance': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420'
	],
	'danse': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420'
	],
	'ballet': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'hip-hop': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'hip hop': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'contemporain': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	'contemporary': [
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'
	],
	
	// Martial Arts category - Children doing martial arts (multiple variations)
	'martial arts': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a'
	],
	'arts martiaux': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a'
	],
	'judo': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	'karate': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	'aikido': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	'kung fu': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	'kung-fu': [
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf'
	],
	
	// Culture/Theater category - Children in theater/culture (multiple variations)
	'culture': [
		'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'theatre': [
		'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'théâtre': [
		'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'theater': [
		'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	
	// Games category - Children playing games (multiple variations)
	'games': [
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'jeux': [
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
	],
	'jeu': [
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'chess': [
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'echecs': [
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	'puzzle': [
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
	],
	
	// Default fallback - Children doing activities (multiple variations)
	'default': [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
		'https://images.unsplash.com/photo-1518611012118-696072aa579a',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
		'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
		'https://images.unsplash.com/photo-1511512578047-dfb367046420',
		'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf',
		'https://images.unsplash.com/photo-1530549387789-4c1017266635',
		'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
		'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
		'https://images.unsplash.com/photo-1622163642991-c6c81a9162b8'
	]
};

// Legacy single-image mapping for backward compatibility
const CATEGORY_IMAGES = {};
for (const [key, images] of Object.entries(CATEGORY_IMAGE_SETS)) {
	CATEGORY_IMAGES[key] = images[0] + '?w=400&h=300&fit=crop&q=80&auto=format';
}

/**
 * Get category-specific image URL
 * Maps activity categories to appropriate images showing children doing those activities
 * Returns an array of image URLs for variety
 */
function getCategoryImageUrl(categories, seed = 0) {
	if (!categories || !Array.isArray(categories) || categories.length === 0) {
		const defaultImages = CATEGORY_IMAGE_SETS.default || [CATEGORY_IMAGES.default];
		return defaultImages[seed % defaultImages.length];
	}
	
	// Check each category in order (first match wins)
	for (const category of categories) {
		const normalized = category.toLowerCase().trim();
		
		// Direct match (exact)
		if (CATEGORY_IMAGE_SETS[normalized]) {
			const images = CATEGORY_IMAGE_SETS[normalized];
			return images[seed % images.length];
		}
		
		// Check for partial matches - category contains key or key contains category
		// This handles variations like "arts martiaux" matching "martial arts"
		for (const [key, images] of Object.entries(CATEGORY_IMAGE_SETS)) {
			if (key === 'default') continue; // Skip default in loop
			
			// Exact word match (more precise)
			const keyWords = key.split(/\s+/);
			const catWords = normalized.split(/\s+/);
			
			// Check if any word from key matches any word from category
			if (keyWords.some(kw => catWords.includes(kw)) || 
			    catWords.some(cw => keyWords.includes(cw))) {
				return images[seed % images.length];
			}
			
			// Fallback: substring match
			if (normalized.includes(key) || key.includes(normalized)) {
				return images[seed % images.length];
			}
		}
	}
	
	// Fallback to default
	const defaultImages = CATEGORY_IMAGE_SETS.default || [CATEGORY_IMAGES.default];
	return defaultImages[seed % defaultImages.length];
}

/**
 * Generate professional activity image URL
 * Uses category-specific images showing children doing activities
 * No API calls - direct image URLs
 * Makes images unique per activity by using activity ID or title hash
 */
export function getActivityImageUrl(activity, locale = 'en', width = 400, height = 300) {
	// If activity already has images, use the first one
	if (activity.images && Array.isArray(activity.images) && activity.images.length > 0) {
		const firstImage = activity.images[0];
		// If it's already a full URL, return it
		if (typeof firstImage === 'string' && (firstImage.startsWith('http://') || firstImage.startsWith('https://'))) {
			return firstImage;
		}
	}
	
	// Make image unique per activity by using activity ID or title to generate a seed
	// This ensures different activities get different image variations even with same category
	let seed = 0;
	if (activity.id) {
		// Use activity ID to generate a consistent seed
		for (let i = 0; i < activity.id.length; i++) {
			seed += activity.id.charCodeAt(i);
		}
	} else {
		// Fallback: use title to generate seed
		let title = '';
		if (activity.title) {
			if (typeof activity.title === 'object' && activity.title !== null) {
				title = activity.title[locale] || activity.title.en || activity.title.fr || '';
			} else if (typeof activity.title === 'string') {
				title = activity.title;
			}
		}
		if (!title && activity.name) {
			title = typeof activity.name === 'object'
				? (activity.name[locale] || activity.name.en || activity.name.fr || '')
				: String(activity.name);
		}
		for (let i = 0; i < title.length; i++) {
			seed += title.charCodeAt(i);
		}
	}
	
	// Get category-specific image with seed for variety
	const baseImageUrl = getCategoryImageUrl(activity.categories, seed);
	
	// Add query parameters for proper sizing
	const separator = baseImageUrl.includes('?') ? '&' : '?';
	return `${baseImageUrl}${separator}w=${width}&h=${height}&fit=crop&q=80&auto=format`;
}


/**
 * Generate multiple image URLs for an activity
 */
export function getActivityImageUrls(activity, locale = 'en', count = 3) {
	const urls = [];
	
	// Use existing images if available
	if (activity.images && Array.isArray(activity.images)) {
		for (let i = 0; i < Math.min(count, activity.images.length); i++) {
			const img = activity.images[i];
			if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
				urls.push(img);
			}
		}
	}
	
	// Generate additional images if needed (use category image with different seeds)
	let seed = 0;
	if (activity.id) {
		for (let i = 0; i < activity.id.length; i++) {
			seed += activity.id.charCodeAt(i);
		}
	}
	while (urls.length < count) {
		const categoryImage = getCategoryImageUrl(activity.categories, seed + urls.length);
		urls.push(categoryImage);
	}
	
	return urls;
}

/**
 * Get optimized image URL with proper dimensions
 */
export function getOptimizedImageUrl(activity, locale = 'en', size = 'medium') {
	const sizes = {
		small: { width: 300, height: 200 },
		medium: { width: 400, height: 300 },
		large: { width: 800, height: 600 }
	};
	
	const dimensions = sizes[size] || sizes.medium;
	return getActivityImageUrl(activity, locale, dimensions.width, dimensions.height);
}

