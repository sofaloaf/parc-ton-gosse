import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { trackEvent } from '../utils/analytics.js';

export default function Preorder() {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const [promoCode, setPromoCode] = useState('');
	const [promoValid, setPromoValid] = useState(null);
	const [promoDiscount, setPromoDiscount] = useState(0);
	const [amount, setAmount] = useState(4.99);
	const [originalAmount, setOriginalAmount] = useState(4.99);
	const [discountApplied, setDiscountApplied] = useState(false);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState('');
	const [agreedToTerms, setAgreedToTerms] = useState(false);

	useEffect(() => {
		// Check if user is logged in
		api('/me')
			.then(data => {
				if (!data.user) {
					navigate('/profile');
				}
			})
			.catch(() => {
				navigate('/profile');
			});

		// Check if user already committed
		setLoading(true);
		api('/preorders/status')
			.then(status => {
				if (status.hasPreordered) {
					navigate('/preorder/confirmation');
				}
			})
			.catch(() => {
				// Not logged in or error
				navigate('/profile');
			})
			.finally(() => {
				setLoading(false);
			});

		// Track preorder page view
		api('/preorders/track-page-view', {
			method: 'POST'
		}).catch(() => {
			// Ignore errors
		});

		// Track analytics
		trackEvent('preorder', 'page_viewed', 'preorder_page');
	}, [navigate]);

	const validatePromo = async (code) => {
		if (!code) {
			setPromoValid(null);
			return;
		}
		try {
			const result = await api('/preorders/validate-promo', {
				method: 'POST',
				body: { promoCode: code }
			});
			if (result.valid) {
				setPromoValid(true);
				setPromoDiscount(result.discount);
				setAmount(result.amount);
				setOriginalAmount(result.originalAmount);
				setDiscountApplied(true);
			} else {
				setPromoValid(false);
				setAmount(originalAmount);
				setDiscountApplied(false);
			}
		} catch (e) {
			setPromoValid(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!agreedToTerms) {
			setError(locale === 'fr' 
				? 'Vous devez accepter les conditions générales'
				: 'You must agree to the terms and conditions');
			return;
		}

		setProcessing(true);
		setError('');

		try {
			// Create commitment
			const result = await api('/preorders/commit', {
				method: 'POST',
				body: { 
					promoCode: promoCode || undefined,
					agreedToTerms: true
				}
			});

			// Track analytics
			trackEvent('preorder', 'commitment_made', 'commitment', Math.round(amount * 100));

			// Redirect to confirmation
			navigate(`/preorder/confirmation?commitment=${result.commitmentId}`);
		} catch (err) {
			setError(err.message || (locale === 'fr' ? 'Échec de l\'engagement' : 'Failed to create commitment'));
			setProcessing(false);
		}
	};

	if (loading) {
		return <LoadingSpinner message={locale === 'fr' ? 'Chargement...' : 'Loading...'} />;
	}

	return (
		<div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
			{/* Header */}
			<div style={{ textAlign: 'center', marginBottom: 40 }}>
				<h1 style={{ fontSize: 36, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
					{locale === 'fr' ? 'S\'engager à payer' : 'Commit to Pay'}
				</h1>
				<p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.6 }}>
					{locale === 'fr' 
						? 'Accédez en avant-première à la plateforme complète de Parc Ton Gosse'
						: 'Get early access to the complete Parc Ton Gosse platform'}
				</p>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
				{/* Value Proposition */}
				<div>
					<h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20, color: '#1e293b' }}>
						{locale === 'fr' ? 'Pourquoi s\'engager?' : 'Why Commit?'}
					</h2>
					<div style={{ display: 'grid', gap: 16 }}>
						<div style={{ padding: 16, background: '#eff6ff', borderRadius: 8 }}>
							<h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1e40af' }}>
								✓ {locale === 'fr' ? 'Accès anticipé' : 'Early Access'}
							</h3>
							<p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
								{locale === 'fr' 
									? 'Soyez parmi les premiers à découvrir toutes les fonctionnalités'
									: 'Be among the first to discover all features'}
							</p>
						</div>
						<div style={{ padding: 16, background: '#eff6ff', borderRadius: 8 }}>
							<h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1e40af' }}>
								✓ {locale === 'fr' ? 'Prix de lancement' : 'Launch Price'}
							</h3>
							<p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
								{locale === 'fr' 
									? 'Tarif réduit pour les engagements. Prix final: €9.99'
									: 'Special commitment price. Regular price: €9.99'}
							</p>
						</div>
						<div style={{ padding: 16, background: '#eff6ff', borderRadius: 8 }}>
							<h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1e40af' }}>
								✓ {locale === 'fr' ? 'Garantie de remboursement' : 'Money-Back Guarantee'}
							</h3>
							<p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
								{locale === 'fr' 
									? 'Remboursement complet si vous n\'êtes pas satisfait dans les 30 jours'
									: 'Full refund if not satisfied within 30 days'}
							</p>
						</div>
					</div>

					{/* Important Notice */}
					<div style={{ marginTop: 32, padding: 20, background: '#fef3c7', borderRadius: 8, border: '1px solid #fbbf24' }}>
						<h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#92400e' }}>
							{locale === 'fr' ? '⚠️ Important: Paiement différé' : '⚠️ Important: Deferred Payment'}
						</h3>
						<p style={{ margin: 0, color: '#78350f', fontSize: 14, lineHeight: 1.6 }}>
							{locale === 'fr' 
								? 'En vous engageant maintenant, vous promettez de payer €' + amount.toFixed(2) + ' lorsque le paiement sera activé. Vous recevrez un email avec les instructions de paiement une fois que nous aurons configuré notre système de paiement. Aucun paiement ne sera effectué automatiquement.'
								: 'By committing now, you promise to pay €' + amount.toFixed(2) + ' when payment is enabled. You will receive an email with payment instructions once we have set up our payment system. No payment will be charged automatically.'}
						</p>
					</div>

					{/* Launch Timeline */}
					<div style={{ marginTop: 32, padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e0e7f0' }}>
						<h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1e293b' }}>
							{locale === 'fr' ? '⏰ Date de lancement prévue' : '⏰ Expected Launch'}
						</h3>
						<p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
							{locale === 'fr' 
								? 'Lancement prévu: Q1 2025. Vous recevrez un email de confirmation avec les détails d\'accès et les instructions de paiement.'
								: 'Expected launch: Q1 2025. You\'ll receive a confirmation email with access details and payment instructions.'}
						</p>
					</div>

					{/* Terms */}
					<div style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
						<p>
							{locale === 'fr' 
								? 'En vous engageant, vous acceptez nos conditions générales. Remboursement disponible dans les 30 jours suivant le lancement.'
								: 'By committing, you agree to our terms and conditions. Refunds available within 30 days of launch.'}
						</p>
					</div>
				</div>

				{/* Commitment Form */}
				<div style={{
					padding: 32,
					background: 'white',
					borderRadius: 12,
					border: '1px solid #e0e7f0',
					boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
				}}>
					<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
						{/* Promo Code */}
						<div>
							<label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
								{locale === 'fr' ? 'Code promo (optionnel)' : 'Promo Code (optional)'}
							</label>
							<div style={{ display: 'flex', gap: 8 }}>
								<input
									type="text"
									value={promoCode}
									onChange={(e) => {
										setPromoCode(e.target.value);
										validatePromo(e.target.value);
									}}
									placeholder={locale === 'fr' ? 'Entrez un code promo' : 'Enter promo code'}
									style={{
										flex: 1,
										padding: 10,
										border: '1px solid #cbd5e1',
										borderRadius: 6,
										fontSize: 14
									}}
								/>
								{promoValid === true && (
									<div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: 500 }}>
										✓ {promoDiscount}% {locale === 'fr' ? 'de réduction' : 'off'}
									</div>
								)}
								{promoValid === false && (
									<div style={{ display: 'flex', alignItems: 'center', color: '#ef4444', fontSize: 12 }}>
										{locale === 'fr' ? 'Code invalide' : 'Invalid code'}
									</div>
								)}
							</div>
						</div>

						{/* Price Display */}
						<div style={{
							padding: 16,
							background: '#f8fafc',
							borderRadius: 8,
							border: '1px solid #e0e7f0'
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
								<span style={{ fontSize: 16 }}>{locale === 'fr' ? 'Montant à payer' : 'Amount to Pay'}</span>
								<div style={{ textAlign: 'right' }}>
									{discountApplied && (
										<div style={{ fontSize: 14, color: '#64748b', textDecoration: 'line-through' }}>
											€{originalAmount.toFixed(2)}
										</div>
									)}
									<div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
										€{amount.toFixed(2)}
									</div>
								</div>
							</div>
							<div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
								{locale === 'fr' 
									? '* Paiement différé - vous recevrez les instructions par email'
									: '* Deferred payment - you will receive instructions by email'}
							</div>
						</div>

						{/* Terms Agreement */}
						<div style={{
							padding: 16,
							background: '#f8fafc',
							borderRadius: 8,
							border: '1px solid #e0e7f0'
						}}>
							<label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
								<input
									type="checkbox"
									checked={agreedToTerms}
									onChange={(e) => setAgreedToTerms(e.target.checked)}
									style={{ marginTop: 2 }}
								/>
								<span style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
									{locale === 'fr' 
										? 'Je comprends que je m\'engage à payer €' + amount.toFixed(2) + ' lorsque le système de paiement sera activé. Je recevrai un email avec les instructions de paiement. Aucun paiement ne sera effectué automatiquement.'
										: 'I understand that I commit to paying €' + amount.toFixed(2) + ' when the payment system is activated. I will receive an email with payment instructions. No payment will be charged automatically.'}
								</span>
							</label>
						</div>

						{error && (
							<div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 14 }}>
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={!agreedToTerms || processing}
							style={{
								padding: '14px 24px',
								background: (!agreedToTerms || processing) ? '#94a3b8' : '#3b82f6',
								color: 'white',
								border: 'none',
								borderRadius: 8,
								fontSize: 16,
								fontWeight: 600,
								cursor: (!agreedToTerms || processing) ? 'not-allowed' : 'pointer',
								transition: 'all 0.2s'
							}}
						>
							{processing 
								? (locale === 'fr' ? 'Traitement...' : 'Processing...')
								: (locale === 'fr' ? `S'engager pour €${amount.toFixed(2)}` : `Commit to Pay €${amount.toFixed(2)}`)
							}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
