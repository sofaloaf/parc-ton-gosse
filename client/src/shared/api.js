const isBrowser = typeof window !== 'undefined';
const LOCAL_API_URL = 'http://localhost:4000/api';
const PRODUCTION_API_URL = 'https://parc-ton-gosse-backend-production.up.railway.app/api';

let cachedBaseUrl = null;

function resolveBaseUrl() {
	if (cachedBaseUrl) {
		return cachedBaseUrl;
	}

	if (!isBrowser) {
		cachedBaseUrl = LOCAL_API_URL;
		console.log('🔍 API URL resolved (server-side):', cachedBaseUrl);
		return cachedBaseUrl;
	}

	const { hostname, origin } = window.location;
	
	// CRITICAL: For ANY Railway domain, ALWAYS use backend URL - never same-origin
	// This is the most important check - do it FIRST before anything else
	// Check multiple ways to catch all Railway domains
	const isRailwayDomain = hostname.includes('.up.railway.app') || 
	                       hostname.includes('railway') ||
	                       hostname.includes('victorious-gentleness') ||
	                       hostname.includes('parc-ton-gosse');
	
	if (isRailwayDomain) {
		// Only use PRODUCTION_API_URL if this is NOT the backend service itself
		if (!hostname.includes('backend')) {
			cachedBaseUrl = PRODUCTION_API_URL;
			console.log('✅ API URL resolved (Railway domain detected):', cachedBaseUrl);
			console.log('   Frontend hostname:', hostname);
			console.log('   Frontend origin:', origin);
			console.log('   PRODUCTION_API_URL constant:', PRODUCTION_API_URL);
			return cachedBaseUrl;
		}
	}
	
	// Debug logging
	console.log('🔍 API URL Resolution Debug:');
	console.log('   hostname:', hostname);
	console.log('   origin:', origin);
	console.log('   window.__PTG_API_URL__:', window.__PTG_API_URL__);
	console.log('   import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
	
	// Check for runtime override (works even if VITE_API_URL wasn't set)
	const globalOverride = typeof window.__PTG_API_URL__ === 'string' ? window.__PTG_API_URL__.trim() : '';
	if (globalOverride) {
		cachedBaseUrl = globalOverride;
		console.log('✅ API URL resolved from runtime override:', cachedBaseUrl);
		return cachedBaseUrl;
	}

	// Check for VITE_API_URL environment variable (set at build time)
	const envApiUrl = import.meta.env.VITE_API_URL;
	if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim()) {
		cachedBaseUrl = envApiUrl.trim().replace(/\/$/, '') + (envApiUrl.endsWith('/api') ? '' : '/api');
		console.log('✅ API URL resolved from VITE_API_URL:', cachedBaseUrl);
		return cachedBaseUrl;
	}

	// Localhost detection
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
		cachedBaseUrl = LOCAL_API_URL;
		console.log('🔍 API URL resolved (localhost):', cachedBaseUrl);
		return cachedBaseUrl;
	}

	// Final fallback: assume API is at /api on same origin (only for non-Railway domains)
	console.warn('⚠️  Falling back to same-origin API - this may not work!');
	console.warn(`   Frontend origin: ${origin}`);
	console.warn(`   Consider setting VITE_API_URL environment variable`);
	cachedBaseUrl = `${origin.replace(/\/$/, '')}/api`;
	console.log('🔍 API URL resolved (fallback):', cachedBaseUrl);
	return cachedBaseUrl;
}

// CSRF token helper (double-submit cookie pattern)
function getCsrfToken() {
	// Get CSRF token from cookie (set by server)
	if (typeof document === 'undefined') return null;
	const name = 'csrf-token=';
	const decodedCookie = decodeURIComponent(document.cookie);
	const ca = decodedCookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) {
			return c.substring(name.length, c.length);
		}
	}
	return null;
}

export async function api(path, { method = 'GET', body, headers } = {}) {
	// Include credentials to send cookies (httpOnly cookies)
	const csrfToken = getCsrfToken();
	const baseUrl = resolveBaseUrl();
	const res = await fetch(`${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`, {
		method,
		credentials: 'include', // Include cookies in request
		headers: {
			'Content-Type': 'application/json',
			...(csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) ? { 'X-CSRF-Token': csrfToken } : {}),
			...headers
		},
		body: body ? JSON.stringify(body) : undefined
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export const auth = {
	login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
	signup: (email, password, role, profile, referralCode) => api('/auth/signup', { method: 'POST', body: { email, password, role, profile, referralCode } }),
	logout: () => api('/auth/logout', { method: 'POST' })
};


