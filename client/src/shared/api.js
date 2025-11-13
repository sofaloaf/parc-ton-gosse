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
		return cachedBaseUrl;
	}

	const { hostname, origin } = window.location;
	
	// Check for VITE_API_URL environment variable first (set at build time)
	const envApiUrl = import.meta.env.VITE_API_URL;
	if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim()) {
		cachedBaseUrl = envApiUrl.trim().replace(/\/$/, '') + (envApiUrl.endsWith('/api') ? '' : '/api');
		return cachedBaseUrl;
	}

	// Check for runtime override
	const globalOverride = typeof window.__PTG_API_URL__ === 'string' ? window.__PTG_API_URL__.trim() : '';
	if (globalOverride) {
		cachedBaseUrl = globalOverride;
		return cachedBaseUrl;
	}

	// Localhost detection
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
		cachedBaseUrl = LOCAL_API_URL;
		return cachedBaseUrl;
	}

	// Production Railway frontend - use new backend URL
	if (hostname.includes('victorious-gentleness') || hostname.includes('railway')) {
		cachedBaseUrl = PRODUCTION_API_URL;
		return cachedBaseUrl;
	}

	// Fallback: assume API is at /api on same origin
	cachedBaseUrl = `${origin.replace(/\/$/, '')}/api`;
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
	signup: (email, password, role, profile) => api('/auth/signup', { method: 'POST', body: { email, password, role, profile } }),
	logout: () => api('/auth/logout', { method: 'POST' })
};


