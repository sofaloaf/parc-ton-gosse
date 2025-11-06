import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';
import SearchBar from '../components/SearchBar.jsx';
import Filters from '../components/Filters.jsx';
import ActivityCard from '../components/ActivityCard.jsx';
import DataTable from '../components/DataTable.jsx';
import MapViewSimple from '../components/MapViewSimple.jsx';
import TrialGate from '../components/TrialGate.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Browse() {
	const { locale, t } = useI18n();
	const [activities, setActivities] = useState([]);
	const [params, setParams] = useState({});
	const [viewMode, setViewMode] = useState('table');
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

	useEffect(() => {
		const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== '' && v != null)).toString();
		setLoading(true);
		setError(null);
		api(`/activities${qs ? `?${qs}` : ''}`).then((data) => {
			setActivities(data);
			setError(null);
		}).catch((err) => {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error fetching activities:', err);
			}
			setActivities([]);
			setError(err.message || 'Failed to load activities');
		}).finally(() => {
			setLoading(false);
		});
	}, [params]);

	// If viewMode is set to 'map' (hidden), fallback to 'table'
	useEffect(() => {
		if (viewMode === 'map') {
			setViewMode('table');
		}
	}, [viewMode]);

	return (
		<TrialGate requireAuth={false}>
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
					{/* Sticky Search and Filters - Left Half */}
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
						maxWidth: '50%',
						alignSelf: 'flex-start'
					}}>
						<SearchBar 
							onSearch={handleSearch} 
							onSelect={(a) => navigate(`/activity/${a.id}`)}
							initialValue={params.q || ''}
						/>
						<Filters onApply={setParams} params={params} />
					</div>

					{/* Sticky View Toggle */}
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
				<div style={{ display: 'flex', gap: 8 }}>
					<button
						onClick={() => setViewMode('cards')}
						aria-label={locale === 'fr' ? 'Vue cartes' : 'Cards view'}
						aria-pressed={viewMode === 'cards'}
						style={{
							padding: '10px 20px',
							border: viewMode === 'cards' ? 'none' : '1px solid #cbd5e1',
							borderRadius: '8px',
							background: viewMode === 'cards' ? '#3b82f6' : 'white',
							color: viewMode === 'cards' ? 'white' : '#475569',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: viewMode === 'cards' ? 600 : 500,
							transition: 'all 0.2s ease',
							boxShadow: viewMode === 'cards' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
						}}
						onMouseEnter={(e) => {
							if (viewMode !== 'cards') {
								e.currentTarget.style.background = '#eff6ff';
								e.currentTarget.style.borderColor = '#3b82f6';
							}
						}}
						onMouseLeave={(e) => {
							if (viewMode !== 'cards') {
								e.currentTarget.style.background = 'white';
								e.currentTarget.style.borderColor = '#cbd5e1';
							}
						}}
					>
						🔲 {t.cards || 'Cards'}
					</button>
					<button
						onClick={() => setViewMode('table')}
						aria-label={locale === 'fr' ? 'Vue tableau' : 'Table view'}
						aria-pressed={viewMode === 'table'}
						style={{
							padding: '10px 20px',
							border: viewMode === 'table' ? 'none' : '1px solid #cbd5e1',
							borderRadius: '8px',
							background: viewMode === 'table' ? '#3b82f6' : 'white',
							color: viewMode === 'table' ? 'white' : '#475569',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: viewMode === 'table' ? 600 : 500,
							transition: 'all 0.2s ease',
							boxShadow: viewMode === 'table' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
						}}
						onMouseEnter={(e) => {
							if (viewMode !== 'table') {
								e.currentTarget.style.background = '#eff6ff';
								e.currentTarget.style.borderColor = '#3b82f6';
							}
						}}
						onMouseLeave={(e) => {
							if (viewMode !== 'table') {
								e.currentTarget.style.background = 'white';
								e.currentTarget.style.borderColor = '#cbd5e1';
							}
						}}
					>
						📊 {t.table || 'Table'}
					</button>
					{/* Map View Button - Hidden but kept for future re-enablement */}
					{false && (
						<button
							onClick={() => setViewMode('map')}
							style={{
								padding: '10px 20px',
								border: viewMode === 'map' ? 'none' : '1px solid #cbd5e1',
								borderRadius: '8px',
								background: viewMode === 'map' ? '#3b82f6' : 'white',
								color: viewMode === 'map' ? 'white' : '#475569',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: viewMode === 'map' ? 600 : 500,
								transition: 'all 0.2s ease',
								boxShadow: viewMode === 'map' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
							}}
							onMouseEnter={(e) => {
								if (viewMode !== 'map') {
									e.currentTarget.style.background = '#eff6ff';
									e.currentTarget.style.borderColor = '#3b82f6';
								}
							}}
							onMouseLeave={(e) => {
								if (viewMode !== 'map') {
									e.currentTarget.style.background = 'white';
									e.currentTarget.style.borderColor = '#cbd5e1';
								}
							}}
						>
							🗺️ {t.map || 'Map'}
						</button>
					)}
				</div>
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
							{activities.map(a => <ActivityCard key={a.id} activity={a} locale={locale} />)}
						</div>
					)}
				</>
			)}

			{/* Table View */}
			{viewMode === 'table' && (
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
						<DataTable activities={activities} locale={locale} />
					)}
				</>
			)}

			{/* Map View - Hidden but kept for future re-enablement */}
			{false && viewMode === 'map' && (
				<MapViewSimple activities={activities} locale={locale} />
						)}
					</>
					)}
					</div>
				</div>
			</div>
		</TrialGate>
	);
}
