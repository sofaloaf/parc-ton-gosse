import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { translateCategories } from '../utils/categoryTranslations.js';
import { formatTitle } from '../utils/textFormatting.js';
import { getCategoryIcons } from '../utils/categoryIcons.js';
import { getActivityImageUrl } from '../utils/activityImages.js';
import StarRating from './StarRating.jsx';

export default function ActivityCard({ activity, locale, onView, rating = { average: 0, count: 0 } }) {
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
	
	// Handle title - support both {en, fr} object and string formats
	// Also handle title_en/title_fr format (legacy support)
	let title = '';
	
	// Priority 1: Try title object first (most common format)
	if (activity.title) {
		if (typeof activity.title === 'object' && activity.title !== null && !Array.isArray(activity.title)) {
			// Bilingual object: use locale-specific version
			title = activity.title[locale] || activity.title.en || activity.title.fr || '';
		} else if (typeof activity.title === 'string') {
			title = activity.title;
		}
	}
	
	// Priority 2: Try title_en/title_fr (legacy format)
	if (!title && (activity.title_en !== undefined || activity.title_fr !== undefined)) {
		// Use locale-specific version
		title = locale === 'fr' 
			? (activity.title_fr || activity.title_en || '')
			: (activity.title_en || activity.title_fr || '');
	}
	
	// Priority 3: Fallback to name field if title is empty (but NOT providerId)
	if (!title && activity.name) {
		if (typeof activity.name === 'object' && activity.name !== null && !Array.isArray(activity.name)) {
			title = activity.name[locale] || activity.name.en || activity.name.fr || '';
		} else {
			const nameStr = String(activity.name);
			// Don't use providerId as title
			if (nameStr && !nameStr.toLowerCase().startsWith('provider-') && nameStr !== activity.providerId) {
				title = nameStr;
			}
		}
	}
	
	// Priority 4: Last resort: check organization name (but NOT providerId)
	if (!title) {
		if (activity.organizationName && !String(activity.organizationName).toLowerCase().startsWith('provider-')) {
			title = String(activity.organizationName);
		} else if (activity.organization && !String(activity.organization).toLowerCase().startsWith('provider-')) {
			title = String(activity.organization);
		}
	}
	
	// Debug: Log what we found
	if (process.env.NODE_ENV === 'development' || !title || title === 'Activity') {
		console.log('🔍 ActivityCard title extraction:', {
			id: activity.id,
			locale: locale,
			foundTitle: title,
			titleObject: activity.title,
			title_en: activity.title_en,
			title_fr: activity.title_fr,
			name: activity.name,
			providerId: activity.providerId
		});
	}
	
	// Format the title (capitalize properly)
	title = formatTitle(title || 'Activity', locale);
	
	// Handle description - support both {en, fr} object and string formats
	let desc = '';
	if (activity.description) {
		if (typeof activity.description === 'object' && activity.description !== null) {
			desc = activity.description[locale] || activity.description.en || activity.description.fr || '';
		} else if (typeof activity.description === 'string') {
			desc = activity.description;
		}
	}
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
	
	// Generate professional activity image based on description
	const [imageUrl, setImageUrl] = useState(() => {
		// Use existing image if available, otherwise generate one
		if (images && images.length > 0 && typeof images[0] === 'string' && 
		    (images[0].startsWith('http://') || images[0].startsWith('https://'))) {
			return images[0];
		}
		return getActivityImageUrl(activity, locale, 400, 300);
	});
	const [imageError, setImageError] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);
	
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
				{/* Image Section - Professional activity images */}
				<div style={{
					width: '100%',
					height: '200px',
					background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
					position: 'relative',
					overflow: 'hidden'
				}}>
					{!imageError ? (
						<img 
							src={imageUrl} 
							alt={title}
							loading="lazy"
							style={{
								width: '100%',
								height: '100%',
								objectFit: 'cover',
								transition: 'opacity 0.3s ease',
								opacity: imageLoading ? 0.3 : 1
							}}
							onLoad={() => setImageLoading(false)}
							onError={(e) => {
								setImageError(true);
								setImageLoading(false);
								e.target.style.display = 'none';
							}}
						/>
					) : null}
					{imageError && (
						<div style={{
							width: '100%',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
					{imageLoading && !imageError && (
						<div style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'rgba(240, 249, 255, 0.9)',
							zIndex: 1
						}}>
							<div 
								className="image-loading-spinner"
								style={{
									width: '32px',
									height: '32px',
									border: '3px solid #e0f2fe',
									borderTop: '3px solid #3b82f6',
									borderRadius: '50%'
								}}
							></div>
						</div>
					)}
				</div>
				
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
					
					{/* Rating */}
					{rating.count > 0 && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
							<StarRating rating={rating.average} size="small" />
							<span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
								{rating.average.toFixed(1)} ({rating.count})
							</span>
						</div>
					)}
					
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


