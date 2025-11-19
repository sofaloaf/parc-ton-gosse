import ReactGA from 'react-ga4';

// Initialize Google Analytics
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (GA_MEASUREMENT_ID) {
	ReactGA.initialize(GA_MEASUREMENT_ID);
}

/**
 * Track page views
 */
export function trackPageView(path) {
	if (GA_MEASUREMENT_ID) {
		ReactGA.send({ hitType: 'pageview', page: path });
	}
}

/**
 * Track events
 */
export function trackEvent(category, action, label, value) {
	if (GA_MEASUREMENT_ID) {
		ReactGA.event({
			category,
			action,
			label,
			value
		});
	}
}

/**
 * Track user signup
 */
export function trackSignup(method = 'email') {
	trackEvent('User', 'Signup', method);
}

/**
 * Track user login
 */
export function trackLogin(method = 'email') {
	trackEvent('User', 'Login', method);
}

/**
 * Track email verification
 */
export function trackEmailVerification() {
	trackEvent('User', 'Email Verified');
}

/**
 * Track activity registration
 */
export function trackActivityRegistration(activityId) {
	trackEvent('Activity', 'Registration', activityId);
}

/**
 * Track preorder
 */
export function trackPreorder(amount, promoCode) {
	trackEvent('Monetization', 'Preorder', promoCode || 'none', amount);
}

/**
 * Track search
 */
export function trackSearch(query) {
	trackEvent('Search', 'Query', query);
}

/**
 * Track filter usage
 */
export function trackFilter(filterType, value) {
	trackEvent('Filter', 'Used', filterType, value);
}

/**
 * Track view mode change
 */
export function trackViewMode(mode) {
	trackEvent('UI', 'View Mode', mode);
}

