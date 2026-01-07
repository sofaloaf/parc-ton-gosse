import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { translateCategories } from '../utils/categoryTranslations.js';
import { formatTitle } from '../utils/textFormatting.js';
import StarRating from '../components/StarRating.jsx';

export default function ActivityDetail() {
	const { id } = useParams();
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const [activity, setActivity] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [rating, setRating] = useState({ average: 0, count: 0 });
	const [userRating, setUserRating] = useState(null);
	const [user, setUser] = useState(null);
	const [submittingRating, setSubmittingRating] = useState(false);

	// Check if user is logged in
	useEffect(() => {
		api('/me')
			.then(data => setUser(data.user))
			.catch(() => setUser(null));
	}, []);
	
	// Load activity and ratings
	useEffect(() => {
		setLoading(true);
		setError(null);
		
		// Set a timeout to prevent infinite loading
		const timeoutId = setTimeout(() => {
			setError(locale === 'fr' ? 'La requête a pris trop de temps. Veuillez réessayer.' : 'Request timed out. Please try again.');
			setLoading(false);
		}, 30000); // 30 second timeout
		
		Promise.all([
			api(`/activities/${id}`).catch(err => { 
				clearTimeout(timeoutId);
				throw err; 
			}),
			api(`/reviews/activity/${id}/rating`).catch(() => ({ average: 0, count: 0 })),
			api('/me').then(data => data.user).catch(() => null)
		])
			.then(([activityData, ratingData, userData]) => {
				clearTimeout(timeoutId);
				setActivity(activityData);
				setRating(ratingData || { average: 0, count: 0 });
				setUser(userData);
				
				// If user is logged in, check if they've already rated
				if (userData) {
					api(`/reviews/activity/${id}/user`)
						.then(review => setUserRating(review?.rating || null))
						.catch(() => setUserRating(null));
				}
			})
			.catch((err) => {
				clearTimeout(timeoutId);
				console.error('Error loading activity:', err);
				setError(err.message || 'Failed to load activity');
			})
			.finally(() => {
				clearTimeout(timeoutId);
				setLoading(false);
			});
		
		return () => clearTimeout(timeoutId);
	}, [id]);
	
	// Reload rating when user rating changes
	useEffect(() => {
		if (user) {
			api(`/reviews/activity/${id}/user`)
				.then(review => setUserRating(review.rating))
				.catch(() => setUserRating(null));
		}
		api(`/reviews/activity/${id}/rating`)
			.then(data => setRating(data))
			.catch(() => setRating({ average: 0, count: 0 }));
	}, [id, user, submittingRating]);
	
	const handleRate = async (newRating) => {
		if (!user) {
			// Redirect to login
			navigate('/profile');
			return;
		}
		
		setSubmittingRating(true);
		try {
			await api('/reviews', {
				method: 'POST',
				body: {
					activityId: id,
					rating: newRating,
					comment: ''
				}
			});
			setUserRating(newRating);
			// Reload rating stats
			const ratingData = await api(`/reviews/activity/${id}/rating`);
			setRating(ratingData);
		} catch (err) {
			console.error('Failed to submit rating:', err);
			alert(locale === 'fr' 
				? 'Impossible d\'enregistrer votre note. Veuillez réessayer.'
				: 'Failed to save rating. Please try again.');
		} finally {
			setSubmittingRating(false);
		}
	};

	if (loading) {
		return <LoadingSpinner message={locale === 'fr' ? 'Chargement...' : 'Loading...'} />;
	}

	if (error) {
		return (
			<div style={{ padding: 20, textAlign: 'center' }}>
				<div style={{
					padding: 16,
					background: '#fee2e2',
					color: '#991b1b',
					borderRadius: 8,
					display: 'inline-block'
				}}>
					<strong>{locale === 'fr' ? 'Erreur:' : 'Error:'}</strong> {error}
				</div>
				<div style={{ marginTop: 16 }}>
					<Link to="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>
						{locale === 'fr' ? '← Retour à la liste' : '← Back to list'}
					</Link>
				</div>
			</div>
		);
	}

	if (!activity) return null;
	const title = formatTitle(activity.title, locale);
	const desc = activity.description?.[locale] || activity.description?.en || activity.description?.fr;
	
	// Helper function to check if value is yes/no and return icon
	const getYesNoIcon = (value) => {
		if (typeof value === 'string') {
			const normalized = value.trim().toLowerCase();
			if (normalized === 'yes' || normalized === 'oui' || normalized === 'true' || normalized === '1' || normalized === 'y') {
				return { isYesNo: true, icon: '✓', color: '#10b981' };
			} else if (normalized === 'no' || normalized === 'non' || normalized === 'false' || normalized === '0' || normalized === 'n') {
				return { isYesNo: true, icon: '✗', color: '#ef4444' };
			}
		} else if (typeof value === 'boolean') {
			return { isYesNo: true, icon: value ? '✓' : '✗', color: value ? '#10b981' : '#ef4444' };
		} else if (typeof value === 'number' && (value === 1 || value === 0)) {
			return { isYesNo: true, icon: value === 1 ? '✓' : '✗', color: value === 1 ? '#10b981' : '#ef4444' };
		}
		return { isYesNo: false };
	};
	
	// Helper function to format values
	const formatValue = (field, value) => {
		if (!value && value !== 0 && value !== false) return t.na;
		
		// Check for yes/no values first
		const yesNo = getYesNoIcon(value);
		if (yesNo.isYesNo) {
			return (
				<span style={{
					fontSize: '18px',
					color: yesNo.color,
					fontWeight: 'bold',
					display: 'inline-block'
				}}>
					{yesNo.icon}
				</span>
			);
		}
		
		if (Array.isArray(value)) {
			if (value.length === 0) return t.na;
			return value.join(', ');
		}
		return String(value);
	};
	
	return (
		<div style={{ display: 'grid', gap: 20, maxWidth: '900px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
				<h1 style={{ margin: 0, flex: 1 }}>{title}</h1>
				{rating.count > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<StarRating rating={rating.average} size="large" />
							<span style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
								{rating.average.toFixed(1)}
							</span>
						</div>
						<span style={{ fontSize: '14px', color: '#64748b' }}>
							{rating.count} {rating.count === 1 
								? (locale === 'fr' ? 'avis' : 'review')
								: (locale === 'fr' ? 'avis' : 'reviews')}
						</span>
					</div>
				)}
			</div>
			
			{/* User Rating Section */}
			{user && (
				<div style={{
					padding: '20px',
					background: '#f8fafc',
					borderRadius: '12px',
					border: '1px solid #e2e8f0'
				}}>
					<h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
						{locale === 'fr' ? 'Votre note' : 'Your Rating'}
					</h3>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
						<StarRating 
							rating={userRating || 0} 
							onRate={handleRate}
							interactive={true}
							size="large"
						/>
						{userRating && (
							<span style={{ fontSize: '14px', color: '#64748b' }}>
								{locale === 'fr' ? 'Vous avez noté' : 'You rated'} {userRating} {locale === 'fr' ? 'étoiles' : 'stars'}
							</span>
						)}
						{submittingRating && (
							<span style={{ fontSize: '14px', color: '#64748b' }}>
								{locale === 'fr' ? 'Enregistrement...' : 'Saving...'}
							</span>
						)}
					</div>
				</div>
			)}
			
			{!user && (
				<div style={{
					padding: '16px',
					background: '#eff6ff',
					borderRadius: '12px',
					border: '1px solid #bfdbfe',
					textAlign: 'center'
				}}>
					<p style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '14px' }}>
						{locale === 'fr' 
							? 'Connectez-vous pour noter cette activité'
							: 'Sign in to rate this activity'}
					</p>
					<Link 
						to="/profile"
						style={{
							display: 'inline-block',
							padding: '8px 16px',
							background: '#3b82f6',
							color: 'white',
							textDecoration: 'none',
							borderRadius: '8px',
							fontSize: '14px',
							fontWeight: 500
						}}
					>
						{locale === 'fr' ? 'Se connecter' : 'Sign In'}
					</Link>
				</div>
			)}
			
			{/* Images */}
			{Array.isArray(activity.images) && activity.images.length > 0 && (
				<div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
					{activity.images.map((src, i) => <img key={i} src={src} alt="" style={{ height: 200, borderRadius: 6 }} />)}
				</div>
			)}
			
			{/* Detailed Information */}
			<div style={{ display: 'grid', gap: 16 }}>
				{desc && (
					<div>
						<h3 style={{ marginBottom: 8 }}>{t.description}</h3>
						<p style={{ lineHeight: 1.6 }}>{desc}</p>
					</div>
				)}
				
				{/* Two-column grid for details */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
					{/* Activity Type */}
					{(activity.type_d_activit_ || activity.activityType) && (
						<div>
							<strong>{t.typeActivite}:</strong> {formatValue('type_d_activit_', activity.type_d_activit_ || activity.activityType)}
						</div>
					)}
					
					{/* Categories */}
					{activity.categories && Array.isArray(activity.categories) && activity.categories.length > 0 && (
						<div>
							<strong>{t.categories}:</strong> {formatValue('categories', translateCategories(activity.categories, locale))}
						</div>
					)}
					
					{/* Age Range */}
					{(activity.ageMin || activity.ageMax) && (
						<div>
							<strong>{t.age}:</strong> {activity.ageMin || 0}-{activity.ageMax || 99} {locale === 'fr' ? 'ans' : 'years'}
						</div>
					)}
					
					{/* Price */}
					{activity.price?.amount && (
						<div>
							<strong>{t.price}:</strong> {activity.price.amount} {activity.price.currency?.toUpperCase() || 'EUR'}
						</div>
					)}
					
					{/* Neighborhood */}
					{activity.neighborhood && (
						<div>
							<strong>{t.neighborhood}:</strong> {formatValue('neighborhood', activity.neighborhood)}
						</div>
					)}
					
					{/* Adults */}
					{activity.adults !== undefined && (
						<div>
							<strong>{t.adultes}:</strong> {formatValue('adults', activity.adults)}
						</div>
					)}
				</div>
				
				{/* Availability Days */}
				{activity.disponibiliteJours && (
					<div>
						<h3 style={{ marginBottom: 8 }}>{t.disponibiliteJours}</h3>
						<ul style={{ marginLeft: 20 }}>
							{typeof activity.disponibiliteJours === 'string' && activity.disponibiliteJours.includes(',') 
								? activity.disponibiliteJours.split(',').map((day, idx) => (
									<li key={idx}>{day.trim()}</li>
								))
								: <li>{formatValue('disponibiliteJours', activity.disponibiliteJours)}</li>
							}
						</ul>
					</div>
				)}
				
				{/* Availability Dates */}
				{activity.disponibiliteDates && (
					<div>
						<h3 style={{ marginBottom: 8 }}>{t.disponibiliteDates}</h3>
						<p>{formatValue('disponibiliteDates', activity.disponibiliteDates)}</p>
					</div>
				)}
				
				{/* Addresses */}
				{(activity.addresses || activity.addresse) && (() => {
					const addressStr = activity.addresses || activity.addresse;
					// Parse new format: "Location: Address - Location: Address"
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
					return (
						<div>
							<h3 style={{ marginBottom: 8 }}>{t.addresses}</h3>
							<ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc' }}>
								{addresses.map((addr, idx) => (
									<li key={idx} style={{ marginBottom: 8 }}>
										{addr.location && <strong style={{ color: '#007bff' }}>{addr.location}:</strong>} {addr.address}
									</li>
								))}
							</ul>
						</div>
					);
				})()}
				
				{/* Links */}
				{(activity.websiteLink || activity.registrationLink) && (
					<div>
						<h3 style={{ marginBottom: 8 }}>Links</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{activity.websiteLink && (
								<div>
									<strong>{t.lienSite}:</strong>{' '}
									<a href={activity.websiteLink.startsWith('http') ? activity.websiteLink : `https://${activity.websiteLink}`} 
									   target="_blank" 
									   rel="noopener noreferrer" 
									   style={{ color: '#007bff', textDecoration: 'none' }}>
										🔗 {activity.websiteLink}
									</a>
								</div>
							)}
							{activity.registrationLink && (
								<div>
									<strong>{t.lienEnregistrement}:</strong>{' '}
									<a href={activity.registrationLink.startsWith('http') ? activity.registrationLink : `https://${activity.registrationLink}`} 
									   target="_blank" 
									   rel="noopener noreferrer" 
									   style={{ color: '#007bff', textDecoration: 'none' }}>
										🔗 {activity.registrationLink}
									</a>
								</div>
							)}
						</div>
					</div>
				)}
				
				{/* Contact Info */}
				{((activity.contact__email_ || activity.contactEmail) || (activity.contact__t_l_phone_ || activity.contactPhone)) && (
					<div>
						<h3 style={{ marginBottom: 8 }}>{locale === 'fr' ? 'Contact' : 'Contact'}</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{(activity.contact__email_ || activity.contactEmail) && (
								<div>
									<strong>{t.contactEmail}:</strong>{' '}
									<a href={`mailto:${activity.contact__email_ || activity.contactEmail}`} 
									   style={{ color: '#28a745', textDecoration: 'none' }}>
										📧 {activity.contact__email_ || activity.contactEmail}
									</a>
								</div>
							)}
							{(activity.contact__t_l_phone_ || activity.contactPhone) && (
								<div>
									<strong>{t.contactPhone}:</strong>{' '}
									<a href={`tel:${(activity.contact__t_l_phone_ || activity.contactPhone).replace(/[^\d+]/g, '')}`} 
									   style={{ color: '#17a2b8', textDecoration: 'none' }}>
										📞 {activity.contact__t_l_phone_ || activity.contactPhone}
									</a>
								</div>
							)}
						</div>
					</div>
				)}
				
				{/* Additional Notes */}
				{(activity.notes_specifiques_additionelles || activity.additionalNotes) && (
					<div>
						<h3 style={{ marginBottom: 8 }}>{t.additionalNotes}</h3>
						<div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
							{formatValue('additionalNotes', activity.notes_specifiques_additionelles || activity.additionalNotes)}
						</div>
					</div>
				)}
			</div>
			
			{/* Actions */}
			<div style={{ display: 'flex', gap: 12 }}>
				<Link to={`/register/${activity.id}`} style={{
					padding: '12px 24px',
					background: '#007bff',
					color: 'white',
					textDecoration: 'none',
					borderRadius: 6
				}}>
					{t.book}
				</Link>
				<Link to="/" style={{
					padding: '12px 24px',
					background: '#6c757d',
					color: 'white',
					textDecoration: 'none',
					borderRadius: 6
				}}>
					{t.locale === 'fr' ? 'Retour' : 'Back'}
				</Link>
			</div>
		</div>
	);
}
