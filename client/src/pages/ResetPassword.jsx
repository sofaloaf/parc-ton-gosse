import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});

	const token = searchParams.get('token');
	const email = searchParams.get('email');

	useEffect(() => {
		if (!token || !email) {
			setMessage(locale === 'fr' 
				? 'Lien de réinitialisation invalide. Token et email requis.'
				: 'Invalid reset link. Token and email required.');
		}
	}, [token, email, locale]);

	const validateForm = () => {
		const newErrors = {};
		if (password.length < 8) {
			newErrors.password = locale === 'fr' 
				? 'Le mot de passe doit contenir au moins 8 caractères'
				: 'Password must be at least 8 characters';
		}
		if (password !== confirmPassword) {
			newErrors.confirmPassword = locale === 'fr' 
				? 'Les mots de passe ne correspondent pas'
				: 'Passwords do not match';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			setMessage(locale === 'fr' ? 'Veuillez corriger les erreurs' : 'Please correct the errors');
			return;
		}

		if (!token || !email) {
			setMessage(locale === 'fr' 
				? 'Lien de réinitialisation invalide'
				: 'Invalid reset link');
			return;
		}

		setLoading(true);
		setMessage('');

		try {
			await api('/auth/reset-password', {
				method: 'POST',
				body: { token, email, newPassword: password }
			});
			setMessage(locale === 'fr' 
				? 'Mot de passe réinitialisé avec succès ! Redirection...'
				: 'Password reset successfully! Redirecting...');
			setTimeout(() => {
				navigate('/profile');
			}, 2000);
		} catch (err) {
			setMessage(err.message || (locale === 'fr' 
				? 'Échec de la réinitialisation du mot de passe'
				: 'Password reset failed'));
		} finally {
			setLoading(false);
		}
	};

	if (!token || !email) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 20, maxWidth: 500, margin: '0 auto', padding: 20 }}>
				<div style={{ fontSize: 64 }}>❌</div>
				<h2 style={{ color: '#dc3545', textAlign: 'center' }}>
					{locale === 'fr' ? 'Lien invalide' : 'Invalid Link'}
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
			</div>
		);
	}

	return (
		<div style={{ display: 'grid', gap: 16, maxWidth: 400, margin: '0 auto', padding: 20 }}>
			<h2>{locale === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset Password'}</h2>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
				<div>
					<input
						placeholder={locale === 'fr' ? 'Nouveau mot de passe' : 'New password'}
						type="password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (errors.password) validateForm();
						}}
						onBlur={validateForm}
						style={{
							width: '100%',
							padding: 8,
							border: `1px solid ${errors.password ? '#ef4444' : '#ddd'}`,
							borderRadius: 4
						}}
					/>
					{errors.password && (
						<div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
							{errors.password}
						</div>
					)}
					{password && <PasswordStrength password={password} />}
				</div>
				<div>
					<input
						placeholder={locale === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
						type="password"
						value={confirmPassword}
						onChange={(e) => {
							setConfirmPassword(e.target.value);
							if (errors.confirmPassword) validateForm();
						}}
						onBlur={validateForm}
						style={{
							width: '100%',
							padding: 8,
							border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#ddd'}`,
							borderRadius: 4
						}}
					/>
					{errors.confirmPassword && (
						<div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
							{errors.confirmPassword}
						</div>
					)}
				</div>
				<button
					type="submit"
					disabled={loading}
					style={{
						padding: '10px 16px',
						background: loading ? '#94a3b8' : '#28a745',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: loading ? 'not-allowed' : 'pointer',
						opacity: loading ? 0.6 : 1
					}}
				>
					{loading ? (locale === 'fr' ? 'Réinitialisation...' : 'Resetting...') : (locale === 'fr' ? 'Réinitialiser' : 'Reset Password')}
				</button>
			</form>
			{message && (
				<div style={{
					padding: 12,
					background: message.includes('succès') || message.includes('successfully') ? '#d4edda' : '#f8d7da',
					color: message.includes('succès') || message.includes('successfully') ? '#155724' : '#721c24',
					borderRadius: 4
				}}>
					{message}
				</div>
			)}
		</div>
	);
}

