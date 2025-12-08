import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useI18n } from './shared/i18n.jsx';
import Browse from './pages/Browse.jsx';
import ActivityDetail from './pages/ActivityDetail.jsx';
import RegistrationFlow from './pages/RegistrationFlow.jsx';
import Profile from './pages/Profile.jsx';
import ProviderDashboard from './pages/ProviderDashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Preorder from './pages/Preorder.jsx';
import PreorderConfirmation from './pages/PreorderConfirmation.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Onboarding from './pages/Onboarding.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import FeedbackWidget from './components/FeedbackWidget.jsx';
import Logo from './components/Logo.jsx';
import { api } from './shared/api.js';
import { auth } from './shared/api.js';
import { trackPageView } from './utils/analytics.js';

export default function App() {
	const { t, locale, setRemoteDict } = useI18n();
	const [user, setUser] = useState(null);
	const [initializing, setInitializing] = useState(true);
	const location = useLocation();

	// Track page views with Google Analytics
	useEffect(() => {
		trackPageView(location.pathname + location.search);
	}, [location]);

	useEffect(() => {
		setInitializing(true);
		
		// Load i18n with timeout to prevent hanging
		const i18nTimeout = setTimeout(() => {
			console.warn('i18n API call timed out');
		}, 5000);
		
		api(`/i18n/${locale}`).then(setRemoteDictLoc => {
			clearTimeout(i18nTimeout);
			setRemoteDict(prev => ({ ...prev, [locale]: setRemoteDictLoc }));
		}).catch((err) => {
			clearTimeout(i18nTimeout);
			console.warn('Failed to load i18n:', err);
			// Don't fail the app if i18n fails
		});
		
		// Check if user is logged in (cookies are sent automatically)
		const userTimeout = setTimeout(() => {
			console.warn('User API call timed out');
			setUser(null);
			setInitializing(false);
		}, 5000);
		
		api('/me').then(data => {
			clearTimeout(userTimeout);
			setUser(data.user);
			setInitializing(false);
		}).catch((err) => {
			clearTimeout(userTimeout);
			console.warn('Failed to check user:', err);
			setUser(null);
			setInitializing(false);
		});
	}, [locale, setRemoteDict]);

	// Also check user on route changes (in case user logs in/out)
	useEffect(() => {
		const timeout = setTimeout(() => {
			console.warn('User check API call timed out');
			setUser(null);
		}, 5000);
		
		api('/me').then(data => {
			clearTimeout(timeout);
			setUser(data.user);
		}).catch(() => {
			clearTimeout(timeout);
			setUser(null);
		});
	}, [location.pathname]);

	const handleLogout = async () => {
		try {
			await auth.logout();
		} catch (e) {
			// Ignore errors on logout
		}
		// Clear user state immediately
		setUser(null);
		// Clear any localStorage data
		localStorage.removeItem('sessionStartTime');
		localStorage.removeItem('anonymousSessionStartTime');
		localStorage.removeItem('cardViewCount');
		// Force a page reload to clear any cached state
		window.location.href = '/';
	};

	// Show loading state briefly to prevent blank screen
	if (initializing) {
		return (
			<div style={{ 
				fontFamily: 'system-ui, sans-serif', 
				padding: 16,
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				minHeight: '100vh'
			}}>
				<div style={{ textAlign: 'center' }}>
					<div style={{ fontSize: 18, color: '#64748b', marginBottom: 8 }}>
						{locale === 'fr' ? 'Chargement...' : 'Loading...'}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
					<header style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
						<Logo />
						<nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
							<Link to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>{locale === 'fr' ? 'Connexion' : 'Sign In'}</Link>
							<Link to="/provider" style={{ textDecoration: 'none', color: 'inherit' }}>{t.provider || 'Provider'}</Link>
							{user && (
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#f0f0f0', borderRadius: 4 }}>
									<span style={{ fontSize: 14 }}>
										{locale === 'fr' ? 'Bienvenue' : 'Welcome'}, <strong>{user.profile?.name || user.email}</strong>
									</span>
									<button 
										onClick={handleLogout} 
										style={{ 
											padding: '4px 8px', 
											fontSize: 12, 
											border: '1px solid #ccc', 
											borderRadius: 4, 
											background: 'white', 
											cursor: 'pointer' 
										}}
									>
										{locale === 'fr' ? 'Déconnexion' : 'Logout'}
									</button>
								</div>
							)}
							<LanguageToggle />
						</nav>
					</header>
					
					{/* Admin link in bottom left */}
					<Link 
						to="/admin" 
						style={{ 
							position: 'fixed',
							bottom: 20,
							left: 20,
							padding: '8px 16px',
							background: '#6c757d',
							color: 'white',
							textDecoration: 'none',
							borderRadius: 4,
							fontSize: 14,
							zIndex: 999
						}}
					>
						Admin
					</Link>
					<Routes>
						<Route path="/" element={<Browse />} />
						<Route path="/activity/:id" element={<ActivityDetail />} />
						<Route path="/register/:activityId" element={<RegistrationFlow />} />
						<Route path="/profile" element={<Profile />} />
						<Route path="/provider" element={<ProviderDashboard />} />
						<Route path="/admin" element={<AdminPanel />} />
						<Route path="/preorder" element={<Preorder />} />
						<Route path="/preorder/confirmation" element={<PreorderConfirmation />} />
						<Route path="/verify-email" element={<VerifyEmail />} />
						<Route path="/reset-password" element={<ResetPassword />} />
						<Route path="/forgot-password" element={<ForgotPassword />} />
						<Route path="/onboarding" element={<Onboarding />} />
					</Routes>
					<FeedbackWidget />
				</div>
	);
}
