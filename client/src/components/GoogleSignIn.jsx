import React, { useEffect, useState } from 'react';
import { api } from '../shared/api.js';
import { auth } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import { trackLogin } from '../utils/analytics.js';

export default function GoogleSignIn({ onSuccess, onError }) {
	const { locale } = useI18n();
	const [initialized, setInitialized] = useState(false);
	const isFrench = locale === 'fr';

	useEffect(() => {
		initializeGoogleSignIn();
	}, []);

	const initializeGoogleSignIn = async () => {
		const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
		
		if (!clientId) {
			if (process.env.NODE_ENV === 'development') {
				console.warn('VITE_GOOGLE_CLIENT_ID is missing');
			}
			return;
		}

		try {
			// Load Google Sign-In script if not already loaded
			if (!window.google || !window.google.accounts) {
				const script = document.createElement('script');
				script.src = 'https://accounts.google.com/gsi/client';
				script.async = true;
				script.defer = true;
				
				await new Promise((resolve, reject) => {
					script.onload = () => {
						if (process.env.NODE_ENV === 'development') {
							console.log('Google Sign-In script loaded');
						}
						resolve();
					};
					script.onerror = () => {
						if (process.env.NODE_ENV === 'development') {
							console.error('Failed to load Google Sign-In script');
						}
						reject(new Error('Failed to load Google Sign-In script'));
					};
					document.head.appendChild(script);
				});
				
				// Wait for script to fully initialize
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			if (window.google?.accounts?.id) {
				// Initialize Google Sign-In
				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: handleCredentialResponse,
				});

				setInitialized(true);
			}
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to initialize Google Sign-In:', err);
			}
		}
	};

	const handleCredentialResponse = async (response) => {
		try {
			const result = await api('/auth/google', {
				method: 'POST',
				body: { idToken: response.credential }
			});

			// Token is now in httpOnly cookie
			trackLogin('google');
			
			if (onSuccess) {
				onSuccess(result.user);
			}
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Google login error:', err);
			}
			if (onError) {
				onError(err.message || 'Google login failed');
			}
		}
	};

	if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
		return null; // Don't show button if not configured
	}

	return (
		<div style={{ width: '100%', marginTop: 12 }}>
			<div 
				id="google-signin-button" 
				style={{ 
					display: 'flex', 
					justifyContent: 'center',
					marginBottom: 12
				}}
			/>
			{!initialized && (
				<button
					onClick={initializeGoogleSignIn}
					style={{
						width: '100%',
						padding: '10px 16px',
						background: '#4285f4',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer',
						fontSize: 14,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8
					}}
				>
					<svg width="18" height="18" viewBox="0 0 18 18">
						<path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
						<path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
						<path fill="#fff" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
						<path fill="#fff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
					</svg>
					{isFrench ? 'Se connecter avec Google' : 'Sign in with Google'}
				</button>
			)}
			{initialized && (
				<script
					dangerouslySetInnerHTML={{
						__html: `
							if (window.google && window.google.accounts && window.google.accounts.id) {
								const buttonDiv = document.getElementById('google-signin-button');
								if (buttonDiv && !buttonDiv.hasChildNodes()) {
									window.google.accounts.id.renderButton(buttonDiv, {
										type: 'standard',
										theme: 'outline',
										size: 'large',
										text: 'signin_with',
										width: '100%'
									});
								}
							}
						`
					}}
				/>
			)}
		</div>
	);
}

