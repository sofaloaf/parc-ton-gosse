import React, { useState, useEffect } from 'react';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

export default function ReferralCodeDisplay({ userId }) {
	const { locale } = useI18n();
	const [referralCode, setReferralCode] = useState('');
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);
	const isFrench = locale === 'fr';

	useEffect(() => {
		loadReferralCode();
	}, [userId]);

	const loadReferralCode = async () => {
		try {
			const data = await api('/referrals/code');
			setReferralCode(data.referralCode);
			
			// Load stats
			const statsData = await api('/referrals/stats');
			setStats(statsData);
		} catch (err) {
			console.error('Failed to load referral code:', err);
		} finally {
			setLoading(false);
		}
	};

	const copyToClipboard = () => {
		if (referralCode) {
			navigator.clipboard.writeText(referralCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const shareUrl = referralCode ? `${window.location.origin}/profile?ref=${referralCode}` : '';

	if (loading) {
		return <div style={{ fontSize: 14, color: '#666' }}>{isFrench ? 'Chargement...' : 'Loading...'}</div>;
	}

	return (
		<div style={{ display: 'grid', gap: 12 }}>
			<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<div style={{
					padding: '8px 16px',
					background: 'white',
					border: '2px solid #007bff',
					borderRadius: 4,
					fontFamily: 'monospace',
					fontSize: 18,
					fontWeight: 'bold',
					color: '#007bff',
					flex: 1,
					textAlign: 'center'
				}}>
					{referralCode || 'N/A'}
				</div>
				<button
					onClick={copyToClipboard}
					style={{
						padding: '8px 16px',
						background: copied ? '#28a745' : '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer',
						fontSize: 14
					}}
				>
					{copied ? (isFrench ? '✓ Copié' : '✓ Copied') : (isFrench ? 'Copier' : 'Copy')}
				</button>
			</div>
			
			{stats && (
				<div style={{ fontSize: 12, color: '#666' }}>
					{isFrench 
						? `${stats.totalReferrals} parrainage${stats.totalReferrals > 1 ? 's' : ''} • ${stats.successfulReferrals} réussis`
						: `${stats.totalReferrals} referral${stats.totalReferrals !== 1 ? 's' : ''} • ${stats.successfulReferrals} successful`}
				</div>
			)}
			
			<div style={{ fontSize: 12, color: '#666' }}>
				{isFrench 
					? 'Partagez ce lien avec vos amis :'
					: 'Share this link with friends:'}
			</div>
			<div style={{
				padding: 8,
				background: 'white',
				border: '1px solid #ddd',
				borderRadius: 4,
				fontSize: 12,
				color: '#666',
				wordBreak: 'break-all'
			}}>
				{shareUrl}
			</div>
		</div>
	);
}

