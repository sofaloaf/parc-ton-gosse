import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';

/**
 * TimeLimitModal - Modal that appears after 5 minutes requiring commitment to pay
 * Best practices:
 * - Clear value proposition
 * - Prominent call-to-action
 * - Easy to understand next steps
 * - No way to dismiss without committing
 */
export default function TimeLimitModal({ onCommit }) {
	const { locale } = useI18n();
	const navigate = useNavigate();

	const handleCommit = () => {
		// Clear session timer
		localStorage.removeItem('sessionStartTime');
		// Navigate to preorder page
		navigate('/preorder');
		if (onCommit) {
			onCommit();
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
					background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
					borderRadius: '50%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 40
				}}>
					⏰
				</div>

				{/* Title */}
				<h2 style={{
					fontSize: 28,
					fontWeight: 700,
					color: '#1e293b',
					margin: '0 0 16px 0'
				}}>
					{locale === 'fr' 
						? 'Vos 20 minutes de navigation gratuite sont écoulées'
						: 'Your 20 minutes of free browsing have expired'}
				</h2>

				{/* Message */}
				<p style={{
					fontSize: 16,
					color: '#475569',
					lineHeight: 1.6,
					margin: '0 0 32px 0'
				}}>
					{locale === 'fr' 
						? 'Vous avez exploré Parc Ton Gosse pendant 25 minutes au total (5 minutes anonymes + 20 minutes avec compte). Pour continuer à explorer toutes les activités et fonctionnalités, veuillez vous engager à payer. Aucun paiement ne sera effectué aujourd\'hui - vous serez facturé au lancement de la plateforme (Q1 2026).'
						: 'You\'ve explored Parc Ton Gosse for 25 minutes total (5 minutes anonymous + 20 minutes with account). To continue exploring all activities and features, please commit to pay. No payment will be processed today - you will be charged when the platform launches (Q1 2026).'}
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
									{locale === 'fr' ? 'Accès illimité' : 'Unlimited access'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Explorez toutes les activités sans limite de temps'
										: 'Explore all activities without time limits'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Prix de lancement' : 'Launch price'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Bloquez le tarif réduit de précommande de €4.99'
										: 'Lock in the special preorder price of €4.99'}
								</span>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
							<span style={{ fontSize: 20 }}>✓</span>
							<div>
								<strong style={{ display: 'block', marginBottom: 4 }}>
									{locale === 'fr' ? 'Paiement différé' : 'Deferred payment'}
								</strong>
								<span style={{ fontSize: 14, color: '#64748b' }}>
									{locale === 'fr' 
										? 'Aucun paiement requis aujourd\'hui - facturé au lancement'
										: 'No payment required today - charged at launch'}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* CTA Buttons */}
				<div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
					<button
						onClick={handleCommit}
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
						{locale === 'fr' ? 'S\'engager maintenant (€4.99)' : 'Commit Now (€4.99)'}
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
						? 'En cliquant sur "S\'engager maintenant", vous acceptez nos conditions générales. Le paiement sera traité au lancement de la plateforme (Q1 2026).'
						: 'By clicking "Commit Now", you agree to our terms and conditions. Payment will be processed at platform launch (Q1 2026).'}
				</p>
			</div>
		</div>
	);
}

