/**
 * Generate professional activity images based on activity description and categories
 * Uses Picsum Photos for free, high-quality stock photos with consistent seeding
 */

/**
 * Extract keywords from activity for image search
 */
function extractImageKeywords(activity, locale = 'en') {
	const keywords = [];
	
	// Add categories
	if (activity.categories && Array.isArray(activity.categories)) {
		keywords.push(...activity.categories.slice(0, 2));
	}
	
	// Extract keywords from title
	const title = activity.title?.[locale] || activity.title?.en || activity.title?.fr || '';
	if (title) {
		// Remove common words and extract meaningful terms
		const titleWords = title.toLowerCase()
			.split(/\s+/)
			.filter(word => word.length > 3)
			.filter(word => !['pour', 'avec', 'des', 'les', 'the', 'for', 'with', 'and', 'et'].includes(word))
			.slice(0, 2);
		keywords.push(...titleWords);
	}
	
	// Extract keywords from description
	const desc = activity.description?.[locale] || activity.description?.en || activity.description?.fr || '';
	if (desc) {
		const descWords = desc.toLowerCase()
			.split(/\s+/)
			.filter(word => word.length > 4)
			.filter(word => !['children', 'kids', 'enfant', 'activité', 'activity', 'paris'].includes(word))
			.slice(0, 2);
		keywords.push(...descWords);
	}
	
	// Map common activity terms to better search terms
	const termMap = {
		'sport': 'children playing sports',
		'sports': 'children playing sports',
		'football': 'children playing football',
		'soccer': 'children playing soccer',
		'basketball': 'children playing basketball',
		'tennis': 'children playing tennis',
		'swimming': 'children swimming',
		'natation': 'children swimming',
		'arts': 'children doing art',
		'art': 'children doing art',
		'peinture': 'children painting',
		'painting': 'children painting',
		'music': 'children playing music',
		'musique': 'children playing music',
		'piano': 'children playing piano',
		'dance': 'children dancing',
		'danse': 'children dancing',
		'gymnastics': 'children gymnastics',
		'gymnastique': 'children gymnastics',
		'judo': 'children martial arts',
		'karate': 'children martial arts',
		'cooking': 'children cooking',
		'cuisine': 'children cooking',
		'reading': 'children reading',
		'lecture': 'children reading',
		'coding': 'children coding',
		'programming': 'children coding',
		'robotics': 'children robotics',
		'yoga': 'children yoga',
		'gardening': 'children gardening',
		'jardinage': 'children gardening'
	};
	
	// Replace keywords with better search terms
	const mappedKeywords = keywords.map(k => {
		const normalized = k.toLowerCase();
		return termMap[normalized] || k;
	});
	
	// Combine and create search query
	const searchQuery = mappedKeywords.slice(0, 2).join(' ') || 'children activities';
	
	return searchQuery;
}

/**
 * Generate professional activity image URL
 * Uses Picsum Photos with activity-specific seed for consistent, professional images
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
	
	// Generate a consistent seed based on activity ID and categories
	// This ensures the same activity always gets the same image
	const seed = generateImageSeed(activity);
	
	// Use Picsum Photos - free, professional stock photos
	// Using seed ensures consistent images per activity
	// Format: https://picsum.photos/seed/{seed}/{width}/{height}
	return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Generate a consistent seed for image selection based on activity
 */
function generateImageSeed(activity) {
	// Create a hash-like seed from activity ID and first category
	const id = activity.id || '';
	const firstCategory = activity.categories && activity.categories.length > 0 
		? activity.categories[0] 
		: 'activity';
	
	// Simple hash function to convert string to number
	let hash = 0;
	const str = `${id}-${firstCategory}`;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	
	// Ensure positive number and limit range for Picsum (0-1000 works well)
	return Math.abs(hash) % 1000;
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
	
	// Generate additional images if needed
	const seed = generateImageSeed(activity);
	while (urls.length < count) {
		// Use different seeds for variety
		const imageSeed = seed + urls.length;
		urls.push(`https://picsum.photos/seed/${imageSeed}/400/300`);
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

