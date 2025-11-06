import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';

export default function MapViewSimple({ activities, locale }) {
	const mapContainerRef = useRef(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapInstance, setMapInstance] = useState(null);
	const navigate = useNavigate();
	const { t } = useI18n();

	// Removed debug log for production

	useEffect(() => {
		const script = document.createElement('script');
		script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
		script.onload = () => {
			setMapLoaded(true);
		};
		document.body.appendChild(script);

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		document.head.appendChild(link);

		return () => {
			document.body.removeChild(script);
			document.head.removeChild(link);
		};
	}, []);

	useEffect(() => {
		if (!mapLoaded || !window.L || !mapContainerRef.current) return;

		// Removed debug log for production

		// Fix Leaflet marker icons issue
		delete window.L.Icon.Default.prototype._getIconUrl;
		window.L.Icon.Default.mergeOptions({
			iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
			iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
			shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
		});

		// Initialize map
		const map = window.L.map(mapContainerRef.current).setView([48.8566, 2.3522], 12);

		window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(map);

		setMapInstance(map);

		return () => {
			if (map) map.remove();
		};
	}, [mapLoaded]);

	useEffect(() => {
		if (!mapInstance || !activities.length) return;

		// Removed debug log for production

		const markers = [];

		// Process activities and geocode addresses
		const processActivities = async () => {
			for (const activity of activities) {
				// Prefer 'addresses' over 'addresse' for new data structure
				const addressStr = activity.addresses || activity.addresse || activity.address || '';
				if (!addressStr) {
					// Removed debug log for production
					continue;
				}

				// Removed debug log for production

				// Parse new format: "Location: Address - Location: Address"
				const addresses = parseAddresses(addressStr);
				// Removed debug log for production

				const title = activity.title?.[locale] || activity.title?.en || activity.title?.fr || activity.title || 'Activity';
				const description = activity.description?.[locale] || activity.description?.en || activity.description?.fr || '';

				for (let index = 0; index < addresses.length; index++) {
					const addrObj = addresses[index];
					const addr = addrObj.address || addrObj;
					let coords = null;

					// Use local geocoding for now (fast and free)
					// Google Geocoding can be enabled later if needed
					coords = geocodeAddress(typeof addr === 'string' ? addr : addrObj.address, activity.neighborhood);
					// Removed debug log for production

					if (coords && coords[0] && coords[1]) {
						const marker = window.L.marker(coords).addTo(mapInstance);

						const displayAddr = typeof addr === 'string' ? addr : addrObj.address;
						const locationName = addrObj.location || '';
						const popupContent = `
							<div style="min-width: 200px;">
								<h3 style="margin: 0 0 8px 0; font-size: 16px;">${title}${addresses.length > 1 ? ` (${locationName || `#${index + 1}`})` : ''}</h3>
								${description ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${description.substring(0, 100)}...</p>` : ''}
								${locationName ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #007bff; font-weight: 600;">${locationName}</p>` : ''}
								<p style="margin: 0 0 8px 0; font-size: 12px; color: #888;">${displayAddr.substring(0, 80)}${displayAddr.length > 80 ? '...' : ''}</p>
								<button onclick="window.location.href='#/activity/${activity.id}'" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">View Details</button>
							</div>
						`;

						marker.bindPopup(popupContent);
						marker.on('click', () => {
							// Removed debug log for production
							navigate(`/activity/${activity.id}`);
						});

						markers.push(marker);
					}
				}
			}

			// Removed debug log for production

			if (markers.length > 0) {
				const bounds = window.L.latLngBounds(markers.map(m => m.getLatLng()));
				mapInstance.fitBounds(bounds, { padding: [50, 50] });
				// Removed debug log for production
			}
		};

		processActivities();

		return () => {
			markers.forEach(marker => marker.remove());
		};
	}, [mapInstance, activities, locale, navigate]);

	function parseAddresses(addressStr) {
		if (!addressStr) return [];
		
		// New format: "Location: Address - Location: Address"
		if (addressStr.includes(' - ') || addressStr.includes(':')) {
			const parts = addressStr.split(' - ').map(p => p.trim().replace(/^\s*-\s*|\s*-\s*$/g, '')).filter(p => p);
			return parts.map(part => {
				const colonIndex = part.indexOf(':');
				if (colonIndex > 0) {
					const locationName = part.substring(0, colonIndex).trim();
					const address = part.substring(colonIndex + 1).trim().replace(/^\s*-\s*|\s*-\s*$/g, '');
					return { location: locationName, address: address };
				}
				return { location: '', address: part.replace(/^\s*-\s*|\s*-\s*$/g, '') };
			});
		}
		
		// Old format fallback: newline or comma separated
		const separator = addressStr.includes('\n') ? '\n' : ',';
		return addressStr.split(separator).map(line => ({
			location: '',
			address: line.trim().replace(/^\s*-\s*|\s*-\s*$/g, '')
		})).filter(item => item.address.length > 0);
	}
	
	function splitAddresses(addressStr) {
		// Legacy function for backward compatibility
		const parsed = parseAddresses(addressStr);
		return parsed.map(item => item.address);
	}

	function geocodeAddress(address, neighborhood) {
		const neighborhoods = {
			'1er': [48.8606, 2.3376], '2e': [48.8698, 2.3411], '3e': [48.8630, 2.3628],
			'4e': [48.8546, 2.3522], '5e': [48.8449, 2.3437], '6e': [48.8506, 2.3376],
			'7e': [48.8566, 2.3192], '8e': [48.8708, 2.3188], '9e': [48.8759, 2.3437],
			'10e': [48.8729, 2.3628], '11e': [48.8630, 2.3706], '12e': [48.8449, 2.3706],
			'13e': [48.8333, 2.3561], '14e': [48.8333, 2.3266], '15e': [48.8422, 2.2995],
			'16e': [48.8616, 2.2844], '17e': [48.8891, 2.3192], '18e': [48.8931, 2.3475],
			'19e': [48.8827, 2.3727], '20e': [48.8616, 2.3988]
		};

		// Paris postal codes mapping (75001-75020)
		const postalCodes = {
			'75001': neighborhoods['1er'], '75002': neighborhoods['2e'],
			'75003': neighborhoods['3e'], '75004': neighborhoods['4e'],
			'75005': neighborhoods['5e'], '75006': neighborhoods['6e'],
			'75007': neighborhoods['7e'], '75008': neighborhoods['8e'],
			'75009': neighborhoods['9e'], '75010': neighborhoods['10e'],
			'75011': neighborhoods['11e'], '75012': neighborhoods['12e'],
			'75013': neighborhoods['13e'], '75014': neighborhoods['14e'],
			'75015': neighborhoods['15e'], '75016': neighborhoods['16e'],
			'75017': neighborhoods['17e'], '75018': neighborhoods['18e'],
			'75019': neighborhoods['19e'], '75020': neighborhoods['20e']
		};

		// Known Paris locations (extended list to match backend)
		const knownLocations = {
			'Belleville': neighborhoods['19e'], 'Menilmontant': neighborhoods['20e'],
			'Bidassoa': neighborhoods['20e'], 'Orteaux': neighborhoods['20e'],
			'Nation': neighborhoods['12e'], 'Roquepine': neighborhoods['8e'],
			'Jussieu': neighborhoods['5e'], 'Luxembourg': neighborhoods['6e'],
			'Rasselins': neighborhoods['20e'], 'Rigoles': neighborhoods['20e'],
			'Gambetta': neighborhoods['20e'], 'Couronnes': neighborhoods['20e'],
			'Davout': neighborhoods['20e'], 'Pelleport': neighborhoods['20e'],
			'Maraichers': neighborhoods['20e'], 'Delgrès': neighborhoods['20e'],
			'Dénoyez': neighborhoods['20e'], 'Déjerine': neighborhoods['20e'],
			'Nakache': neighborhoods['20e'], 'Charonne': neighborhoods['11e'],
			'CHARONNE': neighborhoods['11e'], 'Planchat': neighborhoods['11e'],
			'Vercors': neighborhoods['12e'], 'Ramus': neighborhoods['20e'],
			'Lumiére': neighborhoods['20e'], 'Lumière': neighborhoods['20e'],
			'Louis Ganne': neighborhoods['20e'], 'Frapié': neighborhoods['20e'],
			'Boyer': neighborhoods['20e']
		};

		// Use neighborhood directly if provided
		if (neighborhood && neighborhoods[neighborhood]) {
			return neighborhoods[neighborhood];
		}

		// Try postal code first (most specific)
		for (const [code, coords] of Object.entries(postalCodes)) {
			if (address.includes(code)) {
				return coords;
			}
		}

		// Try arrondissement patterns
		const arrondPatterns = [
			/(\d{1,2})(?:er|e)\s/,  // "20e "
			/Paris\s(\d{1,2})(?:er|e)/,  // "Paris 20e"
			/Paris\s(\d{1,2})[\s,]/,  // "Paris 20"
			/(\d{1,2})(?:ème|eme)/,  // "10ème"
			/\((\d{1,2})\)/  // "(18)"
		];
		
		for (const pattern of arrondPatterns) {
			const match = address.match(pattern);
			if (match) {
				const num = match[1];
				const neighKey = num === '1' ? '1er' : num + 'e';
				if (neighborhoods[neighKey]) {
					return neighborhoods[neighKey];
				}
			}
		}

		// Try neighborhood names
		for (const [key, coords] of Object.entries(neighborhoods)) {
			if (address.includes(key) || address.includes(key.replace('e', 'er'))) {
				return coords;
			}
		}

		// Try known locations (case insensitive)
		for (const [location, coords] of Object.entries(knownLocations)) {
			if (address.toLowerCase().includes(location.toLowerCase())) {
				return coords;
			}
		}

		return [48.8566, 2.3522];
	}

	const activitiesWithAddresses = activities.filter(a => a.addresses || a.addresse || a.address);

	// Get unique activity types for legend
	const activityTypes = [...new Set(activities.map(a => a.type_d_activit_).filter(Boolean))].sort();
	const typeCounts = activityTypes.reduce((acc, type) => {
		acc[type] = activities.filter(a => a.type_d_activit_ === type).length;
		return acc;
	}, {});

	return (
		<div style={{ width: '100%' }}>
			{/* Map */}
			<div style={{ width: '100%', height: '600px', position: 'relative' }}>
				{!mapLoaded && (
					<div style={{ 
						position: 'absolute', 
						top: '50%', 
						left: '50%', 
						transform: 'translate(-50%, -50%)',
						zIndex: 1000
					}}>
						<p>Loading map...</p>
					</div>
				)}
				<div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
				{mapLoaded && activitiesWithAddresses.length === 0 && (
					<div style={{ 
						position: 'absolute', 
						top: '50%', 
						left: '50%', 
						transform: 'translate(-50%, -50%)',
						background: 'white',
						padding: '20px',
						borderRadius: '8px',
						boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
						zIndex: 1000
					}}>
						<p>{t.noAddresses || 'No activities with addresses found'}</p>
					</div>
				)}
			</div>

			{/* Map Legend/Info */}
			{mapLoaded && activitiesWithAddresses.length > 0 && (
				<div style={{ 
					marginTop: '16px', 
					padding: '16px', 
					background: '#f8f9fa', 
					borderRadius: '8px',
					border: '1px solid #e9ecef'
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
						<h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
							{t.mapLegend || 'Map Legend'} ({activitiesWithAddresses.length} {t.activities || 'Activities'} with addresses)
						</h4>
						<div style={{ fontSize: '12px', color: '#666' }}>
							{activities.length} {t.total || 'Total'} {activities.length === 1 ? 'activity' : 'activities'} in database
						</div>
					</div>

					{/* Activity Types Breakdown */}
					{activityTypes.length > 0 && (
						<div style={{ marginBottom: '12px' }}>
							<strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
								{t.activityTypes || 'Activity Types'}:
							</strong>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
								{activityTypes.slice(0, 10).map(type => (
									<span key={type} style={{ 
										padding: '4px 8px', 
										background: 'white', 
										border: '1px solid #ddd', 
										borderRadius: '4px', 
										fontSize: '12px',
										color: '#333'
									}}>
										{type.split(',')[0].trim()} <span style={{ color: '#007bff', fontWeight: 600 }}>({typeCounts[type]})</span>
									</span>
								))}
								{activityTypes.length > 10 && (
									<span style={{ 
										padding: '4px 8px', 
										background: 'white', 
										border: '1px solid #ddd', 
										borderRadius: '4px', 
										fontSize: '12px',
										color: '#999'
									}}>
										+{activityTypes.length - 10} more
									</span>
								)}
							</div>
						</div>
					)}

					{/* Quick Stats */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '12px', color: '#666' }}>
						<div>
							<strong>{t.withAddresses || 'With addresses'}:</strong> {activitiesWithAddresses.length}
						</div>
						<div>
							<strong>{t.withoutAddresses || 'Without addresses'}:</strong> {activities.length - activitiesWithAddresses.length}
						</div>
						<div>
							<strong>{t.categories || 'Categories'}:</strong> {[...new Set(activities.flatMap(a => a.categories || []))].length}
						</div>
						<div>
							<strong>{t.totalLocations || 'Total locations'}:</strong> {activitiesWithAddresses.reduce((sum, a) => {
								const addressStr = a.addresses || a.addresse || a.address || '';
								const addrs = parseAddresses(addressStr);
								return sum + addrs.length;
							}, 0)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

