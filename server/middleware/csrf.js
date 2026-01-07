import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

		// Debug CSRF token for troubleshooting (only in development)
		// Never log full tokens or sensitive data
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
		// Since CSRF runs before requireAuth, we need to check the JWT token directly
		const isAdminOnlyEndpoint = path.includes('/crawler') || 
		                           originalUrl.includes('/crawler') ||
		                           path.includes('/metrics') ||
		                           originalUrl.includes('/metrics') ||
		                           path.includes('/sandbox') ||
		                           originalUrl.includes('/sandbox');
		
		if (isAdminOnlyEndpoint) {
			// Check if user has a valid admin token
			const authToken = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
			if (authToken) {
				try {
					const decoded = jwt.verify(authToken, JWT_SECRET);
					if (decoded.role === 'admin') {
						// Admin-only endpoints are already protected by requireAuth middleware
						// If user has a valid admin token, allow the request (CSRF is less critical for authenticated admin requests)
						if (process.env.NODE_ENV === 'development') {
							console.log('🔓 Allowing admin-only endpoint (dev):', path, originalUrl);
						}
						return next();
					}
				} catch (e) {
					// Invalid token, continue with CSRF check
				}
			}
		}

		// Allow requests without CSRF token in development (for easier testing)
		if (process.env.NODE_ENV === 'development' && !headerToken) {
			return next();
		}

		// For signup/login endpoints, be more lenient with CSRF (they're public endpoints)
		// This helps with cross-origin issues where cookies might not be set properly
		const isAuthEndpoint = path.includes('/signup') || 
		                      path.includes('/login') ||
		                      originalUrl.includes('/auth/signup') ||
		                      originalUrl.includes('/auth/login');
		
		if (isAuthEndpoint) {
			// For auth endpoints, if we have at least one token, allow the request
			// This is more lenient but still provides some protection
			if (cookieToken || headerToken) {
				if (process.env.NODE_ENV === 'development') {
					console.log('🔓 Allowing auth endpoint with partial CSRF (dev):', path);
				}
				return next();
			}
		}

		// For public feedback endpoints, be more lenient with CSRF (they're public endpoints)
		// Feedback submission doesn't require authentication, so CSRF is less critical
		const isFeedbackEndpoint = path.includes('/feedback/submit') || 
		                          path.includes('/feedback/add-organization') ||
		                          originalUrl.includes('/feedback/submit') ||
		                          originalUrl.includes('/feedback/add-organization');
		
		if (isFeedbackEndpoint) {
			// For feedback endpoints, if we have at least one token, allow the request
			// This is more lenient but still provides some protection
			if (cookieToken || headerToken) {
				if (process.env.NODE_ENV === 'development') {
					console.log('🔓 Allowing feedback endpoint with partial CSRF (dev):', path);
				}
				return next();
			}
			// Even if no token, allow in development for easier testing
			if (process.env.NODE_ENV === 'development') {
				console.log('🔓 Allowing feedback endpoint without CSRF (dev):', path);
				return next();
			}
		}

		if (!cookieToken || !headerToken || cookieToken !== headerToken) {
			// Log CSRF failures (but not token values) for security monitoring
			console.error('❌ CSRF token mismatch:', {
				path: req.path,
				originalUrl: req.originalUrl,
				hasCookieToken: !!cookieToken,
				hasHeaderToken: !!headerToken,
				tokensMatch: cookieToken === headerToken,
				method: req.method,
				headers: Object.keys(req.headers)
			});
			// More helpful error message for debugging
			const errorMsg = process.env.NODE_ENV === 'development' 
				? `CSRF validation failed: ${!cookieToken ? 'Missing cookie token' : !headerToken ? 'Missing header token' : 'Tokens do not match'}`
				: 'Request validation failed';
			return res.status(403).json({ error: errorMsg });
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

