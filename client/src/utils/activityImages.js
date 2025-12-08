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
 */
const CATEGORY_IMAGES = {
	// Sports category - Children playing sports
	'sport': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'sports': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'football': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'soccer': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'basketball': 'https://images.unsplash.com/photo-1519869325934-21c5bf688fcf?w=400&h=300&fit=crop&q=80&auto=format',
	'tennis': 'https://images.unsplash.com/photo-1622163642991-c6c81a9162b8?w=400&h=300&fit=crop&q=80&auto=format',
	'swimming': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop&q=80&auto=format',
	'natation': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop&q=80&auto=format',
	'rugby': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'handball': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'volleyball': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'gymnastics': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	'gymnastique': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Arts category - Children doing art
	'art': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'arts': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'peinture': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'painting': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'dessin': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'drawing': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'sculpture': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'pottery': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	'poterie': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Music category - Children playing music
	'music': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'musique': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'piano': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'guitar': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	'guitare': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	'violin': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	'violon': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	'chant': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'singing': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'chorale': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'choir': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80&auto=format',
	'batterie': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	'drums': 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Dance category - Children dancing
	'dance': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'danse': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'ballet': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'hip-hop': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'hip hop': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'contemporain': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	'contemporary': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Martial Arts category - Children doing martial arts
	'martial arts': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'arts martiaux': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'judo': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'karate': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'aikido': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'kung fu': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	'kung-fu': 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Culture/Theater category - Children in theater/culture
	'culture': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=300&fit=crop&q=80&auto=format',
	'theatre': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=300&fit=crop&q=80&auto=format',
	'théâtre': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=300&fit=crop&q=80&auto=format',
	'theater': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Games category - Children playing games
	'games': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop&q=80&auto=format',
	'jeux': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop&q=80&auto=format',
	'jeu': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop&q=80&auto=format',
	'chess': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=300&fit=crop&q=80&auto=format',
	'echecs': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=300&fit=crop&q=80&auto=format',
	'puzzle': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop&q=80&auto=format',
	
	// Default fallback - Children doing activities
	'default': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&q=80&auto=format'
};

/**
 * Get category-specific image URL
 * Maps activity categories to appropriate images showing children doing those activities
 */
function getCategoryImageUrl(categories) {
	if (!categories || !Array.isArray(categories) || categories.length === 0) {
		return CATEGORY_IMAGES.default;
	}
	
	// Check each category in order (first match wins)
	for (const category of categories) {
		const normalized = category.toLowerCase().trim();
		
		// Direct match (exact)
		if (CATEGORY_IMAGES[normalized]) {
			return CATEGORY_IMAGES[normalized];
		}
		
		// Check for partial matches - category contains key or key contains category
		// This handles variations like "arts martiaux" matching "martial arts"
		for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
			if (key === 'default') continue; // Skip default in loop
			
			// Exact word match (more precise)
			const keyWords = key.split(/\s+/);
			const catWords = normalized.split(/\s+/);
			
			// Check if any word from key matches any word from category
			if (keyWords.some(kw => catWords.includes(kw)) || 
			    catWords.some(cw => keyWords.includes(cw))) {
				return url;
			}
			
			// Fallback: substring match
			if (normalized.includes(key) || key.includes(normalized)) {
				return url;
			}
		}
	}
	
	// Fallback to default
	return CATEGORY_IMAGES.default;
}

/**
 * Generate professional activity image URL
 * Uses category-specific images showing children doing activities
 * No API calls - direct image URLs
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
	
	// Get category-specific image
	return getCategoryImageUrl(activity.categories);
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
	
	// Generate additional images if needed (use category image)
	const categoryImage = getCategoryImageUrl(activity.categories);
	while (urls.length < count) {
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

