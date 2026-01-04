/**
 * Utility to reset card view count for testing
 * Call this from browser console: resetCardViews()
 */

export function resetCardViews() {
	localStorage.removeItem('cardViewCount');
	console.log('✅ Card view count reset. Refresh the page to see changes.');
	return true;
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
	window.resetCardViews = resetCardViews;
}




