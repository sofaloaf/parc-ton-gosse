import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo() {
	return (
		<Link 
			to="/" 
			style={{ 
				textDecoration: 'none', 
				display: 'flex', 
				alignItems: 'center', 
				gap: 12,
				color: 'inherit'
			}}
		>
			{/* Logo Circle */}
			<div style={{
				width: 40,
				height: 40,
				borderRadius: '50%',
				background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
			}}>
				{/* You can replace this with an actual logo image */}
				{/* <img src="/logo.png" alt="Parc ton gosse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> */}
			</div>
			
			{/* Logo Text */}
			<span style={{
				fontSize: 20,
				fontWeight: 700,
				color: '#3b82f6',
				letterSpacing: '-0.5px'
			}}>
				Parctongosse
			</span>
		</Link>
	);
}

