import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

// Payment form component
function PreorderForm({ amount, originalAmount, discountApplied, onSuccess }) {
	const stripe = useStripe();
	const elements = useElements();
	const { locale, t } = useI18n();
	const [promoCode, setPromoCode] = useState('');
	const [promoValid, setPromoValid] = useState(null);
	const [promoDiscount, setPromoDiscount] = useState(0);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState('');

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
			} else {
				setPromoValid(false);
			}
		} catch (e) {
			setPromoValid(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!stripe || !elements) return;

		setProcessing(true);
		setError('');

		try {
			// Create payment intent
			const { clientSecret } = await api('/preorders/create-payment-intent', {
				method: 'POST',
				body: { promoCode: promoCode || undefined }
			});

			// Confirm payment
			const cardElement = elements.getElement(CardElement);
			const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
				payment_method: {
					card: cardElement,
				}
			});

			if (stripeError) {
				setError(stripeError.message);
				setProcessing(false);
			} else if (paymentIntent.status === 'succeeded') {
				// Confirm preorder on backend
				await api('/preorders/confirm', {
					method: 'POST',
					body: { paymentIntentId: paymentIntent.id }
				});
				onSuccess(paymentIntent.id);
			}
		} catch (err) {
			setError(err.message || 'Payment failed');
			setProcessing(false);
		}
	};

	return (
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
					<span style={{ fontSize: 16 }}>{locale === 'fr' ? 'Montant' : 'Amount'}</span>
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
			</div>

			{/* Card Element */}
			<div style={{
				padding: 16,
				border: '1px solid #cbd5e1',
				borderRadius: 8,
				background: 'white'
			}}>
				<label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
					{locale === 'fr' ? 'Informations de carte' : 'Card Information'}
				</label>
				<CardElement
					options={{
						style: {
							base: {
								fontSize: '16px',
								color: '#334155',
								'::placeholder': { color: '#94a3b8' }
							}
						}
					}}
				/>
			</div>

			{error && (
				<div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 14 }}>
					{error}
				</div>
			)}

			<button
				type="submit"
				disabled={!stripe || processing}
				style={{
					padding: '14px 24px',
					background: processing ? '#94a3b8' : '#3b82f6',
					color: 'white',
					border: 'none',
					borderRadius: 8,
					fontSize: 16,
					fontWeight: 600,
					cursor: processing ? 'not-allowed' : 'pointer',
					transition: 'all 0.2s'
				}}
			>
				{processing 
					? (locale === 'fr' ? 'Traitement...' : 'Processing...')
					: (locale === 'fr' ? `Précommander pour €${amount.toFixed(2)}` : `Preorder for €${amount.toFixed(2)}`)
				}
			</button>
		</form>
	);
}

export default function Preorder() {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const [paymentIntent, setPaymentIntent] = useState(null);
	const [amount, setAmount] = useState(4.99);
	const [originalAmount, setOriginalAmount] = useState(4.99);
	const [discountApplied, setDiscountApplied] = useState(false);
	const [loading, setLoading] = useState(true);
	const paymentsEnabled = Boolean(stripePromise);

	useEffect(() => {
		// Check if user is logged in (cookies are sent automatically)
		api('/me')
			.then(data => {
				if (!data.user) {
					navigate('/profile');
				}
			})
			.catch(() => {
				navigate('/profile');
			});

		// Check if user already preordered
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
	}, [navigate]);

	if (loading) {
		return <LoadingSpinner message={locale === 'fr' ? 'Chargement...' : 'Loading...'} />;
	}

	const handlePaymentSuccess = (paymentIntentId) => {
		navigate(`/preorder/confirmation?payment=${paymentIntentId}`);
	};

	return (
		<div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
			{/* Header */}
			<div style={{ textAlign: 'center', marginBottom: 40 }}>
				<h1 style={{ fontSize: 36, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
					{locale === 'fr' ? 'Précommande' : 'Preorder'}
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
						{locale === 'fr' ? 'Pourquoi précommander?' : 'Why Preorder?'}
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
									? 'Tarif réduit pour les précommandes. Prix final: €9.99'
									: 'Special preorder price. Regular price: €9.99'}
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

					{/* Launch Timeline */}
					<div style={{ marginTop: 32, padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e0e7f0' }}>
						<h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1e293b' }}>
							{locale === 'fr' ? '⏰ Date de lancement prévue' : '⏰ Expected Launch'}
						</h3>
						<p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
							{locale === 'fr' 
								? 'Lancement prévu: Q1 2025. Vous recevrez un email de confirmation avec les détails d\'accès.'
								: 'Expected launch: Q1 2025. You\'ll receive a confirmation email with access details.'}
						</p>
					</div>

					{/* Terms */}
					<div style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
						<p>
							{locale === 'fr' 
								? 'En précommandant, vous acceptez nos conditions générales. Remboursement disponible dans les 30 jours suivant le lancement.'
								: 'By preordering, you agree to our terms and conditions. Refunds available within 30 days of launch.'}
						</p>
					</div>
				</div>

				{/* Payment Form */}
				<div style={{
					padding: 32,
					background: 'white',
					borderRadius: 12,
					border: '1px solid #e0e7f0',
					boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
				}}>
					{paymentsEnabled ? (
						<Elements stripe={stripePromise}>
							<PreorderForm
								amount={amount}
								originalAmount={originalAmount}
								discountApplied={discountApplied}
								onSuccess={handlePaymentSuccess}
							/>
						</Elements>
					) : (
						<div style={{ display: 'grid', gap: 12, color: '#475569', fontSize: 16 }}>
							<strong>{locale === 'fr' ? 'Paiements bientôt disponibles' : 'Payments coming soon'}</strong>
							<span>
								{locale === 'fr'
									? 'La fonctionnalité de paiement est temporairement désactivée pendant la phase de test.'
									: 'The payment feature is temporarily disabled while we finish testing.'}
							</span>
							<span>
								{locale === 'fr'
									? 'Revenez bientôt pour précommander avec votre carte bancaire.'
									: 'Check back soon to preorder with your credit card.'}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

