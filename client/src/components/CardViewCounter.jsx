import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import PaywallModal from './PaywallModal.jsx';

/**
 * CardViewCounter - Tracks card views and shows paywall after 10 cards
 * Best practices:
 * - Track views server-side for security
 * - Show progress indicator
 * - Smooth transition to paywall
 */
const MAX_FREE_CARDS = 10;

export default function CardViewCounter({ children }) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const [cardViews, setCardViews] = useState(0);
	const [showPaywall, setShowPaywall] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const initializeCounter = async () => {
			try {
				// Check if user is authenticated
				const userData = await api('/me').catch(() => null);
				
				// Admin and provider have unlimited access
				if (userData?.user?.role === 'admin' || userData?.user?.role === 'provider') {
					setLoading(false);
					return;
				}

				// Users who have subscribed have unlimited access
				if (userData?.user?.hasPreordered || userData?.user?.subscriptionActive) {
					setLoading(false);
					return;
				}

				// For anonymous users, start with 0 and track in localStorage
				// Only check backend for authenticated users
				if (userData?.user) {
					try {
						const status = await api('/card-views/status');
						setCardViews(status.count || 0);
						
						// IMPORTANT: Never show paywall on initial page load
						// Only show it when user actually tries to view the 11th card
						// This allows users to browse the page normally
					} catch (error) {
						// Fallback: start with 0 for authenticated users too
						setCardViews(0);
					}
				} else {
					// Anonymous users - check localStorage but NEVER show paywall on initial load
					// Allow them to see the page, paywall will show when they try to view 11th card
					const stored = localStorage.getItem('cardViewCount');
					const count = stored ? parseInt(stored, 10) : 0;
					setCardViews(count);
					
					// CRITICAL: Never show paywall on initial page load, even if count >= 10
					// The paywall will only appear when handleCardView is called and count >= 10
					// This ensures users can always see the page and browse normally
				}
			} catch (error) {
				console.error('Failed to initialize card view counter:', error);
				// On error, allow access - start with 0
				setCardViews(0);
			} finally {
				setLoading(false);
			}
		};

		initializeCounter();
	}, []);

	const handleCardView = async (activityId) => {
		try {
			// Check if user is authenticated
			const userData = await api('/me').catch(() => null);
			
			// Skip tracking for admin, provider, or subscribed users
			if (userData?.user?.role === 'admin' || 
			    userData?.user?.role === 'provider' ||
			    userData?.user?.hasPreordered ||
			    userData?.user?.subscriptionActive) {
				return;
			}

			// Increment count first (optimistic update)
			const newCount = cardViews + 1;
			setCardViews(newCount);
			localStorage.setItem('cardViewCount', newCount.toString());

			// Track card view on backend (for authenticated users)
			if (userData?.user) {
				try {
					const result = await api('/card-views/track', {
						method: 'POST',
						body: { activityId }
					});
					
					// Use backend count if available
					if (result.count !== undefined) {
						setCardViews(result.count);
						localStorage.setItem('cardViewCount', result.count.toString());
						
						// Show paywall if count >= MAX_FREE_CARDS
						if (result.count >= MAX_FREE_CARDS) {
							setShowPaywall(true);
							return;
						}
					}
				} catch (error) {
					// Backend failed, use local count
					console.warn('Failed to track on backend, using local count:', error);
				}
			}

			// Show paywall when reaching the limit (after viewing 10 cards, block the 11th)
			if (newCount >= MAX_FREE_CARDS) {
				setShowPaywall(true);
			}
		} catch (error) {
			console.error('Failed to track card view:', error);
		}
	};

	const handleSubscribe = () => {
		setShowPaywall(false);
		navigate('/preorder');
	};

	const handleClose = () => {
		// Allow user to close and continue browsing (they'll hit paywall again on next card)
		// Or navigate to preorder page
		setShowPaywall(false);
		// Optionally navigate to preorder
		// navigate('/preorder');
	};

	if (loading) {
		return typeof children === 'function' ? children({ onCardView: () => {} }) : children;
	}

	// IMPORTANT: Only show paywall when user actually views a card that triggers the limit
	// Never show paywall on initial page load - always allow users to see the page first
	if (showPaywall) {
		// Show paywall modal but allow user to see content behind it (they can still see what they're missing)
		return (
			<>
				{typeof children === 'function' ? children({ onCardView: handleCardView }) : children}
				<PaywallModal onSubscribe={handleSubscribe} onClose={handleClose} />
			</>
		);
	}

	return (
		<>
			{/* Progress Indicator */}
			{cardViews > 0 && cardViews < MAX_FREE_CARDS && (
				<div style={{
					position: 'fixed',
					bottom: 20,
					right: 20,
					background: 'white',
					padding: '12px 16px',
					borderRadius: 8,
					boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
					zIndex: 999,
					border: '2px solid #3b82f6',
					fontSize: 14,
					fontWeight: 600,
					color: '#3b82f6',
					minWidth: 200
				}}>
					<div style={{ marginBottom: 4 }}>
						{locale === 'fr' 
							? `${cardViews} / ${MAX_FREE_CARDS} cartes consultées`
							: `${cardViews} / ${MAX_FREE_CARDS} cards viewed`}
					</div>
					<div style={{
						width: '100%',
						height: 6,
						background: '#e0e7f0',
						borderRadius: 3,
						overflow: 'hidden'
					}}>
						<div style={{
							width: `${(cardViews / MAX_FREE_CARDS) * 100}%`,
							height: '100%',
							background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
							transition: 'width 0.3s ease'
						}} />
					</div>
				</div>
			)}
			{typeof children === 'function' ? children({ onCardView: handleCardView }) : children}
		</>
	);
}

