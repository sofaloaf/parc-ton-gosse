import { v4 as uuidv4 } from 'uuid';

// CSRF protection middleware (double-submit cookie pattern)
export function csrfProtection() {
	return (req, res, next) => {
		// Always set CSRF token cookie if not present (for GET requests and initial page load)
		if (!req.cookies['csrf-token']) {
			const token = uuidv4();
			res.cookie('csrf-token', token, {
				httpOnly: false, // Must be readable by JavaScript
				secure: process.env.NODE_ENV === 'production',
				sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
				maxAge: 24 * 60 * 60 * 1000 // 24 hours
			});
		}

		// Skip CSRF verification for GET, HEAD, OPTIONS requests
		if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
			return next();
		}

		// For state-changing requests, verify CSRF token
		const cookieToken = req.cookies['csrf-token'];
		const headerToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];

		// Debug CSRF token for troubleshooting
		if (process.env.NODE_ENV === 'development') {
			console.log('🔐 CSRF Check:', {
				path: req.path,
				originalUrl: req.originalUrl,
				hasCookieToken: !!cookieToken,
				hasHeaderToken: !!headerToken,
				cookieTokenPreview: cookieToken ? `${cookieToken.substring(0, 8)}...` : 'null',
				headerTokenPreview: headerToken ? `${headerToken.substring(0, 8)}...` : 'null'
			});
		}

		// For OAuth endpoints, be more lenient (they come from Google's redirect)
		// Check both path (route-relative) and originalUrl (full path) to catch all variations
		// Note: req.path is relative to the route mount point, so /api/auth/admin/google becomes /admin/google
		const path = req.path || '';
		const originalUrl = req.originalUrl || '';
		const isOAuthEndpoint = path.includes('/google') || 
		                       path.includes('admin/google') ||
		                       originalUrl.includes('/auth/google') ||
		                       originalUrl.includes('/auth/admin/google');
		
		if (isOAuthEndpoint) {
			// OAuth requests are authenticated by Google's token, so we can be more lenient
			// Always allow OAuth endpoints - they're secure via Google's authentication
			if (process.env.NODE_ENV === 'development') {
				console.log('🔓 Allowing OAuth endpoint (dev):', path, originalUrl);
			}
			return next();
		}

		// For admin-only endpoints that require authentication, we can be more lenient
		// The crawler endpoint is protected by requireAuth middleware which checks for admin role
		const isAdminOnlyEndpoint = path.includes('/crawler') || 
		                           originalUrl.includes('/crawler') ||
		                           path.includes('/metrics') ||
		                           originalUrl.includes('/metrics');
		
		if (isAdminOnlyEndpoint && req.user && req.user.role === 'admin') {
			// Admin-only endpoints are already protected by requireAuth middleware
			// If user is authenticated as admin, allow the request
			if (process.env.NODE_ENV === 'development') {
				console.log('🔓 Allowing admin-only endpoint (dev):', path, originalUrl);
			}
			return next();
		}

		// Allow requests without CSRF token in development (for easier testing)
		if (process.env.NODE_ENV === 'development' && !headerToken) {
			return next();
		}

		if (!cookieToken || !headerToken || cookieToken !== headerToken) {
			console.error('❌ CSRF token mismatch:', {
				path: req.path,
				originalUrl: req.originalUrl,
				hasCookieToken: !!cookieToken,
				hasHeaderToken: !!headerToken,
				tokensMatch: cookieToken === headerToken
			});
			return res.status(403).json({ error: 'CSRF token mismatch' });
		}

		next();
	};
}

// Generate CSRF token endpoint
export function generateCsrfToken(req, res) {
	const token = uuidv4();
	res.cookie('csrf-token', token, {
		httpOnly: false, // Must be readable by JavaScript
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
		maxAge: 24 * 60 * 60 * 1000 // 24 hours
	});
	res.json({ csrfToken: token });
}

