import React from 'react';

// Responsive breakpoints
export const breakpoints = {
	mobile: 768,
	tablet: 1024,
	desktop: 1280
};

// Media query helpers
export const useMediaQuery = (query) => {
	const [matches, setMatches] = React.useState(false);

	React.useEffect(() => {
		if (typeof window === 'undefined') return;
		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}
		const listener = () => setMatches(media.matches);
		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	}, [matches, query]);

	return matches;
};

// Responsive styles helper
export const getResponsiveStyles = (styles) => {
	if (typeof window === 'undefined') return styles.base || {};
	const isMobile = window.innerWidth < breakpoints.mobile;
	const isTablet = window.innerWidth >= breakpoints.mobile && window.innerWidth < breakpoints.tablet;
	
	return {
		...styles.base,
		...(isMobile && styles.mobile),
		...(isTablet && styles.tablet)
	};
};

