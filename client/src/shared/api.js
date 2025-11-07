const isBrowser = typeof window !== 'undefined';
const defaultBaseUrl = (() => {
	if (!isBrowser) return 'http://localhost:4000/api';
	const hostname = window.location.hostname;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return 'http://localhost:4000/api';
	}
	return 'https://parc-ton-gosse-production.up.railway.app/api';
})();

const BASE_URL = import.meta.env.VITE_API_URL || defaultBaseUrl;

if (isBrowser && !import.meta.env.VITE_API_URL) {
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
	const res = await fetch(`${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
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


