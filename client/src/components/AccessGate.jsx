import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * AccessGate - Allows 5 minutes anonymous browsing, then requires signup
 * Best practices:
 * - Allow anonymous browsing to reduce friction
 * - Clear value proposition before forcing signup
 * - Multiple signup options (email, social login)
 * - Minimal friction (quick signup process)
 */
const ANONYMOUS_BROWSING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function AccessGate({ children }) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const location = useLocation();
	const [loading, setLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [anonymousTimeExpired, setAnonymousTimeExpired] = useState(false);

	// Public routes that don't require authentication
	const publicRoutes = ['/profile', '/verify-email', '/reset-password', '/forgot-password', '/preorder', '/preorder/confirmation'];
	const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

	useEffect(() => {
		const checkAuth = async () => {
			// Allow access to public routes (login, signup, password reset, etc.)
			if (isPublicRoute) {
				setIsAuthenticated(true);
				setLoading(false);
				return;
			}

			try {
				const data = await api('/me');
				if (data.user) {
					// Authenticated user - allow access
					setIsAuthenticated(true);
					setLoading(false);
					return;
				}
			} catch (error) {
				// Not authenticated - check anonymous browsing time
			}

			// Check anonymous browsing time
			const anonymousStartTime = localStorage.getItem('anonymousSessionStartTime');
			if (!anonymousStartTime) {
				// First visit - start anonymous timer
				const now = new Date().toISOString();
				localStorage.setItem('anonymousSessionStartTime', now);
				setIsAuthenticated(true); // Allow browsing
				setLoading(false);
				return;
			}

			// Check if anonymous time has expired
			const start = new Date(anonymousStartTime);
			const now = new Date();
			const elapsed = now - start;

			if (elapsed > ANONYMOUS_BROWSING_TIME) {
				// Anonymous time expired - require signup
				setAnonymousTimeExpired(true);
				setIsAuthenticated(false);
				setLoading(false);
			} else {
				// Still within anonymous browsing time
				setIsAuthenticated(true);
				setLoading(false);
			}
		};

		checkAuth();
	}, [navigate, location.pathname, isPublicRoute, locale]);

	if (loading) {
		return <LoadingSpinner message={locale === 'fr' ? 'Vérification de l\'accès...' : 'Checking access...'} />;
	}

	if (anonymousTimeExpired && !isPublicRoute) {
		// Redirect to signup/login after anonymous time expires
		navigate('/profile', { 
			state: { 
				from: location.pathname,
				message: locale === 'fr' 
					? 'Veuillez créer un compte pour continuer à explorer' 
					: 'Please create an account to continue exploring'
			}
		});
		return null;
	}

	if (!isAuthenticated && !isPublicRoute) {
		return null; // Will redirect to /profile
	}

	return <>{children}</>;
}

