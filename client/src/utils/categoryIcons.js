/**
 * Get icon/emoji for a single category
 * @param {string} category - Single category name
 * @returns {string} - Emoji icon
 */
function getIconForCategory(category) {
	if (!category || typeof category !== 'string') return null;
	
	const normalized = category.toLowerCase().trim();
	
	// Comprehensive category to icon mapping (prioritize specific matches first)
	const categoryIconMap = {
		// Specific Sports (most specific first)
		'football': '⚽',
		'soccer': '⚽',
		'basketball': '🏀',
		'tennis': '🎾',
		'swimming': '🏊',
		'natation': '🏊',
		'cycling': '🚴',
		'velo': '🚴',
		'rugby': '🏉',
		'handball': '🤾',
		'volleyball': '🏐',
		'volley': '🏐',
		'badminton': '🏸',
		'ping-pong': '🏓',
		'table tennis': '🏓',
		'escalade': '🧗',
		'climbing': '🧗',
		'equitation': '🐴',
		'horse riding': '🐴',
		'gymnastique': '🤸',
		'gymnastics': '🤸',
		'athletisme': '🏃',
		'athletics': '🏃',
		'course': '🏃',
		'running': '🏃',
		
		// Martial Arts (specific first)
		'judo': '🥋',
		'karate': '🥋',
		'aikido': '🥋',
		'kung fu': '🥋',
		'kung-fu': '🥋',
		'arts martiaux': '🥋',
		'martial arts': '🥋',
		
		// General Sports
		'sport': '⚽',
		'sports': '⚽',
		
		// Specific Arts
		'peinture': '🖌️',
		'painting': '🖌️',
		'dessin': '✏️',
		'drawing': '✏️',
		'sculpture': '🗿',
		'poterie': '🏺',
		'pottery': '🏺',
		'ceramique': '🏺',
		'ceramics': '🏺',
		'photographie': '📷',
		'photography': '📷',
		
		// General Arts
		'arts': '🎨',
		'art': '🎨',
		
		// Specific Music
		'piano': '🎹',
		'guitar': '🎸',
		'guitare': '🎸',
		'violin': '🎻',
		'violon': '🎻',
		'violoncelle': '🎻',
		'cello': '🎻',
		'flute': '🎵',
		'flute': '🎵',
		'chant': '🎤',
		'singing': '🎤',
		'chorale': '🎤',
		'choir': '🎤',
		'batterie': '🥁',
		'drums': '🥁',
		
		// General Music
		'musique': '🎵',
		'music': '🎵',
		
		// Specific Dance
		'hip-hop': '🕺',
		'hip hop': '🕺',
		'ballet': '🩰',
		'classique': '🩰',
		'classical': '🩰',
		'salsa': '💃',
		'contemporain': '💃',
		'contemporary': '💃',
		
		// General Dance
		'dance': '💃',
		'danse': '💃',
		
		// Culture & Theater
		'theatre': '🎭',
		'théâtre': '🎭',
		'theater': '🎭',
		'culture': '🎭',
		
		// Games & Play
		'jeux': '🎮',
		'games': '🎮',
		'jeu': '🎮',
		'play': '🧩',
		'puzzle': '🧩',
		'echecs': '♟️',
		'chess': '♟️',
		
		// Science & Technology
		'informatique': '💻',
		'computer science': '💻',
		'programmation': '💻',
		'programming': '💻',
		'coding': '💻',
		'robotique': '🤖',
		'robotics': '🤖',
		'sciences': '🔬',
		'science': '🔬',
		
		// Nature & Outdoors
		'jardinage': '🌱',
		'gardening': '🌱',
		'plein air': '🏕️',
		'outdoor': '🏕️',
		'nature': '🌳',
		
		// Language & Reading
		'lecture': '📖',
		'reading': '📖',
		'anglais': '🇬🇧',
		'english': '🇬🇧',
		'langue': '📚',
		'language': '📚',
		
		// Cooking
		'patisserie': '🧁',
		'pastry': '🧁',
		'cuisine': '👨‍🍳',
		'cooking': '👨‍🍳',
		
		// Wellness
		'yoga': '🧘',
		'meditation': '🧘',
		
		// Other
		'cheerleading': '📣',
		'pompom': '📣',
	};
	
	// 1. Try exact match first
	if (categoryIconMap[normalized]) {
		return categoryIconMap[normalized];
	}
	
	// 2. Try word boundary matches (more precise)
	for (const [key, icon] of Object.entries(categoryIconMap)) {
		// Match if category contains the key as a whole word
		const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
		if (regex.test(normalized)) {
			return icon;
		}
	}
	
	// 3. Fallback: try partial match (less precise, but better than nothing)
	for (const [key, icon] of Object.entries(categoryIconMap)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return icon;
		}
	}
	
	return null;
}

/**
 * Get icons for categories - returns array of unique icons
 * @param {string|string[]} categories - Category or array of categories
 * @returns {string[]} - Array of emoji icons (unique, max 3)
 */
export function getCategoryIcons(categories) {
	if (!categories) return ['🎨']; // Default fallback
	
	// Normalize to array - use original categories, not translated
	const cats = Array.isArray(categories) ? categories : [categories];
	
	// Get icons for each category
	const icons = [];
	const seenIcons = new Set();
	
	for (const cat of cats) {
		const icon = getIconForCategory(cat);
		if (icon && !seenIcons.has(icon)) {
			icons.push(icon);
			seenIcons.add(icon);
			// Limit to 3 icons max
			if (icons.length >= 3) break;
		}
	}
	
	// If no icons found, return default
	return icons.length > 0 ? icons : ['🎨'];
}

/**
 * Get a single icon for a category (for backward compatibility)
 * @param {string|string[]} categories - Category or array of categories
 * @returns {string} - First emoji icon
 */
export function getCategoryIcon(categories) {
	const icons = getCategoryIcons(categories);
	return icons[0] || '🎨';
}

