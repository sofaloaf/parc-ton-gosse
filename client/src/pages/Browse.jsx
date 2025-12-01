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
		
		fetchWithRetry(`/activities${qs ? `?${qs}` : ''}`).then((data) => {
			setActivities(Array.isArray(data) ? data : []);
			setError(null);
			console.log(`✅ Loaded ${data.length} activities`);
		}).catch((err) => {
			// Always log errors for debugging
			console.error('❌ Error fetching activities:', {
				message: err.message,
				url: `/activities${qs ? `?${qs}` : ''}`,
				timestamp: new Date().toISOString()
			});
			setActivities([]);
			setError(getErrorMessage(err));
		}).finally(() => {
			setLoading(false);
		});
	}, [params, locale]);



	return (
		<CardViewCounter>
			{({ onCardView }) => (
					<>
						<div style={{ 
				minHeight: '100vh',
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 15%, #f093fb 30%, #f5576c 45%, #4facfe 60%, #00f2fe 100%)',
				backgroundSize: '400% 400%',
				animation: 'gradientShift 15s ease infinite',
				position: 'relative'
			}}>
				{/* Add keyframes for animated gradient */}
				<style>{`
					@keyframes gradientShift {
						0% { background-position: 0% 50%; }
						50% { background-position: 100% 50%; }
						100% { background-position: 0% 50%; }
					}
					@media (max-width: 768px) {
						.browse-search-filters {
							width: 100% !important;
							max-width: 100% !important;
						}
					}
				`}</style>
				<div style={{ 
					background: 'rgba(255, 255, 255, 0.95)',
					backdropFilter: 'blur(10px)',
					minHeight: '100vh',
					padding: '20px',
					position: 'relative',
					zIndex: 1
				}}>
					<div style={{ display: 'grid', gap: 20 }}>
					{error && (
						<div style={{
							padding: 16,
							background: '#fee2e2',
							color: '#991b1b',
							borderRadius: 8,
							border: '1px solid #fca5a5'
						}}>
							<strong>{locale === 'fr' ? 'Erreur:' : 'Error:'}</strong> {error}
						</div>
					)}
					{loading && activities.length === 0 ? (
						<LoadingSpinner message={locale === 'fr' ? 'Chargement des activités...' : 'Loading activities...'} />
					) : (
						<>
					{/* Sticky Search and Filters - Full Width */}
					<div className="browse-search-filters" style={{ 
						display: 'flex',
						flexDirection: 'column',
						gap: 12,
						position: 'sticky',
						top: 0,
						background: 'rgba(255, 255, 255, 0.98)',
						backdropFilter: 'blur(20px)',
						padding: '20px',
						zIndex: 100,
						borderRadius: '16px',
						border: '1px solid rgba(255, 255, 255, 0.3)',
						boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
						marginBottom: 12,
						width: '100%',
						maxWidth: '100%'
					}}>
						<SearchBar 
							onSearch={handleSearch} 
							onSelect={(a) => navigate(`/activity/${a.id}`)}
							initialValue={params.q || ''}
						/>
						<Filters onApply={setParams} params={params} />
					</div>

					{/* Activity Count */}
					<div style={{ 
						display: 'flex', 
						justifyContent: 'flex-start', 
						alignItems: 'center',
						gap: 16,
						position: 'sticky',
						top: 0,
						background: 'rgba(255, 255, 255, 0.98)',
						backdropFilter: 'blur(20px)',
						padding: '16px 20px',
						zIndex: 99,
						borderRadius: '12px',
						border: '1px solid rgba(255, 255, 255, 0.3)',
						boxShadow: '0 4px 24px rgba(102, 126, 234, 0.1)',
						width: '100%',
						marginTop: '12px',
						marginBottom: '20px'
					}}>
						<h2 style={{ margin: 0 }}>
							{activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
						</h2>
					</div>

			{/* Cards View - ProductHunt style grid */}
			{viewMode === 'cards' && (
				<>
					{activities.length === 0 ? (
						<div style={{
							textAlign: 'center',
							padding: '60px 20px',
							background: '#f8fafc',
							borderRadius: 12,
							border: '1px solid #e0e7f0',
							maxWidth: '600px',
							margin: '0 auto'
						}}>
							<div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
							<h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: 20, fontWeight: 600 }}>
								{locale === 'fr' ? 'Aucune activité trouvée' : 'No activities found'}
							</h3>
							<p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
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
									padding: '10px 20px',
									background: '#3b82f6',
									color: 'white',
									border: 'none',
									borderRadius: 8,
									cursor: 'pointer',
									fontSize: 14,
									fontWeight: 500
								}}
							>
								{locale === 'fr' ? 'Réinitialiser les filtres' : 'Clear Filters'}
							</button>
						</div>
					) : (
						<div style={{ 
							display: 'grid', 
							gap: '20px', 
							gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
							padding: '8px 0'
						}}>
							{activities.map(a => (
								<ActivityCard 
									key={a.id} 
									activity={a} 
									locale={locale}
									onView={() => onCardView && onCardView(a.id)}
								/>
							))}
						</div>
					)}
				</>
			)}


					</>
					)}
					</div>
				</div>
			</div>
			</>
			)}
		</CardViewCounter>
	);
}
