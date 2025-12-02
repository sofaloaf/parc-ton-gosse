import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';
import SearchBar from '../components/SearchBar.jsx';
import Filters from '../components/Filters.jsx';
import ActivityCard from '../components/ActivityCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import CardViewCounter from '../components/CardViewCounter.jsx';

export default function Browse() {
	const { locale, t } = useI18n();
	const [activities, setActivities] = useState([]);
	const [ratings, setRatings] = useState({}); // Map of activityId -> {average, count}
	const [params, setParams] = useState({});
	const [viewMode, setViewMode] = useState('cards');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Handle search from search bar
	const handleSearch = (searchQuery) => {
		setParams(prev => {
			const newParams = { ...prev };
			if (searchQuery) {
				newParams.q = searchQuery;
			} else {
				delete newParams.q;
			}
			return newParams;
		});
	};

	// Helper to get user-friendly error message
	const getErrorMessage = (err) => {
		const message = err.message || 'Failed to load activities';
		if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
			return locale === 'fr' 
				? 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
				: 'Unable to connect to server. Please check your internet connection.';
		}
		if (message.includes('Data store not available') || message.includes('not initialized')) {
			return locale === 'fr'
				? 'Le serveur est en cours d\'initialisation. Veuillez réessayer dans un instant.'
				: 'Server is initializing. Please try again in a moment.';
		}
		if (message.includes('timeout')) {
			return locale === 'fr'
				? 'La requête a pris trop de temps. Veuillez réessayer.'
				: 'Request timed out. Please try again.';
		}
		return locale === 'fr'
			? 'Échec du chargement des activités. Veuillez réessayer.'
			: 'Failed to load activities. Please try again.';
	};

	useEffect(() => {
		const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== '' && v != null)).toString();
		setLoading(true);
		setError(null);
		
		// Add retry logic for network failures
		const fetchWithRetry = async (url, retries = 2) => {
			for (let i = 0; i < retries; i++) {
				try {
					return await api(url);
				} catch (err) {
					// Only retry on network errors, not on 4xx/5xx errors
					const isNetworkError = err.message?.includes('Failed to fetch') || 
					                     err.message?.includes('NetworkError');
					
					if (i === retries - 1 || !isNetworkError) {
						throw err;
					}
					
					// Wait before retry (exponential backoff)
					await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
				}
			}
		};
		
		fetchWithRetry(`/activities${qs ? `?${qs}` : ''}`)
			.then((data) => {
			const activitiesList = Array.isArray(data) ? data : [];
			setActivities(activitiesList);
			setError(null);
			setLoading(false);
			console.log(`✅ Loaded ${activitiesList.length} activities`);
			
			// Fetch ratings using batch endpoint (more efficient)
			if (activitiesList.length > 0) {
				// Fetch in background after a delay to not block initial render
				setTimeout(() => {
					const activityIds = activitiesList.slice(0, 50).map(a => a.id);
					api('/reviews/activities/ratings', {
						method: 'POST',
						body: { activityIds }
					})
						.then(ratingsMap => {
							// Filter out ratings with 0 count
							const filtered = {};
							Object.entries(ratingsMap).forEach(([id, rating]) => {
								if (rating.count > 0) {
									filtered[id] = rating;
								}
							});
							if (Object.keys(filtered).length > 0) {
								setRatings(prev => ({ ...prev, ...filtered }));
							}
						})
						.catch(err => {
							// Silent fail - ratings are optional
							if (process.env.NODE_ENV === 'development') {
								console.warn('Failed to fetch ratings (non-critical):', err);
							}
						});
				}, 1000);
			}
			})
			.catch((err) => {
			// Always log errors for debugging
			console.error('❌ Error fetching activities:', {
				message: err.message,
				url: `/activities${qs ? `?${qs}` : ''}`,
				timestamp: new Date().toISOString()
			});
			setActivities([]);
			setError(getErrorMessage(err));
			setLoading(false);
		});
	}, [params, locale]);

	// Separate effect to fetch ratings after activities are loaded (non-blocking)
	useEffect(() => {
		if (activities.length === 0) return;
		
		// Delay rating fetch to ensure activities are displayed first
		const timeoutId = setTimeout(() => {
			const activityIds = activities.slice(0, 50).map(a => a.id);
			api('/reviews/activities/ratings', {
				method: 'POST',
				body: { activityIds }
			})
				.then(ratingsMap => {
					const filtered = {};
					Object.entries(ratingsMap).forEach(([id, rating]) => {
						if (rating.count > 0) {
							filtered[id] = rating;
						}
					});
					if (Object.keys(filtered).length > 0) {
						setRatings(prev => ({ ...prev, ...filtered }));
					}
				})
				.catch(err => {
					// Silent fail - ratings are optional and don't block activities display
					if (process.env.NODE_ENV === 'development') {
						console.warn('Failed to fetch ratings (non-critical):', err);
					}
				});
		}, 2000); // 2 second delay to ensure activities are displayed first
		
		return () => clearTimeout(timeoutId);
	}, [activities.length]); // Only fetch when activities count changes

	return (
		<CardViewCounter>
			{({ onCardView }) => (
				<div style={{ 
					minHeight: '100vh',
					background: '#ffffff'
				}}>
					{error && (
						<div style={{
							padding: 16,
							background: '#fee2e2',
							color: '#991b1b',
							borderRadius: 8,
							border: '1px solid #fca5a5',
							margin: '20px',
							maxWidth: '1200px',
							marginLeft: 'auto',
							marginRight: 'auto'
						}}>
							<strong>{locale === 'fr' ? 'Erreur:' : 'Error:'}</strong> {error}
						</div>
					)}
					
					{loading && activities.length === 0 ? (
						<div style={{ padding: '80px 20px', textAlign: 'center' }}>
							<LoadingSpinner message={locale === 'fr' ? 'Chargement des activités...' : 'Loading activities...'} />
						</div>
					) : (
						<>
							{/* Hero Section with Search - Inspired by Withlocals/GetYourGuide */}
							<div style={{
								background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
								padding: '60px 20px 80px',
								position: 'relative',
								overflow: 'hidden'
							}}>
								{/* Decorative background elements */}
								<div style={{
									position: 'absolute',
									top: -50,
									right: -50,
									width: 300,
									height: 300,
									borderRadius: '50%',
									background: 'rgba(255, 255, 255, 0.1)',
									opacity: 0.5
								}} />
								<div style={{
									position: 'absolute',
									bottom: -100,
									left: -100,
									width: 400,
									height: 400,
									borderRadius: '50%',
									background: 'rgba(255, 255, 255, 0.1)',
									opacity: 0.3
								}} />
								
								<div style={{
									maxWidth: '1200px',
									margin: '0 auto',
									position: 'relative',
									zIndex: 1
								}}>
									<h1 style={{
										fontSize: '48px',
										fontWeight: 700,
										color: 'white',
										margin: '0 0 16px 0',
										lineHeight: 1.2,
										textAlign: 'center'
									}}>
										{locale === 'fr' 
											? 'Découvrez les meilleures activités pour enfants à Paris'
											: 'Discover the best activities for kids in Paris'}
									</h1>
									<p style={{
										fontSize: '20px',
										color: 'rgba(255, 255, 255, 0.9)',
										margin: '0 0 40px 0',
										textAlign: 'center',
										fontWeight: 400
									}}>
										{locale === 'fr'
											? 'Trouvez des expériences uniques et mémorables pour toute la famille'
											: 'Find unique and memorable experiences for the whole family'}
									</p>
									
									{/* Search Bar - Prominent */}
									<div style={{
										background: 'white',
										borderRadius: '12px',
										padding: '8px',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
										maxWidth: '700px',
										margin: '0 auto 24px'
									}}>
										<SearchBar 
											onSearch={handleSearch} 
											onSelect={(a) => navigate(`/activity/${a.id}`)}
											initialValue={params.q || ''}
										/>
									</div>
									
									{/* Filters - Compact */}
									<div style={{
										background: 'rgba(255, 255, 255, 0.95)',
										borderRadius: '12px',
										padding: '16px',
										boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
										maxWidth: '900px',
										margin: '0 auto'
									}}>
										<Filters onApply={setParams} params={params} />
									</div>
								</div>
							</div>

							{/* Main Content */}
							<div style={{
								maxWidth: '1200px',
								margin: '0 auto',
								padding: '40px 20px'
							}}>
								{/* Results Header */}
								<div style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									marginBottom: '32px',
									flexWrap: 'wrap',
									gap: '16px'
								}}>
									<h2 style={{
										margin: 0,
										fontSize: '28px',
										fontWeight: 700,
										color: '#1e293b'
									}}>
										{activities.length} {activities.length === 1 
											? (locale === 'fr' ? 'activité' : 'activity')
											: (locale === 'fr' ? 'activités' : 'activities')}
									</h2>
								</div>

								{/* Cards Grid - Modern Layout */}
								{viewMode === 'cards' && (
									<>
										{activities.length === 0 ? (
											<div style={{
												textAlign: 'center',
												padding: '80px 20px',
												background: '#f8fafc',
												borderRadius: 16,
												border: '1px solid #e2e8f0'
											}}>
												<div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
												<h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: 24, fontWeight: 600 }}>
													{locale === 'fr' ? 'Aucune activité trouvée' : 'No activities found'}
												</h3>
												<p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>
													{locale === 'fr' 
														? 'Essayez d\'ajuster vos filtres ou votre recherche pour trouver plus de résultats.'
														: 'Try adjusting your filters or search to find more results.'}
												</p>
												<button
													onClick={() => {
														setParams({});
														handleSearch('');
													}}
													style={{
														padding: '12px 24px',
														background: '#3b82f6',
														color: 'white',
														border: 'none',
														borderRadius: 8,
														cursor: 'pointer',
														fontSize: 16,
														fontWeight: 600,
														transition: 'all 0.2s ease'
													}}
													onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
													onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
												>
													{locale === 'fr' ? 'Réinitialiser les filtres' : 'Clear Filters'}
												</button>
											</div>
										) : (
											<div style={{ 
												display: 'grid', 
												gap: '24px', 
												gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))'
											}}>
												{activities.map(a => (
													<ActivityCard 
														key={a.id} 
														activity={a} 
														locale={locale}
														rating={ratings[a.id] || { average: 0, count: 0 }}
														onView={() => onCardView && onCardView(a.id)}
													/>
												))}
											</div>
										)}
									</>
								)}
							</div>
						</>
					)}
				</div>
			)}
		</CardViewCounter>
	);
}
