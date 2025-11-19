/**
 * Session Limit Middleware
 * Enforces 5-minute free browsing limit for non-committed users
 * Best practices:
 * - Server-side enforcement (can't be bypassed)
 * - Clear error messages
 * - Graceful handling for admin/provider roles
 */

const FREE_BROWSING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function checkSessionLimit(req, res, next) {
	// Skip for admin and provider roles
	if (req.user?.role === 'admin' || req.user?.role === 'provider') {
		return next();
	}

	const store = req.app.get('dataStore');
	const user = await store.users.get(req.user.id);
	
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}

	// If user has preordered/committed, grant unlimited access
	if (user.hasPreordered) {
		return next();
	}

	// Check session time limit (5 minutes)
	if (user.sessionStartTime) {
		const sessionStart = new Date(user.sessionStartTime);
		const now = new Date();
		const elapsed = now - sessionStart;
		
		if (elapsed > FREE_BROWSING_TIME) {
			// Session expired - require commitment
			return res.status(403).json({ 
				error: 'Free browsing time expired', 
				sessionExpired: true,
				requiresCommitment: true,
				message: 'Please commit to pay to continue accessing the platform'
			});
		}
	} else {
		// No session start time - initialize it
		const now = new Date().toISOString();
		await store.users.update(req.user.id, { sessionStartTime: now });
	}
	
	next();
}

