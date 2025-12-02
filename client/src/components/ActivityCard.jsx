import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { translateCategories } from '../utils/categoryTranslations.js';
import { formatTitle } from '../utils/textFormatting.js';
import { getCategoryIcons } from '../utils/categoryIcons.js';

export default function ActivityCard({ activity, locale, onView }) {
	const cardRef = useRef(null);
	const hasTracked = useRef(false);
	const observerRef = useRef(null);
	const mountTime = useRef(Date.now());

	// Track card view when it becomes visible (only if user scrolls to it)
	useEffect(() => {
		if (!onView || hasTracked.current) return;

		// Check if card is already visible on mount
		let wasVisibleOnMount = false;
		if (cardRef.current) {
			const rect = cardRef.current.getBoundingClientRect();
			wasVisibleOnMount = rect.top < window.innerHeight && rect.bottom > 0;
		}

		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasTracked.current) {
						// Only track if:
						// 1. Card was NOT visible on mount (user scrolled to it), OR
						// 2. Card was visible on mount but user has been on page for at least 2 seconds (they actually viewed it)
						const timeSinceMount = Date.now() - mountTime.current;
						const shouldTrack = !wasVisibleOnMount || timeSinceMount > 2000;

						if (shouldTrack) {
							hasTracked.current = true;
							onView();
							// Stop observing once tracked
							if (observerRef.current && cardRef.current) {
								observerRef.current.unobserve(cardRef.current);
							}
						}
					}
				});
			},
			{ threshold: 0.5 } // Track when 50% of card is visible
		);

		if (cardRef.current) {
			observerRef.current.observe(cardRef.current);
		}

		return () => {
			if (observerRef.current && cardRef.current) {
				observerRef.current.unobserve(cardRef.current);
			}
		};
	}, [onView]);
	const title = formatTitle(activity.title, locale);
	const desc = activity.description?.[locale] || activity.description?.en || activity.description?.fr;
	const addressStr = activity.addresses || activity.addresse || '';
	
	// Parse addresses in new format: "Location: Address - Location: Address"
	const parseAddresses = (str) => {
		if (!str) return [];
		const parts = str.split(' - ').map(p => p.trim().replace(/^\s*-\s*|\s*-\s*$/g, '')).filter(p => p);
		return parts.map(part => {
			const colonIndex = part.indexOf(':');
			if (colonIndex > 0) {
				const locationName = part.substring(0, colonIndex).trim();
				const address = part.substring(colonIndex + 1).trim().replace(/^\s*-\s*|\s*-\s*$/g, '');
				return { location: locationName, address: address };
			}
			return { location: '', address: part.replace(/^\s*-\s*|\s*-\s*$/g, '') };
		});
	};
	
	const addresses = parseAddresses(addressStr);
	const email = activity.contact__email_ || activity.contactEmail;
	const phone = activity.contact__t_l_phone_ || activity.contactPhone;
	const categories = translateCategories(activity.categories || [], locale);
	const price = activity.price?.amount || activity.price;
	const images = activity.images || [];
	
	// Modern card design inspired by Withlocals/GetYourGuide
	const firstImage = images && images.length > 0 ? images[0] : null;
	
	return (
		<Link 
			to={`/activity/${activity.id}`} 
			style={{ 
				textDecoration: 'none', 
				color: 'inherit',
				display: 'block',
				height: '100%'
			}}
		>
			<div ref={cardRef} style={{ 
				background: 'white',
				borderRadius: '16px',
				border: '1px solid #e2e8f0',
				overflow: 'hidden',
				transition: 'all 0.3s ease',
				boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
				cursor: 'pointer',
				height: '100%',
				display: 'flex',
				flexDirection: 'column'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = 'translateY(-8px)';
				e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.2)';
				e.currentTarget.style.borderColor = '#3b82f6';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = 'translateY(0)';
				e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
				e.currentTarget.style.borderColor = '#e2e8f0';
			}}
			>
				{/* Image Section */}
				{firstImage ? (
					<div style={{
						width: '100%',
						height: '200px',
						background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
						position: 'relative',
						overflow: 'hidden'
					}}>
						<img 
							src={firstImage} 
							alt={title}
							style={{
								width: '100%',
								height: '100%',
								objectFit: 'cover'
							}}
							onError={(e) => {
								e.target.style.display = 'none';
							}}
						/>
					</div>
				) : (
					<div style={{
						width: '100%',
						height: '200px',
						background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'white',
						fontSize: '48px',
						fontWeight: 'normal',
						gap: '12px',
						flexWrap: 'wrap'
					}}>
						{getCategoryIcons(activity.categories || []).map((icon, idx) => (
							<span key={idx} style={{ fontSize: '48px', lineHeight: 1 }}>
								{icon}
							</span>
						))}
					</div>
				)}
				
				{/* Content Section */}
				<div style={{ 
					padding: '20px',
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
					flex: 1
				}}>
					{/* Title */}
					<h3 style={{ 
						margin: 0, 
						fontSize: '20px',
						fontWeight: 700,
						color: '#1e293b',
						lineHeight: '1.3',
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden'
					}}>
						{title}
					</h3>
					
					{/* Description */}
					{desc && (
						<p style={{ 
							color: '#64748b', 
							margin: 0, 
							fontSize: '14px',
							lineHeight: '1.6',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
							flex: 1
						}}>
							{String(desc)}
						</p>
					)}

				{/* Categories/Tags */}
				{categories.length > 0 && (
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
						{Array.isArray(categories) ? categories.slice(0, 3).map((cat, idx) => (
							<span key={idx} style={{
								background: '#eff6ff',
								color: '#1e40af',
								padding: '4px 10px',
								borderRadius: '12px',
								fontSize: '12px',
								fontWeight: 500
							}}>
								{cat}
							</span>
						)) : (
							<span style={{
								background: '#eff6ff',
								color: '#1e40af',
								padding: '4px 10px',
								borderRadius: '12px',
								fontSize: '12px',
								fontWeight: 500
							}}>
								{categories}
							</span>
						)}
					</div>
				)}

				{/* Address */}
				{addresses.length > 0 && (
					<div style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
						<div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
							<span style={{ color: '#3b82f6' }}>📍</span>
							<div style={{ flex: 1 }}>
								{addresses.slice(0, 2).map((addr, idx) => (
									<div key={idx} style={{ marginBottom: idx < addresses.slice(0, 2).length - 1 ? '6px' : 0 }}>
										{addr.location && <strong style={{ color: '#1e293b' }}>{addr.location}: </strong>}
										<span>{addr.address.substring(0, 60)}{addr.address.length > 60 ? '...' : ''}</span>
									</div>
								))}
								{addresses.length > 2 && (
									<div style={{ color: '#3b82f6', fontSize: '12px', marginTop: '4px' }}>
										+{addresses.length - 2} more
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Footer with price and contact */}
				<div style={{ 
					marginTop: 'auto',
					paddingTop: '12px',
					borderTop: '1px solid #e0e7f0',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: '8px'
				}}>
					<div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
						{price && (
							<div style={{ 
								fontWeight: 600, 
								color: '#1e40af',
								fontSize: '16px'
							}}>
								{typeof price === 'object' ? `${price.amount}€` : `${price}€`}
							</div>
						)}
						{activity.neighborhood && (
							<div style={{
								background: '#f1f5f9',
								color: '#475569',
								padding: '2px 8px',
								borderRadius: '6px',
								fontSize: '12px'
							}}>
								{activity.neighborhood}
							</div>
						)}
					</div>
					<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
						{email && (
							<a 
								href={`mailto:${email}`} 
								onClick={(e) => e.stopPropagation()}
								style={{ 
									color: '#3b82f6', 
									fontSize: '20px', 
									textDecoration: 'none',
									lineHeight: 1
								}}
							>
								📧
							</a>
						)}
						{phone && (
							<a 
								href={`tel:${phone.replace(/[^\d+]/g, '')}`} 
								onClick={(e) => e.stopPropagation()}
								style={{ 
									color: '#3b82f6', 
									fontSize: '20px', 
									textDecoration: 'none',
									lineHeight: 1
								}}
							>
								📞
							</a>
						)}
					</div>
				</div>
				</div>
			</div>
		</Link>
	);
}


