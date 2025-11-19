import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';

/**
 * SignupRequiredModal - Modal that appears after 5 minutes requiring signup/login
 * Best practices:
 * - Clear value proposition
 * - Prominent call-to-action
 * - Easy signup process
 * - No way to dismiss without signing up
 */
export default function SignupRequiredModal({ onSignup }) {
	const { locale } = useI18n();
	const navigate = useNavigate();

	const handleSignup = () => {
		// Navigate to signup/login page
		navigate('/profile', { 
			state: { 
				from: window.location.pathname,
				message: locale === 'fr' 
					? 'Veuillez vous inscrire pour continuer' 
					: 'Please sign up to continue'
			}
		});
		if (onSignup) {
			onSignup();
		}
	};

	return (
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background: 'rgba(0, 0, 0, 0.75)',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10000,
			padding: 20
		}}>
			<div style={{
				background: 'white',
				borderRadius: 16,
				padding: 40,
				maxWidth: 600,
				width: '100%',
				boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
				textAlign: 'center'
			}}>
				{/* Icon */}
				<div style={{
					width: 80,
					height: 80,
					margin: '0 auto 24px',
					background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
					borderRadius: '50%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 40
				}}>
					👋
				</div>

				{/* Title */}
				<h2 style={{
					fontSize: 28,
					fontWeight: 700,
					color: '#1e293b',
					margin: '0 0 16px 0'
				}}>
					{locale === 'fr' 
						? 'Créez un compte pour continuer'
						: 'Create an account to continue'}
				</h2>

				{/* Message */}
				<p style={{
					fontSize: 16,
					color: '#475569',
					lineHeight: 1.6,
					margin: '0 0 32px 0'
				}}>
					{locale === 'fr' 
						? 'Vous avez exploré Parc Ton Gosse pendant 5 minutes. Créez un compte gratuit pour continuer à découvrir toutes les activités pendant 20 minutes supplémentaires.'
						: 'You\'ve been exploring Parc Ton Gosse for 5 minutes. Create a free account to continue discovering all activities for an additional 20 minutes.'}
				</p>

				{/* Benefits */}
				<div style={{
					background: '#f8fafc',
					borderRadius: 12,
					padding: 24,
					marginBottom: 32,
					textAlign: 'left'
				}}>
					<h3 style={{
						fontSize: 18,
						fontWeight: 600,
						color: '#1e293b',
						margin: '0 0 16px 0'
					}}>
						{locale === 'fr' ? 'Ce que vous obtenez:' : 'What you get:'}
					</h3>
					<div style={{ display: 'grid', gap: 12 }}>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? '20 minutes supplémentaires' : '20 more minutes'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Continuez à explorer toutes les activités gratuitement'
										: 'Continue exploring all activities for free'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Inscription gratuite' : 'Free signup'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Aucun paiement requis - créez votre compte en 30 secondes'
										: 'No payment required - create your account in 30 seconds'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Accès complet' : 'Full access'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Explorez toutes les fonctionnalités de la plateforme'
										: 'Explore all platform features'}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* CTA Buttons */}
				<div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
					<button
						onClick={handleSignup}
						style={{
							padding: '14px 32px',
							background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
							color: 'white',
							border: 'none',
							borderRadius: 8,
							fontSize: 16,
							fontWeight: 600,
							cursor: 'pointer',
							boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
							transition: 'all 0.2s ease'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'translateY(-2px)';
							e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
						}}
					>
						{locale === 'fr' ? 'Créer un compte gratuit' : 'Create Free Account'}
					</button>
				</div>

				{/* Fine print */}
				<p style={{
					fontSize: 12,
					color: '#94a3b8',
					margin: '24px 0 0 0',
					lineHeight: 1.5
				}}>
					{locale === 'fr' 
						? 'Inscription rapide et sécurisée. Aucun paiement requis pour créer un compte.'
						: 'Quick and secure signup. No payment required to create an account.'}
				</p>
			</div>
		</div>
	);
}

