import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import GoogleSignIn from '../components/GoogleSignIn.jsx';
import ReferralCodeDisplay from '../components/ReferralCodeDisplay.jsx';
import { trackSignup, trackLogin } from '../utils/analytics.js';

export default function Profile() {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [referralCode, setReferralCode] = useState('');
	const [message, setMessage] = useState('');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});

	useEffect(() => {
		// Check if user is already logged in (cookies are sent automatically)
		setLoading(true);
		api('/me').then(data => {
			setUser(data.user);
			// Check if user needs onboarding
			if (data.user && !data.user.profile?.onboardingCompleted && data.user.role === 'parent') {
				// Redirect to onboarding after a short delay
				setTimeout(() => {
					navigate('/onboarding');
				}, 2000);
			}
		}).catch(() => {
			setUser(null);
		}).finally(() => {
			setLoading(false);
		});
	}, [navigate]);

	// Client-side validation
	const validateForm = () => {
		const newErrors = {};
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = locale === 'fr' ? 'Email invalide' : 'Invalid email';
		}
		if (password && password.length < 8) {
			newErrors.password = locale === 'fr' ? 'Le mot de passe doit contenir au moins 8 caractères' : 'Password must be at least 8 characters';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	async function doLogin() {
		if (!validateForm()) {
			setMessage(locale === 'fr' ? 'Veuillez corriger les erreurs' : 'Please correct the errors');
			return;
		}
		if (!email || !password) {
			setMessage(locale === 'fr' ? 'Email et mot de passe requis' : 'Email and password required');
			return;
		}

		setLoading(true);
		setMessage('');
		setErrors({});
		
		try {
			const result = await auth.login(email, password);
			setUser(result.user);
			setMessage(locale === 'fr' ? 'Connecté avec succès!' : 'Logged in successfully!');
			setEmail('');
			setPassword('');
			
			trackLogin('email');
			
			// Check if user needs onboarding
			if (result.user && !result.user.profile?.onboardingCompleted && result.user.role === 'parent') {
				setTimeout(() => {
					navigate('/onboarding');
				}, 1500);
			}
			
			// Track login
			try {
				await api('/auth/track-login', {
					method: 'POST',
					body: { email, timestamp: new Date().toISOString() }
				});
			} catch (e) {
				if (process.env.NODE_ENV === 'development') {
					console.error('Failed to track login:', e);
				}
			}
		} catch (e) {
			const errorMsg = e.message || (locale === 'fr' ? 'Échec de la connexion' : 'Login failed');
			setMessage(errorMsg);
		} finally {
			setLoading(false);
		}
	}

	async function doSignup() {
		if (!validateForm()) {
			setMessage(locale === 'fr' ? 'Veuillez corriger les erreurs' : 'Please correct the errors');
			return;
		}
		if (!email || !password) {
			setMessage(locale === 'fr' ? 'Email et mot de passe requis' : 'Email and password required');
			return;
		}

		setLoading(true);
		setMessage('');
		setErrors({});
		
		try {
			// Apply referral code if provided
			const signupData = { email, password, role: 'parent', profile: { name: name.trim() || undefined } };
			if (referralCode.trim()) {
				signupData.referralCode = referralCode.trim().toUpperCase();
			}
			
			const result = await auth.signup(email, password, 'parent', { name: name.trim() || undefined }, referralCode.trim() || undefined);
			setUser(result.user);
			setMessage(locale === 'fr' ? 'Inscription réussie! Accès gratuit de 24h activé.' : 'Signup successful! 24-hour free trial activated.');
			setEmail('');
			setPassword('');
			setName('');
			setReferralCode('');
			
			trackSignup('email');
			
			// Redirect to onboarding
			setTimeout(() => {
				navigate('/onboarding');
			}, 1500);
		} catch (e) {
			const errorMsg = e.message || (locale === 'fr' ? 'Échec de l\'inscription' : 'Signup failed');
			setMessage(errorMsg);
		} finally {
			setLoading(false);
		}
	}

	if (loading && !user) {
		return <LoadingSpinner message={locale === 'fr' ? 'Chargement...' : 'Loading...'} />;
	}

	if (user) {
		return (
			<div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
				<h2>{locale === 'fr' ? 'Profil' : 'Profile'}</h2>
				<div style={{ padding: 20, background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
					<h3 style={{ marginTop: 0 }}>
						{locale === 'fr' ? 'Bienvenue' : 'Welcome'}, {user.profile?.name || user.email}!
					</h3>
					{user.profile?.name && (
						<div style={{ marginBottom: 12 }}>
							<strong>{locale === 'fr' ? 'Nom:' : 'Name:'}</strong> {user.profile.name}
						</div>
					)}
					<div style={{ marginBottom: 12 }}>
						<strong>{locale === 'fr' ? 'Email:' : 'Email:'}</strong> {user.email}
					</div>
					<div style={{ marginBottom: 12 }}>
						<strong>{locale === 'fr' ? 'Rôle:' : 'Role:'}</strong> {user.role}
					</div>
					{user.emailVerified === false && (
						<div style={{ marginBottom: 12, padding: 12, background: '#fff3cd', borderRadius: 4 }}>
							<strong style={{ color: '#856404' }}>{locale === 'fr' ? '⚠️ Email non vérifié' : '⚠️ Email Not Verified'}</strong>
							<p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#856404' }}>
								{locale === 'fr' 
									? 'Veuillez vérifier votre email pour accéder à toutes les fonctionnalités.'
									: 'Please verify your email to access all features.'}
							</p>
							<button
								onClick={async () => {
									try {
										await api('/auth/resend-verification', {
											method: 'POST',
											body: { email: user.email }
										});
										setMessage(locale === 'fr' 
											? 'Email de vérification envoyé ! Vérifiez votre boîte de réception.'
											: 'Verification email sent! Check your inbox.');
									} catch (err) {
										setMessage(err.message || (locale === 'fr' 
											? 'Échec de l\'envoi de l\'email'
											: 'Failed to send email'));
									}
								}}
								style={{
									marginTop: 8,
									padding: '6px 12px',
									background: '#ffc107',
									color: '#333',
									border: 'none',
									borderRadius: 4,
									cursor: 'pointer',
									fontSize: 12
								}}
							>
								{locale === 'fr' ? 'Renvoyer l\'email de vérification' : 'Resend Verification Email'}
							</button>
						</div>
					)}
					{user.trialStatus && (
						<div style={{ marginBottom: 12, padding: 12, background: user.trialStatus.isExpired ? '#fff3cd' : '#d1ecf1', borderRadius: 4 }}>
							{user.trialStatus.isExpired ? (
								<div>
									<strong style={{ color: '#856404' }}>{locale === 'fr' ? '⚠️ Essai expiré' : '⚠️ Trial Expired'}</strong>
									<p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#856404' }}>
										{locale === 'fr' ? 'Votre accès gratuit de 24h est terminé. Passez votre précommande pour continuer.' : 'Your 24-hour free trial has ended. Place your preorder to continue.'}
									</p>
								</div>
							) : (
								<div>
									<strong style={{ color: '#0c5460' }}>{locale === 'fr' ? '⏱️ Essai gratuit actif' : '⏱️ Free Trial Active'}</strong>
									<p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#0c5460' }}>
										{locale === 'fr' 
											? `Temps restant: ${Math.floor(user.trialStatus.timeRemaining / 3600)}h ${Math.floor((user.trialStatus.timeRemaining % 3600) / 60)}m`
											: `Time remaining: ${Math.floor(user.trialStatus.timeRemaining / 3600)}h ${Math.floor((user.trialStatus.timeRemaining % 3600) / 60)}m`}
									</p>
								</div>
							)}
						</div>
					)}
					{user.hasPreordered && (
						<div style={{ marginBottom: 12, padding: 12, background: '#d4edda', borderRadius: 4 }}>
							<strong style={{ color: '#155724' }}>{locale === 'fr' ? '✅ Précommande effectuée' : '✅ Preorder Placed'}</strong>
							<p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#155724' }}>
								{locale === 'fr' ? 'Merci pour votre précommande! Vous aurez accès à la plateforme complète à la sortie.' : 'Thank you for your preorder! You\'ll have full access when we launch.'}
							</p>
						</div>
					)}
					{/* Referral Code Section */}
					<div style={{ marginBottom: 12, padding: 12, background: '#e7f3ff', borderRadius: 4 }}>
						<strong style={{ color: '#004085' }}>{locale === 'fr' ? '🎁 Code de parrainage' : '🎁 Referral Code'}</strong>
						<p style={{ margin: '8px 0', fontSize: 14, color: '#004085' }}>
							{locale === 'fr' 
								? 'Partagez votre code et gagnez des récompenses !'
								: 'Share your code and earn rewards!'}
						</p>
						<ReferralCodeDisplay userId={user.id} />
					</div>
					<button 
						onClick={async () => {
							try {
								await auth.logout();
							} catch (e) {
								// Ignore errors on logout
							}
							setUser(null);
							setMessage('');
						}}
						style={{
							padding: '8px 16px',
							background: '#dc3545',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{locale === 'fr' ? 'Déconnexion' : 'Logout'}
					</button>
				</div>
				{message && (
					<div style={{ padding: 12, background: '#d4edda', color: '#155724', borderRadius: 4 }}>
						{message}
					</div>
				)}
			</div>
		);
	}

	return (
		<div style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
			<h2>{locale === 'fr' ? 'Connexion / Inscription' : 'Login / Signup'}</h2>
			<div style={{ marginBottom: 12 }}>
				<Link 
					to="/forgot-password" 
					style={{ 
						fontSize: 14, 
						color: '#007bff', 
						textDecoration: 'none' 
					}}
				>
					{locale === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
				</Link>
			</div>
			
			{/* Google Sign In */}
			<GoogleSignIn 
				onSuccess={(user) => {
					setUser(user);
					setMessage(locale === 'fr' ? 'Connecté avec succès!' : 'Logged in successfully!');
					// Check if user needs onboarding
					if (user && !user.profile?.onboardingCompleted && user.role === 'parent') {
						setTimeout(() => {
							navigate('/onboarding');
						}, 1500);
					}
				}}
				onError={(error) => {
					setMessage(error || (locale === 'fr' ? 'Échec de la connexion Google' : 'Google login failed'));
				}}
			/>
			
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: 12, 
				margin: '12px 0',
				color: '#666',
				fontSize: 14
			}}>
				<div style={{ flex: 1, height: 1, background: '#ddd' }}></div>
				<span>{locale === 'fr' ? 'ou' : 'or'}</span>
				<div style={{ flex: 1, height: 1, background: '#ddd' }}></div>
			</div>
			
			<div style={{ display: 'grid', gap: 8 }}>
				<div>
					<input 
						placeholder={locale === 'fr' ? 'Nom (optionnel)' : 'Name (optional)'} 
						type="text"
						value={name} 
						onChange={(e) => setName(e.target.value)} 
						style={{ 
							width: '100%',
							padding: 8, 
							border: `1px solid ${errors.name ? '#ef4444' : '#ddd'}`, 
							borderRadius: 4 
						}}
					/>
					{errors.name && (
						<div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
							{errors.name}
						</div>
					)}
				</div>
				<div>
					<input 
						placeholder={locale === 'fr' ? 'Email' : 'Email'} 
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
				<div>
					<input 
						placeholder={locale === 'fr' ? 'Mot de passe' : 'Password'} 
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
				<div style={{ display: 'flex', gap: 8 }}>
					<button 
						onClick={doLogin}
						disabled={loading}
						style={{
							flex: 1,
							padding: '10px 16px',
							background: loading ? '#94a3b8' : '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: loading ? 'not-allowed' : 'pointer',
							opacity: loading ? 0.6 : 1
						}}
					>
						{loading ? (locale === 'fr' ? 'Connexion...' : 'Logging in...') : (locale === 'fr' ? 'Connexion' : 'Login')}
					</button>
					<button 
						onClick={doSignup}
						disabled={loading}
						style={{
							flex: 1,
							padding: '10px 16px',
							background: loading ? '#94a3b8' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: loading ? 'not-allowed' : 'pointer',
							opacity: loading ? 0.6 : 1
						}}
					>
						{loading ? (locale === 'fr' ? 'Inscription...' : 'Signing up...') : (locale === 'fr' ? 'Inscription' : 'Signup')}
					</button>
				</div>
			</div>
			{message && (
				<div style={{ 
					padding: 12, 
					background: message.includes('succès') || message.includes('successful') ? '#d4edda' : '#f8d7da', 
					color: message.includes('succès') || message.includes('successful') ? '#155724' : '#721c24', 
					borderRadius: 4 
				}}>
					{message}
				</div>
			)}
		</div>
	);
}


