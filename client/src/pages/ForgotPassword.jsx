import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

export default function ForgotPassword() {
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});

	const validateForm = () => {
		const newErrors = {};
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = locale === 'fr' ? 'Email invalide' : 'Invalid email';
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

		setLoading(true);
		setMessage('');

		try {
			await api('/auth/forgot-password', {
				method: 'POST',
				body: { email }
			});
			setMessage(locale === 'fr' 
				? 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception.'
				: 'If an account exists with this email, a reset link has been sent. Check your inbox.');
		} catch (err) {
			setMessage(err.message || (locale === 'fr' 
				? 'Échec de l\'envoi de l\'email'
				: 'Failed to send email'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ display: 'grid', gap: 16, maxWidth: 400, margin: '0 auto', padding: 20 }}>
			<h2>{locale === 'fr' ? 'Mot de passe oublié' : 'Forgot Password'}</h2>
			<p style={{ color: '#666', fontSize: 14 }}>
				{locale === 'fr' 
					? 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.'
					: 'Enter your email address and we\'ll send you a link to reset your password.'}
			</p>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
				<div>
					<input
						placeholder={locale === 'fr' ? 'Adresse email' : 'Email address'}
						type="email"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							if (errors.email) validateForm();
						}}
						onBlur={validateForm}
						style={{
							width: '100%',
							padding: 8,
							border: `1px solid ${errors.email ? '#ef4444' : '#ddd'}`,
							borderRadius: 4
						}}
					/>
					{errors.email && (
						<div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
							{errors.email}
						</div>
					)}
				</div>
				<button
					type="submit"
					disabled={loading}
					style={{
						padding: '10px 16px',
						background: loading ? '#94a3b8' : '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: loading ? 'not-allowed' : 'pointer',
						opacity: loading ? 0.6 : 1
					}}
				>
					{loading ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : (locale === 'fr' ? 'Envoyer le lien' : 'Send Reset Link')}
				</button>
			</form>
			{message && (
				<div style={{
					padding: 12,
					background: message.includes('envoyé') || message.includes('sent') ? '#d4edda' : '#f8d7da',
					color: message.includes('envoyé') || message.includes('sent') ? '#155724' : '#721c24',
					borderRadius: 4
				}}>
					{message}
				</div>
			)}
			<div style={{ textAlign: 'center', marginTop: 12 }}>
				<button
					onClick={() => navigate('/profile')}
					style={{
						background: 'none',
						border: 'none',
						color: '#007bff',
						cursor: 'pointer',
						textDecoration: 'underline',
						fontSize: 14
					}}
				>
					{locale === 'fr' ? 'Retour à la connexion' : 'Back to login'}
				</button>
			</div>
		</div>
	);
}

