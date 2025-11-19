import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

export default function PreorderConfirmation() {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const commitmentId = searchParams.get('commitment') || searchParams.get('payment'); // Support both old and new

	useEffect(() => {
		// Verify user is logged in and has preordered (cookies are sent automatically)
		api('/preorders/status')
			.then(status => {
				if (!status.hasPreordered) {
					navigate('/preorder');
				}
			})
			.catch(() => {
				navigate('/profile');
			});
	}, [navigate]);

	const shareText = locale === 'fr' 
		? 'Je viens de précommander Parc Ton Gosse - la plateforme pour trouver des activités pour enfants à Paris!'
		: 'I just preordered Parc Ton Gosse - the platform to find children\'s activities in Paris!';

	const shareUrl = window.location.origin;

	const handleShare = (platform) => {
		const encodedText = encodeURIComponent(shareText);
		const encodedUrl = encodeURIComponent(shareUrl);
		
		const urls = {
			twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
			facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
			linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
			whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
		};

		if (urls[platform]) {
			window.open(urls[platform], '_blank', 'width=600,height=400');
		}
	};

	return (
		<div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
			{/* Success Icon */}
			<div style={{
				width: 80,
				height: 80,
				margin: '0 auto 24px',
				background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
				borderRadius: '50%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 40,
				color: 'white'
			}}>
				✓
			</div>

			{/* Title */}
			<h1 style={{ fontSize: 36, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
				{locale === 'fr' ? 'Merci pour votre précommande!' : 'Thank You for Your Preorder!'}
			</h1>

			{/* Message */}
			<p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.8, marginBottom: 32 }}>
				{locale === 'fr' 
					? 'Votre précommande a été confirmée. Vous recevrez un email de confirmation dans quelques instants avec tous les détails.'
					: 'Your preorder has been confirmed. You\'ll receive a confirmation email shortly with all the details.'}
			</p>

			{/* Commitment ID */}
			{commitmentId && (
				<div style={{
					padding: 16,
					background: '#f8fafc',
					borderRadius: 8,
					marginBottom: 32,
					textAlign: 'left'
				}}>
					<div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
						{locale === 'fr' ? 'ID d\'engagement' : 'Commitment ID'}
					</div>
					<div style={{ fontSize: 14, fontFamily: 'monospace', color: '#1e293b' }}>
						{commitmentId}
					</div>
				</div>
			)}

			{/* Next Steps */}
			<div style={{
				padding: 24,
				background: '#eff6ff',
				borderRadius: 8,
				marginBottom: 32,
				textAlign: 'left'
			}}>
				<h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0', color: '#1e40af' }}>
					{locale === 'fr' ? 'Prochaines étapes' : 'Next Steps'}
				</h2>
				<div style={{ display: 'grid', gap: 12 }}>
					<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
						<span style={{ fontSize: 20 }}>1️⃣</span>
						<div>
							<strong style={{ display: 'block', marginBottom: 4 }}>{locale === 'fr' ? 'Email de confirmation' : 'Confirmation Email'}</strong>
							<span style={{ fontSize: 14, color: '#475569' }}>
								{locale === 'fr' 
									? 'Vous recevrez un email avec votre reçu et les détails de précommande'
									: 'You\'ll receive an email with your receipt and preorder details'}
							</span>
						</div>
					</div>
					<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
						<span style={{ fontSize: 20 }}>2️⃣</span>
						<div>
							<strong style={{ display: 'block', marginBottom: 4 }}>{locale === 'fr' ? 'Lancement prévu' : 'Expected Launch'}</strong>
							<span style={{ fontSize: 14, color: '#475569' }}>
								{locale === 'fr' 
									? 'Q1 2025 - Nous vous enverrons un email avec vos identifiants d\'accès et les instructions de paiement'
									: 'Q1 2025 - We\'ll send you an email with your access credentials and payment instructions'}
							</span>
						</div>
					</div>
					<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
						<span style={{ fontSize: 20 }}>3️⃣</span>
						<div>
							<strong style={{ display: 'block', marginBottom: 4 }}>{locale === 'fr' ? 'Remboursement' : 'Refund Policy'}</strong>
							<span style={{ fontSize: 14, color: '#475569' }}>
								{locale === 'fr' 
									? 'Remboursement disponible dans les 30 jours suivant le lancement si vous n\'êtes pas satisfait'
									: 'Full refund available within 30 days of launch if not satisfied'}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Social Sharing */}
			<div>
				<h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#1e293b' }}>
					{locale === 'fr' ? 'Partagez avec vos amis!' : 'Share with Friends!'}
				</h3>
				<div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
					<button
						onClick={() => handleShare('twitter')}
						style={{
							padding: '10px 20px',
							background: '#1DA1F2',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 500
						}}
					>
						🐦 Twitter
					</button>
					<button
						onClick={() => handleShare('facebook')}
						style={{
							padding: '10px 20px',
							background: '#1877F2',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 500
						}}
					>
						📘 Facebook
					</button>
					<button
						onClick={() => handleShare('linkedin')}
						style={{
							padding: '10px 20px',
							background: '#0A66C2',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 500
						}}
					>
						💼 LinkedIn
					</button>
					<button
						onClick={() => handleShare('whatsapp')}
						style={{
							padding: '10px 20px',
							background: '#25D366',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 500
						}}
					>
						💬 WhatsApp
					</button>
				</div>
			</div>

			{/* Back to Site */}
			<div style={{ marginTop: 40 }}>
				<button
					onClick={() => navigate('/')}
					style={{
						padding: '12px 24px',
						background: '#3b82f6',
						color: 'white',
						border: 'none',
						borderRadius: 8,
						fontSize: 16,
						fontWeight: 500,
						cursor: 'pointer'
					}}
				>
					{locale === 'fr' ? 'Retour à la plateforme' : 'Back to Platform'}
				</button>
			</div>
		</div>
	);
}

