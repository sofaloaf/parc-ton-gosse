import React from 'react';

export default function LoadingSpinner({ size = 'medium', message }) {
	const sizeStyles = {
		small: { width: '20px', height: '20px', borderWidth: '2px' },
		medium: { width: '40px', height: '40px', borderWidth: '3px' },
		large: { width: '60px', height: '60px', borderWidth: '4px' }
	};

	const style = sizeStyles[size] || sizeStyles.medium;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
			<div
				style={{
					...style,
					border: `${style.borderWidth} solid #e0e7f0`,
					borderTop: `${style.borderWidth} solid #3b82f6`,
					borderRadius: '50%',
					animation: 'spin 1s linear infinite'
				}}
			/>
			{message && (
				<div style={{ color: '#64748b', fontSize: 14 }}>
					{message}
				</div>
			)}
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
}

