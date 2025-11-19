import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import TimeLimitModal from './TimeLimitModal.jsx';

/**
 * SessionTimer - Tracks user session time and enforces 5-minute free browsing limit
 * Best practices:
 * - Clear countdown timer visible to user
 * - Warning before time expires
 * - Smooth transition to commitment requirement
 * - Persistent across page refreshes (localStorage)
 */
const FREE_BROWSING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 1 * 60 * 1000; // Show warning 1 minute before expiry

export default function SessionTimer({ children }) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [showWarning, setShowWarning] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [sessionStartTime, setSessionStartTime] = useState(null);
	const intervalRef = useRef(null);
	const warningShownRef = useRef(false);

	useEffect(() => {
		const initializeSession = async () => {
			try {
				// Check if user is authenticated
				const userData = await api('/me').catch(() => null);
				if (!userData?.user) {
					// Not authenticated, no timer needed (AccessGate will handle)
					return;
				}

				const user = userData.user;
				
				// Admin and provider have unlimited access
				if (user.role === 'admin' || user.role === 'provider') {
					return;
				}

				// Users who have committed to pay have unlimited access
				if (user.hasPreordered) {
					// Clear any existing session timer
					localStorage.removeItem('sessionStartTime');
					return;
				}

				// Get session status from backend (source of truth)
				try {
					const sessionStatus = await api('/sessions/status');
					
					if (sessionStatus.unlimited) {
						return;
					}

					if (sessionStatus.expired) {
						// Time expired, show modal
						setShowModal(true);
						setTimeRemaining(0);
						return;
					}

					// Set timer based on backend response
					if (sessionStatus.sessionStartTime) {
						setSessionStartTime(sessionStatus.sessionStartTime);
						localStorage.setItem('sessionStartTime', sessionStatus.sessionStartTime);
					}

					const remaining = sessionStatus.timeRemaining || FREE_BROWSING_TIME;
					setTimeRemaining(remaining);
					
					// Check if we should show warning
					if (remaining <= WARNING_TIME && !warningShownRef.current) {
						setShowWarning(true);
						warningShownRef.current = true;
					}
				} catch (e) {
					// Fallback to localStorage if backend fails
					let startTime = localStorage.getItem('sessionStartTime');
					if (!startTime) {
						// First visit - start timer
						startTime = new Date().toISOString();
						localStorage.setItem('sessionStartTime', startTime);
						
						// Track session start on backend
						try {
							await api('/sessions/start', { method: 'POST' });
						} catch (err) {
							// Ignore errors
						}
					}

					setSessionStartTime(startTime);
					const start = new Date(startTime);
					const now = new Date();
					const elapsed = now - start;
					const remaining = Math.max(0, FREE_BROWSING_TIME - elapsed);

					if (remaining <= 0) {
						setShowModal(true);
						setTimeRemaining(0);
					} else {
						setTimeRemaining(remaining);
						if (remaining <= WARNING_TIME && !warningShownRef.current) {
							setShowWarning(true);
							warningShownRef.current = true;
						}
					}
				}
			} catch (error) {
				console.error('Failed to initialize session timer:', error);
			}
		};

		initializeSession();
	}, []);

	useEffect(() => {
		if (timeRemaining === null || timeRemaining <= 0) {
			return;
		}

		// Update timer every second
		intervalRef.current = setInterval(() => {
			setTimeRemaining(prev => {
				if (prev === null || prev <= 0) {
					setShowModal(true);
					return 0;
				}

				const newRemaining = prev - 1000;

				// Show warning 1 minute before expiry
				if (newRemaining <= WARNING_TIME && !warningShownRef.current) {
					setShowWarning(true);
					warningShownRef.current = true;
				}

				return newRemaining;
			});
		}, 1000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [timeRemaining]);

	const handleCommit = () => {
		// Clear session timer
		localStorage.removeItem('sessionStartTime');
		// Navigate to preorder page
		navigate('/preorder');
	};

	const handleCloseWarning = () => {
		setShowWarning(false);
	};

	const formatTime = (ms) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	// Don't show timer for public routes or if user has committed
	if (showModal) {
		return <TimeLimitModal onCommit={handleCommit} />;
	}

	return (
		<>
			{/* Warning Banner (1 minute before expiry) */}
			{showWarning && timeRemaining > 0 && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
					color: 'white',
					padding: '12px 20px',
					textAlign: 'center',
					zIndex: 1000,
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
						<span style={{ fontWeight: 600, fontSize: 14 }}>
							⏰ {locale === 'fr' 
								? `Temps restant: ${formatTime(timeRemaining)} - Engagement requis pour continuer`
								: `Time remaining: ${formatTime(timeRemaining)} - Commitment required to continue`}
						</span>
						<button
							onClick={handleCloseWarning}
							style={{
								background: 'rgba(255, 255, 255, 0.2)',
								border: '1px solid rgba(255, 255, 255, 0.3)',
								color: 'white',
								padding: '4px 12px',
								borderRadius: 4,
								cursor: 'pointer',
								fontSize: 12
							}}
						>
							×
						</button>
					</div>
				</div>
			)}

			{/* Time Remaining Indicator (always visible when timer is active) */}
			{timeRemaining !== null && timeRemaining > 0 && (
				<div style={{
					position: 'fixed',
					bottom: 20,
					right: 20,
					background: 'white',
					padding: '10px 16px',
					borderRadius: 8,
					boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
					zIndex: 999,
					border: '2px solid #3b82f6',
					fontSize: 14,
					fontWeight: 600,
					color: timeRemaining <= WARNING_TIME ? '#f59e0b' : '#3b82f6'
				}}>
					⏱️ {locale === 'fr' ? 'Temps restant' : 'Time remaining'}: {formatTime(timeRemaining)}
				</div>
			)}

			{children}
		</>
	);
}

