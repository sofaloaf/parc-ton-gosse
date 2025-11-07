const isBrowser = typeof window !== 'undefined';
const envBaseUrlRaw = import.meta.env.VITE_API_URL;
const envBaseUrl = typeof envBaseUrlRaw === 'string' ? envBaseUrlRaw.trim() : '';

let cachedBaseUrl = envBaseUrl || null;

function resolveBaseUrl() {
	if (cachedBaseUrl) {
		return cachedBaseUrl;
	}

	if (!isBrowser) {
		return 'http://localhost:4000/api';
	}

	const { hostname } = window.location;
	const computed = (hostname === 'localhost' || hostname === '127.0.0.1')
		? 'http://localhost:4000/api'
		: 'https://parc-ton-gosse-production.up.railway.app/api';

	cachedBaseUrl = computed;
	return cachedBaseUrl;
}

if (isBrowser && !envBaseUrl) {
	console.warn('[api] VITE_API_URL not set, falling back to', resolveBaseUrl());
}

if (isBrowser && !envBaseUrl) {
	console.warn('[api] VITE_API_URL not set, falling back to', BASE_URL);
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


