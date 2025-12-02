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
				background: '#a8e063', // Light green color
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0
			}}>
				{/* You can replace this with an actual logo image */}
				{/* <img src="/logo.png" alt="Parc ton gosse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> */}
			</div>
			
			{/* Logo Text */}
			<span style={{
				fontSize: 20,
				fontWeight: 600,
				color: '#a8e063', // Light green color matching the circle
				letterSpacing: '-0.5px'
			}}>
				Parctongosse
			</span>
		</Link>
	);
}

