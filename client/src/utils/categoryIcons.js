/**
 * Get an icon/emoji for a category
 * @param {string|string[]} categories - Category or array of categories
 * @returns {string} - Emoji icon
 */
export function getCategoryIcon(categories) {
	if (!categories) return '🎨'; // Default fallback
	
	// Normalize to array
	const cats = Array.isArray(categories) ? categories : [categories];
	
	// Map categories to icons (case-insensitive)
	const categoryIconMap = {
		// Sports
		'sport': '⚽',
		'sports': '⚽',
		'football': '⚽',
		'soccer': '⚽',
		'basketball': '🏀',
		'tennis': '🎾',
		'swimming': '🏊',
		'natation': '🏊',
		'cycling': '🚴',
		'velo': '🚴',
		'judo': '🥋',
		'karate': '🥋',
		'aikido': '🥋',
		'arts martiaux': '🥋',
		'martial arts': '🥋',
		
		// Arts
		'arts': '🎨',
		'art': '🎨',
		'peinture': '🖌️',
		'painting': '🖌️',
		'dessin': '✏️',
		'drawing': '✏️',
		'sculpture': '🗿',
		
		// Music
		'musique': '🎵',
		'music': '🎵',
		'piano': '🎹',
		'guitar': '🎸',
		'guitare': '🎸',
		'violin': '🎻',
		'violon': '🎻',
		'chant': '🎤',
		'singing': '🎤',
		
		// Dance
		'dance': '💃',
		'danse': '💃',
		'hip-hop': '🕺',
		'ballet': '🩰',
		
		// Culture & Theater
		'culture': '🎭',
		'theatre': '🎭',
		'théâtre': '🎭',
		'theater': '🎭',
		
		// Games & Play
		'jeux': '🎮',
		'games': '🎮',
		'jeu': '🎮',
		'play': '🧩',
		'puzzle': '🧩',
		
		// Science & Technology
		'sciences': '🔬',
		'science': '🔬',
		'informatique': '💻',
		'computer science': '💻',
		'programmation': '💻',
		'programming': '💻',
		'coding': '💻',
		'robotique': '🤖',
		'robotics': '🤖',
		
		// Nature & Outdoors
		'nature': '🌳',
		'outdoor': '🏕️',
		'plein air': '🏕️',
		'jardinage': '🌱',
		'gardening': '🌱',
		
		// Language & Reading
		'langue': '📚',
		'language': '📚',
		'lecture': '📖',
		'reading': '📖',
		'anglais': '🇬🇧',
		'english': '🇬🇧',
		
		// Cooking
		'cuisine': '👨‍🍳',
		'cooking': '👨‍🍳',
		'patisserie': '🧁',
		'pastry': '🧁',
		
		// Other
		'gymnastique': '🤸',
		'gymnastics': '🤸',
		'yoga': '🧘',
		'meditation': '🧘',
		'cheerleading': '📣',
		'pompom': '📣',
	};
	
	// Check each category (prioritize first match)
	for (const cat of cats) {
		const normalized = cat.toLowerCase().trim();
		
		// Direct match
		if (categoryIconMap[normalized]) {
			return categoryIconMap[normalized];
		}
		
		// Partial match (e.g., "arts martiaux" contains "arts")
		for (const [key, icon] of Object.entries(categoryIconMap)) {
			if (normalized.includes(key) || key.includes(normalized)) {
				return icon;
			}
		}
	}
	
	// Default fallback
	return '🎨';
}

