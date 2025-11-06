import React, { useMemo } from 'react';

export default function PasswordStrength({ password }) {
	const strength = useMemo(() => {
		if (!password) return { score: 0, label: '', color: '#e0e7f0' };

		let score = 0;
		if (password.length >= 8) score++;
		if (password.length >= 12) score++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
		if (/\d/.test(password)) score++;
		if (/[^a-zA-Z\d]/.test(password)) score++;

		const levels = [
			{ label: 'Very Weak', color: '#ef4444' },
			{ label: 'Weak', color: '#f97316' },
			{ label: 'Fair', color: '#eab308' },
			{ label: 'Good', color: '#3b82f6' },
			{ label: 'Strong', color: '#10b981' },
			{ label: 'Very Strong', color: '#059669' }
		];

		return {
			score: Math.min(score, 5),
			...levels[Math.min(score, 5)]
		};
	}, [password]);

	if (!password) return null;

	return (
		<div style={{ marginTop: 8 }}>
			<div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
				{[0, 1, 2, 3, 4].map((i) => (
					<div
						key={i}
						style={{
							flex: 1,
							height: 4,
							background: i <= strength.score ? strength.color : '#e0e7f0',
							borderRadius: 2,
							transition: 'background 0.3s ease'
						}}
					/>
				))}
			</div>
			<div style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
				{strength.label}
			</div>
		</div>
	);
}

