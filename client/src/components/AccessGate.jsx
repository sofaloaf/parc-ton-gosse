import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * AccessGate - Forces all users to sign up or log in before accessing the site
 * Best practices:
 * - Clear value proposition before forcing signup
 * - Multiple signup options (email, social login)
 * - Minimal friction (quick signup process)
 */
export default function AccessGate({ children }) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const location = useLocation();
	const [loading, setLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

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
					setIsAuthenticated(true);
					setLoading(false);
				} else {
					// Not authenticated, redirect to signup/login
					navigate('/profile', { 
						state: { 
							from: location.pathname,
							message: locale === 'fr' 
								? 'Veuillez vous connecter pour accéder au site' 
								: 'Please sign in to access the site'
						}
					});
					setLoading(false);
				}
			} catch (error) {
				// Not authenticated, redirect to signup/login
				navigate('/profile', { 
					state: { 
						from: location.pathname,
						message: locale === 'fr' 
							? 'Veuillez vous connecter pour accéder au site' 
							: 'Please sign in to access the site'
					}
				});
				setLoading(false);
			}
		};

		checkAuth();
	}, [navigate, location.pathname, isPublicRoute, locale]);

	if (loading) {
		return <LoadingSpinner message={locale === 'fr' ? 'Vérification de l\'accès...' : 'Checking access...'} />;
	}

	if (!isAuthenticated && !isPublicRoute) {
		return null; // Will redirect to /profile
	}

	return <>{children}</>;
}

