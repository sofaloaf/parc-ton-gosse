import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';

/**
 * PaywallModal - Modal that appears after 10 cards viewed requiring subscription
 * Best practices:
 * - Clear value proposition
 * - Prominent call-to-action
 * - Multiple pricing options
 * - Easy to understand next steps
 */
export default function PaywallModal({ onSubscribe, onClose }) {
	const { locale } = useI18n();
	const navigate = useNavigate();

	const handleSubscribe = () => {
		if (onSubscribe) {
			onSubscribe();
		} else {
			navigate('/preorder');
		}
	};

	return (
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background: 'rgba(0, 0, 0, 0.85)',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10000,
			padding: 20,
			backdropFilter: 'blur(4px)'
		}}>
			<div style={{
				background: 'white',
				borderRadius: 16,
				padding: 40,
				maxWidth: 700,
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
					🔒
				</div>

				{/* Title */}
				<h2 style={{
					fontSize: 28,
					fontWeight: 700,
					color: '#1e293b',
					margin: '0 0 16px 0'
				}}>
					{locale === 'fr' 
						? 'Vous avez consulté 10 cartes gratuites'
						: 'You\'ve viewed 10 free cards'}
				</h2>

				{/* Message */}
				<p style={{
					fontSize: 16,
					color: '#475569',
					lineHeight: 1.6,
					margin: '0 0 32px 0'
				}}>
					{locale === 'fr' 
						? 'Pour continuer à explorer toutes les activités et fonctionnalités, veuillez vous abonner. Choisissez le plan qui vous convient le mieux.'
						: 'To continue exploring all activities and features, please subscribe. Choose the plan that works best for you.'}
				</p>

				{/* Pricing Options */}
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
					gap: 16,
					marginBottom: 32
				}}>
					{/* Monthly Plan */}
					<div style={{
						padding: 24,
						background: '#f8fafc',
						borderRadius: 12,
						border: '2px solid #e0e7f0',
						cursor: 'pointer',
						transition: 'all 0.2s ease'
					}}
					onClick={handleSubscribe}
					onMouseEnter={(e) => {
						e.currentTarget.style.borderColor = '#3b82f6';
						e.currentTarget.style.background = '#eff6ff';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = '#e0e7f0';
						e.currentTarget.style.background = '#f8fafc';
					}}>
						<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>
							€4.99
						</div>
						<div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
							{locale === 'fr' ? 'par mois' : 'per month'}
						</div>
						<div style={{ fontSize: 12, color: '#475569' }}>
							{locale === 'fr' ? 'Facturé mensuellement' : 'Billed monthly'}
						</div>
					</div>

					{/* 6-Month Plan */}
					<div style={{
						padding: 24,
						background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
						borderRadius: 12,
						border: '2px solid #3b82f6',
						cursor: 'pointer',
						color: 'white',
						position: 'relative',
						transition: 'all 0.2s ease'
					}}
					onClick={handleSubscribe}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'translateY(-2px)';
						e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.4)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = 'none';
					}}>
						<div style={{
							position: 'absolute',
							top: -8,
							right: 12,
							background: '#10b981',
							color: 'white',
							padding: '4px 8px',
							borderRadius: 4,
							fontSize: 10,
							fontWeight: 600
						}}>
							{locale === 'fr' ? 'POPULAIRE' : 'POPULAR'}
						</div>
						<div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
							€24.99
						</div>
						<div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>
							{locale === 'fr' ? 'pour 6 mois' : 'for 6 months'}
						</div>
						<div style={{ fontSize: 12, opacity: 0.8 }}>
							{locale === 'fr' ? 'Économisez 17%' : 'Save 17%'}
						</div>
					</div>

					{/* Yearly Plan */}
					<div style={{
						padding: 24,
						background: '#f8fafc',
						borderRadius: 12,
						border: '2px solid #e0e7f0',
						cursor: 'pointer',
						transition: 'all 0.2s ease'
					}}
					onClick={handleSubscribe}
					onMouseEnter={(e) => {
						e.currentTarget.style.borderColor = '#3b82f6';
						e.currentTarget.style.background = '#eff6ff';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = '#e0e7f0';
						e.currentTarget.style.background = '#f8fafc';
					}}>
						<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>
							€39.99
						</div>
						<div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
							{locale === 'fr' ? 'par an' : 'per year'}
						</div>
						<div style={{ fontSize: 12, color: '#475569' }}>
							{locale === 'fr' ? 'Économisez 33%' : 'Save 33%'}
						</div>
					</div>
				</div>

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
									{locale === 'fr' ? 'Accès illimité' : 'Unlimited access'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Explorez toutes les activités sans limite'
										: 'Explore all activities without limits'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Pas de limite de temps' : 'No time limits'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Naviguez à votre rythme'
										: 'Browse at your own pace'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Annulation à tout moment' : 'Cancel anytime'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Sans engagement, annulez quand vous voulez'
										: 'No commitment, cancel whenever you want'}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* CTA Button */}
				<button
					onClick={handleSubscribe}
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
						transition: 'all 0.2s ease',
						width: '100%',
						maxWidth: 400,
						margin: '0 auto'
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
					{locale === 'fr' ? 'Choisir un plan' : 'Choose a Plan'}
				</button>
			</div>
		</div>
	);
}

