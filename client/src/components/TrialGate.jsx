import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

// Component to check trial status and redirect if expired
export default function TrialGate({ children, requireAuth = false }) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [hasAccess, setHasAccess] = useState(false);

	useEffect(() => {
		const checkAccess = async () => {
			// If requireAuth is false, allow access (public pages)
			if (!requireAuth) {
				setHasAccess(true);
				setLoading(false);
				return;
			}

			try {
				const data = await api('/me');
				const user = data.user;

				// Admin and provider always have access
				if (user.role === 'admin' || user.role === 'provider') {
					setHasAccess(true);
					setLoading(false);
					return;
				}

				// If user has preordered, grant access
				if (user.hasPreordered) {
					setHasAccess(true);
					setLoading(false);
					return;
				}

				// Check trial status
				if (user.trialStatus?.isExpired) {
					// Trial expired, redirect to preorder
					navigate('/preorder');
					return;
				}

				// Trial is active
				setHasAccess(true);
				setLoading(false);
			} catch (error) {
				// Error fetching user, redirect to login (cookies cleared by server)
				navigate('/profile');
			}
		};

		checkAccess();
	}, [navigate, requireAuth]);

	if (loading) {
		return (
			<div style={{ 
				display: 'flex', 
				justifyContent: 'center', 
				alignItems: 'center', 
				minHeight: '400px',
				fontSize: 16,
				color: '#64748b'
			}}>
				{locale === 'fr' ? 'Chargement...' : 'Loading...'}
			</div>
		);
	}

	if (!hasAccess) {
		return null;
	}

	return <>{children}</>;
}

