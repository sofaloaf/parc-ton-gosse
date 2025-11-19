import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function VerifyEmail() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [status, setStatus] = useState('verifying'); // verifying, success, error
	const [message, setMessage] = useState('');

	useEffect(() => {
		const token = searchParams.get('token');
		const email = searchParams.get('email');

		if (!token || !email) {
			setStatus('error');
			setMessage(locale === 'fr' 
				? 'Lien de vérification invalide. Token et email requis.'
				: 'Invalid verification link. Token and email required.');
			return;
		}

		// Verify email
		api(`/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
			.then(() => {
				setStatus('success');
				setMessage(locale === 'fr' 
					? 'Email vérifié avec succès ! Redirection...'
					: 'Email verified successfully! Redirecting...');
				// Redirect to profile after 2 seconds
				setTimeout(() => {
					navigate('/profile');
				}, 2000);
			})
			.catch((err) => {
				setStatus('error');
				const errorMsg = err.message || (locale === 'fr' 
					? 'Échec de la vérification de l\'email'
					: 'Email verification failed');
				setMessage(errorMsg);
			});
	}, [searchParams, navigate, locale]);

	if (status === 'verifying') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 20 }}>
				<LoadingSpinner message={locale === 'fr' ? 'Vérification de l\'email...' : 'Verifying email...'} />
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 20, maxWidth: 500, margin: '0 auto', padding: 20 }}>
			{status === 'success' ? (
				<>
					<div style={{ fontSize: 64 }}>✅</div>
					<h2 style={{ color: '#28a745', textAlign: 'center' }}>
						{locale === 'fr' ? 'Email vérifié !' : 'Email Verified!'}
					</h2>
					<p style={{ textAlign: 'center', color: '#666' }}>{message}</p>
				</>
			) : (
				<>
					<div style={{ fontSize: 64 }}>❌</div>
					<h2 style={{ color: '#dc3545', textAlign: 'center' }}>
						{locale === 'fr' ? 'Échec de la vérification' : 'Verification Failed'}
					</h2>
					<p style={{ textAlign: 'center', color: '#666' }}>{message}</p>
					<button
						onClick={() => navigate('/profile')}
						style={{
							padding: '10px 20px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{locale === 'fr' ? 'Retour au profil' : 'Back to Profile'}
					</button>
				</>
			)}
		</div>
	);
}

